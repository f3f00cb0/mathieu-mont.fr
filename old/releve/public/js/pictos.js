/** Pictogrammes GHS — losange rouge, symbole noir. Usage informatif (ONU SGH). */

const FRAME = `
  <polygon points="50,4 96,50 50,96 4,50" fill="#fff" stroke="#c8102e" stroke-width="5.5" stroke-linejoin="round"/>
`;

const SYMBOLS = {
  GHS01: `<g fill="#1a1a1a">
    <ellipse cx="50" cy="58" rx="16" ry="10"/>
    <path d="M34 50 l-10-22 12 8 4-16 6 16 10-10-2 18 14-6 z"/>
    <path d="M62 48 l18-8-8 12 16 2-16 6 10 14-14-6-2 16-8-14-14 10 z"/>
  </g>`,
  GHS02: `<g fill="none" stroke="#1a1a1a" stroke-width="3.2" stroke-linejoin="round">
    <path d="M42 78c8 4 22 2 28-10 4-8-2-16-10-14 8-10-2-22-14-18-6 2-10 10-8 16-10 2-12 14-4 22 4 4 12 6 8 4z" fill="#1a1a1a" stroke="none"/>
    <path d="M38 36c6 4 8 10 8 10M48 28c2 8 0 12 0 12M58 32c-4 8-6 12-6 12"/>
  </g>`,
  GHS03: `<g fill="#1a1a1a">
    <circle cx="50" cy="62" r="14" fill="none" stroke="#1a1a1a" stroke-width="3"/>
    <circle cx="50" cy="62" r="5"/>
    <path d="M50 22c8 10 6 18-2 22 8 0 12-8 14-16-2 12 6 16 10 14-8 8-16 6-22 2z"/>
  </g>`,
  GHS04: `<g fill="none" stroke="#1a1a1a" stroke-width="3.2" stroke-linejoin="round">
    <path d="M38 78 V36 c0-8 6-12 12-12h8c6 0 12 4 12 12v42"/>
    <path d="M38 48 h32M42 78 h24"/>
    <circle cx="50" cy="30" r="2.4" fill="#1a1a1a" stroke="none"/>
  </g>`,
  GHS05: `<g fill="#1a1a1a">
    <path d="M32 30h10l6 22-8 4 18 22H42l-6-16-8 8z"/>
    <rect x="58" y="28" width="18" height="26" rx="2"/>
    <path d="M56 54h22l-4 22H60z"/>
    <path d="M28 78h44" stroke="#1a1a1a" stroke-width="3"/>
  </g>`,
  GHS06: `<g fill="#1a1a1a">
    <circle cx="50" cy="42" r="16"/>
    <rect x="42" y="56" width="16" height="6" rx="1"/>
    <path d="M38 64h24l4 16H34z"/>
    <circle cx="44" cy="40" r="2.2" fill="#fff"/>
    <circle cx="56" cy="40" r="2.2" fill="#fff"/>
  </g>`,
  GHS07: `<g fill="#1a1a1a">
    <path d="M50 22l22 48H28z"/>
    <rect x="47.2" y="38" width="5.6" height="18" fill="#fff"/>
    <circle cx="50" cy="62" r="3.1" fill="#fff"/>
  </g>`,
  GHS08: `<g fill="#1a1a1a">
    <circle cx="50" cy="28" r="8"/>
    <path d="M34 78 V48 h8 l8 16 8-16 h8 v30 h-8 V58 l-8 12-8-12 v20z"/>
    <path d="M38 44c12 10 24 4 28-2" fill="none" stroke="#1a1a1a" stroke-width="2.4"/>
  </g>`,
  GHS09: `<g fill="#1a1a1a">
    <path d="M28 70c8 8 20 10 28 2 4 8 16 10 24-2-10 4-18-2-20-10 2 10-8 16-18 12 2-8-6-14-14-8z"/>
    <path d="M58 28c8 4 10 14 4 22h-8c-2-8 0-16 4-22z"/>
    <path d="M62 38h16M70 30v20" stroke="#1a1a1a" stroke-width="3"/>
  </g>`,
};

const LABELS = {
  GHS01: "Explosif",
  GHS02: "Inflammable",
  GHS03: "Comburant",
  GHS04: "Gaz sous pression",
  GHS05: "Corrosif",
  GHS06: "Toxique",
  GHS07: "Nocif / irritant",
  GHS08: "Danger pour la santé",
  GHS09: "Danger pour le milieu",
};

export function ghsLabel(code) {
  return LABELS[code] || code;
}

export function ghsSvg(code) {
  const symbol = SYMBOLS[code];
  if (!symbol) return "";
  return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">${FRAME}${symbol}</svg>`;
}

/** Approx. CLP : codes H → pictogrammes si la FDS ne les liste pas. */
export function pictosFromH(codes) {
  const set = new Set();
  for (const raw of codes) {
    const n = parseInt(String(raw).replace(/^[HEUH]+/i, ""), 10);
    if (Number.isNaN(n)) continue;
    if (n >= 200 && n <= 205) set.add("GHS01");
    else if ((n >= 220 && n <= 226) || n === 228 || n === 229 || n === 242 || n === 250 || n === 251 || n === 260 || n === 261) set.add("GHS02");
    else if (n >= 270 && n <= 272) set.add("GHS03");
    else if (n === 280 || n === 281) set.add("GHS04");
    else if (n === 290 || n === 314 || n === 318) set.add("GHS05");
    else if (n === 300 || n === 301 || n === 310 || n === 311 || n === 330 || n === 331) set.add("GHS06");
    else if (n === 302 || n === 312 || n === 315 || n === 317 || n === 319 || n === 332 || n === 335 || n === 336) set.add("GHS07");
    else if (n === 304 || (n >= 334 && n <= 373)) set.add("GHS08");
    else if (n >= 400 && n <= 413) set.add("GHS09");
  }
  return [...set];
}
