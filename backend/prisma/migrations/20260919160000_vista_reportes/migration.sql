CREATE OR REPLACE VIEW v_reporte_ventas AS
SELECT
  v.creada_en AS fecha_hora,
  s.nombre AS sucursal_nombre,
  v.almacen_id,
  v.caja_turno_id,
  u.nombre AS cajero_nombre,
  v.id AS venta_id,
  cli.nombre AS cliente_nombre,
  va.sku AS variante_sku,
  p.nombre AS producto_nombre,
  va.talla,
  va.color,
  lv.cantidad,
  lv.precio_unitario,
  (lv.cantidad * lv.precio_unitario) AS subtotal,
  v.medio_pago::text AS medio_pago
FROM ventas v
JOIN lineas_venta lv ON lv.venta_id = v.id
JOIN variantes va ON va.id = lv.variante_id
JOIN productos p ON p.id = va.producto_id
JOIN almacenes a ON a.id = v.almacen_id
JOIN sucursales s ON s.id = a.sucursal_id
LEFT JOIN caja_turnos t ON t.id = v.caja_turno_id
LEFT JOIN usuarios u ON u.id = t.cajero_id
LEFT JOIN usuarios cli ON cli.id = v.clienta_id
WHERE v.estado = 'cobrada';
