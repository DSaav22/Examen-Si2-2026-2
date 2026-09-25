export type FacturaLineaHtml = {
  nombre: string;
  detalle: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
};

export type FacturaHtmlDatos = {
  id: string;
  total: number;
  medio: string;
  canal: string;
  fecha: string;
  nit: string;
  sucursal: string;
  clientaNombre: string;
  clientaEmail: string;
  lineas: FacturaLineaHtml[];
};

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function numeroFactura(id: string) {
  return `F-${id.replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}

export function plantillaFacturaHtml(d: FacturaHtmlDatos): string {
  const nro = numeroFactura(d.id);
  const filas = d.lineas
    .map(
      (l, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${esc(l.nombre)}</strong>${l.detalle ? ` · ${esc(l.detalle)}` : ''}</td>
        <td style="text-align:center">${l.cantidad}</td>
        <td style="text-align:right">Bs ${l.precioUnitario.toFixed(2)}</td>
        <td style="text-align:right">Bs ${l.subtotal.toFixed(2)}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/><title>Factura ${nro}</title></head>
<body style="font-family:Segoe UI,Arial,sans-serif;color:#1a1512;margin:0;padding:24px;background:#f7f1ea">
  <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e4dbd2;border-radius:12px;padding:28px">
    <table width="100%" style="border-bottom:2px solid #1a1512;padding-bottom:12px;margin-bottom:16px">
      <tr>
        <td>
          <div style="font-size:26px;font-weight:750">EnsayAR</div>
          <div style="color:#6a625c;font-size:13px">Tienda de moda · Bolivia</div>
          <div style="color:#6a625c;font-size:13px">NIT ${esc(d.nit)}</div>
          <div style="color:#6a625c;font-size:13px">${esc(d.sucursal)}</div>
        </td>
        <td style="text-align:right;vertical-align:top">
          <div style="font-size:18px;font-weight:700">${nro}</div>
          <div style="font-size:13px">${esc(d.fecha)}</div>
          <div style="display:inline-block;margin-top:6px;border:1px solid #1a1512;padding:2px 8px;font-size:11px;text-transform:uppercase">Factura simulada</div>
        </td>
      </tr>
    </table>
    <table width="100%" style="margin-bottom:16px">
      <tr>
        <td style="width:50%;padding:10px;border:1px solid #e4dbd2;border-radius:8px;vertical-align:top">
          <div style="font-size:11px;text-transform:uppercase;color:#7a716a;letter-spacing:.06em">Cliente</div>
          <div style="font-weight:700">${esc(d.clientaNombre)}</div>
          <div>${esc(d.clientaEmail)}</div>
        </td>
        <td style="width:12px"></td>
        <td style="width:50%;padding:10px;border:1px solid #e4dbd2;border-radius:8px;vertical-align:top">
          <div style="font-size:11px;text-transform:uppercase;color:#7a716a;letter-spacing:.06em">Cobro</div>
          <div>Medio: ${esc(d.medio)}</div>
          <div>Canal: ${esc(d.canal.toUpperCase())}</div>
          <div>Ref. ${esc(d.id.slice(0, 8))}</div>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px">
      <thead>
        <tr>
          <th align="left" style="border-bottom:1.5px solid #1a1512;padding:8px 4px">#</th>
          <th align="left" style="border-bottom:1.5px solid #1a1512;padding:8px 4px">Descripción</th>
          <th align="center" style="border-bottom:1.5px solid #1a1512;padding:8px 4px">Cant.</th>
          <th align="right" style="border-bottom:1.5px solid #1a1512;padding:8px 4px">P. unit.</th>
          <th align="right" style="border-bottom:1.5px solid #1a1512;padding:8px 4px">Subtotal</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
    <div style="text-align:right;margin-top:8px">
      <div style="display:inline-block;min-width:200px;text-align:left">
        <div style="display:flex;justify-content:space-between;padding:4px 0"><span>Subtotal</span><span>Bs ${d.total.toFixed(2)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:4px 0;color:#6a625c"><span>IVA / fiscal</span><span>No aplica (demo)</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0 0;margin-top:4px;border-top:2px solid #1a1512;font-size:18px;font-weight:750"><span>Total</span><span>Bs ${d.total.toFixed(2)}</span></div>
      </div>
    </div>
    <p style="margin-top:24px;padding-top:12px;border-top:1px dashed #cfc6bd;font-size:12px;color:#6a625c">
      Documento de demostración académica. Sin validez tributaria. EnsayAR · ${nro}.
    </p>
  </div>
</body>
</html>`;
}
