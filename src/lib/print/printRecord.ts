import { STATUS_BY_VALUE } from "@/config";
import type { ContentItem, TaggedRecord } from "@/types";
import { formatDateTime } from "../time";
import { formatSize } from "../files";

const esc = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const contentHtml = (items: ContentItem[], empty: string): string => {
  if (items.length === 0) return `<p class="muted">${esc(empty)}</p>`;

  return items
    .map((item, index) => {
      const text = item.text
        ? `<p class="entry-text">${index + 1}. ${esc(item.text)}</p>`
        : `<p class="muted">${index + 1}. (image only)</p>`;
      const images = item.images
        // Only data: URLs ever come from the app; refuse anything else.
        .filter((src) => src.startsWith("data:image/"))
        .map((src) => `<img src="${esc(src)}" alt="Screenshot" />`)
        .join("");

      return `<div class="entry">${text}${
        images ? `<div class="shots">${images}</div>` : ""
      }</div>`;
    })
    .join("");
};

const row = (label: string, value: string | null): string =>
  `<tr><th>${esc(label)}</th><td>${esc(value || "-")}</td></tr>`;

/** Self-contained, print-ready HTML for one record (A4, black on white). */
export const buildRecordHtml = (tagged: TaggedRecord): string => {
  const { record } = tagged;
  const title =
    tagged.kind === "support" ? "Support Record" : "Caller Record";

  const kindRows =
    tagged.kind === "support"
      ? [
          row("License", tagged.record.license),
          row("Company Support", tagged.record.companySupport ? "Required" : "Not required"),
        ]
      : [
          row("Product Offer", tagged.record.productOffer),
          row("Customer Type", tagged.record.customerType),
        ];

  const history = record.statusHistory
    .map(
      (h) =>
        `<li>${esc(STATUS_BY_VALUE[h.status].label)} - ${esc(
          formatDateTime(h.at)
        )} by ${esc(h.by.name)}</li>`
    )
    .join("");

  const attachments =
    record.attachments.length === 0
      ? `<p class="muted">No attachments.</p>`
      : `<ul>${record.attachments
          .map((a) => `<li>${esc(a.name)} (${esc(formatSize(a.size))})</li>`)
          .join("")}</ul>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(title)} #${record.id}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 12px; line-height: 1.5; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 14px; }
  h1 { font-size: 20px; margin: 0; }
  h2 { font-size: 13px; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid #bbb; padding-bottom: 3px; }
  .sub { color: #555; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #bbb; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { width: 22%; background: #f1f1f1; font-weight: 600; }
  .entry { border: 1px solid #ddd; border-radius: 4px; padding: 6px 8px; margin-bottom: 6px; page-break-inside: avoid; }
  .entry-text { margin: 0; white-space: pre-wrap; word-break: break-word; }
  .shots { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 6px; }
  .shots img { max-width: 260px; max-height: 190px; border: 1px solid #ccc; }
  .muted { color: #777; margin: 0; }
  ul { margin: 0; padding-left: 18px; }
  footer { margin-top: 22px; font-size: 10px; color: #777; border-top: 1px solid #ddd; padding-top: 6px; }
</style>
</head>
<body>
<header>
  <div><h1>${esc(title)} #${record.id}</h1><div class="sub">Customer Support Management System</div></div>
  <div class="sub">Status: <strong>${esc(STATUS_BY_VALUE[record.status].label)}</strong></div>
</header>

<table>
  ${row("Date", record.date)}
  ${row("Serial No.", record.serialNo)}
  ${row("Mobile No.", record.mobileNo)}
  ${row("Product", record.product)}
  ${kindRows.join("")}
  ${row("Start Time", record.startTime)}
  ${row("End Time", record.endTime)}
  ${row("Total Duration", record.duration)}
  ${row("Created By", record.createdBy.name)}
  ${row("Created At", formatDateTime(record.createdAt))}
</table>

<h2>Problems</h2>
${contentHtml(record.problems, "No problems recorded.")}

<h2>Solutions</h2>
${contentHtml(record.solutions, "No solutions recorded.")}

<h2>Attachments</h2>
${attachments}

${history ? `<h2>Status history</h2><ul>${history}</ul>` : ""}

<footer>Printed on ${esc(formatDateTime(new Date().toISOString()))}</footer>
</body>
</html>`;
};

/**
 * Prints one record (the browser's print dialog also offers "Save as PDF").
 * Uses a hidden iframe so popup blockers cannot get in the way.
 */
export const printRecord = (tagged: TaggedRecord): Promise<void> =>
  new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";

    const cleanup = () => {
      window.setTimeout(() => iframe.remove(), 1000);
      resolve();
    };

    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (!win) {
        cleanup();
        return;
      }

      const images = Array.from(win.document.images);
      const pending = images.filter((img) => !img.complete);

      const doPrint = () => {
        win.focus();
        win.print();
        cleanup();
      };

      if (pending.length === 0) {
        doPrint();
        return;
      }

      // Wait for screenshots to decode so they are not blank on paper.
      let left = pending.length;
      const done = () => {
        left -= 1;
        if (left <= 0) doPrint();
      };
      pending.forEach((img) => {
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });
    };

    iframe.srcdoc = buildRecordHtml(tagged);
    document.body.appendChild(iframe);
  });
