import { detectKind, findCas, findCodes, findPackingGroup, findUn, normalize, unique } from "./detect.js";
import { phraseText } from "./phrases.js";
import { pictosFromH } from "./pictos.js";

export function parseFds(text) {
  const src = normalize(text);
  const product =
    matchLine(src, /nom\s+commercial\s*:\s*(.+)/i) ||
    firstAllCaps(src) ||
    "";
  const supplier = matchLine(src, /^(Gier Chimie SAS)\b/m) ||
    matchLine(src, /fournisseur[^\n]*\n([^\n]+)/i) ||
    "";
  const ufI = matchLine(src, /\bUFI\s*:\s*([A-Z0-9-]{12,})/i);
  const signalWord = (src.match(/mention\s+d['’]?avertissement\s*:\s*(DANGER|ATTENTION)/i) || [])[1] || "";
  const pictograms = unique([
    ...(src.match(/\bGHS0[1-9]\b/gi) || []).map((s) => s.toUpperCase()),
  ]);
  const hCodes = findCodes(src, "H");
  const pCodes = findCodes(src, "P");
  const hPhrases = hCodes.map((code) => ({ code, text: phraseText(code) || lineFor(src, code) }));
  const pPhrases = pCodes.map((code) => ({ code, text: phraseText(code) || lineFor(src, code) }));
  if (!pictograms.length) pictograms.push(...pictosFromH(hCodes));

  return {
    kind: "fds",
    product: product.replace(/\s+/g, " ").trim(),
    supplier: supplier.trim(),
    ufI,
    cas: findCas(src),
    signalWord: signalWord.toUpperCase(),
    pictograms: unique(pictograms),
    hPhrases,
    pPhrases,
    unNumber: findUn(src),
    packingGroup: findPackingGroup(src),
    adrClass: (src.match(/classe(?:\s+ADR)?\s*:\s*([0-9.]+)/i) || [])[1] || "",
    tunnelCode: (src.match(/code\s+tunnel\s*:\s*([A-E](?:\/[A-E])?)/i) || [])[1] || "",
    marinePollutant: /polluant\s+marin/i.test(src),
    flashPoint: (src.match(/point\s+d['’]?[ée]clair\s*:\s*([^\n]+)/i) || [])[1]?.trim() || "",
    density: (src.match(/masse\s+volumique\s*:\s*([^\n]+)/i) || [])[1]?.trim() || "",
  };
}

export function parseCoa(text) {
  const src = normalize(text);
  const specs = [];
  for (const line of src.split("\n")) {
    if (!/CONFORME|NON\s*CONFORME/i.test(line)) continue;
    if (/certificat d['’]?analyse|document fictif|cahier des charges/i.test(line)) continue;
    const status = /NON\s*CONFORME/i.test(line) ? "NON CONFORME" : "CONFORME";
    const name = line.replace(/\s{2,}/g, " ").replace(/\s+(CONFORME|NON CONFORME).*/i, "").trim();
    if (name.length > 4) specs.push({ raw: name, status });
  }
  const conforming = specs.length
    ? specs.every((s) => s.status === "CONFORME") && /est\s+CONFORME/i.test(src)
    : /est\s+CONFORME/i.test(src);

  return {
    kind: "coa",
    product: matchLine(src, /produit\s*:\s*(.+)/i),
    lot: matchLine(src, /n[°º]?\s*(?:de\s+)?lot\s*:\s*([A-Z0-9-]+)/i),
    cas: findCas(src),
    analysisDate: matchLine(src, /date\s+d['’]?analyse\s*:\s*([0-9/.-]+)/i),
    manufactured: matchLine(src, /date\s+de\s+fabrication\s*:\s*([0-9/.-]+)/i),
    quantity: matchLine(src, /quantit[ée]\s*:\s*(.+)/i),
    lab: matchLine(src, /laboratoire\s*:\s*(.+)/i),
    method: matchLine(src, /m[ée]thode\s+de\s+r[ée]f[ée]rence[^\n]*:\s*(.+)/i),
    conforming,
    specs,
  };
}

export function parseBl(text) {
  const src = normalize(text);
  return {
    kind: "bl",
    blNumber: matchLine(src, /bon\s+de\s+livraison\s+n[°º]?\s*([A-Z0-9-]+)/i),
    date: matchLine(src, /date\s+d['’]?exp[ée]dition\s*:\s*([0-9/.-]+)/i),
    product: matchLine(src, /produit\s*:\s*(.+)/i),
    lot: matchLine(src, /n[°º]?\s*(?:de\s+)?lot\s*:\s*([A-Z0-9-]+)/i),
    cas: findCas(src),
    carrier: matchLine(src, /transporteur\s*:\s*([^]+?)(?:lettre|$)/i).split("  ")[0].trim(),
    cmr: matchLine(src, /lettre\s+de\s+voiture\s*:\s*([A-Z0-9-]+)/i),
    plate: matchLine(src, /immatriculation\s*:\s*([A-Z0-9-]+)/i),
    packaging: matchLine(src, /conditionnement\s*:\s*(.+)/i),
    netWeight: matchLine(src, /quantit[ée]\s+nette\s*:\s*([^]+?)(?:poids|$)/i),
    grossWeight: matchLine(src, /poids\s+brut\s*:\s*(.+)/i),
    destination: matchLine(src, /destinataire[\s\S]{0,40}\n([^\n]+)/i),
    unNumber: findUn(src),
    packingGroup: findPackingGroup(src),
    adrClass: matchLine(src, /classe\s+ADR\s*:\s*([0-9.]+)/i),
    tunnelCode: matchLine(src, /code\s+tunnel\s*:\s*([A-E](?:\/[A-E])?)/i),
    marinePollutant: /polluant\s+marin\s*:\s*oui/i.test(src),
    conforming: /CONFORME/i.test(src),
  };
}

export function parseNameplate(text) {
  const src = normalize(text).replace(/[|]/g, " ");
  const type = firstMatch(src, [
    /\bTYPE\s*[:.\s]+([A-Z0-9][A-Z0-9./-]{2,})/i,
    /\bLS-\d{2,4}[A-Z]?(?:-\d)?\b/,
  ]);
  const serial = firstMatch(src, [
    /\bN\.?\s*SERIE\s*[:.\s]+([A-Z0-9][A-Z0-9./-]{4,})/i,
    /\bN[°o]?\s*S[EÉ]RIE\s*[:.\s]+([A-Z0-9][A-Z0-9./-]{4,})/i,
    /\bS\/N\s*[:.\s]+([A-Z0-9.-]{4,})/i,
    /\b20\d{2}-[A-Z]{2,5}-\d+\b/,
  ]);
  const atex = firstMatch(src, [
    /\bII\s*2\s*G\s*Ex\s+[A-Za-z]+\s+IIC\s+T\d\s+Gb\b/i,
    /\bEx\s+d[b]?e?\s+IIC\s+T\d\b/i,
  ]);
  return {
    kind: "nameplate",
    manufacturer: firstMatch(src, [
      /CONSTRUCTEUR\s*[:.\s]+([A-Z][A-Z0-9 .&-]{2,})/i,
      /\bLSM\s+INDUSTRIE\b/i,
    ]),
    equipment: firstMatch(src, [/MOTEUR[^\n]{0,40}/i, /POMPE[^\n]{0,40}/i]) || "",
    type,
    serial,
    year: firstMatch(src, [/\bANN[EÉ]E\s*[:.\s]+(20\d{2})\b/i, /\b(20[12]\d)\b/]),
    standard: firstMatch(src, [/\bNORME\s*[:.\s]+(IEC\s*[\d-]+)/i, /\bIEC\s*[\d-]+\b/i]),
    power: firstMatch(src, [/\bPUISSANCE\s*[:.\s]+([\d,.]+\s*kW)/i, /\b([\d,.]+\s*kW)\b/i]),
    voltage: firstMatch(src, [/\bTENSION\s*[:.\s]+([\d]+\s*V)/i, /\b(\d{3,4}\s*V)\b/i]),
    frequency: firstMatch(src, [/\bFR[EÉ]QUENCE\s*[:.\s]+([\d]+\s*Hz)/i, /\b(50\s*Hz)\b/i]),
    speed: firstMatch(src, [/\bVITESSE\s*[:.\s]+([\d]+\s*min-?1)/i, /\b(\d{3,5}\s*min-?1)\b/i]),
    ip: firstMatch(src, [/\bINDICE\s*IP\s*[:.\s]+(IP\s*\d{2})/i, /\bIP\s*\d{2}\b/i]),
    atex: atex ? atex.replace(/\s+/g, " ").trim() : "",
    certificate: firstMatch(src, [/\bCERTIFICAT\s+([A-Z0-9][A-Z0-9 /-]{6,})/i]),
    mass: firstMatch(src, [/\bMASSE\s*[:.\s]*([\d.,]+\s*kg)/i, /\b([\d.,]+\s*kg)\b/i]),
  };
}

export function parseByKind(kind, text) {
  if (kind === "fds") return parseFds(text);
  if (kind === "coa") return parseCoa(text);
  if (kind === "bl") return parseBl(text);
  if (kind === "nameplate") return parseNameplate(text);
  const guessed = detectKind(text).kind;
  if (guessed !== "unknown") return parseByKind(guessed, text);
  return { kind: "unknown", rawPreview: text.slice(0, 400) };
}

function matchLine(text, re) {
  const m = text.match(re);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

function lineFor(text, code) {
  const re = new RegExp("^.*\\b" + code.replace(/\+/g, "\\+") + "\\b.*$", "im");
  const m = text.match(re);
  if (!m) return "";
  return m[0].replace(new RegExp("^\\s*" + code.replace(/\+/g, "\\s*\\+\\s*") + "\\s*", "i"), "").trim();
}

function firstAllCaps(text, skip = []) {
  for (const line of text.split("\n")) {
    const s = line.trim();
    if (s.length < 3 || s.length > 48) continue;
    if (!/^[A-Z0-9][A-Z0-9 _.-]+$/.test(s)) continue;
    if (skip.some((k) => s.includes(k))) continue;
    if (/^(GIER|RUBRIQUE|DANGER|ADR|IMDG|IATA)/.test(s)) continue;
    return s;
  }
  return "";
}

function firstMatch(text, regexes) {
  for (const re of regexes) {
    const m = text.match(re);
    if (m) return (m[1] || m[0]).replace(/\s+/g, " ").trim();
  }
  return "";
}
