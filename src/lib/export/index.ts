import { todayISO } from "../time";
import { toCsv } from "./csv";
import { downloadBlob } from "./download";
import type { ExportTable } from "./tables";
import { buildXlsx } from "./xlsx";

export type ExportFormat = "csv" | "xlsx";

export { toCsv } from "./csv";
export { buildXlsx } from "./xlsx";
export * from "./tables";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Downloads `table` as CSV (Excel-friendly, UTF-8 BOM) or a real .xlsx. */
export const exportTable = (
  format: ExportFormat,
  baseName: string,
  sheetName: string,
  table: ExportTable
): void => {
  const filename = `${baseName}-${todayISO()}.${format}`;

  if (format === "csv") {
    const text = `\uFEFF${toCsv(table.headers, table.rows)}`;
    downloadBlob(new Blob([text], { type: "text/csv;charset=utf-8" }), filename);
    return;
  }

  const bytes = buildXlsx(sheetName, table.headers, table.rows);
  downloadBlob(new Blob([bytes], { type: XLSX_MIME }), filename);
};
