/**
 * Shape of the JSON eZee POSTs to /ezee/webhook/autosync. Captured live on
 * 2026-06-04 — eZee Connectivity Portal docs say XML but the wire format
 * is actually JSON. Fields are typed loosely (string) because eZee sends
 * numerics as strings ("7137.9000") and some fields are optional per
 * operation (e.g. PaymentDetail is empty on VOID).
 */

export type EzeeAutosyncOperation =
  | 'RESERVATION'
  | 'UPDATEGUEST'
  | 'CHECKIN'
  | 'CHECKOUT'
  | 'CANCEL'
  | 'NOSHOW'
  | 'VOID_CANCEL_NOSHOW_RESERVATION'
  | 'ASSIGN_ROOM'
  | 'UNASSIGN_ROOM'
  | 'ROOMMOVE'
  | 'EXCHANGE_ROOM'
  | 'RESERVATION_GOT_CONFIRMED'
  | 'RESERVATION_GOT_UNCONFIRMED'
  | 'UNCONFIRMED_BOOKING'
  | 'RESERVATIONTOCHECKIN'
  | 'INSERT_TRANSACTION'
  | 'BLOCK_ROOM'
  | 'MODIFY_BLOCK_ROOM'
  | 'UNBLOCK_ROOM'
  | 'AMEND_STAY'
  | 'CHANGE_RATE'
  | 'UPDATE_CFORM'
  | 'RELEASE_ROOM'
  | 'UNDO_CHECKIN'
  | 'VOID_CHECKIN'
  | 'UNDO_CHECKOUT'
  // Fallback for any new op type eZee adds later.
  | (string & {});

export interface EzeeAutosyncRentalInfo {
  RoomID?: string;
  RoomName?: string;
  EffectiveDate?: string;
  PackageCode?: string;
  PackageName?: string;
  RoomTypeCode?: string;
  RoomTypeName?: string;
  Adult?: string;
  Child?: string;
  RentPreTax?: string;
  Rent?: string;
  Discount?: string;
}

export interface EzeeAutosyncTaxDetail {
  TaxCode?: string;
  TaxName?: string;
  TaxAmount?: string;
}

export interface EzeeAutosyncPaymentDetail {
  amount?: string;
  datetime?: string;
  method?: string;
}

export interface EzeeAutosyncBookingTran {
  SubBookingId?: string;
  FolioNo?: string;
  TransactionId?: string;
  Createdatetime?: string;
  Modifydatetime?: string;
  Status?: string;
  IsConfirmed?: string;
  CurrentStatus?: string;
  RateplanName?: string;
  RoomTypeCode?: string;
  RoomTypeName?: string;
  RoomID?: string;
  RoomName?: string;
  Start?: string;
  End?: string;
  TotalAmountAfterTax?: string;
  TotalAmountBeforeTax?: string;
  TotalTax?: string;
  TotalDiscount?: string;
  TotalPayment?: string;
  Salutation?: string;
  FirstName?: string;
  LastName?: string;
  Email?: string;
  Mobile?: string;
  Phone?: string;
  Comment?: string;
  TaxDeatil?: EzeeAutosyncTaxDetail[]; // sic — eZee typo in their API
  PaymentDetail?: EzeeAutosyncPaymentDetail[];
  RentalInfo?: EzeeAutosyncRentalInfo[];
}

export interface EzeeAutosyncReservation {
  BookingTran?: EzeeAutosyncBookingTran[];
  LocationId?: string;
  UniqueID?: string;
  BookedBy?: string;
  Salutation?: string;
  FirstName?: string;
  LastName?: string;
  Email?: string;
  Mobile?: string;
  Phone?: string;
  Source?: string;
}

export interface EzeeAutosyncMessage {
  data?: {
    Reservations?: {
      Reservation?: EzeeAutosyncReservation[];
    };
  };
  hotel_code?: string;
  operation?: EzeeAutosyncOperation;
}
