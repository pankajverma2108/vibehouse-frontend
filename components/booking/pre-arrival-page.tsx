"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileSearch,
  LoaderCircle,
  Upload,
  User,
} from "lucide-react";
import Cropper, { type Area } from "react-easy-crop";
import { toast } from "sonner";

import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { StickerTag } from "@/components/shared/sticker-tag";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getBookingKycDetail,
  getBookingKycSlots,
  getBookingKycUploadUrl,
  linkGuestBooking,
  runBookingKycOcr,
  submitBookingKyc,
  uploadFileToPresignedUrl,
  type BookingKycDetailResponse,
  type BookingSlotSummary,
  type KycSubmitPayload,
} from "@/lib/booking-api";
import { withBrandName } from "@/lib/branding";
import { getClientCache, setClientCache } from "@/lib/client-cache";
import { getStoredGuestToken } from "@/lib/guest-auth-api";
import {
  stripImageMetadata,
  validateIdDocumentFile,
} from "@/lib/securityUtils";
import { toSafeErrorMessage } from "@/lib/ui-error";
import { cn } from "@/lib/utils";

import { BookingEmptyState, BookingPageShell } from "./booking-shell";

type Step = 1 | 2 | 3;
type GenderValue = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
type SupportedIdType = "AADHAAR" | "PASSPORT" | "DRIVING_LICENCE" | "VOTER_ID";

type KycEditorState = {
  nationality_type: string;
  id_type: string;
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth: string;
  gender: GenderValue;
  id_number: string;
  permanent_address: string;
  contact_number: string;
  coming_from: string;
  going_to: string;
  arrival_time: string;
  document_file_key?: string;
  document_file_url?: string;
  consent_terms: boolean;
  consent_age: boolean;
};

type UploadPreviewDraft = {
  file: File;
  objectUrl: string;
};

type SlotsCachePayload = {
  slots: BookingSlotSummary[];
  bookingTitle: string;
  propertyName: string;
  bookingStatus?: string | null;
};

const STEPS: Array<{ id: Step; label: string; icon: typeof User; sticker: string }> = [
  { id: 1, label: "Basic Info", icon: User, sticker: "Names first" },
  { id: 2, label: "Gov. ID", icon: FileSearch, sticker: "ID ready" },
  { id: 3, label: "Time", icon: Clock3, sticker: "Final step" },
];

type KycFieldErrors = Partial<Record<
  | "first_name"
  | "last_name"
  | "email"
  | "date_of_birth"
  | "nationality_type"
  | "permanent_address"
  | "id_type"
  | "document_file_key"
  | "id_number"
  | "consent_terms"
  | "consent_age"
  | "arrival_time"
  | "coming_from"
  | "going_to"
  | "contact_number",
  string
>>;

const NAME_REGEX = /^[A-Za-z][A-Za-z' -]{1,49}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CONTACT_REGEX = /^\+\d{10,15}$/;
const PLACE_REGEX = /^[A-Za-z][A-Za-z0-9,'.\-\s]{1,79}$/;
const AADHAAR_PATTERN = /^[2-9]{1}\d{3}\s\d{4}\s\d{4}$/;
const VOTER_ID_PATTERN = /^[A-Z]{3}\d{7}$/;
const PASSPORT_PATTERN = /^[A-Z]{1}\d{7}$/;
const DRIVING_LICENCE_PATTERN = /^[A-Z]{2}\d{2}\d{4}\d{7}$/;

const VERHOEFF_D: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const VERHOEFF_P: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

const VERHOEFF_INV: number[] = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

function formatAadhaarInput(value: string): string {
  const digits = value.replace(/\D+/g, "").slice(0, 12);
  const groups = digits.match(/.{1,4}/g);
  return groups ? groups.join(" ") : "";
}

function normalizeIdNumberInput(rawValue: string, selectedIdType: string): string {
  const upper = rawValue.toUpperCase();
  const alphanumericCompact = upper.replace(/\s+/g, "").replace(/[^A-Z0-9]/g, "");
  const containsLetters = /[A-Z]/.test(alphanumericCompact);

  if (!containsLetters) {
    const digitsOnly = alphanumericCompact.replace(/\D+/g, "");
    const shouldFormatAsAadhaar =
      selectedIdType === "AADHAAR"
      || /^[2-9]\d*$/.test(digitsOnly);

    if (shouldFormatAsAadhaar) {
      return formatAadhaarInput(digitsOnly);
    }

    return digitsOnly.slice(0, 15);
  }

  return alphanumericCompact.slice(0, 15);
}

function detectIdTypeFromNumber(value: string): SupportedIdType | null {
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  if (AADHAAR_PATTERN.test(normalized)) {
    return "AADHAAR";
  }

  if (VOTER_ID_PATTERN.test(normalized)) {
    return "VOTER_ID";
  }

  if (PASSPORT_PATTERN.test(normalized)) {
    return "PASSPORT";
  }

  if (DRIVING_LICENCE_PATTERN.test(normalized)) {
    return "DRIVING_LICENCE";
  }

  return null;
}

function supportedIdTypeLabel(idType: SupportedIdType): string {
  switch (idType) {
    case "AADHAAR":
      return "Aadhaar";
    case "PASSPORT":
      return "Passport";
    case "DRIVING_LICENCE":
      return "Driving Licence";
    case "VOTER_ID":
      return "Voter ID";
    default:
      return "Unknown";
  }
}

function isValidVerhoeff(value: string): boolean {
  let checksum = 0;
  const digits = value
    .split("")
    .reverse()
    .map((char) => Number(char));

  for (let index = 0; index < digits.length; index += 1) {
    checksum = VERHOEFF_D[checksum][VERHOEFF_P[index % 8][digits[index]]];
  }

  return VERHOEFF_INV[checksum] === 0;
}

function validateIdNumber(value: string): { detectedType: SupportedIdType | null; error?: string } {
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return { detectedType: null, error: "ID number is required." };
  }

  const detectedType = detectIdTypeFromNumber(normalized);
  if (!detectedType) {
    return {
      detectedType: null,
      error: "Enter a valid Aadhaar, Voter ID, Passport, or Driving Licence number.",
    };
  }

  if (detectedType === "AADHAAR") {
    const aadhaarDigits = normalized.replace(/\s+/g, "");
    if (!/^\d{12}$/.test(aadhaarDigits) || !isValidVerhoeff(aadhaarDigits)) {
      return { detectedType, error: "Invalid Aadhaar Number" };
    }
  }

  return { detectedType };
}

function stepTabButtonClasses(isActive: boolean, isComplete: boolean): string {
  if (isActive || isComplete) {
    return "bg-[var(--vh-pink)] text-white shadow-[4px_4px_0px_rgba(0,0,0,0.45)] outline outline-1 outline-black";
  }

  return "bg-white/5 text-white/45 outline outline-1 outline-white/20";
}

function mergeFieldErrors(...parts: KycFieldErrors[]): KycFieldErrors {
  return parts.reduce<KycFieldErrors>((acc, item) => ({ ...acc, ...item }), {});
}

function parseDateString(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

function toInputDateString(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDobDate(value?: string): string {
  const parsed = parseDateString(value);
  if (!parsed) {
    return "Select date";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

const ID_TYPES = [
  { value: "AADHAAR", label: "Aadhaar" },
  { value: "PASSPORT", label: "Passport" },
  { value: "DRIVING_LICENCE", label: "Driving Licence" },
  { value: "VOTER_ID", label: "Voter ID" },
];

const SUPPORTED_OCR_ID_TYPES = new Set<SupportedIdType>(["AADHAAR", "PASSPORT", "DRIVING_LICENCE", "VOTER_ID"]);

const SUBMIT_PURPOSE = "LEISURE";

const ARRIVAL_WINDOWS = [
  "10:00 AM - 12:00 PM",
  "12:00 PM - 02:00 PM",
  "02:00 PM - 04:00 PM",
  "04:00 PM - 06:00 PM",
  "06:00 PM - 08:00 PM",
];

const WEB_CHECKIN_CACHE_TTL_MS = 1000 * 60 * 3;

function slotsCacheKey(ezeeReservationId: string): string {
  return `vh:web-checkin:slots:${ezeeReservationId}`;
}

function slotDetailCacheKey(ezeeReservationId: string, slotId: string): string {
  return `vh:web-checkin:slot:${ezeeReservationId}:${slotId}`;
}

function emptyEditorState(params?: {
  fullName?: string;
  email?: string;
  phone?: string | null;
  birthDate?: string | null;
  nationality?: string | null;
  location?: string | null;
  gender?: string | null;
}): KycEditorState {
  const [first, ...rest] = (params?.fullName || "").trim().split(/\s+/).filter(Boolean);

  return {
    nationality_type: normalizeNationality(params?.nationality),
    id_type: "AADHAAR",
    first_name: first || "",
    last_name: rest.join(" "),
    email: (params?.email || "").trim(),
    date_of_birth: normalizeBirthDate(params?.birthDate),
    gender: normalizeGender(params?.gender),
    id_number: "",
    permanent_address: (params?.location || "").trim(),
    contact_number: normalizeContactNumber(params?.phone),
    coming_from: "",
    going_to: "",
    arrival_time: ARRIVAL_WINDOWS[1],
    consent_terms: false,
    consent_age: false,
  };
}

function createEditorState(
  kyc: BookingKycDetailResponse["kyc"],
  params?: {
    slotGuestName?: string | null;
    guestName?: string;
    email?: string;
    phone?: string | null;
    birthDate?: string | null;
    nationality?: string | null;
    location?: string | null;
    gender?: string | null;
  },
): KycEditorState {
  if (!kyc) {
    return emptyEditorState({
      fullName: params?.slotGuestName || params?.guestName,
      email: params?.email,
      phone: params?.phone,
      birthDate: params?.birthDate,
      nationality: params?.nationality,
      location: params?.location,
      gender: params?.gender,
    });
  }

  const [firstName, ...rest] = (kyc.full_name || params?.slotGuestName || params?.guestName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return {
    nationality_type: kyc.nationality_type || normalizeNationality(params?.nationality),
    id_type: (() => {
      const normalized = normalizeDetectedIdType(kyc.id_type);
      return normalized && isSupportedIdType(normalized) ? normalized : "AADHAAR";
    })(),
    first_name: firstName || "",
    last_name: rest.join(" "),
    email: (params?.email || "").trim(),
    date_of_birth: normalizeBirthDate(kyc.date_of_birth || params?.birthDate),
    gender: normalizeGender(params?.gender),
    id_number: kyc.id_number || "",
    permanent_address: kyc.permanent_address || (params?.location || ""),
    contact_number: kyc.contact_number || normalizeContactNumber(params?.phone),
    coming_from: kyc.coming_from || "",
    going_to: kyc.going_to || "",
    arrival_time: ARRIVAL_WINDOWS[1],
    document_file_key: undefined,
    document_file_url: kyc.front_image_url || kyc.back_image_url || undefined,
    consent_terms: Boolean(kyc.consent_given),
    consent_age: Boolean(kyc.consent_given),
  };
}

function normalizeBirthDate(value?: string | null): string {
  if (!value) {
    return "";
  }

  const raw = value.trim();
  if (!raw) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const alt = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!alt) {
    return "";
  }

  const [, day, month, year] = alt;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function normalizeGender(value?: string | null): GenderValue {
  const raw = (value || "").trim().toLowerCase();
  if (raw === "male") {
    return "MALE";
  }
  if (raw === "female") {
    return "FEMALE";
  }
  if (raw === "prefer_not_to_say" || raw === "prefer not to say") {
    return "PREFER_NOT_TO_SAY";
  }
  return "OTHER";
}

function normalizeNationality(value?: string | null): string {
  const raw = (value || "").trim().toUpperCase();
  if (!raw || raw.includes("IND")) {
    return "INDIAN";
  }
  return raw;
}

function normalizeContactNumber(value?: string | null): string {
  const raw = (value || "").trim();
  if (!raw) {
    return "";
  }

  if (raw.startsWith("+")) {
    return raw;
  }

  const digits = raw.replace(/\D+/g, "");
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length > 0) {
    return `+${digits}`;
  }
  return raw;
}

function isAdult(dateInput: string): boolean {
  const date = new Date(`${dateInput}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 18);
  return date <= minDate;
}

function publicFileUrlFromUploadUrl(uploadUrl: string): string {
  return uploadUrl.split("?")[0] || uploadUrl;
}

function normalizeDetectedIdType(input?: string | null): string | null {
  const normalized = (input || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (!normalized) {
    return null;
  }

  if (normalized === "AADHAR") {
    return "AADHAAR";
  }

  if (normalized === "DRIVING_LICENSE" || normalized === "DRIVER_LICENSE") {
    return "DRIVING_LICENCE";
  }

  return normalized;
}

function isSupportedIdType(input?: string | null): input is SupportedIdType {
  if (!input) {
    return false;
  }

  return SUPPORTED_OCR_ID_TYPES.has(input as SupportedIdType);
}

function loadImage(sourceUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load selected image for cropping."));
    image.src = sourceUrl;
  });
}

async function createCroppedImageFile(file: File, sourceUrl: string, cropPixels: Area | null): Promise<File> {
  if (!cropPixels) {
    return file;
  }

  const image = await loadImage(sourceUrl);
  const canvas = document.createElement("canvas");
  const width = Math.max(1, Math.round(cropPixels.width));
  const height = Math.max(1, Math.round(cropPixels.height));
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return file;
  }

  context.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    width,
    height,
  );

  const mimeType = file.type || "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), mimeType, 0.95);
  });

  if (!blob) {
    return file;
  }

  const extension = mimeType === "image/png" ? "png" : "jpg";
  const baseName = file.name.replace(/\.[^/.]+$/, "");

  return new File([blob], `${baseName}-cropped.${extension}`, {
    type: blob.type || mimeType,
    lastModified: Date.now(),
  });
}

function normalizeOcrDate(input?: string | null): string {
  if (!input) {
    return "";
  }

  return normalizeBirthDate(input);
}

function isPaymentPendingStatus(status?: string | null): boolean {
  const normalized = (status || "").trim().toUpperCase();
  return normalized === "PENDING_PAYMENT" || normalized === "PAYMENT_PENDING" || normalized === "UNPAID";
}

function isKycCompletedStatus(status?: string | null): boolean {
  const normalized = (status || "").trim().toUpperCase();
  return normalized === "PRE_VERIFIED" || normalized === "VERIFIED";
}

function isSlotEditable(slot: BookingSlotSummary): boolean {
  if (typeof slot.can_edit === "boolean") {
    return slot.can_edit;
  }

  return !isKycCompletedStatus(slot.kyc_status);
}

function areAllSlotsCompleted(slots: BookingSlotSummary[]): boolean {
  return slots.length > 0 && slots.every((slot) => isKycCompletedStatus(slot.kyc_status));
}

function resolveNextActiveSlotId(
  slots: BookingSlotSummary[],
  options?: {
    preferredSlotId?: string;
    currentSlotId?: string | null;
  },
): string | null {
  const preferred = options?.preferredSlotId;
  if (preferred && slots.some((slot) => slot.slot_id === preferred && isSlotEditable(slot))) {
    return preferred;
  }

  const current = options?.currentSlotId;
  if (current && slots.some((slot) => slot.slot_id === current && isSlotEditable(slot))) {
    return current;
  }

  const editableSlots = slots.filter((slot) => isSlotEditable(slot));
  if (editableSlots.length === 1) {
    return editableSlots[0].slot_id;
  }

  return null;
}

function getSlotDisplayName(slot: BookingSlotSummary): string {
  const explicitName = slot.guest_name?.trim();
  if (explicitName) {
    return explicitName;
  }

  const label = slot.label?.trim();
  if (label) {
    return label;
  }

  return `Guest ${slot.slot_number}`;
}

function validateStepOne(state: KycEditorState): KycFieldErrors {
  const errors: KycFieldErrors = {};

  const firstName = state.first_name.trim();
  const lastName = state.last_name.trim();
  const email = state.email.trim();
  const contact = state.contact_number.trim();
  const address = state.permanent_address.trim();

  if (!firstName) {
    errors.first_name = "First name is required.";
  } else if (!NAME_REGEX.test(firstName)) {
    errors.first_name = "Use letters only for first name.";
  }

  if (!lastName) {
    errors.last_name = "Last name is required.";
  } else if (!NAME_REGEX.test(lastName)) {
    errors.last_name = "Use letters only for last name.";
  }

  if (!email) {
    errors.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!state.date_of_birth || !/^\d{4}-\d{2}-\d{2}$/.test(state.date_of_birth)) {
    errors.date_of_birth = "Date of birth is required.";
  } else if (!isAdult(state.date_of_birth)) {
    errors.date_of_birth = "Guest must be at least 18 years old.";
  }

  if (!state.nationality_type.trim()) {
    errors.nationality_type = "Nationality is required.";
  }

  if (!CONTACT_REGEX.test(contact)) {
    errors.contact_number = "Contact number must include country code (example: +918765432109).";
  }

  if (!address) {
    errors.permanent_address = "Address is required.";
  } else if (address.length < 8) {
    errors.permanent_address = "Address is too short.";
  }

  return errors;
}

function validateStepTwo(state: KycEditorState): KycFieldErrors {
  const errors: KycFieldErrors = {};
  const hasDocument = Boolean(state.document_file_url && state.document_file_key);
  const hasIdNumberInput = Boolean(state.id_number.trim());

  if (!state.id_type.trim()) {
    errors.id_type = "Select one government ID type.";
  }

  const idNumberValidation = hasIdNumberInput ? validateIdNumber(state.id_number) : { detectedType: null as SupportedIdType | null };
  const hasValidIdNumber = hasIdNumberInput && !idNumberValidation.error;

  if (hasIdNumberInput && idNumberValidation.error) {
    errors.id_number = idNumberValidation.error;
  }

  if (!hasDocument && !hasValidIdNumber) {
    errors.document_file_key = "Upload one ID document or enter a valid ID number.";
  }

  if (!state.consent_terms) {
    errors.consent_terms = "Please accept Terms and Conditions.";
  }

  if (!state.consent_age) {
    errors.consent_age = "Age confirmation is required.";
  }

  return errors;
}

function validateStepThree(state: KycEditorState): KycFieldErrors {
  const errors: KycFieldErrors = {};
  const comingFrom = state.coming_from.trim();
  const goingTo = state.going_to.trim();
  if (!state.arrival_time.trim()) {
    errors.arrival_time = "Select your expected arrival window.";
  }

  if (!comingFrom) {
    errors.coming_from = "Please enter where you are coming from.";
  } else if (!PLACE_REGEX.test(comingFrom)) {
    errors.coming_from = "Coming from can only include letters and basic punctuation.";
  }

  if (!goingTo) {
    errors.going_to = "Please enter your next destination.";
  } else if (!PLACE_REGEX.test(goingTo)) {
    errors.going_to = "Next destination can only include letters and basic punctuation.";
  }

  return errors;
}

function validateStep(step: Step, state: KycEditorState): KycFieldErrors {
  if (step === 1) {
    return validateStepOne(state);
  }

  if (step === 2) {
    return validateStepTwo(state);
  }

  return validateStepThree(state);
}

function validateForSubmit(state: KycEditorState): KycFieldErrors {
  return mergeFieldErrors(validateStepOne(state), validateStepTwo(state), validateStepThree(state));
}

export function PreArrivalPage({ ezeeReservationId }: { ezeeReservationId: string }) {
  const router = useRouter();
  const { guest, isAuthenticated, isRestoringSession, openAuthModal } = useGuestAuth();

  const [bookingTitle, setBookingTitle] = useState("Web check-in");
  const [propertyName, setPropertyName] = useState("The Daily Social");
  const [bookingLifecycleStatus, setBookingLifecycleStatus] = useState<string | null>(null);
  const [slots, setSlots] = useState<BookingSlotSummary[]>([]);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<Step>(1);
  const [editorState, setEditorState] = useState<KycEditorState>(() =>
    emptyEditorState({
      fullName: guest?.name,
      email: guest?.email,
      phone: guest?.phone,
      birthDate: guest?.birthDate,
      nationality: guest?.nationality,
      location: guest?.location,
      gender: guest?.gender,
    }),
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [isRunningOcr, setIsRunningOcr] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dobPickerOpen, setDobPickerOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<KycFieldErrors>({});
  const [uploadPreviewDraft, setUploadPreviewDraft] = useState<UploadPreviewDraft | null>(null);
  const [localDocumentPreviewUrl, setLocalDocumentPreviewUrl] = useState<string | null>(null);
  const [uploadedDocumentKind, setUploadedDocumentKind] = useState<"image" | "pdf" | null>(null);
  const [uploadInlineMessage, setUploadInlineMessage] = useState<string | null>(null);
  const [previewLoadError, setPreviewLoadError] = useState(false);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPixels, setCropPixels] = useState<Area | null>(null);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [isResolvingSlot, setIsResolvingSlot] = useState(false);
  const [slotSelectionError, setSlotSelectionError] = useState<string | null>(null);

  const documentUploadInputRef = useRef<HTMLInputElement | null>(null);
  const slotsRef = useRef<BookingSlotSummary[]>([]);
  const activeSlotIdRef = useRef<string | null>(null);
  const hasRequestedSignInModalRef = useRef(false);

  const guestPrefill = useMemo(
    () => ({
      name: guest?.name,
      email: guest?.email,
      phone: guest?.phone,
      birthDate: guest?.birthDate,
      nationality: guest?.nationality,
      location: guest?.location,
      gender: guest?.gender,
    }),
    [guest?.birthDate, guest?.email, guest?.gender, guest?.location, guest?.name, guest?.nationality, guest?.phone],
  );

  const activeSlot = useMemo(
    () => slots.find((slot) => slot.slot_id === activeSlotId) ?? null,
    [activeSlotId, slots],
  );
  const editableSlots = useMemo(() => slots.filter((slot) => isSlotEditable(slot)), [slots]);

  const showSlotSelectionGate = editableSlots.length > 1 && !activeSlotId;

  const canEditActiveSlot = Boolean(activeSlot && isSlotEditable(activeSlot));

  const documentPreview = localDocumentPreviewUrl || editorState.document_file_url;
  const detectedIdType = useMemo(
    () => detectIdTypeFromNumber(editorState.id_number),
    [editorState.id_number],
  );
  const stepTwoLiveErrors = useMemo(
    () => (activeStep === 2 ? validateStepTwo(editorState) : {}),
    [activeStep, editorState],
  );
  const shouldShowLiveIdNumberError = activeStep === 2 && Boolean(editorState.id_number.trim());
  const shouldShowLiveDocumentError = activeStep === 2 && (
    Boolean(editorState.document_file_key)
    || shouldShowLiveIdNumberError
    || (editorState.consent_terms && editorState.consent_age)
  );
  const idNumberErrorMessage = fieldErrors.id_number
    || (shouldShowLiveIdNumberError ? stepTwoLiveErrors.id_number : undefined);
  const documentUploadErrorMessage = fieldErrors.document_file_key
    || (shouldShowLiveDocumentError ? stepTwoLiveErrors.document_file_key : undefined);
  const canAdvanceToNextStep = useMemo(() => {
    if (!activeSlotId || showSlotSelectionGate || !canEditActiveSlot || activeStep >= 3) {
      return false;
    }

    if (activeStep === 1) {
      return Object.keys(validateStep(1, editorState)).length === 0;
    }

    if (activeStep === 2) {
      return Object.keys(validateStep(2, editorState)).length === 0;
    }

    return false;
  }, [activeSlotId, activeStep, canEditActiveSlot, editorState, showSlotSelectionGate]);

  const showUploadPreviewModal = Boolean(uploadPreviewDraft);

  const setField = <K extends keyof KycEditorState>(key: K, value: KycEditorState[K]) => {
    if (key === "id_type") {
      setUploadInlineMessage(null);
      setPreviewLoadError(false);
      setUploadedDocumentKind(null);
      setLocalDocumentPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
    }

    setEditorState((current) => {
      if (key === "id_type") {
        const nextIdType = String(value);
        return {
          ...current,
          id_type: nextIdType,
          id_number: "",
          document_file_key: undefined,
          document_file_url: undefined,
          [key]: value,
        };
      }

      return { ...current, [key]: value };
    });
    setFieldErrors((current) => ({
      ...current,
      [key]: undefined,
      ...(key === "id_type" ? { id_number: undefined, document_file_key: undefined } : {}),
    }));
  };

  const handleIdNumberInputChange = useCallback(
    (rawValue: string) => {
      const normalizedValue = normalizeIdNumberInput(rawValue, editorState.id_type);
      const nextDetectedType = detectIdTypeFromNumber(normalizedValue);

      setEditorState((current) => ({
        ...current,
        id_number: normalizedValue,
        id_type: nextDetectedType || current.id_type,
      }));
      setFieldErrors((current) => ({
        ...current,
        id_number: undefined,
        id_type: undefined,
      }));
    },
    [editorState.id_type],
  );

  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  useEffect(() => {
    activeSlotIdRef.current = activeSlotId;
  }, [activeSlotId]);

  useEffect(() => {
    return () => {
      if (uploadPreviewDraft?.objectUrl) {
        URL.revokeObjectURL(uploadPreviewDraft.objectUrl);
      }
    };
  }, [uploadPreviewDraft?.objectUrl]);

  useEffect(() => {
    return () => {
      if (localDocumentPreviewUrl) {
        URL.revokeObjectURL(localDocumentPreviewUrl);
      }
    };
  }, [localDocumentPreviewUrl]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeStep]);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    toast.error("Web check-in issue", {
      description: errorMessage,
    });
  }, [errorMessage]);

  useEffect(() => {
    if (isRestoringSession) {
      return;
    }

    if (isAuthenticated) {
      hasRequestedSignInModalRef.current = false;
      return;
    }

    if (!hasRequestedSignInModalRef.current) {
      hasRequestedSignInModalRef.current = true;
      openAuthModal("signin");
    }
  }, [isAuthenticated, isRestoringSession, openAuthModal]);

  const loadSlotDetail = useCallback(
    async (token: string, slotId: string, nextSlots?: BookingSlotSummary[]) => {
      const detailKey = slotDetailCacheKey(ezeeReservationId, slotId);
      const cachedDetail = getClientCache<BookingKycDetailResponse>(detailKey, WEB_CHECKIN_CACHE_TTL_MS);
      const selectedSlot = (nextSlots ?? slotsRef.current).find((slot) => slot.slot_id === slotId) ?? null;

      setUploadInlineMessage(null);
      setPreviewLoadError(false);
      setUploadedDocumentKind(null);
      setLocalDocumentPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });

      if (cachedDetail) {
        setEditorState(
          createEditorState(cachedDetail.kyc, {
            slotGuestName: selectedSlot?.guest_name,
            guestName: guestPrefill.name,
            email: guestPrefill.email,
            phone: guestPrefill.phone,
            birthDate: guestPrefill.birthDate,
            nationality: guestPrefill.nationality,
            location: guestPrefill.location,
            gender: guestPrefill.gender,
          }),
        );
      }

      const detail = await getBookingKycDetail(token, ezeeReservationId, slotId);
      setClientCache(detailKey, detail);
      setEditorState(
        createEditorState(detail.kyc, {
          slotGuestName: selectedSlot?.guest_name,
          guestName: guestPrefill.name,
          email: guestPrefill.email,
          phone: guestPrefill.phone,
          birthDate: guestPrefill.birthDate,
          nationality: guestPrefill.nationality,
          location: guestPrefill.location,
          gender: guestPrefill.gender,
        }),
      );
    },
    [ezeeReservationId, guestPrefill],
  );

  const loadSlots = useCallback(
    async (preferredSlotId?: string) => {
      if (isRestoringSession) {
        return;
      }

      const token = getStoredGuestToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      const cacheKey = slotsCacheKey(ezeeReservationId);
      const cachedSlots = getClientCache<SlotsCachePayload>(cacheKey, WEB_CHECKIN_CACHE_TTL_MS);

      if (cachedSlots) {
        setSlots(cachedSlots.slots);
        setBookingTitle(cachedSlots.bookingTitle);
        setPropertyName(cachedSlots.propertyName);
        setBookingLifecycleStatus(cachedSlots.bookingStatus ?? null);
        setSlotSelectionError(null);
        const currentActiveSlotId = activeSlotIdRef.current;
        const cachedActive = resolveNextActiveSlotId(cachedSlots.slots, {
          preferredSlotId,
          currentSlotId: currentActiveSlotId,
        });
        setActiveSlotId(cachedActive);
        setIsLoading(false);

        if (isPaymentPendingStatus(cachedSlots.bookingStatus)) {
          return;
        }

        if (areAllSlotsCompleted(cachedSlots.slots)) {
          router.replace(`/bookings/${encodeURIComponent(ezeeReservationId)}/confirmed`);
          return;
        }
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [bookingLinkResponse, slotResponse] = await Promise.all([
          linkGuestBooking(token, ezeeReservationId),
          getBookingKycSlots(token, ezeeReservationId),
        ]);

        const nextPropertyName = withBrandName(bookingLinkResponse.booking.property_id);
        const nextTitle = bookingLinkResponse.booking.room_type_name || "Web check-in";
        const nextBookingStatus = (bookingLinkResponse.booking.status || "").toUpperCase();

        setBookingTitle(nextTitle);
        setPropertyName(nextPropertyName);
        setBookingLifecycleStatus(nextBookingStatus || null);

        if (isPaymentPendingStatus(nextBookingStatus)) {
          setSlots([]);
          setActiveSlotId(null);
          setClientCache(cacheKey, {
            slots: [],
            bookingTitle: nextTitle,
            propertyName: nextPropertyName,
            bookingStatus: nextBookingStatus,
          });
          return;
        }

        setSlots(slotResponse.slots);
        setClientCache(cacheKey, {
          slots: slotResponse.slots,
          bookingTitle: nextTitle,
          propertyName: nextPropertyName,
          bookingStatus: nextBookingStatus,
        });

        if (areAllSlotsCompleted(slotResponse.slots)) {
          router.replace(`/bookings/${encodeURIComponent(ezeeReservationId)}/confirmed`);
          return;
        }

        const currentActiveSlotId = activeSlotIdRef.current;
        const nextActiveSlotId = resolveNextActiveSlotId(slotResponse.slots, {
          preferredSlotId,
          currentSlotId: currentActiveSlotId,
        });

        setActiveSlotId(nextActiveSlotId);
        setSlotSelectionError(null);

        if (nextActiveSlotId) {
          await loadSlotDetail(token, nextActiveSlotId, slotResponse.slots);
        } else {
          setEditorState(
            emptyEditorState({
              fullName: guestPrefill.name,
              email: guestPrefill.email,
              phone: guestPrefill.phone,
              birthDate: guestPrefill.birthDate,
              nationality: guestPrefill.nationality,
              location: guestPrefill.location,
              gender: guestPrefill.gender,
            }),
          );
          setActiveStep(1);
          setFieldErrors({});
        }
      } catch (error) {
        setErrorMessage(toSafeErrorMessage(error, "We could not load web check-in right now."));
      } finally {
        setIsLoading(false);
      }
    },
    [
      ezeeReservationId,
      guestPrefill,
      isRestoringSession,
      loadSlotDetail,
      router,
    ],
  );

  useEffect(() => {
    if (isRestoringSession) {
      return;
    }

    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    void loadSlots();
  }, [isAuthenticated, isRestoringSession, loadSlots]);

  async function handleSelectedFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadInlineMessage(null);
    setPreviewLoadError(false);

    const validation = await validateIdDocumentFile(file);
    if (!validation.valid) {
      setFieldErrors((current) => ({
        ...current,
        document_file_key: validation.error || "Unsupported document.",
      }));
      event.target.value = "";
      return;
    }

    setFieldErrors((current) => ({ ...current, document_file_key: undefined }));

    if (file.type === "application/pdf") {
      await handleUpload(file);
      event.target.value = "";
      return;
    }

    setCropPosition({ x: 0, y: 0 });
    setCropZoom(1);
    setCropPixels(null);

    const objectUrl = URL.createObjectURL(file);
    if (uploadPreviewDraft?.objectUrl) {
      URL.revokeObjectURL(uploadPreviewDraft.objectUrl);
    }
    setUploadPreviewDraft({ file, objectUrl });
    event.target.value = "";
  }

  async function handleUpload(file: File) {
    const token = getStoredGuestToken();
    if (!token) {
      setErrorMessage("Your session ended. Please sign in again.");
      return;
    }

    setIsUploadingDocument(true);
    setErrorMessage(null);
    setUploadInlineMessage(null);

    try {
      const sanitizedFile = await stripImageMetadata(file);
      const upload = await getBookingKycUploadUrl(token, ezeeReservationId, {
        file_name: sanitizedFile.name,
        content_type: sanitizedFile.type || "application/octet-stream",
      });

      await uploadFileToPresignedUrl(upload.uploadUrl, sanitizedFile);
      const publicUrl = publicFileUrlFromUploadUrl(upload.uploadUrl);

      setEditorState((current) => ({
        ...current,
        document_file_key: upload.fileKey,
        document_file_url: publicUrl,
      }));
      setFieldErrors((current) => ({
        ...current,
        document_file_key: undefined,
      }));

      if (sanitizedFile.type.startsWith("image/")) {
        const previewUrl = URL.createObjectURL(sanitizedFile);
        setLocalDocumentPreviewUrl((current) => {
          if (current) {
            URL.revokeObjectURL(current);
          }
          return previewUrl;
        });
        setUploadedDocumentKind("image");
        setPreviewLoadError(false);
      } else {
        setLocalDocumentPreviewUrl((current) => {
          if (current) {
            URL.revokeObjectURL(current);
          }
          return null;
        });
        setUploadedDocumentKind("pdf");
        setPreviewLoadError(false);
      }

      setUploadInlineMessage("ID uploaded successfully. Proceed to Scan ID.");

      toast.success("ID uploaded", {
        description: "Document uploaded successfully.",
      });
    } catch (error) {
      setErrorMessage(toSafeErrorMessage(error, "Document upload failed. Please try again."));
    } finally {
      setIsUploadingDocument(false);
    }
  }

  async function applyUploadPreview() {
    if (!uploadPreviewDraft) {
      return;
    }

    const { file, objectUrl } = uploadPreviewDraft;

    try {
      const croppedFile = await createCroppedImageFile(file, objectUrl, cropPixels);
      await handleUpload(croppedFile);
    } catch (error) {
      setErrorMessage(toSafeErrorMessage(error, "We could not process this crop. Please try again."));
    } finally {
      URL.revokeObjectURL(objectUrl);
      setUploadPreviewDraft(null);
    }
  }

  function dismissUploadPreview() {
    if (uploadPreviewDraft?.objectUrl) {
      URL.revokeObjectURL(uploadPreviewDraft.objectUrl);
    }
    setUploadPreviewDraft(null);
  }

  async function handleRunOcr() {
    const token = getStoredGuestToken();
    if (!token || !activeSlotId || !editorState.document_file_key) {
      return;
    }

    setUploadInlineMessage(null);
    setIsRunningOcr(true);
    setErrorMessage(null);

    try {
      const ocr = await runBookingKycOcr(token, ezeeReservationId, activeSlotId, {
        front_image_key: editorState.document_file_key,
      });

      const detectedIdType = normalizeDetectedIdType(ocr.id_type_detected);
      if (detectedIdType && !isSupportedIdType(detectedIdType)) {
        setFieldErrors((current) => ({
          ...current,
          document_file_key:
            "ID type not supported. Re-upload a clearer Aadhaar, Passport, Driving Licence, or Voter ID image.",
          id_type: "OCR could not verify a supported document type.",
        }));
        toast.error("Unsupported ID type", {
          description: "Re-upload a better quality Aadhaar, Passport, Driving Licence, or Voter ID image.",
        });
        return;
      }

      setEditorState((current) => {
        const normalizedName = (ocr.ocr_name || "").trim();
        const [firstName, ...lastNameParts] = normalizedName ? normalizedName.split(/\s+/) : [current.first_name, current.last_name];
        const nextIdType = isSupportedIdType(detectedIdType) ? detectedIdType : current.id_type;
        const nextIdNumber = normalizeIdNumberInput(ocr.ocr_id_number || current.id_number, nextIdType);

        return {
          ...current,
          id_type: nextIdType,
          first_name: firstName || current.first_name,
          last_name: lastNameParts.join(" ") || current.last_name,
          date_of_birth: normalizeOcrDate(ocr.ocr_dob) || current.date_of_birth,
          id_number: nextIdNumber,
          permanent_address: ocr.ocr_address || current.permanent_address,
        };
      });
      setFieldErrors((current) => ({
        ...current,
        document_file_key: undefined,
        id_type: undefined,
      }));

      toast.success("ID scanned", {
        description: "Review the extracted fields before submitting.",
      });
    } catch (error) {
      setErrorMessage(toSafeErrorMessage(error, "We could not scan this ID. Please fill the fields manually."));
    } finally {
      setIsRunningOcr(false);
    }
  }

  async function handleSelectSlot(slotId: string) {
    const token = getStoredGuestToken();
    if (!token) {
      setSlotSelectionError("Your session ended. Please sign in again.");
      return;
    }

    setIsResolvingSlot(true);
    setSlotSelectionError(null);
    setErrorMessage(null);

    try {
      await loadSlotDetail(token, slotId, slotsRef.current);
      setActiveSlotId(slotId);
      setActiveStep(1);
      setFieldErrors({});
    } catch (error) {
      const message = toSafeErrorMessage(error, "We could not open this guest slot right now.");
      setSlotSelectionError(message);
      setErrorMessage(message);
    } finally {
      setIsResolvingSlot(false);
    }
  }

  function nextStep() {
    const stepErrors = activeStep === 1
      ? validateStep(1, editorState)
      : activeStep === 2
        ? validateStep(2, editorState)
        : {};

    if (Object.keys(stepErrors).length > 0) {
      setFieldErrors((current) => ({ ...current, ...stepErrors }));
      return;
    }

    setErrorMessage(null);
    setActiveStep((current) => Math.min(3, current + 1) as Step);
  }

  function previousStep() {
    if (activeStep === 1) {
      router.push("/bookings");
      return;
    }

    setErrorMessage(null);
    setFieldErrors({});
    setActiveStep((current) => Math.max(1, current - 1) as Step);
  }

  async function handleSubmit() {
    const token = getStoredGuestToken();
    if (!token || !activeSlotId) {
      setErrorMessage("Your session ended. Please sign in again.");
      return;
    }

    const validationErrors = validateForSubmit(editorState);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors((current) => ({ ...current, ...validationErrors }));

      const hasStepOneError = Object.keys(validationErrors).some((key) => [
        "first_name",
        "last_name",
        "email",
        "date_of_birth",
        "contact_number",
        "nationality_type",
        "permanent_address",
      ].includes(key));
      const hasStepTwoError = Object.keys(validationErrors).some((key) => [
        "id_type",
        "document_file_key",
        "id_number",
        "consent_terms",
        "consent_age",
      ].includes(key));

      if (hasStepOneError) {
        setActiveStep(1);
      } else if (hasStepTwoError) {
        setActiveStep(2);
      } else {
        setActiveStep(3);
      }

      return;
    }

    const payload: KycSubmitPayload = {
      nationality_type: editorState.nationality_type,
      id_type: editorState.id_type,
      full_name: `${editorState.first_name} ${editorState.last_name}`.replace(/\s+/g, " ").trim(),
      date_of_birth: editorState.date_of_birth,
      id_number: editorState.id_number.trim(),
      permanent_address: editorState.permanent_address.trim(),
      contact_number: editorState.contact_number.trim(),
      coming_from: editorState.coming_from.trim(),
      going_to: editorState.going_to.trim(),
      purpose: SUBMIT_PURPOSE,
      front_image_url: editorState.document_file_url,
      back_image_url: undefined,
      consent_given: editorState.consent_terms && editorState.consent_age,
    };

    setIsSubmitting(true);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      await submitBookingKyc(token, ezeeReservationId, activeSlotId, payload);
      toast.success("Web check-in submitted", {
        description: "Your details are submitted successfully.",
      });
      await loadSlots(activeSlotId);
      setIsCompletionModalOpen(true);
    } catch (error) {
      setErrorMessage(toSafeErrorMessage(error, "Unable to submit web check-in right now."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isRestoringSession || isLoading) {
    return (
      <BookingPageShell
        badge="Web Check-In"
        title="Complete web check-in"
      >
        <div aria-busy="true" aria-live="polite" className="space-y-6" role="status">
          <span className="sr-only">Loading web check-in details.</span>

          <div className="mx-auto flex w-full max-w-[980px] items-center justify-between rounded-[18px] border border-white/10 bg-[var(--vh-panel-strong)] px-5 py-4">
            <Skeleton className="h-5 w-32 bg-white/12" />
            <Skeleton className="h-5 w-24 bg-white/12" />
          </div>

          <div className="mx-auto grid w-full max-w-[980px] gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-[16px] border border-white/10 bg-[var(--vh-panel-strong)] p-4">
                <Skeleton className="h-4 w-20 bg-white/12" />
                <Skeleton className="mt-3 h-3 w-28 bg-white/10" />
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="rounded-[28px] border border-white/12 bg-[var(--vh-panel-strong)] p-6 md:p-8">
              <Skeleton className="h-7 w-44 bg-white/12" />
              <Skeleton className="mt-4 h-4 w-full max-w-[420px] bg-white/10" />
              <div className="mt-6 space-y-4">
                <Skeleton className="h-14 w-full rounded-[12px] bg-white/10" />
                <Skeleton className="h-14 w-full rounded-[12px] bg-white/10" />
                <Skeleton className="h-14 w-full rounded-[12px] bg-white/10" />
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <Skeleton className="h-11 w-28 rounded-full bg-white/10" />
                <Skeleton className="h-11 w-36 rounded-full bg-white/12" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/12 bg-[var(--vh-panel-strong)] p-5">
                <Skeleton className="h-4 w-24 bg-white/12" />
                <Skeleton className="mt-4 h-10 w-full rounded-[10px] bg-white/10" />
                <Skeleton className="mt-3 h-10 w-full rounded-[10px] bg-white/10" />
              </div>
              <div className="rounded-[24px] border border-white/12 bg-[var(--vh-panel-strong)] p-5">
                <Skeleton className="h-4 w-28 bg-white/12" />
                <Skeleton className="mt-4 h-20 w-full rounded-[12px] bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      </BookingPageShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <BookingPageShell
        badge="Web Check-In"
        title="Sign in to continue"
        description="Web check-in is tied to your guest session for this booking."
      >
        <div className="rounded-[28px] border border-white/12 bg-[var(--vh-panel-strong)] p-8 text-center shadow-[var(--vh-shadow-lg)]">
          <p className="text-lg font-semibold text-white">Guest sign-in required</p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/70">
            Sign in with the same account used for this booking, then continue web check-in.
          </p>
          <Button className="mt-6 rounded-full px-6" onClick={() => openAuthModal("signin")} type="button">
            Sign in to continue
          </Button>
        </div>
      </BookingPageShell>
    );
  }

  if (isPaymentPendingStatus(bookingLifecycleStatus)) {
    return (
      <BookingPageShell
        badge="Web Check-In"
        title="Payment pending"
        description="Web check-in opens only after booking payment is successful."
      >
        <BookingEmptyState
          title="Finish payment to unlock web check-in"
          description="Ask the primary guest to complete payment for this reservation, then reopen this link to continue check-in."
          ctaHref={`/bookings/${encodeURIComponent(ezeeReservationId)}/confirmed`}
          ctaLabel="View booking status"
        />
      </BookingPageShell>
    );
  }

  if (slots.length === 0) {
    return (
      <BookingPageShell
        badge="Web Check-In"
        title="No guest slots found"
        description="We could not find guest slots for this booking yet."
      >
        <BookingEmptyState
          title="Guest slots are unavailable"
          description={errorMessage || "Please reopen the booking details and try web check-in again."}
          ctaHref="/bookings"
          ctaLabel="Back to bookings"
        />
      </BookingPageShell>
    );
  }

  if (editableSlots.length === 0) {
    return (
      <BookingPageShell
        badge="Web Check-In"
        title="No editable guest slot"
        description="All visible guest slots are either locked or already verified."
      >
        <BookingEmptyState
          title="No slot available to edit"
          description="If you expected to complete check-in for a co-guest, ask the primary guest to share the latest link and ensure your guest account is linked to this reservation."
          ctaHref={`/bookings/${encodeURIComponent(ezeeReservationId)}/confirmed`}
          ctaLabel="Open booking status"
        />
      </BookingPageShell>
    );
  }

  return (
    <section className="min-h-screen bg-[#07070a] pb-12 pt-24 animate-vh-fade-in md:pt-28">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div className="mx-auto max-w-[980px]">
          <div className="relative min-h-10">
            <Button
              asChild
              className="absolute left-0 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full border border-white/10 bg-transparent p-0 text-white shadow-none hover:bg-white/10"
              variant="ghost"
            >
              <Link aria-label="Back to bookings" href="/bookings">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="vh-title text-center text-[26px] leading-[1.12] text-white md:text-[30px]">Web Check-In</h1>
          </div>

          <p className="mt-2 text-center text-sm text-[#99A1AF]">{propertyName}</p>
          <p className="mt-1 text-center text-xs uppercase tracking-[0.12em] text-[#6A7282]">{bookingTitle}</p>
          <p className="mt-1 text-center text-xs uppercase tracking-[0.12em] text-[#6A7282]">Reservation ID: {ezeeReservationId}</p>

          {errorMessage ? (
            <div className="mt-4 rounded-[12px] border border-[rgba(255,106,95,0.35)] bg-[rgba(255,106,95,0.1)] px-4 py-3 text-sm text-[#ffd9d4]" role="alert">
              {errorMessage}
            </div>
          ) : null}

          <section className="mt-6 rounded-[16px] border border-white/10 bg-[var(--vh-panel-strong)] p-4 md:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">Select Guest Slot</h2>
                <p className="mt-1 text-xs leading-6 text-[#99A1AF]">
                  {showSlotSelectionGate
                    ? "Choose the guest slot you are completing now."
                    : "Guest slot selected. You can switch to another editable slot if needed."}
                </p>
              </div>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/70">
                {editableSlots.length} editable
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {editableSlots.map((slot) => {
                const isActive = activeSlotId === slot.slot_id;
                return (
                  <button
                    key={slot.slot_id}
                    className={cn(
                      "rounded-[12px] border px-4 py-3 text-left transition",
                      isActive
                        ? "border-[var(--vh-pink)] bg-[rgba(198,40,40,0.14)] text-white"
                        : "border-white/12 bg-[#212121] text-white hover:border-white/25",
                    )}
                    disabled={isResolvingSlot}
                    onClick={() => {
                      void handleSelectSlot(slot.slot_id);
                    }}
                    type="button"
                  >
                    <p className="text-sm font-bold tracking-[0.02em]">{getSlotDisplayName(slot)}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-white/65">
                      {slot.label || `Guest ${slot.slot_number}`}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86efac]">
                      {slot.kyc_status.replaceAll("_", " ")}
                    </p>
                  </button>
                );
              })}
            </div>

            {isResolvingSlot ? (
              <p className="mt-3 inline-flex items-center gap-2 text-xs text-[#99A1AF]" role="status">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                Opening selected guest slot...
              </p>
            ) : null}

            {slotSelectionError ? (
              <p className="mt-3 text-xs text-[#ff6a5f]" role="alert">{slotSelectionError}</p>
            ) : null}
          </section>

          {showSlotSelectionGate ? null : (
          <>

          <div className="mx-auto mb-8 mt-8 w-full max-w-[980px] px-2 sm:px-4">
            <div className="mx-auto grid w-[80%] min-w-[280px] items-start" style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }}>
              {STEPS.map((step, index) => {
                const isCurrent = step.id === activeStep;
                const isDone = step.id < activeStep;
                const Icon = step.icon;

                return (
                  <div key={step.id} className="relative flex flex-col items-center gap-3 px-2">
                    {index < STEPS.length - 1 ? (
                      <div className={`pointer-events-none absolute left-1/2 top-6 ml-6 h-[2px] w-[calc(100%-3rem)] ${activeStep > step.id ? "bg-[var(--vh-pink)]" : "bg-transparent"}`} />
                    ) : null}
                    <button
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-[14px] ${stepTabButtonClasses(isCurrent, isDone)}`}
                      onClick={() => {
                        if (step.id <= activeStep) {
                          setActiveStep(step.id);
                        }
                      }}
                      type="button"
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                    <div className="flex flex-col items-center gap-2">
                      <p className={`text-center text-[11px] font-bold uppercase tracking-[0.08em] ${isCurrent || isDone ? "text-white" : "text-white/45"}`}>
                        {step.label}
                      </p>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${isCurrent || isDone ? "bg-white/10 text-white/75" : "bg-white/5 text-white/35"}`}>
                        {step.sticker}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={cn("mt-6", activeStep === 3 && "mx-auto w-full md:w-[calc(53.333%+3rem)]")}>
            <div className="rounded-[16px] border border-white/5 bg-[#1A1A1A] p-5 md:p-8">
              {activeStep === 1 ? (
                <section>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[20px] font-bold leading-7 text-white">Basic Info</h2>
                    <User className="h-5 w-5 text-[#99A1AF]" />
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#99A1AF]">First Name</span>
                      <input
                        className={`h-12 w-full rounded-[10px] border bg-[#212121] px-4 text-sm text-white outline-none placeholder:text-[#6A7282] ${fieldErrors.first_name ? "border-[#ff6a5f]" : "border-white/10 focus:border-[var(--vh-pink)]"}`}
                        onChange={(event) => setField("first_name", event.target.value)}
                        placeholder="First name"
                        value={editorState.first_name}
                      />
                      {fieldErrors.first_name ? <p className="text-xs text-[#ff6a5f]">{fieldErrors.first_name}</p> : null}
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#99A1AF]">Last Name</span>
                      <input
                        className={`h-12 w-full rounded-[10px] border bg-[#212121] px-4 text-sm text-white outline-none placeholder:text-[#6A7282] ${fieldErrors.last_name ? "border-[#ff6a5f]" : "border-white/10 focus:border-[var(--vh-pink)]"}`}
                        onChange={(event) => setField("last_name", event.target.value)}
                        placeholder="Last name"
                        value={editorState.last_name}
                      />
                      {fieldErrors.last_name ? <p className="text-xs text-[#ff6a5f]">{fieldErrors.last_name}</p> : null}
                    </label>

                    <label className="space-y-2 md:col-span-2">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#99A1AF]">Email</span>
                      <input
                        className={`h-12 w-full rounded-[10px] border bg-[#212121] px-4 text-sm text-white outline-none placeholder:text-[#6A7282] ${fieldErrors.email ? "border-[#ff6a5f]" : "border-white/10 focus:border-[var(--vh-pink)]"}`}
                        onChange={(event) => setField("email", event.target.value)}
                        placeholder="Email"
                        type="email"
                        value={editorState.email}
                      />
                      {fieldErrors.email ? <p className="text-xs text-[#ff6a5f]">{fieldErrors.email}</p> : null}
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#99A1AF]">Date Of Birth</span>
                      <Popover onOpenChange={setDobPickerOpen} open={dobPickerOpen}>
                        <PopoverTrigger asChild>
                          <button
                            className={`flex h-12 w-full items-center justify-between rounded-[10px] border bg-[#212121] px-4 text-left text-sm text-white outline-none ${fieldErrors.date_of_birth ? "border-[#ff6a5f]" : "border-white/10 hover:border-white/20"}`}
                            type="button"
                          >
                            <span>{formatDobDate(editorState.date_of_birth)}</span>
                            <ChevronDown className="h-4 w-4 text-[#99A1AF]" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="z-[220] w-auto border-white/10 bg-[#10111a] p-2">
                          <Calendar
                            captionLayout="dropdown"
                            className="vh-calendar-dark vh-calendar-balanced rounded-[16px]"
                            disabled={{ after: new Date() }}
                            fromYear={1900}
                            mode="single"
                            onSelect={(nextDate) => {
                              if (!nextDate) {
                                return;
                              }

                              setField("date_of_birth", toInputDateString(nextDate));
                              setDobPickerOpen(false);
                            }}
                            selected={parseDateString(editorState.date_of_birth)}
                            toYear={new Date().getFullYear()}
                          />
                        </PopoverContent>
                      </Popover>
                      {fieldErrors.date_of_birth ? <p className="text-xs text-[#ff6a5f]">{fieldErrors.date_of_birth}</p> : null}
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#99A1AF]">Gender</span>
                      <Select onValueChange={(value) => setField("gender", value as GenderValue)} value={editorState.gender}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                          <SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#99A1AF]">Nationality</span>
                      <Select onValueChange={(value) => setField("nationality_type", value)} value={editorState.nationality_type}>
                        <SelectTrigger className={fieldErrors.nationality_type ? "border-[#ff6a5f]" : ""}>
                          <SelectValue placeholder="Select nationality" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INDIAN">Indian</SelectItem>
                          <SelectItem value="OTHER">Other Nationality</SelectItem>
                        </SelectContent>
                      </Select>
                      {fieldErrors.nationality_type ? <p className="text-xs text-[#ff6a5f]">{fieldErrors.nationality_type}</p> : null}
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#99A1AF]">Contact Number</span>
                      <input
                        className={`h-12 w-full rounded-[10px] border bg-[#212121] px-4 text-sm text-white outline-none placeholder:text-[#6A7282] ${fieldErrors.contact_number ? "border-[#ff6a5f]" : "border-white/10 focus:border-[var(--vh-pink)]"}`}
                        onChange={(event) => setField("contact_number", normalizeContactNumber(event.target.value))}
                        placeholder="+918765432109"
                        value={editorState.contact_number}
                      />
                      {fieldErrors.contact_number ? <p className="text-xs text-[#ff6a5f]">{fieldErrors.contact_number}</p> : null}
                    </label>

                    <label className="space-y-2 md:col-span-2">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#99A1AF]">Address</span>
                      <textarea
                        className={`min-h-[120px] w-full resize-y rounded-[10px] border bg-[#212121] px-4 py-3 text-sm text-white outline-none placeholder:text-[#6A7282] ${fieldErrors.permanent_address ? "border-[#ff6a5f]" : "border-white/10 focus:border-[var(--vh-pink)]"}`}
                        onChange={(event) => setField("permanent_address", event.target.value)}
                        placeholder="Full address"
                        value={editorState.permanent_address}
                      />
                      {fieldErrors.permanent_address ? <p className="text-xs text-[#ff6a5f]">{fieldErrors.permanent_address}</p> : null}
                    </label>
                  </div>
                </section>
              ) : null}

              {activeStep === 2 ? (
                <section>
                  <h2 className="text-[20px] font-bold leading-7 text-white">Just one ID needed</h2>
                  <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
                    <div className="space-y-5">
                      <p className="text-sm text-[#99A1AF]">Choose one document to upload.</p>
                      {fieldErrors.id_type ? <p className="text-xs text-[#ff6a5f]">{fieldErrors.id_type}</p> : null}

                      <div className="grid gap-3">
                        {ID_TYPES.map((idType) => (
                          <button
                            key={idType.value}
                            className={cn(
                              "flex items-center justify-between rounded-[14px] border px-4 py-4 text-left transition-colors",
                              editorState.id_type === idType.value
                                ? "border-[var(--vh-pink)] bg-[rgba(198,40,40,0.12)] text-[var(--vh-pink)]"
                                : "border-white/10 bg-[#212121] text-white hover:border-white/20",
                            )}
                            onClick={() => setField("id_type", idType.value)}
                            type="button"
                          >
                            <p className="text-base font-semibold tracking-[0.02em]">{idType.label}</p>
                            {editorState.id_type === idType.value ? <Upload className="h-4 w-4" /> : null}
                          </button>
                        ))}
                      </div>

                      <div>
                        <label className="space-y-2">
                          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#99A1AF]">ID Number</span>
                          <input
                            className={`h-12 w-full rounded-[10px] border bg-[#212121] px-4 text-sm text-white outline-none placeholder:text-[#6A7282] ${idNumberErrorMessage ? "border-[#ff6a5f]" : "border-white/10 focus:border-[var(--vh-pink)]"}`}
                            onChange={(event) => handleIdNumberInputChange(event.target.value)}
                            placeholder="You can Enter ID Number Manually, No Prob!"
                            value={editorState.id_number}
                          />
                          {editorState.id_number.trim() ? (
                            <p className={`text-[11px] font-bold uppercase tracking-[0.12em] ${detectedIdType ? "text-[#86efac]" : "text-[#facc15]"}`}>
                              {detectedIdType
                                ? `Detected ID Type: ${supportedIdTypeLabel(detectedIdType)}`
                                : "Detected ID Type: Not recognized yet"}
                            </p>
                          ) : null}
                          {idNumberErrorMessage ? <p className="text-xs text-[#ff6a5f]">{idNumberErrorMessage}</p> : null}
                        </label>
                      </div>

                      <div className="space-y-3 rounded-[12px] border border-white/10 bg-[#212121] p-4">
                        <label className="flex items-start gap-3 text-sm text-[#D1D5DC]">
                          <input
                            checked={editorState.consent_terms}
                            className="mt-1 accent-[var(--vh-pink)]"
                            onChange={(event) => setField("consent_terms", event.target.checked)}
                            type="checkbox"
                          />
                          <span>
                            I hereby consent to provide my identity details for guest registration as required by local law.
                            I understand my data is encrypted and processed according to <Link className="underline decoration-white/40 underline-offset-4" href="/policies/privacy">Privacy Policy</Link>.
                          </span>
                        </label>
                        {fieldErrors.consent_terms ? <p className="text-xs text-[#ff6a5f]">{fieldErrors.consent_terms}</p> : null}

                        <label className="flex items-start gap-3 text-sm text-[#D1D5DC]">
                          <input
                            checked={editorState.consent_age}
                            className="mt-1 accent-[var(--vh-pink)]"
                            onChange={(event) => setField("consent_age", event.target.checked)}
                            type="checkbox"
                          />
                          I confirm that I am above the age of 18.
                        </label>
                        {fieldErrors.consent_age ? <p className="text-xs text-[#ff6a5f]">{fieldErrors.consent_age}</p> : null}
                      </div>
                    </div>

                    <div className="space-y-3 md:self-start">
                      <StickerTag
                        bg="#facc15"
                        className="px-3 py-1.5 text-sm font-bold not-italic uppercase tracking-[0.08em]"
                        label="Gotta make sure it's really you, boss!"
                        rotate="rotate-[-1deg]"
                        text="#000000"
                      />

                      <div className="relative mx-auto w-full max-w-[342px] -rotate-1 bg-white px-4 pb-12 pt-4 shadow-[0px_10px_25px_-5px_rgba(0,0,0,0.30)] ring-1 ring-[#E2E8F0]">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#64748B]">Upload ID Document</p>
                        <button
                          className="relative mt-3 flex h-[305px] w-full items-center justify-center overflow-hidden bg-[#F1F5F9]"
                          disabled={!canEditActiveSlot || isUploadingDocument}
                          onClick={() => documentUploadInputRef.current?.click()}
                          type="button"
                        >
                          {documentPreview && uploadedDocumentKind !== "pdf" && !previewLoadError ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              alt="ID preview"
                              className="h-full w-full object-cover"
                              onError={() => setPreviewLoadError(true)}
                              onLoad={() => setPreviewLoadError(false)}
                              src={documentPreview}
                            />
                          ) : (
                            <div className="relative z-10 flex flex-col items-center">
                              <svg aria-hidden="true" className="h-[40px] w-[44px]" fill="none" viewBox="0 0 44 41" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4.48875 40.6222C3.38892 40.6414 2.44056 40.2662 1.64367 39.4967C0.846785 38.7271 0.438744 37.7924 0.419546 36.6926L0.000688568 12.6963C-0.0185091 11.5964 0.356664 10.6481 1.12621 9.85119C1.89575 9.0543 2.83044 8.64626 3.93027 8.62706L10.2293 8.51711L13.8589 4.45315L25.8571 4.24372L25.9269 8.24311L15.6785 8.422L12.0988 12.4851L4.00008 12.6265L4.41894 36.6228L36.4141 36.0643L36.0999 18.0671L40.0993 17.9973L40.4135 35.9945C40.4327 37.0944 40.0575 38.0427 39.2879 38.8396C38.5184 39.6365 37.5837 40.0445 36.4839 40.0637L4.48875 40.6222ZM35.9952 12.068L35.9254 8.06859L31.926 8.1384L31.8562 4.139L35.8556 4.0692L35.7858 0.0698032L39.7852 -6.4075e-06L39.855 3.99939L43.8544 3.92958L43.9242 7.92897L39.9248 7.99878L39.9946 11.9982L35.9952 12.068ZM20.3641 33.344C22.8638 33.3004 24.9732 32.3884 26.6924 30.6082C28.4116 28.8279 29.2493 26.6879 29.2057 24.1883C29.1621 21.6887 28.2501 19.5793 26.4698 17.8601C24.6896 16.1409 22.5496 15.3031 20.05 15.3468C17.5504 15.3904 15.441 16.3023 13.7218 18.0826C12.0026 19.8629 11.1648 22.0028 11.2084 24.5025C11.2521 27.0021 12.164 29.1115 13.9443 30.8307C15.7246 32.5499 17.8645 33.3877 20.3641 33.344ZM20.2943 29.3446C18.8946 29.3691 17.703 28.9065 16.7196 27.9568C15.7362 27.0072 15.2323 25.8324 15.2078 24.4327C15.1834 23.0329 15.646 21.8413 16.5957 20.8579C17.5453 19.8745 18.72 19.3706 20.1198 19.3462C21.5196 19.3217 22.7112 19.7843 23.6946 20.734C24.678 21.6836 25.1819 22.8583 25.2063 24.2581C25.2308 25.6579 24.7681 26.8495 23.8185 27.8329C22.8688 28.8163 21.6941 29.3202 20.2943 29.3446Z" fill="#94A3B8" />
                              </svg>
                              <p className="pt-2 text-xs font-bold leading-4 text-[#64748B]">CLICK TO SNAP</p>
                            </div>
                          )}

                          {uploadedDocumentKind === "pdf" ? (
                            <p className="absolute bottom-3 px-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
                              PDF uploaded. Preview unavailable.
                            </p>
                          ) : null}

                          {previewLoadError ? (
                            <p className="absolute bottom-3 px-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
                              Preview unavailable. Re-upload a clearer image.
                            </p>
                          ) : null}

                          {isRunningOcr ? (
                            <div className="pointer-events-none absolute inset-0 bg-black/35">
                              <div className="vh-scan-line absolute left-0 right-0 h-[2px] bg-[var(--vh-pink)] shadow-[0_0_12px_rgba(198,40,40,0.7)]" />
                            </div>
                          ) : null}
                        </button>
                        <div className="px-2 pt-4">
                          <div className="h-[9px] rounded-[12px] bg-[#F1F5F9]" />
                        </div>
                      </div>

                      <div className="mt-3 flex justify-center">
                        <Button
                          className="w-[80%] rounded-[10px] bg-[var(--vh-pink)] text-white hover:bg-[var(--vh-pink-soft)]"
                          disabled={!canEditActiveSlot || !editorState.document_file_key || isRunningOcr}
                          onClick={() => void handleRunOcr()}
                          type="button"
                        >
                          {isRunningOcr ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
                          {isRunningOcr ? "Scanning ID" : "Scan ID"}
                        </Button>
                      </div>

                      {uploadInlineMessage ? (
                        <p className="text-xs text-[#86efac]" role="status">{uploadInlineMessage}</p>
                      ) : null}

                      {documentUploadErrorMessage ? (
                        <p className="text-xs text-[#ff6a5f]" role="alert">{documentUploadErrorMessage}</p>
                      ) : null}
                    </div>
                  </div>
                </section>
              ) : null}

              {activeStep === 3 ? (
                <section>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[20px] font-bold leading-7 text-white">Final Details</h2>
                    <Clock3 className="h-5 w-5 text-[#99A1AF]" />
                  </div>

                  <div className="mt-5 grid gap-4">
                    <label className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#99A1AF]">Time of Arrival</span>
                      <Select onValueChange={(value) => setField("arrival_time", value)} value={editorState.arrival_time}>
                        <SelectTrigger className={fieldErrors.arrival_time ? "border-[#ff6a5f]" : ""}>
                          <SelectValue placeholder="Select arrival slot" />
                        </SelectTrigger>
                        <SelectContent>
                          {ARRIVAL_WINDOWS.map((windowLabel) => (
                            <SelectItem key={windowLabel} value={windowLabel}>{windowLabel}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldErrors.arrival_time ? <p className="text-xs text-[#ff6a5f]">{fieldErrors.arrival_time}</p> : null}
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#99A1AF]">Coming From</span>
                      <input
                        className={`h-12 w-full rounded-[10px] border bg-[#212121] px-4 text-sm text-white outline-none placeholder:text-[#6A7282] ${fieldErrors.coming_from ? "border-[#ff6a5f]" : "border-white/10 focus:border-[var(--vh-pink)]"}`}
                        onChange={(event) => setField("coming_from", event.target.value)}
                        placeholder="e.g. Delhi"
                        value={editorState.coming_from}
                      />
                      {fieldErrors.coming_from ? <p className="text-xs text-[#ff6a5f]">{fieldErrors.coming_from}</p> : null}
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#99A1AF]">Next Destination</span>
                      <input
                        className={`h-12 w-full rounded-[10px] border bg-[#212121] px-4 text-sm text-white outline-none placeholder:text-[#6A7282] ${fieldErrors.going_to ? "border-[#ff6a5f]" : "border-white/10 focus:border-[var(--vh-pink)]"}`}
                        onChange={(event) => setField("going_to", event.target.value)}
                        placeholder="e.g. Goa"
                        value={editorState.going_to}
                      />
                      {fieldErrors.going_to ? <p className="text-xs text-[#ff6a5f]">{fieldErrors.going_to}</p> : null}
                    </label>

                  </div>
                </section>
              ) : null}

              <div className="mt-8 flex items-center justify-between gap-3">
                <Button
                  className="rounded-[10px] border border-white/20 bg-transparent text-white hover:bg-white/10"
                  onClick={previousStep}
                  type="button"
                  variant="outline"
                >
                  Prev
                </Button>

                {activeStep < 3 ? (
                  <Button
                    className="rounded-[10px] bg-[var(--vh-pink)] text-white hover:bg-[var(--vh-pink-soft)] disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={!canAdvanceToNextStep}
                    onClick={nextStep}
                    type="button"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    className="rounded-[10px] bg-[var(--vh-pink)] text-white hover:bg-[var(--vh-pink-soft)]"
                    disabled={!canEditActiveSlot || isSubmitting}
                    onClick={() => void handleSubmit()}
                    type="button"
                  >
                    {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Finish Check-in
                  </Button>
                )}
              </div>

            </div>

          </div>
          </>
          )}
        </div>
      </div>

      <input
        ref={documentUploadInputRef}
        accept="application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={(event) => {
          void handleSelectedFile(event);
        }}
        type="file"
      />

      {showUploadPreviewModal ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-[448px] overflow-hidden rounded-[16px] border border-white/10 bg-[#1A1A1A] shadow-[0_25px_50px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-lg font-bold text-white">Crop Image</p>
              <button
                aria-label="Close image preview"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#99A1AF] hover:bg-white/10"
                onClick={dismissUploadPreview}
                type="button"
              >
                x
              </button>
            </div>

            <div className="p-4">
              <div className="relative h-[288px] overflow-hidden rounded-[10px] border border-[#4A5565] bg-[#1E2939]">
                <Cropper
                  aspect={4 / 3}
                  crop={cropPosition}
                  image={uploadPreviewDraft?.objectUrl || ""}
                  maxZoom={3}
                  minZoom={1}
                  objectFit="contain"
                  onCropChange={setCropPosition}
                  onCropComplete={(_, croppedAreaPixels) => setCropPixels(croppedAreaPixels)}
                  onZoomChange={setCropZoom}
                  showGrid
                  zoom={cropZoom}
                />
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.08em] text-[#99A1AF]">
                  <span>Zoom</span>
                  <span>{cropZoom.toFixed(1)}x</span>
                </div>
                <input
                  className="w-full accent-[var(--vh-pink)]"
                  max={3}
                  min={1}
                  onChange={(event) => setCropZoom(Number(event.target.value))}
                  step={0.1}
                  type="range"
                  value={cropZoom}
                />
              </div>

              <p className="mt-4 text-center text-sm text-[#99A1AF]">
                Make sure the details on the document are clearly visible.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button
                  className="rounded-[10px] border border-white/20 bg-transparent text-white hover:bg-white/10"
                  onClick={dismissUploadPreview}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button className="rounded-[10px] bg-[var(--vh-pink)] text-white hover:bg-[var(--vh-pink-soft)]" onClick={() => void applyUploadPreview()} type="button">
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isCompletionModalOpen ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[rgba(17,17,17,0.95)] px-4">
          <div className="w-full max-w-xl text-center">
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full border border-[rgba(0,201,80,0.2)] bg-[rgba(0,201,80,0.1)] shadow-[0_0_100px_rgba(34,197,94,0.2)]">
              <div className="flex h-[142px] w-[142px] items-center justify-center rounded-full border border-[rgba(0,201,80,0.3)]">
                <CheckCircle2 className="h-14 w-14 text-[#00C950]" />
              </div>
            </div>

            <p className="mt-8 text-3xl font-black leading-10 text-white md:text-[30px] md:leading-[36px]">
              Web Check-in to <br />
              <span className="text-[var(--vh-pink)]">{propertyName}</span>
            </p>
            <p className="mt-3 text-xl font-bold uppercase tracking-[0.1em] text-white">
              Done.
            </p>

            <div className="mt-8 flex justify-center">
              <Button
                className="h-14 rounded-full bg-white px-10 text-sm font-black uppercase tracking-[0.08em] text-black hover:bg-white/90"
                onClick={() => {
                  setIsCompletionModalOpen(false);
                  router.push(`/bookings/${encodeURIComponent(ezeeReservationId)}/confirmed`);
                }}
                type="button"
              >
                View Booking
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
