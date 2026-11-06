import { strToU8, zipSync } from "fflate";
import type { Cell } from "./csv";

// Minimal, dependency-light .xlsx writer: one sheet, bold coloured header,
// frozen header row, filter buttons and sensible column widths.

const escapeXml = (value: string): string =>
  value
    // Characters XML 1.0 does not allow would make Excel report a corrupt file.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** 0 -> A, 25 -> Z, 26 -> AA */
export const columnLetter = (index: number): string => {
  let n = index;
  let letters = "";
  do {
    letters = String.fromCharCode(65 + (n % 26)) + letters;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letters;
};

/** Excel sheet names: max 31 chars, none of []:*?/\ */
export const safeSheetName = (name: string): string =>
  name.replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31) || "Sheet1";

const cellXml = (cell: Cell, ref: string, style: number): string => {
  const s = style ? ` s="${style}"` : "";

  if (typeof cell === "number" && Number.isFinite(cell)) {
    return `<c r="${ref}"${s}><v>${cell}</v></c>`;
  }

  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapeXml(
    String(cell)
  )}</t></is></c>`;
};

const columnWidths = (headers: string[], rows: Cell[][]): number[] =>
  headers.map((header, col) => {
    const longest = rows.reduce((max, row) => {
      const text = String(row[col] ?? "");
      // Multi-line cells: width is driven by the longest line.
      const line = Math.max(...text.split("\n").map((l) => l.length));
      return Math.max(max, line);
    }, header.length);

    return Math.min(60, Math.max(10, longest + 2));
  });

export const buildXlsx = (
  sheetName: string,
  headers: string[],
  rows: Cell[][]
): Uint8Array => {
  const widths = columnWidths(headers, rows);
  const lastCol = columnLetter(Math.max(headers.length - 1, 0));
  const lastRow = rows.length + 1;

  const headerRow = `<row r="1">${headers
    .map((h, c) => cellXml(h, `${columnLetter(c)}1`, 1))
    .join("")}</row>`;

  const bodyRows = rows
    .map(
      (row, r) =>
        `<row r="${r + 2}">${headers
          .map((_, c) => cellXml(row[c] ?? "", `${columnLetter(c)}${r + 2}`, 0))
          .join("")}</row>`
    )
    .join("");

  const sheet =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<cols>${widths
      .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
      .join("")}</cols>` +
    `<sheetData>${headerRow}${bodyRows}</sheetData>` +
    `<autoFilter ref="A1:${lastCol}${lastRow}"/>` +
    `</worksheet>`;

  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
        `</Types>`
    ),
    "_rels/.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        `</Relationships>`
    ),
    "xl/workbook.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheets><sheet name="${escapeXml(safeSheetName(sheetName))}" sheetId="1" r:id="rId1"/></sheets>` +
        `</workbook>`
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        `</Relationships>`
    ),
    "xl/styles.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>` +
        `<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF4F46E5"/><bgColor indexed="64"/></patternFill></fill></fills>` +
        `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
        `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
        `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>` +
        `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
        `</styleSheet>`
    ),
    "xl/worksheets/sheet1.xml": strToU8(sheet),
  };

  return zipSync(files, { level: 6 });
};
