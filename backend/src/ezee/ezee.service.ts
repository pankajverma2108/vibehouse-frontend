import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  EzeeApiError,
  EzeeBookingInput,
  EzeeInsertBookingResult,
  EzeeReservationSummary,
  EzeeRoomAssignment,
  EzeeRoomAvailabilityResult,
  EzeeRoomInventoryResult,
  EzeePhysicalRoomCatalogResult,
} from './ezee.types';

/**
 * HTTP client for all eZee PMS API calls.
 *
 * Reads credentials from `ezee_connection` table per property.
 * All methods throw `EzeeApiError` on failure.
 */
@Injectable()
export class EzeeService {
  private readonly logger = new Logger(EzeeService.name);

  private static readonly KIOSK_PATH = '/index.php/page/service.kioskconnectivity';
  private static readonly RESERVATION_PATH = '/booking/reservation_api/listing.php';
  private static readonly PMS_PATH = '/pmsinterface/pms_connectivity.php';
  private static readonly VACATION_RENTAL_PATH = '/channelbookings/vacation_rental.php';

  // eZee's payment-method + currency IDs are namespaced per hotel (the ID
  // prefix is the hotel code), so they CANNOT be hardcoded — TDS's IDs are
  // invalid for Buteak and vice versa (caused eZee error 110 on AddPayment for
  // Buteak bookings). We resolve them per property via RetrievePayMethods /
  // RetrieveCurrency and cache the result for the process lifetime.
  private readonly paymentContextCache = new Map<
    string,
    { paymentId: string; currencyId: string }
  >();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the Cash payment-method ID + base/INR currency ID for a property
   * from eZee (cached). Throws if eZee can't supply them, so AddPayment fails
   * loudly rather than posting an invalid (wrong-hotel) ID.
   */
  private async resolvePaymentContext(
    propertyId: string,
  ): Promise<{ paymentId: string; currencyId: string }> {
    const cached = this.paymentContextCache.get(propertyId);
    if (cached) return cached;

    const { hotelCode, authCode, baseUrl } = await this.getConnection(propertyId);
    const url = `${baseUrl}${EzeeService.KIOSK_PATH}`;
    const auth = { HotelCode: hotelCode, AuthCode: authCode };

    // ── Cash payment method ──
    const payResp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ RES_Request: { Request_Type: 'RetrievePayMethods', Authentication: auth } }),
    });
    const payData = await payResp.json();
    this.checkKioskError(payData, 'RetrievePayMethods');
    const methods: any[] = payData.Success?.PayMethods ?? [];
    const cash =
      methods.find((m) => (m.Type ?? '').toLowerCase() === 'cash') ??
      methods.find((m) => (m.Name ?? '').toLowerCase() === 'cash');
    const paymentId = cash?.PaymentID;
    if (!paymentId) {
      throw new EzeeApiError('NO_PAYMETHOD', `No Cash pay method for property ${propertyId}`, 'RetrievePayMethods');
    }

    // ── Base currency (INR) ──
    const curResp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ RES_Request: { Request_Type: 'RetrieveCurrency', Authentication: auth } }),
    });
    const curData = await curResp.json();
    this.checkKioskError(curData, 'RetrieveCurrency');
    const currencies: any[] = curData.Success?.CurrencyList ?? [];
    const base =
      currencies.find((c) => c.IsBaseCurrency === '1' || c.IsBaseCurrency === 1) ??
      currencies.find((c) => (c.CurrencyCode ?? '').toUpperCase() === 'INR');
    const currencyId = base?.CurrencyID;
    if (!currencyId) {
      throw new EzeeApiError('NO_CURRENCY', `No base/INR currency for property ${propertyId}`, 'RetrieveCurrency');
    }

    const ctx = { paymentId, currencyId };
    this.paymentContextCache.set(propertyId, ctx);
    this.logger.log(
      `eZee payment context for property ${propertyId} (hotel ${hotelCode}): PaymentID=${paymentId}, CurrencyID=${currencyId}`,
    );
    return ctx;
  }

  // ── Credentials ──────────────────────────────────────────────────────────

  private async getConnection(propertyId: string) {
    const conn = await this.prisma.ezee_connection.findFirst({
      where: { property_id: propertyId, is_active: true },
    });
    if (!conn) {
      throw new EzeeApiError('NO_CONNECTION', `No active eZee connection for property ${propertyId}`, 'getConnection');
    }
    return {
      hotelCode: conn.hotel_code,
      authCode: conn.api_key,
      baseUrl: conn.api_endpoint.replace(/\/+$/, ''), // trim trailing slash
    };
  }

  // ── 1. Physical Room Catalog (all rooms, no date filter) ─────────────────

  /**
   * Fetches ALL room types from eZee unconditionally — regardless of
   * availability or date range. Uses the Vacation Rental API endpoint.
   *
   * room_id returned here equals roomtypeunkid used in RoomList / InsertBooking.
   * Use this to power the catalog layer; overlay getRoomInventory() for
   * live rates + availability counts on specific dates.
   */
  async getPhysicalRooms(propertyId: string): Promise<EzeePhysicalRoomCatalogResult> {
    const { hotelCode, authCode, baseUrl } = await this.getConnection(propertyId);

    const resp = await fetch(`${baseUrl}${EzeeService.VACATION_RENTAL_PATH}`, {
      method: 'POST',
      headers: {
        // AUTH_CODE goes as a separate header — the combined Content-Type format
        // returns error 104. Two headers is the correct working format.
        'Content-Type': 'application/json',
        'AUTH_CODE': authCode,
      },
      body: JSON.stringify({
        request_type: 'get_rooms',
        body: { hotel_id: hotelCode },
      }),
    });

    const data = await resp.json();

    if (data.status !== 'success') {
      throw new EzeeApiError(
        String(data.error_code ?? 'UNKNOWN'),
        data.error_message ?? JSON.stringify(data),
        'get_rooms',
      );
    }

    const rawRooms: any[] = data.data?.rooms ?? [];
    const rooms = rawRooms.map((r) => ({
      roomId: String(r.room_id),
      roomName: String(r.room_name),
      // "rooms" field is a CSV of physical room numbers: "106,107,108"
      physicalRoomNos: r.rooms ? String(r.rooms).split(',').map((s: string) => s.trim()) : [],
      // "room_code" field is CSV of "number : status" pairs
      physicalRoomCodes: r.room_code ? String(r.room_code).split(',').map((s: string) => s.trim()) : [],
    }));

    this.logger.debug(`eZee get_rooms: ${rooms.map((r) => `${r.roomName}(${r.roomId})`).join(', ')}`);
    return { rooms };
  }

  // ── 2. Room Availability (kiosk) ─────────────────────────────────────────

  async getRoomAvailability(
    propertyId: string,
    checkin: string,
    checkout: string,
  ): Promise<EzeeRoomAvailabilityResult> {
    const { hotelCode, authCode, baseUrl } = await this.getConnection(propertyId);

    const body = {
      RES_Request: {
        Request_Type: 'RoomAvailability',
        Authentication: { HotelCode: hotelCode, AuthCode: authCode },
        RoomData: { from_date: checkin, to_date: checkout },
      },
    };

    const resp = await fetch(`${baseUrl}${EzeeService.KIOSK_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await resp.json();
    this.checkKioskError(data, 'RoomAvailability');

    const roomList = data.Success?.RoomList ?? [];
    return {
      rooms: roomList.map((rt: any) => ({
        roomTypeId: rt.RoomtypeID,
        roomTypeName: rt.RoomtypeName,
        physicalRooms: (rt.RoomData ?? []).map((r: any) => ({
          roomId: r.RoomID,
          roomName: r.RoomName,
        })),
      })),
    };
  }

  // ── 1b. Room Inventory (availability + rates) ───────────────────────────

  /**
   * Fetches room types with availability and nightly rates from eZee's
   * RoomList reservation API. This single endpoint returns everything:
   * room type names, available room counts per date, base rates, taxes.
   *
   * Uses YYYY-MM-DD date format (not DD/MM/YYYY — tested with eZee API).
   */
  async getRoomInventory(
    propertyId: string,
    checkin: string,
    checkout: string,
  ): Promise<EzeeRoomInventoryResult> {
    const { hotelCode, authCode, baseUrl } = await this.getConnection(propertyId);

    const url = `${baseUrl}${EzeeService.RESERVATION_PATH}?request_type=RoomList&HotelCode=${hotelCode}&APIKey=${authCode}&check_in_date=${checkin}&check_out_date=${checkout}&RoomType=all`;

    const resp = await fetch(url);
    const data = await resp.json();

    // Error check — reservation API returns array; errors have Error Details
    if (!Array.isArray(data)) {
      const errDetails = data?.['Error Details'] ?? data?.Error_Details;
      if (errDetails) {
        throw new EzeeApiError(
          errDetails.Error_Code ?? 'UNKNOWN',
          errDetails.Error_Message ?? JSON.stringify(data),
          'RoomList',
        );
      }
      throw new EzeeApiError('UNEXPECTED', `Unexpected RoomList response: ${JSON.stringify(data).slice(0, 200)}`, 'RoomList');
    }

    // Check if it's an error array
    if (data.length > 0 && data[0]?.['Error Details']) {
      const err = data[0]['Error Details'];
      throw new EzeeApiError(err.Error_Code ?? 'UNKNOWN', err.Error_Message ?? 'Unknown error', 'RoomList');
    }

    const rooms: EzeeRoomInventoryResult['rooms'] = [];

    for (const rt of data) {
      rooms.push({
        roomTypeId: rt.roomtypeunkid,
        roomTypeName: rt.Roomtype_Name,
        availability: Number(rt.min_ava_rooms ?? 0),
        ratePerNight: Number(rt.room_rates_info?.avg_per_night_without_tax ?? 0),
        ratePlanId: rt.roomrateunkid ?? '',
        rateTypeId: rt.ratetypeunkid ?? '',
      });
    }

    this.logger.debug(`eZee RoomList: ${rooms.map(r => `${r.roomTypeName}=${r.availability}@₹${r.ratePerNight}`).join(', ')}`);
    return { rooms };
  }

  // ── 2. Insert Booking ────────────────────────────────────────────────────

  /**
   * Serialises a room rate for eZee's `baserate` field.
   *
   * eZee accepts FRACTIONAL rates — verified live on 2026-08-05 (hotel 60765
   * reservation 127: `baserate: "1.23"` came back as folio beforeTax 1.23, tax
   * 0.06, after-tax 1.29). The previous `Math.round()` here silently dropped
   * the paise, so on coupon bookings the folio's room charge was up to ₹0.50
   * below what Razorpay actually captured, leaving the folio with a negative
   * balance once we started posting payments (55402 res 1647 at −0.05, 61766
   * res 187 at −0.24 on 2026-08-05).
   *
   * Trailing zeros are stripped so a whole-rupee rate serialises byte-identically
   * to the old behaviour (459 → "459", not "459.00") — the non-coupon path that
   * was already reconciling exactly is left untouched.
   */
  private static formatRate(value: number): string {
    return String(Number(value.toFixed(2)));
  }

  async insertBooking(
    propertyId: string,
    input: EzeeBookingInput,
  ): Promise<EzeeInsertBookingResult> {
    const { hotelCode, authCode, baseUrl } = await this.getConnection(propertyId);

    // Build Room_Details
    const roomDetails: Record<string, any> = {};
    for (let i = 0; i < input.rooms.length; i++) {
      const room = input.rooms[i];
      // eZee requires comma-separated per-night values — one entry per night.
      // All three rate arrays must have the same length as numberOfNights.
      // e.g. 2 nights at ₹500: baserate="500,500", extradultrate="0,0"
      const nights = Math.max(1, room.numberOfNights);
      // Prefer explicit per-night base rates (used to bake a booking-level
      // discount into the folio so the room charge nets to the paid amount).
      // Fall back to repeating ratePerNight when not provided.
      const perNight =
        room.baseRates && room.baseRates.length === nights
          ? room.baseRates.map((r) => EzeeService.formatRate(r))
          : Array(nights).fill(EzeeService.formatRate(room.ratePerNight));
      const rateStr = perNight.join(',');
      const zeroStr = Array(nights).fill('0').join(',');
      roomDetails[`Room_${i + 1}`] = {
        Rateplan_Id: room.ezeeRatePlanId,
        Ratetype_Id: room.ezeeRateTypeId,
        Roomtype_Id: room.ezeeRoomTypeId,
        baserate: rateStr,
        extradultrate: zeroStr,
        extrachildrate: zeroStr,
        number_adults: String(room.adults),
        number_children: String(room.children),
        ExtraChild_Age: '',
        Title: room.guestTitle,
        First_Name: room.guestFirstName,
        Last_Name: room.guestLastName,
        Gender: room.guestGender,
        // eZee accepts plain text; we use it to embed a payment trace
        // (Razorpay ID, purpose, source) so the booking is traceable back to
        // our system from the eZee folio.
        SpecialRequest: room.specialRequest ?? '',
      };
    }

    const bookingData = JSON.stringify({
      Room_Details: roomDetails,
      check_in_date: input.checkin,
      check_out_date: input.checkout,
      // Surfaces in eZee folio. We use "Online-Razorpay" for payments made
      // through our platform — distinguishes from OTA / cash / walk-in.
      Booking_Payment_Mode: input.paymentMode ?? '',
      Email_Address: input.email || '',
      Source_Id: '',
      MobileNo: input.phone || '',
      Address: input.address || '',
      State: input.state || '',
      Country: input.country || 'India',
      City: input.city || '',
      Zipcode: input.zipcode || '',
      Fax: '',
      Device: '',
      Languagekey: 'en',
      paymenttypeunkid: '',
    });

    const url = `${baseUrl}${EzeeService.RESERVATION_PATH}?request_type=InsertBooking&HotelCode=${hotelCode}&APIKey=${authCode}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `BookingData=${encodeURIComponent(bookingData)}`,
    });

    const data = await resp.json();

    if (data.Error_Details || data.error) {
      const errCode = data.Error_Details?.Error_Code ?? data.error?.code ?? 'UNKNOWN';
      const errMsg = data.Error_Details?.Error_Message ?? data.error?.message ?? JSON.stringify(data);
      throw new EzeeApiError(errCode, errMsg, 'InsertBooking');
    }

    if (!data.ReservationNo) {
      throw new EzeeApiError('NO_RESERVATION', `InsertBooking returned no ReservationNo: ${JSON.stringify(data)}`, 'InsertBooking');
    }

    this.logger.log(`eZee InsertBooking: ReservationNo=${data.ReservationNo}`);

    return {
      reservationNo: String(data.ReservationNo),
      subReservationNos: (data.SubReservationNo ?? []).map(String),
      inventoryMode: data.Inventory_Mode ?? '',
      contactUnkid: data.contactunkid ?? '',
    };
  }

  // ── 3. Process Booking (Confirm) ─────────────────────────────────────────

  async processBooking(propertyId: string, reservationNo: string): Promise<void> {
    const { hotelCode, authCode, baseUrl } = await this.getConnection(propertyId);

    const processData = JSON.stringify({
      Action: 'ConfirmBooking',
      ReservationNo: reservationNo,
      Inventory_Mode: 'REGULAR',
      Error_Text: '',
    });

    const url = `${baseUrl}${EzeeService.RESERVATION_PATH}?request_type=ProcessBooking&HotelCode=${hotelCode}&APIKey=${authCode}&Process_Data=${encodeURIComponent(processData)}`;

    const resp = await fetch(url);
    const data = await resp.json();

    if (data.result !== 'success') {
      throw new EzeeApiError(
        data.Error_Details?.Error_Code ?? 'PROCESS_FAILED',
        data.message ?? JSON.stringify(data),
        'ProcessBooking',
      );
    }

    this.logger.log(`eZee ProcessBooking: confirmed reservation ${reservationNo}`);
  }

  // ── 4. Assign Room ───────────────────────────────────────────────────────

  async assignRoom(propertyId: string, assignments: EzeeRoomAssignment[]): Promise<void> {
    const { hotelCode, authCode, baseUrl } = await this.getConnection(propertyId);

    const body = {
      RES_Request: {
        Request_Type: 'AssignRoom',
        Authentication: { HotelCode: hotelCode, AuthCode: authCode },
        RoomAssign: assignments.map((a) => ({
          BookingId: a.bookingId,
          RoomTypeID: a.roomTypeId,
          RoomID: a.roomId,
        })),
      },
    };

    const resp = await fetch(`${baseUrl}${EzeeService.KIOSK_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await resp.json();
    this.checkKioskError(data, 'AssignRoom');

    this.logger.log(`eZee AssignRoom: ${assignments.map((a) => `Booking ${a.bookingId} → Room ${a.roomId}`).join(', ')}`);
  }

  // ── 5. Add Payment ───────────────────────────────────────────────────────

  async addPayment(propertyId: string, bookingId: string, amount: number): Promise<string> {
    const { hotelCode, authCode, baseUrl } = await this.getConnection(propertyId);
    // Per-property Cash payment-method + base currency IDs (resolved + cached).
    const { paymentId, currencyId } = await this.resolvePaymentContext(propertyId);

    const body = {
      RES_Request: {
        Request_Type: 'AddPayment',
        Authentication: { HotelCode: hotelCode, AuthCode: authCode },
        Reservation: [
          {
            BookingId: bookingId,
            PaymentId: paymentId,
            CurrencyId: currencyId,
            Payment: String(amount),
          },
        ],
      },
    };

    const resp = await fetch(`${baseUrl}${EzeeService.KIOSK_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await resp.json();
    this.checkKioskError(data, 'AddPayment');

    const receiptNo = data.Success?.Receipt?.[0]?.ReceiptNo ?? '';
    this.logger.log(`eZee AddPayment: Booking ${bookingId}, ₹${amount}, Receipt=${receiptNo}`);
    return receiptNo;
  }

  // ── 6. Fetch Single Booking ──────────────────────────────────────────────

  async fetchBooking(propertyId: string, bookingId: string): Promise<any> {
    const { hotelCode, authCode, baseUrl } = await this.getConnection(propertyId);

    const body = {
      RES_Request: {
        Request_Type: 'FetchSingleBooking',
        BookingId: bookingId,
        Authentication: { HotelCode: hotelCode, AuthCode: authCode },
      },
    };

    const resp = await fetch(`${baseUrl}${EzeeService.PMS_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await resp.json();

    if (data.error) {
      throw new EzeeApiError(data.error.code, data.error.message, 'FetchSingleBooking');
    }

    // eZee returns ONE Reservation ENTRY PER ROOM for a multi-room booking — same UniqueID on
    // each, one BookingTran inside each (verified live on booking 109: entry[0] = sub 109-1
    // room 301, entry[1] = sub 109-2 room 206). Taking Reservation[0] therefore silently
    // dropped every room but the first. Fold the entries back into the single reservation the
    // rest of the codebase expects, with ALL its rooms.
    const entries: any[] = data.Reservations?.Reservation ?? [];
    if (entries.length === 0) return null;

    const head = entries[0];
    const sameBooking = entries.filter(
      (r) => String(r?.UniqueID ?? '') === String(head?.UniqueID ?? ''),
    );
    return {
      ...head,
      BookingTran: sameBooking.flatMap((r) => r?.BookingTran ?? []),
    };
  }

  // ── 7. Fetch Reservations by Date Range ──────────────────────────────────

  /**
   * Returns all reservations arriving or in-house between fromDate and toDate.
   * Used by reconciliation to detect cancellations, check-ins, check-outs
   * that happened in eZee outside our system.
   *
   * eZee CurrentStatus values:
   *   "Confirmed Reservation" → CONFIRMED
   *   "Cancelled Reservation" → CANCELLED
   *   "Checked In"            → CHECKED_IN
   *   "Checked Out"           → CHECKED_OUT
   *   "No Show"               → NO_SHOW
   */
  async fetchReservationsByDateRange(
    propertyId: string,
    fromDate: string,
    toDate: string,
  ): Promise<EzeeReservationSummary[]> {
    const { hotelCode, authCode, baseUrl } = await this.getConnection(propertyId);

    // eZee PMS uses "ArrivalList" request type with max 30-day window.
    const body = {
      RES_Request: {
        Request_Type: 'ArrivalList',
        Authentication: { HotelCode: hotelCode, AuthCode: authCode },
        Date: { from_date: fromDate, to_date: toDate },
      },
    };

    const resp = await fetch(`${baseUrl}${EzeeService.PMS_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await resp.json();

    if (data.Errors?.ErrorCode && String(data.Errors.ErrorCode) !== '0') {
      throw new EzeeApiError(data.Errors.ErrorCode, data.Errors.ErrorMessage, 'ArrivalList');
    }

    const reservations = data.Reservations?.Reservation ?? [];
    const results: EzeeReservationSummary[] = [];
    // Multi-room bookings have one BookingTran per room — deduplicate by UniqueID,
    // using the first tran for guest/status info and summing guest counts.
    const seen = new Set<string>();

    for (const res of reservations) {
      const resNo = String(res.UniqueID);
      if (seen.has(resNo)) continue;
      seen.add(resNo);

      const tran = res.BookingTran?.[0];
      if (!tran) continue;

      // Sum adults/children across all trans (multi-room bookings)
      const totalGuests = (res.BookingTran ?? []).reduce(
        (sum: number, t: any) => sum + Number(t.Adult ?? 1) + Number(t.Child ?? 0),
        0,
      );

      results.push({
        reservationNo: resNo,
        status: tran.CurrentStatus ?? '',
        roomName: tran.RoomName ?? null,
        roomTypeId: tran.RoomTypeCode ?? null,
        roomTypeName: tran.RoomTypeName ?? null,
        checkin: tran.Start ?? null,
        checkout: tran.End ?? null,
        firstName: res.FirstName ?? tran.FirstName ?? null,
        lastName: res.LastName ?? tran.LastName ?? null,
        email: res.Email ?? tran.Email ?? null,
        phone: res.Mobile ?? tran.Mobile ?? null,
        source: tran.Source ?? null,
        noOfGuests: totalGuests || 1,
        totalAmountBeforeTax: Number(tran.TotalAmountBeforeTax ?? 0),
      });
    }

    return results;
  }

  // ── Error checking ───────────────────────────────────────────────────────

  private checkKioskError(data: any, endpoint: string): void {
    // Kiosk errors come in two formats
    const errors = data.Errors ?? data.Error;
    if (!errors) return;

    const errorList = Array.isArray(errors) ? errors : [errors];
    for (const err of errorList) {
      const code = err.ErrorCode ?? err.errorCode;
      if (code && code !== '0' && code !== 0) {
        throw new EzeeApiError(String(code), err.ErrorMessage ?? 'Unknown error', endpoint);
      }
    }
  }
}
