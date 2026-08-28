import { detectKind } from "./js/detect.js";
import { parseByKind } from "./js/parse.js";
import { emptyDossier, mergePatch, dossierToJson } from "./js/dossier.js";
import { ghsLabel, ghsSvg } from "./js/pictos.js";

const SAMPLES = {
  fds: { name: "FDS Estera-42.pdf", url: "./samples/fds-estera-42.pdf", fileKind: "pdf" },
  coa: { name: "COA L26-0847.pdf", url: "./samples/coa-estera-42.pdf", fileKind: "pdf" },
  bl: { name: "BL-26-4418.pdf", url: "./samples/bl-estera-42.pdf", fileKind: "pdf" },
  plate: { name: "plaque-ls-180m.jpg", url: "./samples/plaque-ls-180m.jpg", fileKind: "image" },
};

const KIND_LABEL = {
  fds: "FDS",
  coa: "COA",
  bl: "BL",
  nameplate: "Plaque",
  unknown: "Inconnu",
};

const $ = (sel) => document.querySelector(sel);

const ui = {
  status: $("#status"),
  steps: $("#steps"),
  pipeline: $("#pipeline"),
  product: $("#product"),
  identity: $("#identity-meta"),
  badges: $("#badges"),
  pictos: $("#pictos"),
  danger: $("#danger-dl"),
  h: $("#h-phrases"),
  p: $("#p-phrases"),
  quality: $("#quality-dl"),
  specs: $("#specs"),
  logistics: $("#logistics-dl"),
  equipment: $("#equipment-dl"),
  json: $("#json"),
  drop: $("#drop"),
  file: $("#file"),
  camera: $("#camera"),
  video: $("#cam-video"),
};

let dossier = emptyDossier();
let camStream = null;
let busy = false;

function setStatus(msg) {
  ui.status.hidden = !msg;
  ui.status.textContent = msg || "";
}

function setBusy(on) {
  busy = on;
  document.querySelectorAll(".chip").forEach((btn) => {
    if (btn.dataset.copy != null) return;
    btn.classList.toggle("is-busy", on);
  });
}

function render() {
  const d = dossier;
  ui.product.textContent = d.product || d.manufacturer || "—";
  const bits = [d.supplier, d.lot && `lot ${d.lot}`, d.cas[0] && `CAS ${d.cas[0]}`].filter(Boolean);
  ui.identity.textContent = bits.length ? bits.join(" · ") : "En attente d’un document.";

  ui.badges.replaceChildren();
  if (d.signalWord) addBadge(d.signalWord, "danger");
  if (d.conforming === true) addBadge("Conforme");
  if (d.conforming === false) addBadge("Non conforme", "danger");
  if (d.unNumber) addBadge(`UN ${d.unNumber}`);
  if (d.packingGroup) addBadge(`GE ${d.packingGroup}`);
  if (d.atex) addBadge("ATEX");

  ui.pictos.hidden = d.pictograms.length === 0;
  ui.pictos.replaceChildren();
  for (const code of d.pictograms) {
    const fig = document.createElement("figure");
    fig.className = "picto";
    fig.innerHTML = ghsSvg(code);
    const cap = document.createElement("span");
    cap.textContent = ghsLabel(code);
    fig.append(cap);
    ui.pictos.append(fig);
  }

  fillDl(ui.danger, [
    ["Mention", d.signalWord],
    ["UN", d.unNumber && `UN ${d.unNumber}`],
    ["Emballage", d.packingGroup],
    ["Classe ADR", d.adrClass],
    ["Tunnel", d.tunnelCode],
    ["Éclair", d.flashPoint],
    ["Masse vol.", d.density],
    ["Marin", d.marinePollutant ? "polluant marin" : ""],
    ["UFI", d.ufI],
  ]);
  fillPhrases(ui.h, d.hPhrases);
  fillPhrases(ui.p, d.pPhrases, true);

  fillDl(ui.quality, [
    ["Lot", d.lot],
    ["Analyse", d.analysisDate],
    ["Labo", d.lab],
    ["Quantité", d.quantity],
    ["CAS", d.cas.join(", ")],
  ]);
  const body = ui.specs.querySelector("tbody");
  body.replaceChildren();
  ui.specs.hidden = d.specs.length === 0;
  for (const spec of d.specs) {
    const tr = document.createElement("tr");
    const a = document.createElement("td");
    a.textContent = spec.raw;
    const b = document.createElement("td");
    b.textContent = spec.status;
    tr.append(a, b);
    body.append(tr);
  }

  fillDl(ui.logistics, [
    ["BL", d.blNumber],
    ["Transporteur", d.carrier],
    ["CMR", d.cmr],
    ["Colis", d.packaging],
    ["Net", d.netWeight],
    ["Destination", d.destination],
  ]);

  fillDl(ui.equipment, [
    ["Constructeur", d.manufacturer],
    ["Désignation", d.equipment],
    ["Type", d.type],
    ["Série", d.serial],
    ["Année", d.year],
    ["Puissance", d.power],
    ["Tension", d.voltage],
    ["IP", d.ip],
    ["ATEX", d.atex],
    ["Masse", d.mass],
  ]);

  ui.pipeline.hidden = d.sources.length === 0;
  ui.steps.replaceChildren();
  for (const src of d.sources) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="kind">${KIND_LABEL[src.kind] || src.kind}</span><span>${escapeHtml(src.name)}</span><span class="fields">${src.fields} champs</span>`;
    ui.steps.append(li);
  }

  ui.json.textContent = JSON.stringify(dossierToJson(d), null, 2);
}

function addBadge(text, extra) {
  const el = document.createElement("span");
  el.className = extra ? `badge ${extra}` : "badge";
  el.textContent = text;
  ui.badges.append(el);
}

function fillDl(root, rows) {
  root.replaceChildren();
  for (const [dt, dd] of rows) {
    const term = document.createElement("dt");
    term.textContent = dt;
    const def = document.createElement("dd");
    def.textContent = dd || "—";
    if (!dd) def.className = "empty";
    root.append(term, def);
  }
}

function fillPhrases(root, items, quiet = false) {
  root.replaceChildren();
  root.classList.toggle("quiet", quiet);
  for (const item of items) {
    const li = document.createElement("li");
    const code = document.createElement("code");
    code.textContent = item.code;
    li.append(code, document.createTextNode(item.text || ""));
    root.append(li);
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function ingest({ name, fileKind, buffer, blob, url }) {
  setStatus(fileKind === "image" ? "OCR de la plaque…" : `Lecture de ${name}…`);
  let text = "";
  if (fileKind === "pdf") {
    const { pdfToText } = await import("./js/pdf-text.js");
    text = await pdfToText(buffer);
  } else {
    const { ocrImage } = await import("./js/ocr.js");
    text = await ocrImage(blob || url);
  }
  if (!text.trim()) throw new Error("Aucun texte lisible.");
  const detected = detectKind(text, fileKind);
  const kind = fileKind === "image" ? "nameplate" : detected.kind;
  const patch = parseByKind(kind === "unknown" ? detected.kind : kind, text);
  const id = `${patch.kind}-${name}`;
  dossier = mergePatch(dossier, patch, { id, kind: patch.kind, name });
  render();
  setStatus("");
}

async function ingestSample(key) {
  const sample = SAMPLES[key];
  const res = await fetch(sample.url);
  if (!res.ok) throw new Error("Exemple introuvable.");
  if (sample.fileKind === "pdf") {
    const buffer = new Uint8Array(await res.arrayBuffer());
    await ingest({ name: sample.name, fileKind: "pdf", buffer });
  } else {
    const blob = await res.blob();
    await ingest({ name: sample.name, fileKind: "image", blob });
  }
}

async function ingestFile(file) {
  const image = file.type.startsWith("image/");
  if (image) {
    await ingest({ name: file.name, fileKind: "image", blob: file });
    return;
  }
  const buffer = new Uint8Array(await file.arrayBuffer());
  await ingest({ name: file.name, fileKind: "pdf", buffer });
}

async function run(task) {
  if (busy) return;
  setBusy(true);
  try {
    await task();
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Échec de la lecture.");
  } finally {
    setBusy(false);
  }
}

document.querySelector("[data-load-all]").addEventListener("click", () => {
  run(async () => {
    for (const key of ["fds", "coa", "bl", "plate"]) await ingestSample(key);
  });
});

document.querySelectorAll("[data-sample]").forEach((btn) => {
  btn.addEventListener("click", () => run(() => ingestSample(btn.dataset.sample)));
});

document.querySelector("[data-reset]").addEventListener("click", () => {
  dossier = emptyDossier();
  setStatus("");
  render();
});

document.querySelector("[data-copy]").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(ui.json.textContent);
    setStatus("JSON copié.");
    setTimeout(() => setStatus(""), 1600);
  } catch {
    setStatus("Copie impossible.");
  }
});

ui.file.addEventListener("change", () => {
  const file = ui.file.files?.[0];
  ui.file.value = "";
  if (file) run(() => ingestFile(file));
});

["dragenter", "dragover"].forEach((ev) => {
  ui.drop.addEventListener(ev, (e) => {
    e.preventDefault();
    ui.drop.classList.add("is-over");
  });
});
["dragleave", "drop"].forEach((ev) => {
  ui.drop.addEventListener(ev, (e) => {
    e.preventDefault();
    ui.drop.classList.remove("is-over");
  });
});
ui.drop.addEventListener("drop", (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (file) run(() => ingestFile(file));
});

document.querySelector("[data-camera]").addEventListener("click", () => run(openCamera));
document.querySelector("[data-close-cam]").addEventListener("click", closeCamera);
document.querySelector("[data-capture]").addEventListener("click", () => run(capturePlate));

async function openCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Caméra indisponible sur ce navigateur.");
  }
  camStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
    audio: false,
  });
  ui.video.srcObject = camStream;
  ui.camera.showModal();
  setBusy(false);
}

function closeCamera() {
  camStream?.getTracks().forEach((t) => t.stop());
  camStream = null;
  ui.video.srcObject = null;
  if (ui.camera.open) ui.camera.close();
}

async function capturePlate() {
  const video = ui.video;
  if (!video.videoWidth) throw new Error("Flux caméra vide.");
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  closeCamera();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  await ingest({ name: "plaque-camera.jpg", fileKind: "image", blob });
}

ui.camera.addEventListener("close", closeCamera);

render();

