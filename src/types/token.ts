import type { RecordKind, RecordOwner } from "./record";
import type { Role } from "./user";

export type TokenProgress =
  | "pending"
  | "ongoing"
  | "completed";

export interface Token {
  id: number;
  tokenNumber: number;

  customerName: string;
  mobileNo: string;
  software: string;
  kind: "support" | "lead";
  address?: string;
  contactPersonName?: string;
  gstNumber?: string;

  progress: TokenProgress;
  progressDisplay: string;
  notes: string;

  createdBy: RecordOwner;
  createdByRole: Role;

  createdAt: string;
  updatedAt: string;

  updatedBy: RecordOwner | null;
  completedAt: string | null;

  linkedRecord:
    | {
        kind: RecordKind;
        id: number;
      }
    | null;
}

/** What the "Generate Token" form collects. */
export interface NewToken {
  kind: "support" | "lead";
  customerName: string;
  mobileNo: string;
  software: string;
  progress: Exclude<
    TokenProgress,
    "completed"
  >;
  address?: string;
  contactPersonName?: string;
  gstNumber?: string;
}
