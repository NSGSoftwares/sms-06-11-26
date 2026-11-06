import { useEffect, useState } from "react";
import type { CallerRecord, SupportRecord } from "@/types";

export interface SerialCustomerDetails {
  serialNo: string;
  customerName: string;
  organizationName: string;
  mobileNo: string;
  product: string;
  license: SupportRecord["license"];
}

interface SerialCustomerSuggestionProps {
  serialNo: string;
  supportRecords: SupportRecord[];
  callerRecords: CallerRecord[];
  onApply: (details: SerialCustomerDetails) => void;
}

const SerialCustomerSuggestion = ({
  serialNo,
  supportRecords,
  callerRecords,
  onApply,
}: SerialCustomerSuggestionProps) => {
  const [selectedSerial, setSelectedSerial] = useState<string | null>(null);
  const serial = serialNo.trim();
  useEffect(() => {
    if (selectedSerial && serial !== selectedSerial) setSelectedSerial(null);
  }, [selectedSerial, serial]);

  if (!serial) return null;
  if (selectedSerial === serial) return null;

  const query = serial.replace(/\D/g, "");
  if (!query) return null;
  const matchingRecords = [...supportRecords, ...callerRecords]
    .filter((record) => {
      const recordSerial = record.serialNo.replace(/\D/g, "");
      return recordSerial.includes(query);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const recordsBySerial = new Map<string, typeof matchingRecords>();
  matchingRecords.forEach((record) => {
    const records = recordsBySerial.get(record.serialNo) ?? [];
    records.push(record);
    recordsBySerial.set(record.serialNo, records);
  });
  const suggestions = [...recordsBySerial.entries()].slice(0, 5).map(([matchedSerial, records]) => {
    const latestValue = (getValue: (record: typeof records[number]) => string) =>
      records.map(getValue).find((value) => value && value !== "-") ?? "";
    const products = [...new Set(records.flatMap((record) =>
      record.product.split(",").map((product) => product.trim()).filter((product) => product && product !== "-"),
    ))];
    const license = supportRecords
      .filter((record) => record.serialNo === matchedSerial)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((record) => record.license)
      .find((value) => value === "Valid" || value === "Invalid") ?? "";
    const details: SerialCustomerDetails = {
      serialNo: matchedSerial,
      customerName: latestValue((record) => record.customerName.trim()),
      organizationName: latestValue((record) => record.organizationName?.trim() ?? ""),
      mobileNo: latestValue((record) => record.mobileNo.trim()),
      product: products.join(", "),
      license,
    };
    const summary = [
      details.customerName,
      details.organizationName,
      details.mobileNo,
      details.product,
      details.license ? `License: ${details.license}` : "",
    ].filter(Boolean);
    return { details, summary };
  });
  if (!suggestions.length) return null;

  return (
    <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-line bg-surface p-2 shadow-[0_12px_36px_rgba(15,23,42,0.16)] ring-1 ring-black/5">
      <div className="flex items-center justify-between px-3 pb-2 pt-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Matching customers</p>
        <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-fg-subtle">
          {suggestions.length} {suggestions.length === 1 ? "match" : "matches"}
        </span>
      </div>
      <ul className="space-y-1">
        {suggestions.map(({ details, summary }) => (
          <li key={details.serialNo}>
            <button
              type="button"
              onClick={() => {
                onApply(details);
                setSelectedSerial(details.serialNo);
              }}
              className="group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 9h8M8 13h5" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-fg group-hover:text-brand">{details.serialNo}</span>
                {summary.length > 0 && (
                  <span className="mt-1 block truncate text-xs leading-5 text-fg-subtle">{summary.join(" · ")}</span>
                )}
              </span>
              <svg viewBox="0 0 20 20" fill="currentColor" className="mt-2 h-4 w-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden="true">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L10.94 10 7.23 6.29a.75.75 0 1 1 1.06-1.06l4.24 4.24a.75.75 0 0 1 0 1.06l-4.24 4.24a.75.75 0 0 1-1.08 0Z" clipRule="evenodd" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SerialCustomerSuggestion;
