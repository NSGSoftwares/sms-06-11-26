import * as XLSX from "xlsx";
import { sanitizeMobileInput, validateMobileInput } from "@/lib/validation";

export const CUSTOMER_COLUMNS = [
  "serial_no",
  "customer_name",
  "mobile_no",
  "product",
] as const;

const REQUIRED_COLUMNS = ["serial_no", "customer_name", "mobile_no"] as const;

export const MAX_IMPORT_ROWS = 20000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export interface CustomerImportRow {
  serial_no: string;
  customer_name: string;
  mobile_no: string;
  product: string;
}

export interface RowError {
  row: number; // spreadsheet row number (header = row 1)
  message: string;
}

export interface ParsedImport {
  rows: CustomerImportRow[];
  errors: RowError[];
  totalRows: number;
  headerError?: string;
}

const SAMPLE_ROWS: string[][] = [
  ["1001", "Sample Customer One", "9876543210", "Tally"],
  ["1002", "Sample Customer Two", "9123456780", ""],
];

const INSTRUCTIONS: string[][] = [
  ["Column", "Required", "Rules"],
  ["serial_no", "Yes", "Digits only. Must be unique in the file."],
  ["customer_name", "Yes", "Customer / organization name."],
  ["mobile_no", "Yes", "10-digit Indian number, or + and country code."],
  ["product", "No", "Product name, e.g. as listed in Settings."],
  ["", "", "Do not rename or remove the header row. Delete the sample rows before importing."],
];

const saveBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const downloadSample = (format: "xlsx" | "csv") => {
  const aoa = [Array.from(CUSTOMER_COLUMNS) as string[], ...SAMPLE_ROWS];

  if (format === "csv") {
    const csv = aoa
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    saveBlob(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
      "customer-import-sample.csv",
    );
    return;
  }

  const wb = XLSX.utils.book_new();
  const data = XLSX.utils.aoa_to_sheet(aoa);
  data["!cols"] = [{ wch: 14 }, { wch: 30 }, { wch: 18 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, data, "Customers");
  const help = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);
  help["!cols"] = [{ wch: 16 }, { wch: 10 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, help, "Instructions");
  XLSX.writeFile(wb, "customer-import-sample.xlsx");
};

const cellText = (value: unknown) => String(value ?? "").trim();

export const parseCustomerFile = async (file: File): Promise<ParsedImport> => {
  const empty: ParsedImport = { rows: [], errors: [], totalRows: 0 };

  if (file.size > MAX_IMPORT_BYTES) {
    return { ...empty, headerError: "File is larger than 5 MB." };
  }

  const isCsv = /\.csv$/i.test(file.name);
  if (!isCsv && !/\.(xlsx|xls)$/i.test(file.name)) {
    return { ...empty, headerError: "Upload a .xlsx, .xls or .csv file." };
  }

  let table: unknown[][];
  try {
    // CSV is read as plain text so serials/mobiles keep leading zeros.
    const wb = isCsv
      ? XLSX.read(await file.text(), { type: "string", raw: true })
      : XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    table = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: isCsv,
      defval: "",
    });
  } catch {
    return { ...empty, headerError: "Could not read this file. Is it a valid spreadsheet?" };
  }

  if (table.length === 0) {
    return { ...empty, headerError: "The file is empty." };
  }

  const header = table[0].map((h) => cellText(h).toLowerCase());
  const known = CUSTOMER_COLUMNS as readonly string[];
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  const unknown = header.filter((h) => h && !known.includes(h));

  if (missing.length || unknown.length) {
    const parts = [];
    if (missing.length) parts.push(`missing column(s): ${missing.join(", ")}`);
    if (unknown.length) parts.push(`unknown column(s): ${unknown.join(", ")}`);
    return {
      ...empty,
      headerError: `Header does not match the sample sheet (${parts.join("; ")}). Download the sample and use its headers.`,
    };
  }

  const index = (name: string) => header.indexOf(name);
  const body = table.slice(1);

  if (body.length > MAX_IMPORT_ROWS) {
    return { ...empty, headerError: `Too many rows. The limit is ${MAX_IMPORT_ROWS}.` };
  }

  const rows: CustomerImportRow[] = [];
  const errors: RowError[] = [];
  const seen = new Map<string, number>();
  let totalRows = 0;

  body.forEach((line, i) => {
    const rowNumber = i + 2;
    const get = (name: string) => {
      const col = index(name);
      return col === -1 ? "" : cellText(line[col]);
    };

    const serial = get("serial_no");
    const name = get("customer_name");
    const mobileRaw = get("mobile_no");
    const product = get("product");

    if (!serial && !name && !mobileRaw && !product) return; // blank row
    totalRows += 1;

    const problems: string[] = [];

    if (!serial) problems.push("serial_no is required");
    else if (!/^\d+$/.test(serial)) problems.push("serial_no must contain digits only");
    else if (seen.has(serial)) problems.push(`duplicate serial_no (also in row ${seen.get(serial)})`);

    if (!name) problems.push("customer_name is required");

    const mobile = sanitizeMobileInput(mobileRaw);
    if (!mobileRaw) problems.push("mobile_no is required");
    else if (validateMobileInput(mobile)) problems.push("mobile_no is not valid");

    if (problems.length) {
      errors.push({ row: rowNumber, message: problems.join("; ") });
      return;
    }

    seen.set(serial, rowNumber);
    rows.push({ serial_no: serial, customer_name: name, mobile_no: mobile, product });
  });

  if (totalRows === 0) {
    return { ...empty, headerError: "The file has a header but no data rows." };
  }

  return { rows, errors, totalRows };
};