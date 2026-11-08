import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import type { ColumnaResultado } from './compilador';

export type Fila = Record<string, string | number | null>;

export interface ReporteParaExportar {
  tienda: string;
  titulo: string;
  generadoEn: Date;
  criterios: { fuente: string; filtros: string[]; agrupar: string[]; orden: string[] };
  columnas: ColumnaResultado[];
  filas: Fila[];
  totales: Record<string, number> | null;
  sql: string;
  parametros: unknown[];
  avisos: string[];
  motor: string;
}

const esNumero = (c: ColumnaResultado) => c.tipo === 'entero' || c.tipo === 'numero' || c.tipo === 'dinero';

function fechaHumana(d: Date) {
  return d.toLocaleString('es-BO', { timeZone: 'America/La_Paz', dateStyle: 'short', timeStyle: 'short' });
}

export function lineasDeCriterios(r: ReporteParaExportar): string[] {
  return [
    `Fuente: ${r.criterios.fuente}`,
    r.criterios.filtros.length ? `Criterios: ${r.criterios.filtros.join(' · ')}` : 'Criterios: ninguno (todos los registros)',
    ...(r.criterios.agrupar.length ? [`Agrupado por: ${r.criterios.agrupar.join(', ')}`] : []),
    ...(r.criterios.orden.length ? [`Orden: ${r.criterios.orden.join(', ')}`] : []),
  ];
}

function textoCelda(c: ColumnaResultado, v: string | number | null | undefined): string {
  if (v == null || v === '') return '';
  if (c.tipo === 'dinero') return Number(v).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (c.tipo === 'numero') return Number(v).toLocaleString('es-BO', { maximumFractionDigits: 2 });
  if (c.tipo === 'entero') return Number(v).toLocaleString('es-BO', { maximumFractionDigits: 0 });
  if (c.tipo === 'fecha') {
    const [y, m, d] = String(v).slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  if (c.tipo === 'fechahora') {
    const s = String(v);
    const [y, m, d] = s.slice(0, 10).split('-');
    return `${d}/${m}/${y} ${s.slice(11, 16)}`;
  }
  return String(v);
}

/* ───────────── Excel ───────────── */

export async function aExcel(r: ReporteParaExportar): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'EnsayAR · Reportes inteligentes';
  libro.created = r.generadoEn;
  const hoja = libro.addWorksheet('Reporte', { views: [{ state: 'frozen', ySplit: 0 }] });

  const ancho = Math.max(r.columnas.length, 1);
  const encabezado: [string, Partial<ExcelJS.Font>][] = [
    [r.tienda, { bold: true, size: 12, color: { argb: 'FF6B7280' } }],
    [r.titulo, { bold: true, size: 15 }],
    ...lineasDeCriterios(r).map((l): [string, Partial<ExcelJS.Font>] => [l, { size: 10, color: { argb: 'FF374151' } }]),
    [`Generado: ${fechaHumana(r.generadoEn)} · ${r.filas.length} filas · intérprete: ${r.motor}`, { size: 9, italic: true, color: { argb: 'FF6B7280' } }],
    ...r.avisos.map((a): [string, Partial<ExcelJS.Font>] => [`Aviso: ${a}`, { size: 9, color: { argb: 'FFB45309' } }]),
  ];
  for (const [texto, fuente] of encabezado) {
    const fila = hoja.addRow([texto]);
    hoja.mergeCells(fila.number, 1, fila.number, ancho);
    fila.getCell(1).font = fuente;
  }
  hoja.addRow([]);

  const filaCab = hoja.addRow(r.columnas.map((c) => c.etiqueta));
  filaCab.eachCell((celda) => {
    celda.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    celda.alignment = { vertical: 'middle', wrapText: true };
  });
  const primeraDato = filaCab.number + 1;

  for (const f of r.filas) {
    hoja.addRow(
      r.columnas.map((c) => {
        const v = f[c.clave];
        if (v == null) return null;
        if (esNumero(c)) return Number(v);
        if (c.tipo === 'fecha') return new Date(`${String(v).slice(0, 10)}T00:00:00Z`);
        if (c.tipo === 'fechahora') return new Date(`${String(v).slice(0, 19)}Z`);
        return v;
      }),
    );
  }

  r.columnas.forEach((c, i) => {
    const col = hoja.getColumn(i + 1);
    if (c.tipo === 'dinero') col.numFmt = '#,##0.00';
    else if (c.tipo === 'numero') col.numFmt = '#,##0.##';
    else if (c.tipo === 'entero') col.numFmt = '#,##0';
    else if (c.tipo === 'fecha') col.numFmt = 'dd/mm/yyyy';
    else if (c.tipo === 'fechahora') col.numFmt = 'dd/mm/yyyy hh:mm';
    const largo = Math.max(c.etiqueta.length, ...r.filas.slice(0, 300).map((f) => textoCelda(c, f[c.clave]).length));
    col.width = Math.min(48, Math.max(10, largo + 2));
  });

  if (r.totales && r.filas.length) {
    const fila = hoja.addRow(r.columnas.map((c, i) => (i === 0 ? 'TOTAL' : c.clave in r.totales! ? r.totales![c.clave] : null)));
    fila.eachCell((celda) => {
      celda.font = { bold: true };
      celda.border = { top: { style: 'thin' } };
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    });
  }

  hoja.autoFilter = { from: { row: filaCab.number, column: 1 }, to: { row: filaCab.number, column: ancho } };
  hoja.views = [{ state: 'frozen', ySplit: filaCab.number }];
  hoja.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: `${filaCab.number}:${filaCab.number}` };
  void primeraDato;

  const tecnica = libro.addWorksheet('Cómo se generó');
  tecnica.columns = [{ width: 24 }, { width: 110 }];
  const filasTec: [string, string][] = [
    ['Título', r.titulo],
    ...lineasDeCriterios(r).map((l): [string, string] => {
      const [k, ...v] = l.split(': ');
      return [k, v.join(': ')];
    }),
    ['Intérprete', r.motor],
    ['Parámetros', JSON.stringify(r.parametros)],
    ['SQL ejecutado', r.sql],
  ];
  for (const [k, v] of filasTec) {
    const fila = tecnica.addRow([k, v]);
    fila.getCell(1).font = { bold: true };
    fila.getCell(2).alignment = { wrapText: true, vertical: 'top' };
  }

  return Buffer.from(await libro.xlsx.writeBuffer());
}

/* ───────────── PDF ───────────── */

export function aPdf(r: ReporteParaExportar): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36, bufferPages: true, info: { Title: r.titulo, Author: r.tienda } });
    const partes: Buffer[] = [];
    doc.on('data', (b: Buffer) => partes.push(b));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);

    const izq = doc.page.margins.left;
    const anchoUtil = doc.page.width - izq - doc.page.margins.right;
    const fondo = () => doc.page.height - doc.page.margins.bottom - 18;

    doc.fillColor('#6B7280').font('Helvetica-Bold').fontSize(10).text(r.tienda.toUpperCase(), izq, 36);
    doc.fillColor('#111827').fontSize(17).text(r.titulo, { width: anchoUtil });
    doc.moveDown(0.3).font('Helvetica').fontSize(9).fillColor('#374151');
    for (const l of lineasDeCriterios(r)) doc.text(l, { width: anchoUtil });
    doc.fillColor('#6B7280').text(`Generado: ${fechaHumana(r.generadoEn)} · ${r.filas.length} filas · intérprete: ${r.motor}`);
    for (const a of r.avisos) doc.fillColor('#B45309').text(`Aviso: ${a}`, { width: anchoUtil });
    doc.moveDown(0.6);

    // Ancho de cada columna según el largo típico de su contenido.
    const tam = 8;
    doc.fontSize(tam);
    const pesos = r.columnas.map((c) => {
      const muestras = r.filas.slice(0, 200).map((f) => textoCelda(c, f[c.clave]).length);
      const tipico = muestras.length ? muestras.sort((a, b) => a - b)[Math.floor(muestras.length * 0.9)] : 0;
      return Math.min(40, Math.max(6, c.etiqueta.length * 0.8, tipico));
    });
    const sumaPesos = pesos.reduce((a, b) => a + b, 0) || 1;
    const anchos = pesos.map((p) => (p / sumaPesos) * anchoUtil);
    const alto = 15;

    const fila = (valores: string[], y: number, opciones: { negrita?: boolean; fondo?: string; color?: string }) => {
      if (opciones.fondo) doc.rect(izq, y, anchoUtil, alto).fill(opciones.fondo);
      doc.font(opciones.negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(tam).fillColor(opciones.color ?? '#111827');
      let x = izq;
      valores.forEach((v, i) => {
        const c = r.columnas[i];
        doc.text(v, x + 3, y + 4, { width: anchos[i] - 6, height: alto - 4, ellipsis: true, lineBreak: false, align: c && esNumero(c) ? 'right' : 'left' });
        x += anchos[i];
      });
    };
    const cabecera = (y: number) => fila(r.columnas.map((c) => c.etiqueta), y, { negrita: true, fondo: '#1F2937', color: '#FFFFFF' });

    let y = doc.y;
    cabecera(y);
    y += alto;
    if (!r.filas.length) {
      doc.font('Helvetica-Oblique').fontSize(10).fillColor('#6B7280').text('No hay registros que cumplan los criterios.', izq, y + 8);
    }
    r.filas.forEach((f, i) => {
      if (y + alto > fondo()) {
        doc.addPage();
        y = doc.page.margins.top;
        cabecera(y);
        y += alto;
      }
      fila(r.columnas.map((c) => textoCelda(c, f[c.clave])), y, { fondo: i % 2 ? '#F9FAFB' : undefined });
      y += alto;
    });
    if (r.totales && r.filas.length) {
      if (y + alto > fondo()) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      doc.moveTo(izq, y).lineTo(izq + anchoUtil, y).strokeColor('#9CA3AF').stroke();
      fila(r.columnas.map((c, i) => (i === 0 ? 'TOTAL' : c.clave in r.totales! ? textoCelda(c, r.totales![c.clave]) : '')), y, { negrita: true, fondo: '#F3F4F6' });
    }

    const paginas = doc.bufferedPageRange();
    for (let i = 0; i < paginas.count; i++) {
      doc.switchToPage(paginas.start + i);
      doc.font('Helvetica').fontSize(8).fillColor('#9CA3AF');
      const margenInferior = doc.page.margins.bottom;
      // pdfkit agrega una página si se escribe por debajo del margen inferior.
      doc.page.margins.bottom = 0;
      const pie = doc.page.height - margenInferior + 8;
      doc.text(`${r.titulo} · ${r.tienda}`, izq, pie, { width: anchoUtil / 2, lineBreak: false, ellipsis: true, height: 10 });
      doc.text(`Página ${i + 1} de ${paginas.count}`, izq + anchoUtil / 2, pie, { width: anchoUtil / 2, align: 'right', lineBreak: false });
      doc.page.margins.bottom = margenInferior;
    }
    doc.end();
  });
}
