import { STATUS_BY_VALUE } from "@/config";
import type { CallerRecord, ContentItem, SupportRecord } from "@/types";
import { formatDuration } from "../time";
import type { StaffRow } from "../stats";
import type { Cell } from "./csv";

export interface ExportTable {
  headers: string[];
  rows: Cell[][];
}

/** "1. text [2 screenshots]" lines - screenshots cannot go in a spreadsheet. */
export const contentToText = (items: ContentItem[]): string =>
  items
    .map((item, index) => {
      const shots =
        item.images.length > 0
          ? ` [${item.images.length} screenshot${item.images.length > 1 ? "s" : ""}]`
          : "";
      return `${index + 1}. ${item.text || "(image only)"}${shots}`;
    })
    .join("\n");

const minutes = (seconds: number): number =>
  Math.round((seconds / 60) * 100) / 100;

export const supportRecordsTable = (
  records: SupportRecord[],
  includeCreator: boolean
): ExportTable => ({
  headers: [
    "Record ID",
    "Date",
    "Serial No.",
    "Customer Name",
    "Organization Name",
    "Mobile No.",
    "Product",
    "License",
    "Status",
    "Start Time",
    "End Time",
    "Total Duration",
    "Duration (minutes)",
    "Company Support",
    "Transfer to",
    "Problems",
    "Solutions",
    "Note",
    "Attachments",
    ...(includeCreator ? ["Created By"] : []),
  ],
  rows: records.map((r) => [
    r.id,
    r.date,
    r.serialNo,
    r.customerName,
    r.organizationName ?? "",
    r.mobileNo,
    r.product,
    r.license,
    STATUS_BY_VALUE[r.status].label,
    r.startTime ?? "-",
    r.endTime ?? "-",
    r.duration,
    minutes(r.durationSeconds),
    r.companySupport ? "Yes" : "No",
    r.assistedByName ?? "",
    contentToText(r.problems),
    contentToText(r.solutions),
    r.remarks ?? "",
    r.attachments.map((a) => a.name).join(", "),
    ...(includeCreator ? [r.createdBy.name] : []),
  ]),
});

export const callerRecordsTable = (
  records: CallerRecord[],
  includeCreator: boolean
): ExportTable => ({
  headers: [
    "Record ID",
    "Date",
    "Serial No.",
    "Customer Name",
    "Organization Name",
    "Mobile No.",
    "Product",
    "Product Offer",
    "Customer Type",
    "Form Type",
    "Source",
    "Status",
    "Start Time",
    "End Time",
    "Total Duration",
    "Duration (minutes)",
    "Contact Person",
    "Address",
    "GST No.",
    "Rating",
    "Note",
    "Lost Reason",
    "Attachments",
    ...(includeCreator ? ["Created By"] : []),
  ],
  rows: records.map((r) => [
    r.id,
    r.date,
    r.serialNo,
    r.customerName,
    r.organizationName ?? "",
    r.mobileNo,
    r.product,
    r.productOffer,
    r.customerType,
    r.callerMode === "new_lead" ? "New Lead" : "Feedback",
    r.source,
    STATUS_BY_VALUE[r.status].label,
    r.startTime ?? "-",
    r.endTime ?? "-",
    r.duration,
    minutes(r.durationSeconds),
    r.contactPersonName ?? "",
    r.address ?? "",
    r.gstNumber ?? "",
    r.rating ?? "",
    r.remarks ?? "",
    r.lostReason ?? "",
    r.attachments.map((a) => a.name).join(", "),
    ...(includeCreator ? [r.createdBy.name] : []),
  ]),
});

export const staffReportTable = (rows: StaffRow[]): ExportTable => ({
  headers: [
    "Staff",
    "Support Records",
    "Caller Records",
    "Total Records",
    "Resolved / Self Resolved",
    "Open / In Progress",
    "Invalid Licenses",
    "Company Support Required",
    "Total Time",
    "Total Time (minutes)",
    "Average Time",
  ],
  rows: rows.map((r) => [
    r.staffName,
    r.support,
    r.caller,
    r.total,
    r.resolved,
    r.pending,
    r.invalidLicense,
    r.companySupport,
    r.totalSeconds > 0 ? formatDuration(r.totalSeconds) : "-",
    minutes(r.totalSeconds),
    r.avgSeconds > 0 ? formatDuration(r.avgSeconds) : "-",
  ]),
});
