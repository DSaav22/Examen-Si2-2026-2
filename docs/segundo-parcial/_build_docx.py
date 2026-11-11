# -*- coding: utf-8 -*-
"""Arma el informe del segundo parcial (.docx y, si hay Word, .pdf) desde los capítulos Markdown."""
import re
import sys
from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT, WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from PIL import Image

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "EnsayAR-Informe-Segundo-Parcial.docx"

# Carátula oficial de la facultad: se inserta tal cual con Word, sin regenerarla.
PORTADA_DOCX = ROOT / "portada-oficial.docx"
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

# Formato APA 7: Times New Roman 12, interlineado doble, márgenes de 2,54 cm y sangría de 1,27 cm.
FUENTE = "Times New Roman"
INTERLINEADO = 2.0
SANGRIA = Cm(1.27)
MARGEN = Cm(2.54)
ANCHO_MAX = Cm(16)
ALTO_MAX = Cm(17)
ANCHO_QR = Cm(5)
# Diagramas anchos (despliegue, componentes, máquinas de estado): van en página horizontal para que se lean.
APAISADAS = ("arq-", "est-")
ANCHO_H = Cm(22.5)
ALTO_H = Cm(11.5)
horizontal = False
AZUL = RGBColor(0, 0, 0)
TEXTO = RGBColor(0, 0, 0)
GRIS = RGBColor(0, 0, 0)
FIGURA = re.compile(r"^(Figura [\d.]+)[:.]\s*(.*)$", re.S)

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
                borde_celda(cell, "bottom")
    bordes_apa(table)
    if len(rows) > 1:
        tr_pr = table.rows[0]._tr.get_or_add_trPr()
        header = OxmlElement("w:tblHeader")
        header.set(qn("w:val"), "true")
        tr_pr.append(header)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def bordes_apa(table):
    """Tabla APA: solo líneas horizontales arriba, bajo el encabezado y al final."""
    tbl_pr = table._tbl.tblPr
    bordes = OxmlElement("w:tblBorders")
    for lado in ("top", "left", "bottom", "right", "insideH", "insideV"):
        b = OxmlElement(f"w:{lado}")
        if lado in ("top", "bottom"):
            b.set(qn("w:val"), "single")
            b.set(qn("w:sz"), "8")
            b.set(qn("w:color"), "000000")
        else:
            b.set(qn("w:val"), "nil")
        bordes.append(b)
    look = tbl_pr.find(qn("w:tblLook"))
    if look is not None:
        look.addprevious(bordes)
    else:
        tbl_pr.append(bordes)


def borde_celda(cell, lado):
    tc_pr = cell._tc.get_or_add_tcPr()
    bordes = OxmlElement("w:tcBorders")
    b = OxmlElement(f"w:{lado}")
    b.set(qn("w:val"), "single")
    b.set(qn("w:sz"), "6")
    b.set(qn("w:color"), "000000")
    bordes.append(b)
    tc_pr.append(bordes)


def add_paragraph(doc, text, align=WD_ALIGN_PARAGRAPH.LEFT, referencia=False):
    p = doc.add_paragraph()
    p.alignment = align
    f = p.paragraph_format
    f.space_after = Pt(0)
    f.line_spacing = INTERLINEADO
    if referencia:
        f.left_indent = SANGRIA
        f.first_line_indent = -SANGRIA
    elif align == WD_ALIGN_PARAGRAPH.LEFT:
        f.first_line_indent = SANGRIA
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
    ancho, alto = (ANCHO_H, ALTO_H) if horizontal else (ANCHO_MAX, ALTO_MAX)
    if path.name.startswith("qr-"):
        ancho = ANCHO_QR
    if ancho * h / w > alto:
        ancho = int(alto * w / h)

    # APA 7: número de figura en negrita y título en cursiva sobre la imagen; la explicación va como nota.
    numero, titulo, nota = "", caption, ""
    m = FIGURA.match(caption or "")
    if m:
        numero, resto = m.groups()
        partes = re.split(r"(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ¿])", resto, maxsplit=1)
        titulo = partes[0].rstrip(".")
        nota = partes[1] if len(partes) > 1 else ""

    def linea(texto, negrita=False, cursiva=False):
        c = doc.add_paragraph()
        c.alignment = WD_ALIGN_PARAGRAPH.LEFT
        c.paragraph_format.keep_with_next = True
        c.paragraph_format.space_after = Pt(0)
        c.paragraph_format.line_spacing = INTERLINEADO
        r = c.add_run(texto)
        r.bold = negrita or None
        r.italic = cursiva or None

    if numero:
        linea(numero, negrita=True)
    if titulo:
        linea(titulo, cursiva=True)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = bool(nota)
    p.add_run().add_picture(str(path), width=ancho)
    if nota:
        c = doc.add_paragraph()
        c.alignment = WD_ALIGN_PARAGRAPH.LEFT
        c.paragraph_format.space_after = Pt(12)
        c.paragraph_format.line_spacing = INTERLINEADO
        c.add_run("Nota. ").italic = True
        add_runs(c, nota, color=TEXTO)


def render_markdown(doc, md_path, text, desplazar=0, centrado=False, referencias=False):
    lines = text.replace("\r\n", "\n").split("\n")
    i = 0
    buf = []
    align = WD_ALIGN_PARAGRAPH.CENTER if centrado else WD_ALIGN_PARAGRAPH.LEFT

    def flush():
        nonlocal buf
        chunk = " ".join(x.strip() for x in buf).strip()
        buf = []
        if chunk:
            add_paragraph(doc, chunk, align, referencia=referencias)

    def es_apaisada(k):
        m = IMAGEN.match(lines[k].strip()) if k < len(lines) else None
        return bool(m) and Path(m.group(2)).name.startswith(APAISADAS)

    while i < len(lines):
        line = lines[i]
        s = line.strip()

        if s and s != "---":
            siguiente = next((k for k in range(i + 1, len(lines)) if lines[k].strip()), len(lines))
            quiere = es_apaisada(i) or (s.startswith("#") and es_apaisada(siguiente))
            if quiere != horizontal:
                flush()
                orientar(doc, quiere)

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
            p.paragraph_format.left_indent = SANGRIA
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = INTERLINEADO
            add_runs(p, " ".join(quote), color=TEXTO)
            continue

        if s.startswith("- ") or s.startswith("* "):
            flush()
            p = doc.add_paragraph(style="List Bullet")
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = INTERLINEADO
            add_runs(p, s[2:], color=TEXTO)
            i += 1
            continue

        m = NUMERADA.match(s)
        if m:
            flush()
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Cm(0.9)
            p.paragraph_format.first_line_indent = Cm(-0.6)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = INTERLINEADO
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
    section.top_margin = MARGEN
    section.bottom_margin = MARGEN
    section.left_margin = MARGEN
    section.right_margin = MARGEN
    section.header_distance = Cm(1.27)
    section.footer_distance = Cm(1.27)


def orientar(doc, apaisado):
    global horizontal
    horizontal = apaisado
    s = doc.add_section(WD_SECTION.NEW_PAGE)
    apply_margins(s)
    for pg in s._sectPr.findall(qn("w:pgNumType")):
        s._sectPr.remove(pg)
    w, h = s.page_width, s.page_height
    if apaisado != (w > h):
        s.page_width, s.page_height = h, w
    s.orientation = WD_ORIENT.LANDSCAPE if apaisado else WD_ORIENT.PORTRAIT


def pie_con_numero(section, start_at):
    """Número de página en el pie, alineado a la derecha."""
    section.footer.is_linked_to_previous = False
    p = section.footer.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    add_field(p, "PAGE")
    pg = OxmlElement("w:pgNumType")
    pg.set(qn("w:start"), str(start_at))
    section._sectPr.append(pg)


def fijar_fuente(estilo, nombre):
    estilo.font.name = nombre
    rfonts = estilo.element.get_or_add_rPr().get_or_add_rFonts()
    for atributo in ("w:asciiTheme", "w:hAnsiTheme", "w:eastAsiaTheme", "w:cstheme"):
        rfonts.attrib.pop(qn(atributo), None)
    for atributo in ("w:ascii", "w:hAnsi", "w:eastAsia", "w:cs"):
        rfonts.set(qn(atributo), nombre)


def configurar_estilos(doc):
    normal = doc.styles["Normal"]
    fijar_fuente(normal, FUENTE)
    normal.font.size = Pt(12)
    normal.font.color.rgb = TEXTO
    normal.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    normal.paragraph_format.space_after = Pt(0)
    for nombre in ("List Bullet", "Header", "Footer"):
        fijar_fuente(doc.styles[nombre], FUENTE)
    # APA 7, niveles 1 a 4: centrado negrita; izquierda negrita; izquierda negrita cursiva; sangría negrita.
    for nivel in (1, 2, 3, 4):
        st = doc.styles[f"Heading {nivel}"]
        fijar_fuente(st, FUENTE)
        st.font.size = Pt(12)
        st.font.bold = True
        st.font.italic = nivel == 3
        st.font.color.rgb = AZUL
        f = st.paragraph_format
        f.alignment = WD_ALIGN_PARAGRAPH.CENTER if nivel == 1 else WD_ALIGN_PARAGRAPH.LEFT
        f.left_indent = SANGRIA if nivel == 4 else Cm(0)
        f.line_spacing = INTERLINEADO
        f.space_before = Pt(12 if nivel > 1 else 0)
        f.space_after = Pt(0)
        f.keep_with_next = True


def construir():
    doc = Document()
    apply_margins(doc.sections[0])
    configurar_estilos(doc)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.line_spacing = INTERLINEADO
    p.add_run("Índice").bold = True
    add_field(doc.add_paragraph(), 'TOC \\o "1-3" \\h \\z \\u')

    body = doc.add_section(WD_SECTION.NEW_PAGE)
    apply_margins(body)
    pie_con_numero(body, 1)

    for k, rel in enumerate(CAPITULOS):
        path = ROOT / rel
        texto = path.read_text(encoding="utf-8")
        primera = texto.lstrip().split("\n", 1)[0]
        desplazar = 1 if primera.startswith("# ") and SUBSECCION.match(primera[2:]) else 0
        if k and not desplazar:
            doc.add_page_break()
        render_markdown(doc, path, texto, desplazar, referencias="bibliografia" in rel)

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
        if PORTADA_DOCX.exists():
            d.Range(0, 0).InsertFile(str(PORTADA_DOCX))
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
