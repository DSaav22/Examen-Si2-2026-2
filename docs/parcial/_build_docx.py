# -*- coding: utf-8 -*-
"""Arma el informe EnsayAR en un .docx a partir de los capítulos Markdown."""
import re
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = Path(r"c:\Users\diego\Documents\GitHub\Examen-Si2-2026-2\docs\parcial")
OUT = ROOT / "EnsayAR-Informe-Primer-Parcial.docx"

FILES = [
    ROOT / "00-portada.md",
    ROOT / "00-indice.md",
    ROOT / "01-fundamentacion" / "01-perfil.md",
    ROOT / "01-fundamentacion" / "02-marco-teorico.md",
    ROOT / "02-puds" / "modulos.md",
    ROOT / "02-puds" / "03-requisitos.md",
    ROOT / "02-puds" / "casos-de-uso-detalle.md",
    ROOT / "02-puds" / "analisis-diseno.md",
    ROOT / "02-puds" / "03-fase-construccion.md",
    ROOT / "02-puds" / "07-pruebas.md",
    ROOT / "04-cierre" / "09-conclusion.md",
    ROOT / "04-cierre" / "10-recomendaciones.md",
    ROOT / "04-cierre" / "11-bibliografia.md",
    ROOT / "04-cierre" / "12-anexos.md",
]

BOLD = re.compile(r"\*\*(.+?)\*\*")


def add_page_number(paragraph):
    run = paragraph.add_run()
    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")
    run._r.append(fld_begin)
    run._r.append(instr)
    run._r.append(fld_end)


def add_runs(paragraph, text):
    pos = 0
    for match in BOLD.finditer(text):
        if match.start() > pos:
            paragraph.add_run(text[pos:match.start()])
        run = paragraph.add_run(match.group(1))
        run.bold = True
        pos = match.end()
    if pos < len(text):
        paragraph.add_run(text[pos:])


def is_table_sep(line):
    s = line.strip()
    return s.startswith("|") and set(s.replace("|", "").replace(":", "").strip()) <= {"-"}


def split_row(line):
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    return cells


def add_table(doc, rows):
    if not rows:
        return
    cols = max(len(r) for r in rows)
    table = doc.add_table(rows=len(rows), cols=cols)
    table.style = "Table Grid"
    for i, row in enumerate(rows):
        for j in range(cols):
            value = row[j] if j < len(row) else ""
            cell = table.rows[i].cells[j]
            cell.text = ""
            p = cell.paragraphs[0]
            add_runs(p, value.replace("`", ""))
            for run in p.runs:
                run.font.size = Pt(10)
                run.font.name = "Calibri"
            if i == 0:
                for run in p.runs:
                    run.bold = True
    doc.add_paragraph()


def add_body_paragraph(doc, text, style=None):
    p = doc.add_paragraph(style=style)
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.line_spacing = 1.15
    if style is None:
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    add_runs(p, text.replace("`", ""))
    for run in p.runs:
        run.font.name = "Calibri"
        run.font.size = Pt(12)
        run.font.color.rgb = RGBColor(0x1A, 0x1A, 0x1A)
    return p


def render_markdown(doc, text):
    lines = text.replace("\r\n", "\n").split("\n")
    i = 0
    buf = []

    def flush():
        nonlocal buf
        chunk = " ".join(x.strip() for x in buf).strip()
        buf = []
        if chunk:
            add_body_paragraph(doc, chunk)

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped or stripped == "---":
            flush()
            i += 1
            continue

        if stripped.startswith("|"):
            flush()
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                if not is_table_sep(lines[i]):
                    rows.append(split_row(lines[i]))
                i += 1
            add_table(doc, rows)
            continue

        if stripped.startswith("#"):
            flush()
            level = len(stripped) - len(stripped.lstrip("#"))
            level = min(level, 3)
            title = stripped[level:].strip()
            p = doc.add_heading(title.replace("**", ""), level=level)
            for run in p.runs:
                run.font.color.rgb = RGBColor(0x1F, 0x2A, 0x44)
            i += 1
            continue

        if stripped.startswith("- "):
            flush()
            p = doc.add_paragraph(style="List Bullet")
            add_runs(p, stripped[2:].replace("`", ""))
            for run in p.runs:
                run.font.name = "Calibri"
                run.font.size = Pt(12)
            i += 1
            continue

        buf.append(stripped)
        i += 1

    flush()


def apply_margins(section):
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.5)


def footer_with_number(section, start_at):
    section.footer.is_linked_to_previous = False
    paragraph = section.footer.paragraphs[0]
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for child in list(paragraph._p):
        if child.tag == qn("w:r"):
            paragraph._p.remove(child)
    label = paragraph.add_run("EnsayAR — Primer Parcial SI2  ·  ")
    label.font.size = Pt(9)
    label.font.name = "Calibri"
    label.font.color.rgb = RGBColor(0x66, 0x66, 0x66)
    add_page_number(paragraph)
    for run in paragraph.runs:
        run.font.size = Pt(9)
        run.font.name = "Calibri"
    pg = OxmlElement("w:pgNumType")
    pg.set(qn("w:start"), str(start_at))
    section._sectPr.append(pg)


def main():
    doc = Document()
    apply_margins(doc.sections[0])

    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(12)
    normal.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    normal.paragraph_format.line_spacing = 1.15

    # Carátula e índice: sin número de página.
    render_markdown(doc, FILES[0].read_text(encoding="utf-8"))
    doc.add_page_break()
    render_markdown(doc, FILES[1].read_text(encoding="utf-8"))

    # El cuerpo empieza en la hoja siguiente. Esa es la página 1.
    body = doc.add_section(WD_SECTION.NEW_PAGE)
    apply_margins(body)
    footer_with_number(body, 1)

    for path in FILES[2:]:
        render_markdown(doc, path.read_text(encoding="utf-8"))
        if path != FILES[-1]:
            doc.add_page_break()

    try:
        doc.save(OUT)
        print(OUT)
    except PermissionError:
        alt = OUT.with_name("EnsayAR-Informe-Primer-Parcial-numerado.docx")
        try:
            doc.save(alt)
            print("LOCKED", alt)
        except PermissionError:
            alt2 = OUT.with_name("EnsayAR-Informe-Indice-Tatiana.docx")
            doc.save(alt2)
            print("LOCKED2", alt2)


if __name__ == "__main__":
    main()
