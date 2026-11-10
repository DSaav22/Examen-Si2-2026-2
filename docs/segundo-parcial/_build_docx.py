# -*- coding: utf-8 -*-
"""Arma el informe del segundo parcial (.docx y, si hay Word, .pdf) desde los capítulos Markdown."""
import re
import sys
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from PIL import Image

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "EnsayAR-Informe-Segundo-Parcial.docx"

PORTADA = ROOT / "00-portada.md"
CAPITULOS = [
    "01-fundamentacion/01-perfil.md",
    "01-fundamentacion/02-marco-teorico.md",
    "01-fundamentacion/03-saas.md",
    "01-fundamentacion/04-multitenant.md",
    "01-fundamentacion/05-pagos.md",
    "01-fundamentacion/06-offline-pwa-sync.md",
    "01-fundamentacion/07-ia-reportes.md",
    "01-fundamentacion/08-analitica.md",
    "02-iconix/00-metodologia.md",
    "02-iconix/01-requisitos.md",
    "02-iconix/02-robustez.md",
    "02-iconix/03-diseno-detallado.md",
    "02-iconix/04-implementacion-pruebas.md",
    "03-adopcion/10-adopcion-capacitacion.md",
    "04-cierre/11-conclusiones.md",
    "04-cierre/12-recomendaciones.md",
    "04-cierre/13-bibliografia.md",
    "04-cierre/14-anexos.md",
]

ANCHO_MAX = Cm(16)
ALTO_MAX = Cm(21)
AZUL = RGBColor(0x1F, 0x2A, 0x44)
TEXTO = RGBColor(0x1A, 0x1A, 0x1A)
GRIS = RGBColor(0x55, 0x55, 0x55)

INLINE = re.compile(r"\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|(?<![\w*])\*(?!\s)([^*]+?)\*(?![\w*])")
IMAGEN = re.compile(r"^!\[([^\]]*)\]\(([^)]+)\)\s*$")
NUMERADA = re.compile(r"^(\d+)\.\s+(.*)$")
SUBSECCION = re.compile(r"^\d+\.\d+")


def add_runs(paragraph, text, size=None, color=None, italic=False):
    def run(t, bold=False, code=False, ital=False):
        r = paragraph.add_run(t)
        r.bold = bold or None
        r.italic = (ital or italic) or None
        if code:
            r.font.name = "Consolas"
            r.font.size = Pt((size or 12) - 1.5)
        elif size:
            r.font.size = Pt(size)
        if color is not None:
            r.font.color.rgb = color

    pos = 0
    for m in INLINE.finditer(text):
        if m.start() > pos:
            run(text[pos:m.start()])
        bold, code, link_text, link_url, ital = m.groups()
        if bold is not None:
            run(bold.replace("`", ""), bold=True)
        elif code is not None:
            run(code, code=True)
        elif link_text is not None:
            run(link_text if link_text == link_url else f"{link_text} ({link_url})")
        else:
            run(ital, ital=True)
        pos = m.end()
    if pos < len(text):
        run(text[pos:])


def shade(element, fill):
    props = element.get_or_add_tcPr() if hasattr(element, "get_or_add_tcPr") else element.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill)
    props.append(shd)


def is_table_sep(line):
    s = line.strip()
    return s.startswith("|") and set(s.replace("|", "").replace(":", "").strip()) <= {"-"}


def split_row(line):
    s = line.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|"):
        s = s[:-1]
    return [c.strip() for c in re.split(r"(?<!\\)\|", s)]


def add_table(doc, rows):
    cols = max(len(r) for r in rows)
    size = 10 if cols <= 3 else 9 if cols <= 5 else 8
    table = doc.add_table(rows=len(rows), cols=cols)
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, row in enumerate(rows):
        for j in range(cols):
            cell = table.rows[i].cells[j]
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.0
            add_runs(p, (row[j] if j < len(row) else "").replace("\\|", "|"), size=size)
            if i == 0:
                for r in p.runs:
                    r.bold = True
                shade(cell._tc, "DCE3EE")
    if len(rows) > 1:
        tr_pr = table.rows[0]._tr.get_or_add_trPr()
        header = OxmlElement("w:tblHeader")
        header.set(qn("w:val"), "true")
        tr_pr.append(header)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def add_paragraph(doc, text, align=WD_ALIGN_PARAGRAPH.JUSTIFY):
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_after = Pt(8)
    add_runs(p, text, color=TEXTO)
    return p


def add_code(doc, lines):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.line_spacing = 1.0
    p.paragraph_format.left_indent = Cm(0.3)
    shade(p._p, "F2F2F2")
    for k, line in enumerate(lines):
        r = p.add_run(line)
        r.font.name = "Consolas"
        r.font.size = Pt(8.5)
        if k < len(lines) - 1:
            r.add_break()


def add_image(doc, md_path, caption, src):
    path = (md_path.parent / src).resolve()
    if not path.exists():
        add_paragraph(doc, f"[Falta la imagen {src}]")
        print("FALTA", path, file=sys.stderr)
        return
    with Image.open(path) as im:
        w, h = im.size
    ancho = ANCHO_MAX
    if ancho * h / w > ALTO_MAX:
        ancho = int(ALTO_MAX * w / h)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.space_after = Pt(2)
    p.add_run().add_picture(str(path), width=ancho)
    if caption:
        c = doc.add_paragraph()
        c.alignment = WD_ALIGN_PARAGRAPH.CENTER
        c.paragraph_format.space_after = Pt(10)
        add_runs(c, caption, size=10, color=GRIS, italic=True)


def render_markdown(doc, md_path, text, desplazar=0, centrado=False):
    lines = text.replace("\r\n", "\n").split("\n")
    i = 0
    buf = []
    align = WD_ALIGN_PARAGRAPH.CENTER if centrado else WD_ALIGN_PARAGRAPH.JUSTIFY

    def flush():
        nonlocal buf
        chunk = " ".join(x.strip() for x in buf).strip()
        buf = []
        if chunk:
            add_paragraph(doc, chunk, align)

    while i < len(lines):
        line = lines[i]
        s = line.strip()

        if s.startswith("```"):
            flush()
            i += 1
            code = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code.append(lines[i].rstrip())
                i += 1
            add_code(doc, code)
            i += 1
            continue

        if not s or s == "---":
            flush()
            i += 1
            continue

        if s.startswith("|"):
            flush()
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                if not is_table_sep(lines[i]):
                    rows.append(split_row(lines[i]))
                i += 1
            add_table(doc, rows)
            continue

        if s.startswith("#"):
            flush()
            level = len(s) - len(s.lstrip("#"))
            title = s[level:].strip().replace("**", "")
            level = min(level + desplazar, 4)
            if centrado:
                p = doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r = p.add_run(title)
                r.bold = True
                r.font.size = Pt(30 if level == 1 else 16)
                r.font.color.rgb = AZUL
            else:
                doc.add_heading(title, level=level)
            i += 1
            continue

        m = IMAGEN.match(s)
        if m:
            flush()
            add_image(doc, md_path, m.group(1), m.group(2))
            i += 1
            continue

        if s.startswith("> "):
            flush()
            quote = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote.append(lines[i].strip().lstrip(">").strip())
                i += 1
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Cm(1)
            p.paragraph_format.space_after = Pt(8)
            add_runs(p, " ".join(quote), color=GRIS, italic=True)
            continue

        if s.startswith("- ") or s.startswith("* "):
            flush()
            p = doc.add_paragraph(style="List Bullet")
            p.paragraph_format.space_after = Pt(3)
            add_runs(p, s[2:], color=TEXTO)
            i += 1
            continue

        m = NUMERADA.match(s)
        if m:
            flush()
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Cm(0.9)
            p.paragraph_format.first_line_indent = Cm(-0.6)
            p.paragraph_format.space_after = Pt(3)
            add_runs(p, f"{m.group(1)}.\t{m.group(2)}", color=TEXTO)
            p.paragraph_format.tab_stops.add_tab_stop(Cm(0.9))
            i += 1
            continue

        buf.append(s)
        if centrado or line.endswith("  "):
            flush()
        i += 1

    flush()


def add_field(paragraph, instruccion):
    run = paragraph.add_run()
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    begin.set(qn("w:dirty"), "true")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = f" {instruccion} "
    sep = OxmlElement("w:fldChar")
    sep.set(qn("w:fldCharType"), "separate")
    texto = OxmlElement("w:t")
    texto.text = "Actualice el índice (clic derecho, Actualizar campos)." if "TOC" in instruccion else "1"
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    for el in (begin, instr, sep, texto, end):
        run._r.append(el)


def apply_margins(section):
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.5)


def footer_with_number(section, start_at):
    section.footer.is_linked_to_previous = False
    p = section.footer.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    label = p.add_run("EnsayAR — Segundo Parcial SI2  ·  ")
    add_field(p, "PAGE")
    for r in p.runs:
        r.font.size = Pt(9)
        r.font.color.rgb = GRIS
    pg = OxmlElement("w:pgNumType")
    pg.set(qn("w:start"), str(start_at))
    section._sectPr.append(pg)


def configurar_estilos(doc):
    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    normal.font.size = Pt(11.5)
    normal.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    normal.paragraph_format.line_spacing = 1.15
    for nivel, tam in ((1, 20), (2, 15), (3, 13), (4, 12)):
        st = doc.styles[f"Heading {nivel}"]
        st.font.name = "Calibri"
        st.font.size = Pt(tam)
        st.font.bold = True
        st.font.italic = False
        st.font.color.rgb = AZUL
        st.paragraph_format.space_before = Pt(18 if nivel == 1 else 12)
        st.paragraph_format.space_after = Pt(6)
        st.paragraph_format.keep_with_next = True


def construir():
    doc = Document()
    apply_margins(doc.sections[0])
    configurar_estilos(doc)

    portada = PORTADA.read_text(encoding="utf-8").split("\n", 1)[1]
    for _ in range(4):
        doc.add_paragraph()
    render_markdown(doc, PORTADA, portada, centrado=True)
    doc.add_page_break()

    p = doc.add_paragraph()
    r = p.add_run("Índice")
    r.bold = True
    r.font.size = Pt(20)
    r.font.color.rgb = AZUL
    add_field(doc.add_paragraph(), 'TOC \\o "1-3" \\h \\z \\u')

    body = doc.add_section(WD_SECTION.NEW_PAGE)
    apply_margins(body)
    footer_with_number(body, 1)

    for k, rel in enumerate(CAPITULOS):
        path = ROOT / rel
        texto = path.read_text(encoding="utf-8")
        primera = texto.lstrip().split("\n", 1)[0]
        desplazar = 1 if primera.startswith("# ") and SUBSECCION.match(primera[2:]) else 0
        if k and not desplazar:
            doc.add_page_break()
        render_markdown(doc, path, texto, desplazar)

    try:
        doc.save(OUT)
        return OUT
    except PermissionError:
        alt = OUT.with_name(OUT.stem + "-nuevo.docx")
        doc.save(alt)
        return alt


def exportar_pdf(docx_path):
    try:
        import win32com.client
    except ImportError:
        print("Sin pywin32: no se genera el PDF.")
        return
    word = win32com.client.DispatchEx("Word.Application")
    word.Visible = False
    word.DisplayAlerts = 0
    try:
        d = word.Documents.Open(str(docx_path))
        d.Fields.Update()
        for toc in d.TablesOfContents:
            toc.Update()
        d.Save()
        pdf = docx_path.with_suffix(".pdf")
        d.ExportAsFixedFormat(str(pdf), 17, OptimizeFor=0, CreateBookmarks=1)
        paginas = d.ComputeStatistics(2)
        d.Close(False)
        print(pdf, f"({paginas} páginas)")
    finally:
        word.Quit()


if __name__ == "__main__":
    salida = construir()
    print(salida)
    if "--sin-pdf" not in sys.argv:
        exportar_pdf(salida)
