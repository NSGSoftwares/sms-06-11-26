// src/types/records.ts
// -----------------------------------------------------------------------------
// Record types shared by Support and Caller features.
// -----------------------------------------------------------------------------

export interface ContentItem {
  id: string;
  text: string;
  images: string[];
}

export interface AttachmentFile {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  context?: "record" | "problem" | "solution";
}

/**
 * Database user IDs are UUID strings.
 *
 * IMPORTANT:
 * Do not use number here.
 */
export interface RecordOwner {
  id: string;
  name: string;
}

export type RecordStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "not_resolved"
  | "self_resolved"
  | "positive"
  | "negative"
  | "win"
  | "lost"
  | "not_interested"
  | "transferred";

export interface StatusChange {
  status: RecordStatus;
  at: string;
  by: RecordOwner;
  reason?: string;
}

export type RecordKind = "support" | "caller";

/**
 * Common fields shared by Support and Caller records.
 *
 * serialNo and mobileNo remain strings intentionally.
 * This prevents JavaScript precision problems.
 *
 * customerName is a real database field and must never be
 * stored inside serialNo.
 */
export interface BaseRecord {
  /**
   * Database record UUID.
   */
  id: string;

  date: string;
  dateISO: string;

  /**
   * Numeric database values are represented as strings
   * in the frontend.
   */
  serialNo: string;
  mobileNo: string;

  /**
   * Actual customer / organization name.
   */
  customerName: string;

  /** Optional business / organization associated with the customer. */
  organizationName?: string;

  product: string;

  startTime: string | null;
  endTime: string | null;

  duration: string;
  durationSeconds: number;

  problems: ContentItem[];
  solutions: ContentItem[];

  attachments: AttachmentFile[];

  createdBy: RecordOwner;
  createdAt: string;

  updatedAt: string;
  updatedBy: RecordOwner | null;

  status: RecordStatus;
  statusHistory: StatusChange[];
}

/**
 * Support record.
 */
export interface SupportRecord extends BaseRecord {
  recordType?: "support";
  feedbackCompleted?: boolean;
  assistedById?: string | null;
  assistedByName?: string;

  address?: string;
  contactPersonName?: string;
  gstNumber?: string;

  license: "Valid" | "Invalid" | "";

  companySupport: boolean;

  customerType?: string;

  offer?: string;

  issueSubject?: string;
  issueDescription?: string;
  resolution?: string;
  remarks?: string;
}

/**
 * Caller reference mode.
 */
export type CallerReferenceType =
  | "serial"
  | "customer_org";

/**
 * Caller record.
 */
export interface CallerRecord extends BaseRecord {
  recordType?: "caller";

  alternativeMobileNo?: string;
  productOffer: string;
  customerType: string;

  callerReferenceType: CallerReferenceType;
  callerReferenceValue: string;

  source: string;

  callType?: string;
  callerMode?: "feedback" | "new_lead";
  sourceSupportId?: string | null;
  address?: string;
  contactPersonName?: string;
  gstNumber?: string;
  lostReason?: string;
  remarks?: string;

  rating?: number | null;
}

export type AnyRecord =
  | SupportRecord
  | CallerRecord;

export type TaggedRecord =
  | {
      kind: "support";
      record: SupportRecord;
    }
  | {
      kind: "caller";
      record: CallerRecord;
    };

/* -------------------------------------------------------------------------- */
/* Store-managed fields                                                       */
/* -------------------------------------------------------------------------- */

type StoreManaged =
  | "id"
  | "createdBy"
  | "createdAt"
  | "updatedAt"
  | "updatedBy"
  | "statusHistory";

export type NewSupportRecord =
  Omit<SupportRecord, StoreManaged>;

export type NewCallerRecord =
  Omit<CallerRecord, StoreManaged>;

/* -------------------------------------------------------------------------- */
/* Locked fields                                                              */
/* -------------------------------------------------------------------------- */

type Locked =
  | StoreManaged
  | "date"
  | "dateISO"
  | "startTime"
  | "endTime"
  | "duration"
  | "durationSeconds";

export type SupportRecordPatch =
  Partial<Omit<SupportRecord, Locked>>;

export type CallerRecordPatch =
  Partial<Omit<CallerRecord, Locked>>;
