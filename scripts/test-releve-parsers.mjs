import { detectKind } from "../public/releve/js/detect.js";
import { parseBl, parseCoa, parseFds, parseNameplate } from "../public/releve/js/parse.js";
import { emptyDossier, mergePatch, dossierToJson } from "../public/releve/js/dossier.js";

const FDS = `
FICHE DE DONNÉES DE SÉCURITÉ
selon le règlement (CE) n° 1907/2006 (REACH) et le règlement (UE) 2020/878
ESTERA-42
Solvant de dégraissage industriel
UFI : P410-D0X2-T00Y-8K3R
Nom commercial : ESTERA-42
Gier Chimie SAS
14 rue des Aciéries
Pictogrammes de danger : GHS02   GHS07   GHS09
Mention d'avertissement : DANGER
H225  Liquide et vapeurs très inflammables.
H319  Provoque une sévère irritation des yeux.
H336  Peut provoquer somnolence ou vertiges.
H411  Toxique pour les organismes aquatiques, entraîne des effets néfastes à long terme.
EUH066  L'exposition répétée peut provoquer dessèchement ou gerçures de la peau.
P210  Tenir à l'écart de la chaleur.
P261  Éviter de respirer les vapeurs.
P305+P351+P338  EN CAS DE CONTACT AVEC LES YEUX
P403+P233  Stocker dans un endroit bien ventilé.
Acétate d'éthyle              141-78-6     205-500-4
Propane-2-ol                  67-63-0
14.1  Numéro ONU : UN 1993
14.4  Groupe d'emballage : II
14.3  Classe : 3
ADR : 3, II, code tunnel D/E
Point d'éclair : -4 °C (coupelle fermée)
`;

const COA = `
CERTIFICAT D'ANALYSE
Certificate of Analysis (COA)
Produit : ESTERA-42
N° CAS principal : 141-78-6 (acétate d'éthyle)
N° de lot : L26-0847
Date d'analyse : 19/08/2026
Quantité : 800 kg (4 fûts 200 L)
Laboratoire : Saint-Chamond CQ-02
Méthode de référence interne : CQ-GC-14 / CQ-KF-02
Aspect                    visuel            incolore, limpide   conforme      CONFORME
Eau (Karl Fischer)        ISO 760           <= 0,10 %           0,04 %        CONFORME
Le lot L26-0847 d'ESTERA-42 est CONFORME aux spécifications de vente
en vigueur (cahier des charges CDC-ESTERA-42-2026).
`;

const BL = `
BON DE LIVRAISON
Bon de livraison n° BL-26-4418
Date d'expédition : 21/08/2026
Destinataire
Atelier maintenance  —  Unité solvants
Transporteur : Transports Mollard    Lettre de voiture : CMR-88421
Produit : ESTERA-42
N° de lot : L26-0847
N° CAS : 141-78-6
Conditionnement : 4 fûts acier 200 L
Quantité nette : 800 kg     Poids brut : 872 kg
Numéro ONU : UN 1993
Classe ADR : 3
Groupe d'emballage : II
Code tunnel : D/E
Polluant marin : oui
`;

const PLATE = `
LSM INDUSTRIE
MOTEUR ASYNCHRONE TRIPHASE
CONSTRUCTEUR LSM INDUSTRIE
TYPE LS-180M-4
N. SERIE 2024-STE-11847
ANNEE 2024
NORME IEC 60034-1
PUISSANCE 18,5 kW
TENSION 400 V
FREQUENCE 50 Hz
VITESSE 1465 min-1
INDICE IP IP55
MARQUAGE ATEX / IECEx
II 2 G Ex db IIC T4 Gb
CERTIFICAT INERIS 24 ATEX 3084 X
MASSE 148 kg
`;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(detectKind(FDS).kind === "fds", "detect FDS");
assert(detectKind(COA).kind === "coa", "detect COA");
assert(detectKind(BL).kind === "bl", "detect BL");
assert(detectKind(PLATE).kind === "nameplate", "detect plaque");

const fds = parseFds(FDS);
assert(fds.product === "ESTERA-42", `product ${fds.product}`);
assert(fds.signalWord === "DANGER", "signal");
assert(fds.pictograms.includes("GHS02") && fds.pictograms.includes("GHS09"), "pictos");
assert(fds.hPhrases.some((p) => p.code === "H225"), "H225");
assert(fds.hPhrases.some((p) => p.code === "EUH066"), "EUH066");
assert(fds.pPhrases.some((p) => p.code === "P305+P351+P338"), "P combo");
assert(fds.unNumber === "1993", "UN");
assert(fds.packingGroup === "II", "GE");
assert(fds.cas.includes("141-78-6"), "CAS");
assert(fds.ufI === "P410-D0X2-T00Y-8K3R", "UFI");

const coa = parseCoa(COA);
assert(coa.lot === "L26-0847", "lot");
assert(coa.conforming === true, "coa conforme");
assert(coa.specs.length >= 2, "specs");

const bl = parseBl(BL);
assert(bl.blNumber === "BL-26-4418", `bl ${bl.blNumber}`);
assert(bl.carrier.includes("Mollard"), `carrier ${bl.carrier}`);
assert(bl.unNumber === "1993", "bl UN");
assert(bl.marinePollutant === true, "marin");

const plate = parseNameplate(PLATE);
assert(plate.manufacturer.includes("LSM"), "mfr");
assert(plate.type === "LS-180M-4", `type ${plate.type}`);
assert(plate.serial === "2024-STE-11847", `sn ${plate.serial}`);
assert(/Ex db IIC T4/i.test(plate.atex), `atex ${plate.atex}`);
assert(plate.ip.replace(/\s/g, "") === "IP55", `ip ${plate.ip}`);
const PLATE_COLUMNS = `
LSM INDUSTRIE
MOTEUR ASYNCHRONE TRIPHASE
CONSTRUCTEUR PUISSANCE
LSM INDUSTRIE 18,5 kW
TYPE TENSION
LS-180M-4 400 V
N. SERIE FREQUENCE
2024-STE-11847 50 Hz
ANNEE VITESSE
2024 1465 min-1
NORME INDICE IP
IEC 60034-1 IP55
II 2 G Ex db IIC T4 Gb
CERTIFICAT INERIS 24 ATEX 3084 X
MASSE 148 kg
`;

const plateCols = parseNameplate(PLATE_COLUMNS);
assert(plateCols.manufacturer.includes("LSM"), `col mfr ${plateCols.manufacturer}`);
assert(plateCols.type === "LS-180M-4", `col type ${plateCols.type}`);
assert(plateCols.serial === "2024-STE-11847", `col sn ${plateCols.serial}`);
assert(plateCols.power.includes("18"), `col kW ${plateCols.power}`);
assert(!/^TENSION$/i.test(plateCols.type), "type is not a label");
assert(!/^FREQUENCE$/i.test(plateCols.serial), "serial is not a label");

let dossier = emptyDossier();
dossier = mergePatch(dossier, fds, { id: "1", name: "fds.pdf" });
dossier = mergePatch(dossier, coa, { id: "2", name: "coa.pdf" });
dossier = mergePatch(dossier, bl, { id: "3", name: "bl.pdf" });
dossier = mergePatch(dossier, plate, { id: "4", name: "plate.jpg" });
const json = dossierToJson(dossier);
assert(json.produit === "ESTERA-42", "merge product");
assert(json.lot === "L26-0847", "merge lot");
assert(json.logistique.bl === "BL-26-4418", "merge bl");
assert(json.equipement.type === "LS-180M-4", "merge type");
assert(json.danger.pictogrammes.length === 3, "merge pictos");

console.log("ok — Relève parsers");
