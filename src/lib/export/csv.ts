export type Cell = string | number;

/**
 * Spreadsheet programs run text that starts with = + - or @ as a formula.
 * Prefixing a quote keeps user-typed text (e.g. a problem description) inert.
 */
const defuse = (value: string): string =>
  /^[=+\-@\t\r]/.test(value) && value !== "-" ? `'${value}` : value;

const escapeCell = (cell: Cell): string => {
  if (typeof cell === "number") return String(cell);

  const text = defuse(cell);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Builds CSV text (CRLF line endings, as spreadsheet apps expect). */
export const toCsv = (headers: string[], rows: Cell[][]): string =>
  [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
