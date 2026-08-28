import { unique } from "./detect.js";

export function emptyDossier() {
  return {
    product: "",
    supplier: "",
    ufI: "",
    lot: "",
    cas: [],
    signalWord: "",
    pictograms: [],
    hPhrases: [],
    pPhrases: [],
    unNumber: "",
    packingGroup: "",
    adrClass: "",
    tunnelCode: "",
    marinePollutant: false,
    flashPoint: "",
    density: "",
    conforming: null,
    specs: [],
    analysisDate: "",
    quantity: "",
    lab: "",
    blNumber: "",
    carrier: "",
    cmr: "",
    packaging: "",
    netWeight: "",
    destination: "",
    manufacturer: "",
    equipment: "",
    type: "",
    serial: "",
    year: "",
    power: "",
    voltage: "",
    ip: "",
    atex: "",
    mass: "",
    sources: [],
  };
}

export function mergePatch(dossier, patch, source) {
  const next = structuredClone(dossier);
  const skip = new Set(["kind", "rawPreview"]);
  for (const [key, value] of Object.entries(patch)) {
    if (skip.has(key) || value == null || value === "") continue;
    if (Array.isArray(value)) {
      if (key === "hPhrases" || key === "pPhrases") {
        next[key] = mergePhrases(next[key], value);
      } else if (key === "specs") {
        next.specs = value.length ? value : next.specs;
      } else {
        next[key] = unique([...(next[key] || []), ...value]);
      }
      continue;
    }
    if (key === "marinePollutant") {
      next.marinePollutant = next.marinePollutant || Boolean(value);
      continue;
    }
    if (key === "conforming") {
      if (next.conforming == null) next.conforming = value;
      else next.conforming = next.conforming && value;
      continue;
    }
    if (!next[key]) next[key] = value;
  }
  next.sources = [
    ...next.sources.filter((s) => s.id !== source.id),
    {
      id: source.id,
      kind: patch.kind || source.kind,
      name: source.name,
      fields: countFields(patch),
    },
  ];
  return next;
}

export function dossierToJson(dossier) {
  const { sources, ...rest } = dossier;
  return {
    produit: rest.product || null,
    fournisseur: rest.supplier || null,
    ufi: rest.ufI || null,
    lot: rest.lot || null,
    cas: rest.cas,
    danger: {
      mention: rest.signalWord || null,
      pictogrammes: rest.pictograms,
      mentions_h: rest.hPhrases,
      conseils_p: rest.pPhrases,
      un: rest.unNumber || null,
      groupe_emballage: rest.packingGroup || null,
      classe_adr: rest.adrClass || null,
      tunnel: rest.tunnelCode || null,
      polluant_marin: rest.marinePollutant || null,
      point_eclair: rest.flashPoint || null,
    },
    qualite: {
      conforme: rest.conforming,
      date_analyse: rest.analysisDate || null,
      laboratoire: rest.lab || null,
      specifications: rest.specs,
    },
    logistique: {
      bl: rest.blNumber || null,
      transporteur: rest.carrier || null,
      cmr: rest.cmr || null,
      conditionnement: rest.packaging || null,
      quantite: rest.quantity || rest.netWeight || null,
      destination: rest.destination || null,
    },
    equipement: {
      constructeur: rest.manufacturer || null,
      designation: rest.equipment || null,
      type: rest.type || null,
      serie: rest.serial || null,
      annee: rest.year || null,
      puissance: rest.power || null,
      tension: rest.voltage || null,
      ip: rest.ip || null,
      atex: rest.atex || null,
      masse: rest.mass || null,
    },
    sources: sources.map(({ name, kind, fields }) => ({ name, kind, fields })),
  };
}

function mergePhrases(current, incoming) {
  const map = new Map();
  for (const item of [...current, ...incoming]) {
    if (!item?.code) continue;
    const prev = map.get(item.code);
    if (!prev || (item.text && item.text.length > (prev.text || "").length)) {
      map.set(item.code, item);
    }
  }
  return [...map.values()];
}

function countFields(patch) {
  let n = 0;
  for (const [k, v] of Object.entries(patch)) {
    if (k === "kind") continue;
    if (Array.isArray(v)) n += v.length ? 1 : 0;
    else if (typeof v === "boolean") n += 1;
    else if (v) n += 1;
  }
  return n;
}
