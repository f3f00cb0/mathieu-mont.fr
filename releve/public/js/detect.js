export function normalize(text) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

export function detectKind(text, fileKind = "pdf") {
  if (fileKind === "image") {
    return { kind: "nameplate", score: 0.55, scores: { nameplate: 0.55 } };
  }
  const t = normalize(text);
  const scores = { fds: 0, coa: 0, bl: 0, nameplate: 0 };

  if (/fiche\s+de\s+donn[ée]es\s+de\s+s[ée]curit/i.test(t)) scores.fds += 5;
  if (/\bREACH\b/.test(t) && /\bCLP\b/.test(t)) scores.fds += 2;
  if (/RUBRIQUE\s+2/i.test(t)) scores.fds += 2;
  if (/\bGHS0[1-9]\b/.test(t)) scores.fds += 2;
  if (/\bH2\d{2}\b/.test(t) && /\bP2\d{2}\b/.test(t)) scores.fds += 1;

  if (/certificat\s+d['’ ]analyse/i.test(t)) scores.coa += 5;
  if (/certificate\s+of\s+analysis/i.test(t)) scores.coa += 4;
  if (/\bCONFORME\b/.test(t) && /sp[ée]cification/i.test(t)) scores.coa += 2;
  if (/Karl\s+Fischer|APHA|GC-FID/i.test(t)) scores.coa += 2;

  if (/bon\s+de\s+livraison/i.test(t)) scores.bl += 5;
  if (/transporteur/i.test(t) && /\bADR\b/.test(t)) scores.bl += 2;
  if (/\bCMR\b/.test(t) || /lettre\s+de\s+voiture/i.test(t)) scores.bl += 2;
  if (/incoterm/i.test(t)) scores.bl += 1;

  if (/constructeur/i.test(t) && /n[°.\s]*s[eé]rie/i.test(t)) scores.nameplate += 4;
  if (/\bATEX\b/.test(t) && /\bEx\s+d/i.test(t)) scores.nameplate += 2;
  if (/\bIP\s*\d{2}\b/.test(t) && /\bkW\b/.test(t)) scores.nameplate += 1;

  let kind = "unknown";
  let score = 0;
  for (const [k, v] of Object.entries(scores)) {
    if (v > score) {
      kind = k;
      score = v;
    }
  }
  if (score < 2) kind = "unknown";
  return { kind, score, scores };
}

export function afterLabel(text, labels, { until = /$/m, flags = "i" } = {}) {
  const src = normalize(text);
  for (const label of labels) {
    const re = new RegExp(
      label + "\\s*[:：]\\s*(.+?)(?=" + (until.source || until) + ")",
      flags,
    );
    const m = src.match(re);
    if (m) return m[1].replace(/\s+/g, " ").trim();
  }
  return "";
}

export function unique(arr) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const key = String(item).toUpperCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function findCas(text) {
  const m = String(text).match(/\b(\d{2,7}-\d{2}-\d)\b/g) || [];
  return unique(m);
}

export function findUn(text) {
  const m = String(text).match(/\bUN\s*0*(\d{4})\b/i);
  return m ? m[1] : "";
}

export function findPackingGroup(text) {
  const m = String(text).match(
    /groupe\s+d['’ ]emballage\s*[:\s]+(I{1,3})\b|(?:packing\s+group|GE)\s*[:\s]+(I{1,3})\b/i,
  );
  if (m) return (m[1] || m[2] || "").toUpperCase();
  const loose = String(text).match(/\b(?:GE|PG)\s*[:\s]*(I{1,3})\b/i);
  return loose ? loose[1].toUpperCase() : "";
}

export function findCodes(text, prefix) {
  const src = String(text).toUpperCase().replace(/\s+/g, " ");
  const combo = prefix === "P"
    ? src.match(/\bP\d{3}(?:\s*\+\s*P\d{3})+/g) || []
    : src.match(/\bH\d{3}(?:\s*\+\s*H\d{3})+/g) || [];
  const combos = combo.map((s) => s.replace(/\s+/g, ""));
  const used = new Set();
  for (const c of combos) {
    for (const part of c.split("+")) used.add(part);
  }
  const singleRe = prefix === "P" ? /\bP\d{3}\b/g : /\bH\d{3}\b/g;
  const singles = (src.match(singleRe) || []).filter((c) => !used.has(c));
  const euh = prefix === "H" ? src.match(/\bEUH\d{3}\b/g) || [] : [];
  return unique([...combos, ...singles, ...euh]);
}
