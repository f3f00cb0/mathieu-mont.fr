#!/usr/bin/env python3
"""Génère les PDF et la plaque constructeur de la démo Relève.

Documents 100 % fictifs (Gier Chimie / ESTERA-42 / moteur LSM).
"""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "releve" / "public" / "samples"
A4 = (595, 842)


def pdf_escape(text: str) -> bytes:
    raw = text.encode("cp1252", "replace")
    return raw.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")


class Page:
    def __init__(self) -> None:
        self.ops: list[bytes] = []

    def fill(self, x: float, y: float, w: float, h: float, gray: float) -> None:
        self.ops.append(f"{gray:.3f} g {x:.1f} {y:.1f} {w:.1f} {h:.1f} re f 0 g".encode())

    def stroke(self, x: float, y: float, w: float, h: float, width: float = 0.6) -> None:
        self.ops.append(
            f"{width:.2f} w {x:.1f} {y:.1f} {w:.1f} {h:.1f} re S".encode()
        )

    def line(self, x1: float, y1: float, x2: float, y2: float, width: float = 0.4) -> None:
        self.ops.append(f"{width:.2f} w {x1:.1f} {y1:.1f} m {x2:.1f} {y2:.1f} l S".encode())

    def text(self, x: float, y: float, s: str, size: float = 10, bold: bool = False) -> None:
        font = "F2" if bold else "F1"
        self.ops.append(
            b"BT /%s %.1f Tf %.1f %.1f Td (%s) Tj ET"
            % (font.encode(), size, x, y, pdf_escape(s))
        )


def wrap(text: str, width: int = 92) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for w in words:
        trial = (cur + " " + w).strip()
        if len(trial) <= width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines or [""]


def build_pdf(pages: list[Page]) -> bytes:
    objects: list[bytes] = []

    def add(obj: bytes) -> int:
        objects.append(obj)
        return len(objects)

    add(b"<< /Type /Catalog /Pages 2 0 R >>")
    kids = []
    # placeholders; we fill after pages
    add(b"<< /Type /Pages /Kids [] /Count 0 >>")
    font1 = add(
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
    )
    font2 = add(
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
    )

    page_ids: list[int] = []
    for page in pages:
        content = b"\n".join(page.ops) + b"\n"
        stream = b"<< /Length %d >>\nstream\n%s\nendstream" % (len(content), content)
        cid = add(stream)
        pid = add(
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            b"/Contents %d 0 R /Resources << /Font << /F1 %d 0 R /F2 %d 0 R >> >> >>"
            % (cid, font1, font2)
        )
        page_ids.append(pid)

    objects[1] = (
        b"<< /Type /Pages /Kids [%s] /Count %d >>"
        % (b" ".join(b"%d 0 R" % i for i in page_ids), len(page_ids))
    )

    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out += b"%d 0 obj\n%s\nendobj\n" % (i, obj)
    xref = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
    for off in offsets[1:]:
        out += b"%010d 00000 n \n" % off
    out += (
        b"trailer << /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n"
        % (len(objects) + 1, xref)
    )
    return bytes(out)


class Cursor:
    def __init__(self, page: Page, y: float = 800) -> None:
        self.page = page
        self.y = y

    def gap(self, n: float = 10) -> None:
        self.y -= n

    def p(self, text: str, size: float = 9.5, bold: bool = False, x: float = 48) -> None:
        self.page.text(x, self.y, text, size=size, bold=bold)
        self.y -= size + 4

    def wrapped(self, text: str, size: float = 9.5, width: int = 92, x: float = 48) -> None:
        for line in wrap(text, width):
            self.p(line, size=size, x=x)


def make_fds() -> bytes:
    p1, p2 = Page(), Page()
    for p in (p1, p2):
        p.fill(0, 812, 595, 30, 0.12)
        p.text(48, 822, "GIER CHIMIE SAS", 11, bold=True)
        p.text(320, 822, "Document fictif  —  démonstration", 8)

    c = Cursor(p1, 790)
    c.p("FICHE DE DONNÉES DE SÉCURITÉ", 16, bold=True)
    c.p("selon le règlement (CE) n° 1907/2006 (REACH) et le règlement (UE) 2020/878", 8)
    c.p("et le règlement (CE) n° 1272/2008 (CLP)", 8)
    c.gap(8)
    c.p("ESTERA-42", 18, bold=True)
    c.p("Solvant de dégraissage industriel", 11)
    c.gap(6)
    c.p("Date d'émission : 12/03/2026     Version : 3.1     Remplace : 2.4 du 04/11/2024", 8)
    c.p("UFI : P410-D0X2-T00Y-8K3R", 8)
    c.gap(10)

    c.p("RUBRIQUE 1  Identification de la substance/du mélange et de la société", 11, bold=True)
    p1.line(48, c.y + 8, 547, c.y + 8, 0.8)
    c.gap(4)
    c.p("1.1  Identificateur de produit", 9.5, bold=True)
    c.p("Nom commercial : ESTERA-42")
    c.p("UFI : P410-D0X2-T00Y-8K3R")
    c.p("1.2  Utilisations identifiées pertinentes", 9.5, bold=True)
    c.wrapped(
        "Dégraissage de pièces mécaniques en atelier de maintenance. "
        "Usage professionnel et industriel uniquement. Usage déconseillé : grand public."
    )
    c.p("1.3  Renseignements concernant le fournisseur", 9.5, bold=True)
    c.p("Gier Chimie SAS")
    c.p("14 rue des Aciéries")
    c.p("42400 Saint-Chamond  —  France")
    c.p("Tél. : +33 4 77 00 00 00    fds@gier-chimie.example")
    c.p("1.4  Numéro d'appel d'urgence", 9.5, bold=True)
    c.p("ORFILA (INRS) : +33 1 45 42 59 59")
    c.gap(8)

    c.p("RUBRIQUE 2  Identification des dangers", 11, bold=True)
    p1.line(48, c.y + 8, 547, c.y + 8, 0.8)
    c.gap(4)
    c.p("2.1  Classification selon le règlement (CE) n° 1272/2008 (CLP)", 9.5, bold=True)
    c.p("Flam. Liq. 2, H225")
    c.p("Eye Irrit. 2, H319")
    c.p("STOT SE 3, H336")
    c.p("Aquatic Chronic 2, H411")
    c.gap(4)
    c.p("2.2  Éléments d'étiquetage", 9.5, bold=True)
    c.p("Pictogrammes de danger : GHS02   GHS07   GHS09")
    c.p("Mention d'avertissement : DANGER")
    c.gap(3)
    c.p("Mentions de danger", 9.5, bold=True)
    c.p("H225  Liquide et vapeurs très inflammables.")
    c.p("H319  Provoque une sévère irritation des yeux.")
    c.p("H336  Peut provoquer somnolence ou vertiges.")
    c.p("H411  Toxique pour les organismes aquatiques, entraîne des effets néfastes à long terme.")
    c.p("EUH066  L'exposition répétée peut provoquer dessèchement ou gerçures de la peau.")
    c.gap(3)
    c.p("Conseils de prudence", 9.5, bold=True)
    c.wrapped("P210  Tenir à l'écart de la chaleur, des surfaces chaudes, des étincelles, des flammes nues et de toute autre source d'inflammation. Ne pas fumer.")
    c.p("P261  Éviter de respirer les vapeurs.")
    c.p("P273  Éviter le rejet dans l'environnement.")
    c.wrapped("P280  Porter des gants de protection / un équipement de protection des yeux.")
    c.wrapped("P305+P351+P338  EN CAS DE CONTACT AVEC LES YEUX : Rincer avec précaution à l'eau pendant plusieurs minutes. Enlever les lentilles de contact si la victime en porte et si elles peuvent être facilement enlevées. Continuer à rincer.")
    c.p("P391  Recueillir le produit répandu.")
    c.wrapped("P403+P233  Stocker dans un endroit bien ventilé. Maintenir le récipient fermé de manière étanche.")
    c.p("P501  Éliminer le contenu/récipient dans une installation d'élimination des déchets agréée.")

    c = Cursor(p2, 790)
    c.p("ESTERA-42  -  FDS  -  page 2/2", 8)
    c.gap(8)
    c.p("RUBRIQUE 3  Composition / informations sur les composants", 11, bold=True)
    p2.line(48, c.y + 8, 547, c.y + 8, 0.8)
    c.gap(4)
    c.p("Mélange")
    c.gap(4)
    c.p("Composant                     N° CAS       N° CE        % (p/p)    Classification", 8, bold=True)
    c.p("Acétate d'éthyle              141-78-6     205-500-4    55-65      Flam. Liq. 2 H225, Eye Irrit. 2 H319, STOT SE 3 H336", 8)
    c.p("Propane-2-ol                  67-63-0      200-661-7    20-30      Flam. Liq. 2 H225, Eye Irrit. 2 H319, STOT SE 3 H336", 8)
    c.p("Hydrocarbures, C7-C9          64742-49-0   265-151-9    10-20      Flam. Liq. 2 H225, Asp. Tox. 1 H304, Aquatic Chronic 2 H411", 8)
    c.gap(12)

    c.p("RUBRIQUE 9  Propriétés physiques et chimiques", 11, bold=True)
    p2.line(48, c.y + 8, 547, c.y + 8, 0.8)
    c.gap(4)
    c.p("État physique : liquide")
    c.p("Couleur : incolore")
    c.p("Odeur : ester, caractéristique")
    c.p("Point d'éclair : -4 °C (coupelle fermée)")
    c.p("Masse volumique : 0,84 g/cm3 à 20 °C")
    c.p("Solubilité : partiellement miscible à l'eau")
    c.gap(12)

    c.p("RUBRIQUE 14  Informations relatives au transport", 11, bold=True)
    p2.line(48, c.y + 8, 547, c.y + 8, 0.8)
    c.gap(4)
    c.p("14.1  Numéro ONU : UN 1993")
    c.p("14.2  Désignation officielle : LIQUIDE INFLAMMABLE, N.S.A. (acétate d'éthyle, hydrocarbures)")
    c.p("14.3  Classe : 3")
    c.p("14.4  Groupe d'emballage : II")
    c.p("14.5  Dangers pour l'environnement : oui (polluant marin)")
    c.p("ADR : 3, II, code tunnel D/E")
    c.p("IMDG : 3, II, F-E S-E, polluant marin")
    c.p("IATA : 3, II")
    c.gap(12)

    c.p("RUBRIQUE 16  Autres informations", 11, bold=True)
    p2.line(48, c.y + 8, 547, c.y + 8, 0.8)
    c.gap(4)
    c.wrapped(
        "Document généré pour une démonstration d'extraction automatisée. "
        "Produit, lots et société sont fictifs. Aucune mise sur le marché."
    )
    c.p("Phrases H et P : voir rubrique 2.")
    return build_pdf([p1, p2])


def make_coa() -> bytes:
    p = Page()
    p.fill(0, 812, 595, 30, 0.12)
    p.text(48, 822, "GIER CHIMIE SAS  —  Laboratoire contrôle qualité", 10, bold=True)
    p.text(430, 822, "Document fictif", 8)

    c = Cursor(p, 788)
    c.p("CERTIFICAT D'ANALYSE", 16, bold=True)
    c.p("Certificate of Analysis (COA)", 10)
    c.gap(8)
    p.stroke(48, c.y - 70, 499, 78, 0.8)
    c.p("Produit : ESTERA-42")
    c.p("N° CAS principal : 141-78-6 (acétate d'éthyle)")
    c.p("N° de lot : L26-0847")
    c.p("Date de fabrication : 18/08/2026     Date d'analyse : 19/08/2026")
    c.p("Date de recontrôle : 18/08/2028")
    c.p("Quantité : 800 kg (4 fûts 200 L)")
    c.gap(16)

    c.p("Résultats d'analyse", 11, bold=True)
    p.line(48, c.y + 8, 547, c.y + 8, 0.8)
    c.gap(6)
    c.p("Paramètre                 Méthode           Spécification        Résultat      Statut", 8, bold=True)
    c.p("Aspect                    visuel            incolore, limpide   conforme      CONFORME", 8)
    c.p("Masse volumique 20 °C     ISO 12185         0,830 - 0,850       0,842 g/cm3   CONFORME", 8)
    c.p("Indice de réfraction      ASTM D1218        1,370 - 1,378       1,373         CONFORME", 8)
    c.p("Teneur acétate d'éthyle   GC-FID interne    55 - 65 % (p/p)     61,2 %        CONFORME", 8)
    c.p("Teneur propane-2-ol       GC-FID interne    20 - 30 % (p/p)     24,8 %        CONFORME", 8)
    c.p("Eau (Karl Fischer)        ISO 760           <= 0,10 %           0,04 %        CONFORME", 8)
    c.p("Couleur APHA              ISO 6271          <= 15               6             CONFORME", 8)
    c.p("Point d'éclair            ISO 13736         <= 0 °C             -4 °C         CONFORME", 8)
    c.gap(14)

    c.p("Conclusion", 11, bold=True)
    p.line(48, c.y + 8, 547, c.y + 8, 0.8)
    c.gap(4)
    c.wrapped(
        "Le lot L26-0847 d'ESTERA-42 est CONFORME aux spécifications de vente "
        "en vigueur (cahier des charges CDC-ESTERA-42-2026). "
        "Pas de déviation. Libération autorisée."
    )
    c.gap(8)
    c.p("Spécifications liées à la FDS version 3.1 (classification CLP inchangée).")
    c.p("N° CE acétate d'éthyle : 205-500-4")
    c.gap(16)
    c.p("Laboratoire : Saint-Chamond CQ-02")
    c.p("Analyste : M. Faure     Visa libération : C. Roux")
    c.p("Méthode de référence interne : CQ-GC-14 / CQ-KF-02")
    c.gap(20)
    c.p("Document fictif  —  démonstration d'extraction. Aucune valeur commerciale.", 8)
    return build_pdf([p])


def make_bl() -> bytes:
    p = Page()
    p.fill(0, 812, 595, 30, 0.12)
    p.text(48, 822, "GIER CHIMIE SAS", 11, bold=True)
    p.text(400, 822, "BON DE LIVRAISON", 11, bold=True)

    c = Cursor(p, 788)
    c.p("Bon de livraison n° BL-26-4418", 14, bold=True)
    c.p("Date d'expédition : 21/08/2026     Incoterm : DAP", 9)
    c.gap(8)
    c.p("Expéditeur", 10, bold=True)
    c.p("Gier Chimie SAS  —  14 rue des Aciéries  —  42400 Saint-Chamond")
    c.gap(4)
    c.p("Destinataire", 10, bold=True)
    c.p("Atelier maintenance  —  Unité solvants")
    c.p("Site fictif Loire  —  42000 Saint-Étienne")
    c.gap(8)
    c.p("Transporteur : Transports Mollard    Lettre de voiture : CMR-88421", 9.5)
    c.p("Immatriculation : FB-442-ZM    Chauffeur : A. Morel", 9.5)
    c.gap(10)

    c.p("Marchandise", 11, bold=True)
    p.line(48, c.y + 8, 547, c.y + 8, 0.8)
    c.gap(4)
    c.p("Produit : ESTERA-42")
    c.p("N° de lot : L26-0847")
    c.p("N° CAS : 141-78-6")
    c.p("Conditionnement : 4 fûts acier 200 L")
    c.p("Quantité nette : 800 kg     Poids brut : 872 kg")
    c.p("Certificat d'analyse : COA L26-0847 du 19/08/2026  —  CONFORME")
    c.gap(12)

    c.p("Transport de marchandises dangereuses (ADR)", 11, bold=True)
    p.line(48, c.y + 8, 547, c.y + 8, 0.8)
    c.gap(4)
    p.stroke(48, c.y - 88, 499, 96, 1.1)
    c.p("Numéro ONU : UN 1993")
    c.p("Désignation : LIQUIDE INFLAMMABLE, N.S.A. (acétate d'éthyle, hydrocarbures)")
    c.p("Classe ADR : 3")
    c.p("Groupe d'emballage : II")
    c.p("Code tunnel : D/E")
    c.p("Polluant marin : oui")
    c.p("Étiquettes : 3 + danger pour l'environnement")
    c.gap(20)
    c.p("FDS jointe : ESTERA-42 version 3.1 du 12/03/2026")
    c.p("Observation : livraison quai solvants, retenue échantillon CQ.")
    c.gap(24)
    c.p("Signature expédition                  Signature réception", 9)
    c.gap(28)
    c.p("Document fictif  —  démonstration d'extraction. Aucune expédition réelle.", 8)
    return build_pdf([p])


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


def make_nameplate() -> Image.Image:
    w, h = 1400, 900
    img = Image.new("RGB", (w, h), (214, 214, 208))
    draw = ImageDraw.Draw(img)
    # brushed aluminium
    px = img.load()
    seed = 17
    for y in range(h):
        for x in range(w):
            seed = (seed * 1103515245 + 12345 + x * 13 + y * 7) & 0x7FFFFFFF
            n = (seed >> 16) % 18
            base = 198 + (y % 5) - 2
            v = max(170, min(230, base + n - 8))
            px[x, y] = (v, v - 1, v - 6)

    # plate bevel
    draw.rounded_rectangle([18, 18, w - 19, h - 19], radius=18, outline=(40, 40, 38), width=8)
    draw.rounded_rectangle([32, 32, w - 33, h - 33], radius=12, outline=(90, 90, 86), width=2)

    # rivets
    for cx, cy in [(70, 70), (w - 71, 70), (70, h - 71), (w - 71, h - 71)]:
        draw.ellipse([cx - 16, cy - 16, cx + 16, cy + 16], fill=(88, 88, 84), outline=(40, 40, 38), width=2)
        draw.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=(160, 160, 154))

    sans = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
    mono = "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf"
    sans_r = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"

    draw.text((120, 64), "LSM INDUSTRIE", font=font(sans, 42), fill=(20, 20, 18))
    draw.text((120, 118), "MOTEUR ASYNCHRONE TRIPHASE", font=font(sans_r, 22), fill=(32, 32, 30))
    draw.rectangle([120, 158, 1280, 162], fill=(20, 20, 18))

    rows_left = [
        ("CONSTRUCTEUR", "LSM INDUSTRIE"),
        ("TYPE", "LS-180M-4"),
        ("N. SERIE", "2024-STE-11847"),
        ("ANNEE", "2024"),
        ("NORME", "IEC 60034-1"),
    ]
    rows_right = [
        ("PUISSANCE", "18,5 kW"),
        ("TENSION", "400 V"),
        ("FREQUENCE", "50 Hz"),
        ("VITESSE", "1465 min-1"),
        ("INDICE IP", "IP55"),
    ]

    y = 190
    for (lab, val), (lab2, val2) in zip(rows_left, rows_right):
        draw.text((120, y), lab, font=font(sans_r, 18), fill=(50, 50, 46))
        draw.text((120, y + 28), val, font=font(mono, 28), fill=(10, 10, 8))
        draw.text((760, y), lab2, font=font(sans_r, 18), fill=(50, 50, 46))
        draw.text((760, y + 28), val2, font=font(mono, 28), fill=(10, 10, 8))
        y += 86

    # ATEX box
    draw.rectangle([120, 640, 1280, 820], outline=(20, 20, 18), width=3)
    draw.text((140, 658), "MARQUAGE ATEX / IECEx", font=font(sans, 20), fill=(20, 20, 18))
    draw.text((140, 698), "II 2 G Ex db IIC T4 Gb", font=font(mono, 36), fill=(10, 10, 8))
    draw.text((140, 754), "CERTIFICAT  INERIS 24 ATEX 3084 X     MASSE  148 kg", font=font(sans_r, 20), fill=(20, 20, 18))

    img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=80, threshold=2))
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "fds-estera-42.pdf").write_bytes(make_fds())
    (OUT / "coa-estera-42.pdf").write_bytes(make_coa())
    (OUT / "bl-estera-42.pdf").write_bytes(make_bl())
    make_nameplate().save(OUT / "plaque-ls-180m.jpg", "JPEG", quality=84, optimize=True, subsampling=0)
    for name in os.listdir(OUT):
        path = OUT / name
        print(f"{name:24}  {path.stat().st_size:7d} o")


if __name__ == "__main__":
    main()
