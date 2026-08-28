import { getDocument, GlobalWorkerOptions } from "../vendor/pdf.js";

GlobalWorkerOptions.workerSrc = new URL("../vendor/pdf.worker.min.js", import.meta.url).href;

export async function pdfToText(data) {
  const pdf = await getDocument({
    data,
    disableRange: true,
    disableStream: true,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(itemsToText(content.items));
  }
  return pages.join("\n\n");
}

function itemsToText(items) {
  const rows = [];
  const tol = 2.4;
  for (const item of items) {
    const str = (item.str || "").replace(/\s+/g, " ");
    if (!str.trim()) continue;
    const x = item.transform[4];
    const y = item.transform[5];
    let row = rows.find((r) => Math.abs(r.y - y) < tol);
    if (!row) {
      row = { y, parts: [] };
      rows.push(row);
    }
    row.parts.push({ x, str });
  }
  rows.sort((a, b) => b.y - a.y);
  return rows
    .map((row) => {
      row.parts.sort((a, b) => a.x - b.x);
      let line = "";
      let prev = null;
      for (const part of row.parts) {
        if (prev && part.x - prev.x > 1.5) line += " ";
        line += part.str;
        prev = { x: part.x + (part.str.length * 4) };
      }
      return line.replace(/\s+/g, " ").trim();
    })
    .filter(Boolean)
    .join("\n");
}
