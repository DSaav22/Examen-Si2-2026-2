/**
 * Capa semántica de los reportes inteligentes.
 *
 * El usuario (o el modelo de IA) nunca escribe SQL: elige una fuente y campos de este
 * catálogo. Cada campo trae su expresión SQL fija, revisada a mano; el compilador solo
 * combina estas piezas y pasa los valores del usuario como parámetros ($1, $2…).
 */

export type TipoCampo = 'texto' | 'entero' | 'numero' | 'dinero' | 'fecha' | 'fechahora' | 'logico';

export interface Campo {
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  /** Expresión SQL fila a fila (o agregada si `agregado`). */
  sql: string;
  /** Palabras con las que la gente nombra el campo, sin tildes y en minúsculas. */
  sinonimos: string[];
  /** Joins opcionales de la fuente que necesita esta expresión. */
  joins?: string[];
  /** La expresión ya es un agregado (COUNT…): obliga a agrupar. */
  agregado?: boolean;
  /** Numérico que se usa para agrupar (año, hora), no para sumar. */
  dimension?: boolean;
  /** Valores posibles cuando el campo es una lista cerrada (enum). */
  valores?: string[];
  /** Agregación que se aplica si el reporte está agrupado y el campo no la indica. */
  agregacionPorDefecto?: Agregacion;
  descripcion?: string;
}

export interface Fuente {
  clave: string;
  etiqueta: string;
  descripcion: string;
  sinonimos: string[];
  desde: string;
  /** Condición fija: aislamiento por tienda y reglas de negocio de la fuente. */
  dondeBase: string;
  joins: Record<string, string>;
  /** Dependencias entre joins (un join que usa el alias de otro). */
  joinsRequieren?: Record<string, string[]>;
  campos: Campo[];
  columnasPorDefecto: string[];
  medidasAlAgrupar: { campo: string; agregacion?: Agregacion }[];
  ordenPorDefecto: { campo: string; dir: 'asc' | 'desc' };
  campoFecha?: string;
  medidaPrincipal: string;
}

export type Agregacion = 'suma' | 'promedio' | 'conteo' | 'conteo_distinto' | 'minimo' | 'maximo';

export const AGREGACIONES: Record<Agregacion, { sql: (e: string) => string; etiqueta: (e: string) => string }> = {
  suma: { sql: (e) => `SUM(${e})`, etiqueta: (e) => `Total ${e.toLowerCase()}` },
  promedio: { sql: (e) => `ROUND(AVG(${e})::numeric, 2)`, etiqueta: (e) => `Promedio ${e.toLowerCase()}` },
  conteo: { sql: (e) => `COUNT(${e})`, etiqueta: (e) => `N.º de ${e.toLowerCase()}` },
  conteo_distinto: { sql: (e) => `COUNT(DISTINCT ${e})`, etiqueta: (e) => `${e} distintos` },
  minimo: { sql: (e) => `MIN(${e})`, etiqueta: (e) => `${e} mínimo` },
  maximo: { sql: (e) => `MAX(${e})`, etiqueta: (e) => `${e} máximo` },
};

export const ZONA_HORARIA = 'America/La_Paz';
const TIENDA = "current_setting('app.tienda_id', true)";
/** Las fechas se guardan en UTC; los reportes se leen en hora de Bolivia. */
export const local = (col: string) => `(${col} AT TIME ZONE 'UTC' AT TIME ZONE '${ZONA_HORARIA}')`;
export const HOY = `(now() AT TIME ZONE '${ZONA_HORARIA}')::date`;

const ESTADOS_VENTA = ['cobrada', 'devuelta_parcial', 'devuelta'];
const MEDIOS = ['efectivo', 'qr', 'tarjeta', 'transferencia', 'contra_entrega', 'mixto', 'credito'];

const diaSemana = (col: string) =>
  `(ARRAY['lunes','martes','miércoles','jueves','viernes','sábado','domingo'])[EXTRACT(ISODOW FROM ${local(col)})::int]`;

const direccionDe = (usuario: string) => `LEFT JOIN LATERAL (
    SELECT d.detalle, d.ciudad FROM direcciones_cliente d
    WHERE d.usuario_id = ${usuario}
    ORDER BY (d.etiqueta = 'Casa') DESC, d.id LIMIT 1) dir ON true`;

const ventas: Fuente = {
  clave: 'ventas',
  etiqueta: 'Ventas',
  descripcion: 'Cada prenda vendida (línea de venta) con su ticket, sucursal, cajero, clienta, producto y medio de pago.',
  sinonimos: ['venta', 'ventas', 'vendido', 'vendidos', 'vendidas', 'vendio', 'vendieron', 'vende', 'venden', 'facturacion', 'ingresos', 'tickets', 'cobros', 'recaudacion'],
  desde: `lineas_venta lv
  JOIN ventas v ON v.id = lv.venta_id
  JOIN variantes va ON va.id = lv.variante_id
  JOIN productos p ON p.id = va.producto_id
  JOIN almacenes a ON a.id = v.almacen_id
  JOIN sucursales s ON s.id = a.sucursal_id`,
  dondeBase: `lv.tienda_id = ${TIENDA} AND v.estado IN (${ESTADOS_VENTA.map((e) => `'${e}'`).join(', ')}) AND lv.cantidad > lv.cantidad_devuelta`,
  joins: {
    clienta: 'LEFT JOIN usuarios cl ON cl.id = v.clienta_id',
    cajero: 'LEFT JOIN caja_turnos ct ON ct.id = v.caja_turno_id LEFT JOIN usuarios cj ON cj.id = ct.cajero_id',
    bruto: 'JOIN LATERAL (SELECT SUM(x.cantidad * x.precio_unitario) AS total FROM lineas_venta x WHERE x.venta_id = v.id) br ON true',
    proveedor: 'LEFT JOIN proveedores pr ON pr.id = p.proveedor_id',
  },
  campos: [
    { clave: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', sql: `${local('v.creada_en')}::date`, sinonimos: ['fecha', 'dia', 'dias', 'diario', 'diaria', 'cuando'] },
    { clave: 'fecha_hora', etiqueta: 'Fecha y hora', tipo: 'fechahora', sql: local('v.creada_en'), sinonimos: ['fecha y hora', 'hora exacta'] },
    { clave: 'mes', etiqueta: 'Mes', tipo: 'texto', sql: `to_char(${local('v.creada_en')}, 'YYYY-MM')`, sinonimos: ['mes', 'meses', 'mensual', 'mensuales'] },
    { clave: 'anio', etiqueta: 'Año', tipo: 'entero', sql: `EXTRACT(YEAR FROM ${local('v.creada_en')})::int`, dimension: true, sinonimos: ['ano', 'anio', 'anual', 'gestion'] },
    { clave: 'dia_semana', etiqueta: 'Día de la semana', tipo: 'texto', sql: diaSemana('v.creada_en'), sinonimos: ['dia de la semana', 'dias de la semana'] },
    { clave: 'hora', etiqueta: 'Hora', tipo: 'entero', sql: `EXTRACT(HOUR FROM ${local('v.creada_en')})::int`, dimension: true, sinonimos: ['hora', 'horas', 'horario', 'franja horaria'] },
    { clave: 'ticket', etiqueta: 'Ticket', tipo: 'texto', sql: 'v.uuid', sinonimos: ['ticket', 'numero de venta', 'comprobante', 'recibo'] },
    { clave: 'sucursal', etiqueta: 'Sucursal', tipo: 'texto', sql: 's.nombre', sinonimos: ['sucursal', 'sucursales', 'tienda', 'tiendas', 'local', 'locales', 'punto de venta'] },
    { clave: 'ciudad', etiqueta: 'Ciudad', tipo: 'texto', sql: 's.ciudad', sinonimos: ['ciudad', 'ciudades', 'departamento', 'departamentos'] },
    { clave: 'cajero', etiqueta: 'Cajero', tipo: 'texto', sql: "COALESCE(NULLIF(cj.nombre, ''), cj.email, 'Online')", joins: ['cajero'], sinonimos: ['cajero', 'cajeros', 'cajera', 'cajeras', 'vendedor', 'vendedores', 'vendedora', 'vendedoras'] },
    { clave: 'clienta', etiqueta: 'Clienta', tipo: 'texto', sql: "COALESCE(NULLIF(cl.nombre, ''), cl.email, 'Consumidor final')", joins: ['clienta'], sinonimos: ['clienta', 'clientas', 'cliente', 'clientes', 'compradora', 'compradoras', 'comprador', 'compradores'] },
    { clave: 'email_clienta', etiqueta: 'Email clienta', tipo: 'texto', sql: 'cl.email', joins: ['clienta'], sinonimos: ['email', 'correo', 'correos', 'mail', 'e-mail'] },
    { clave: 'producto', etiqueta: 'Producto', tipo: 'texto', sql: 'p.nombre', sinonimos: ['producto', 'productos', 'prenda', 'prendas', 'articulo', 'articulos', 'modelo', 'modelos'] },
    { clave: 'categoria', etiqueta: 'Categoría', tipo: 'texto', sql: 'p.categoria', sinonimos: ['categoria', 'categorias', 'linea', 'lineas', 'tipo de prenda'] },
    { clave: 'ocasion', etiqueta: 'Ocasión', tipo: 'texto', sql: 'p.ocasion', sinonimos: ['ocasion', 'ocasiones', 'estilo', 'estilos'] },
    { clave: 'proveedor', etiqueta: 'Proveedor', tipo: 'texto', sql: "COALESCE(pr.nombre, 'Sin proveedor')", joins: ['proveedor'], sinonimos: ['proveedor', 'proveedores', 'marca', 'marcas'] },
    { clave: 'talla', etiqueta: 'Talla', tipo: 'texto', sql: 'va.talla', sinonimos: ['talla', 'tallas', 'talle', 'talles'] },
    { clave: 'color', etiqueta: 'Color', tipo: 'texto', sql: 'va.color', sinonimos: ['color', 'colores'] },
    { clave: 'sku', etiqueta: 'SKU', tipo: 'texto', sql: 'va.sku', sinonimos: ['sku', 'codigo', 'codigos'] },
    { clave: 'canal', etiqueta: 'Canal', tipo: 'texto', sql: 'v.canal::text', valores: ['pos', 'online'], sinonimos: ['canal', 'canales'] },
    { clave: 'medio_pago', etiqueta: 'Medio de pago', tipo: 'texto', sql: 'v.medio_pago::text', valores: MEDIOS, sinonimos: ['medio de pago', 'medios de pago', 'forma de pago', 'formas de pago', 'metodo de pago', 'metodos de pago', 'tipo de pago'] },
    { clave: 'estado', etiqueta: 'Estado', tipo: 'texto', sql: 'v.estado::text', valores: ESTADOS_VENTA, sinonimos: ['estado de la venta'] },
    { clave: 'cantidad', etiqueta: 'Unidades', tipo: 'entero', sql: '(lv.cantidad - lv.cantidad_devuelta)', agregacionPorDefecto: 'suma', sinonimos: ['unidades', 'cantidad', 'cantidades', 'piezas', 'prendas vendidas', 'volumen'] },
    { clave: 'precio_unitario', etiqueta: 'Precio unitario', tipo: 'dinero', sql: 'lv.precio_unitario', agregacionPorDefecto: 'promedio', sinonimos: ['precio', 'precios', 'precio unitario'] },
    {
      clave: 'importe',
      etiqueta: 'Importe',
      tipo: 'dinero',
      sql: 'ROUND((lv.cantidad - lv.cantidad_devuelta) * lv.precio_unitario * v.total / NULLIF(br.total, 0), 2)',
      joins: ['bruto'],
      agregacionPorDefecto: 'suma',
      descripcion: 'Lo cobrado por la línea, con el descuento de cupón prorrateado y sin lo devuelto.',
      sinonimos: ['importe', 'importes', 'monto', 'montos', 'total', 'totales', 'dinero', 'facturado', 'ingreso', 'ingresos', 'recaudado', 'bolivianos', 'bs', 'vendido en bs'],
    },
    { clave: 'tickets', etiqueta: 'Tickets', tipo: 'entero', sql: 'COUNT(DISTINCT v.id)', agregado: true, sinonimos: ['tickets', 'numero de ventas', 'cantidad de ventas', 'operaciones', 'transacciones', 'compras'] },
    { clave: 'ticket_promedio', etiqueta: 'Ticket promedio', tipo: 'dinero', sql: 'ROUND(SUM((lv.cantidad - lv.cantidad_devuelta) * lv.precio_unitario * v.total / NULLIF(br.total, 0)) / NULLIF(COUNT(DISTINCT v.id), 0), 2)', joins: ['bruto'], agregado: true, sinonimos: ['ticket promedio', 'venta promedio', 'gasto promedio'] },
    { clave: 'clientas_distintas', etiqueta: 'Clientas distintas', tipo: 'entero', sql: 'COUNT(DISTINCT v.clienta_id)', agregado: true, sinonimos: ['clientas distintas', 'clientes distintos', 'cuantas clientas', 'cuantos clientes'] },
  ],
  columnasPorDefecto: ['fecha', 'sucursal', 'clienta', 'producto', 'talla', 'color', 'cantidad', 'importe', 'medio_pago'],
  medidasAlAgrupar: [{ campo: 'tickets' }, { campo: 'cantidad', agregacion: 'suma' }, { campo: 'importe', agregacion: 'suma' }],
  ordenPorDefecto: { campo: 'fecha_hora', dir: 'desc' },
  campoFecha: 'fecha',
  medidaPrincipal: 'importe',
};

const clientes: Fuente = {
  clave: 'clientes',
  etiqueta: 'Clientes',
  descripcion: 'Una fila por clienta registrada, con sus datos de contacto, compras acumuladas y deuda por ventas al crédito.',
  sinonimos: ['cliente', 'clientes', 'clienta', 'clientas', 'compradoras', 'compradores', 'deudores', 'deudoras', 'morosos', 'morosas'],
  desde: 'usuarios u JOIN cuentas cu ON cu.id = u.cuenta_id',
  dondeBase: `u.tienda_id = ${TIENDA} AND u.rol = 'CLIENTA'`,
  joins: {
    direccion: direccionDe('u.id'),
    compras: `LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS n, COALESCE(SUM(v.total), 0) AS total, MAX(v.creada_en) AS ultima
    FROM ventas v WHERE v.clienta_id = u.id AND v.estado IN ('cobrada', 'devuelta_parcial')) vc ON true`,
    credito: `LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(c.saldo), 0) AS deuda, COALESCE(SUM(c.monto), 0) AS fiado,
           COUNT(*) FILTER (WHERE c.saldo > 0)::int AS abiertos,
           COALESCE(MAX(GREATEST(0, ${HOY} - ${local('c.vence_en')}::date)) FILTER (WHERE c.saldo > 0), 0)::int AS mora,
           MIN(c.vence_en) FILTER (WHERE c.saldo > 0) AS proximo
    FROM cuentas_cobrar c WHERE c.clienta_id = u.id) cr ON true`,
  },
  campos: [
    { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto', sql: "COALESCE(NULLIF(u.nombre, ''), u.email)", sinonimos: ['nombre', 'nombres', 'nombre completo', 'cliente', 'clienta'] },
    { clave: 'email', etiqueta: 'Email', tipo: 'texto', sql: 'u.email', sinonimos: ['email', 'emails', 'correo', 'correos', 'correo electronico', 'mail', 'e-mail'] },
    { clave: 'direccion', etiqueta: 'Dirección', tipo: 'texto', sql: "COALESCE(dir.detalle, 'Sin dirección')", joins: ['direccion'], sinonimos: ['direccion', 'direcciones', 'domicilio', 'domicilios'] },
    { clave: 'ciudad', etiqueta: 'Ciudad', tipo: 'texto', sql: "COALESCE(dir.ciudad, 'Sin ciudad')", joins: ['direccion'], sinonimos: ['ciudad', 'ciudades', 'departamento', 'departamentos'] },
    { clave: 'tipo_cliente', etiqueta: 'Tipo', tipo: 'texto', sql: "CASE WHEN u.mayorista THEN 'mayorista' ELSE 'minorista' END", valores: ['mayorista', 'minorista'], sinonimos: ['tipo de cliente', 'mayorista', 'mayoristas', 'minorista', 'minoristas'] },
    { clave: 'fecha_registro', etiqueta: 'Fecha de registro', tipo: 'fecha', sql: `${local('cu.creada_en')}::date`, sinonimos: ['fecha de registro', 'registro', 'alta', 'antiguedad'] },
    { clave: 'compras', etiqueta: 'Compras', tipo: 'entero', sql: 'COALESCE(vc.n, 0)', joins: ['compras'], agregacionPorDefecto: 'suma', sinonimos: ['compras', 'numero de compras', 'cantidad de compras', 'veces que compro', 'pedidos'] },
    { clave: 'total_comprado', etiqueta: 'Total comprado', tipo: 'dinero', sql: 'COALESCE(vc.total, 0)', joins: ['compras'], agregacionPorDefecto: 'suma', sinonimos: ['total comprado', 'monto comprado', 'gastado', 'gasto', 'consumo', 'compraron', 'compro'] },
    { clave: 'ultima_compra', etiqueta: 'Última compra', tipo: 'fecha', sql: `${local('vc.ultima')}::date`, joins: ['compras'], agregacionPorDefecto: 'maximo', sinonimos: ['ultima compra', 'ultima visita', 'fecha de compra'] },
    {
      clave: 'deuda',
      etiqueta: 'Deuda (saldo crédito)',
      tipo: 'dinero',
      sql: 'COALESCE(cr.deuda, 0)',
      joins: ['credito'],
      agregacionPorDefecto: 'suma',
      descripcion: 'Saldo pendiente de todas sus ventas al crédito.',
      sinonimos: ['deuda', 'deudas', 'debe', 'deben', 'adeuda', 'adeudan', 'saldo', 'saldos', 'saldo pendiente', 'por cobrar', 'monto adeudado', 'monto'],
    },
    { clave: 'total_fiado', etiqueta: 'Total vendido a crédito', tipo: 'dinero', sql: 'COALESCE(cr.fiado, 0)', joins: ['credito'], agregacionPorDefecto: 'suma', sinonimos: ['total fiado', 'vendido a credito', 'credito otorgado', 'total a credito'] },
    { clave: 'creditos_abiertos', etiqueta: 'Créditos abiertos', tipo: 'entero', sql: 'COALESCE(cr.abiertos, 0)', joins: ['credito'], agregacionPorDefecto: 'suma', sinonimos: ['creditos abiertos', 'creditos pendientes', 'cuentas abiertas', 'numero de creditos'] },
    { clave: 'dias_mora', etiqueta: 'Días de mora', tipo: 'entero', sql: 'COALESCE(cr.mora, 0)', joins: ['credito'], agregacionPorDefecto: 'maximo', sinonimos: ['dias de mora', 'mora', 'dias de atraso', 'atraso', 'retraso'] },
    { clave: 'proximo_vencimiento', etiqueta: 'Próximo vencimiento', tipo: 'fecha', sql: `${local('cr.proximo')}::date`, joins: ['credito'], agregacionPorDefecto: 'minimo', sinonimos: ['proximo vencimiento', 'vencimiento', 'vence', 'fecha de vencimiento'] },
    { clave: 'num_clientes', etiqueta: 'Clientes', tipo: 'entero', sql: 'COUNT(*)', agregado: true, sinonimos: ['numero de clientes', 'cantidad de clientes', 'cuantos clientes', 'cuantas clientas', 'numero de clientas'] },
  ],
  columnasPorDefecto: ['nombre', 'email', 'ciudad', 'compras', 'total_comprado', 'deuda'],
  medidasAlAgrupar: [{ campo: 'num_clientes' }, { campo: 'total_comprado', agregacion: 'suma' }, { campo: 'deuda', agregacion: 'suma' }],
  ordenPorDefecto: { campo: 'nombre', dir: 'asc' },
  campoFecha: 'ultima_compra',
  medidaPrincipal: 'total_comprado',
};

const creditos: Fuente = {
  clave: 'creditos',
  etiqueta: 'Créditos',
  descripcion: 'Cada venta al crédito (cuenta por cobrar) con su monto, lo abonado, el saldo, el vencimiento y la mora.',
  sinonimos: ['credito', 'creditos', 'cuentas por cobrar', 'cuenta por cobrar', 'cartera', 'fiados', 'fiado', 'prestamos', 'cobranza', 'cobranzas'],
  desde: `cuentas_cobrar c
  JOIN usuarios cl ON cl.id = c.clienta_id
  JOIN ventas v ON v.id = c.venta_id
  JOIN almacenes a ON a.id = v.almacen_id
  JOIN sucursales s ON s.id = a.sucursal_id`,
  dondeBase: `c.tienda_id = ${TIENDA}`,
  joins: { direccion: direccionDe('cl.id') },
  campos: [
    { clave: 'clienta', etiqueta: 'Clienta', tipo: 'texto', sql: "COALESCE(NULLIF(cl.nombre, ''), cl.email)", sinonimos: ['clienta', 'clientas', 'cliente', 'clientes', 'nombre', 'deudor', 'deudora', 'deudores'] },
    { clave: 'email', etiqueta: 'Email', tipo: 'texto', sql: 'cl.email', sinonimos: ['email', 'correo', 'correos', 'mail'] },
    { clave: 'direccion', etiqueta: 'Dirección', tipo: 'texto', sql: "COALESCE(dir.detalle, 'Sin dirección')", joins: ['direccion'], sinonimos: ['direccion', 'direcciones', 'domicilio'] },
    { clave: 'sucursal', etiqueta: 'Sucursal', tipo: 'texto', sql: 's.nombre', sinonimos: ['sucursal', 'sucursales', 'tienda', 'local'] },
    { clave: 'ciudad', etiqueta: 'Ciudad', tipo: 'texto', sql: 's.ciudad', sinonimos: ['ciudad', 'ciudades'] },
    { clave: 'ticket', etiqueta: 'Ticket', tipo: 'texto', sql: 'v.uuid', sinonimos: ['ticket', 'venta', 'comprobante'] },
    { clave: 'fecha_venta', etiqueta: 'Fecha de venta', tipo: 'fecha', sql: `${local('c.creada_en')}::date`, sinonimos: ['fecha', 'fecha de venta', 'fecha del credito', 'otorgado'] },
    { clave: 'mes', etiqueta: 'Mes', tipo: 'texto', sql: `to_char(${local('c.creada_en')}, 'YYYY-MM')`, sinonimos: ['mes', 'meses', 'mensual'] },
    { clave: 'vence', etiqueta: 'Vence', tipo: 'fecha', sql: `${local('c.vence_en')}::date`, sinonimos: ['vence', 'vencen', 'vencimiento', 'fecha de vencimiento', 'plazo'] },
    { clave: 'monto', etiqueta: 'Monto', tipo: 'dinero', sql: 'c.monto', agregacionPorDefecto: 'suma', sinonimos: ['monto', 'montos', 'monto original', 'importe', 'total'] },
    { clave: 'pagado', etiqueta: 'Abonado', tipo: 'dinero', sql: '(c.monto - c.saldo)', agregacionPorDefecto: 'suma', sinonimos: ['pagado', 'abonado', 'abonos', 'cobrado', 'amortizado'] },
    { clave: 'saldo', etiqueta: 'Saldo', tipo: 'dinero', sql: 'c.saldo', agregacionPorDefecto: 'suma', sinonimos: ['saldo', 'saldos', 'deuda', 'debe', 'deben', 'pendiente', 'por cobrar', 'adeudado'] },
    {
      clave: 'estado',
      etiqueta: 'Estado',
      tipo: 'texto',
      sql: `CASE WHEN c.saldo = 0 THEN 'pagado' WHEN ${local('c.vence_en')}::date < ${HOY} THEN 'vencido' ELSE 'al dia' END`,
      valores: ['pagado', 'vencido', 'al dia'],
      sinonimos: ['estado', 'situacion'],
    },
    { clave: 'dias_mora', etiqueta: 'Días de mora', tipo: 'entero', sql: `CASE WHEN c.saldo > 0 THEN GREATEST(0, ${HOY} - ${local('c.vence_en')}::date) ELSE 0 END`, agregacionPorDefecto: 'maximo', sinonimos: ['dias de mora', 'mora', 'atraso', 'dias de atraso'] },
    { clave: 'num_creditos', etiqueta: 'Créditos', tipo: 'entero', sql: 'COUNT(*)', agregado: true, sinonimos: ['numero de creditos', 'cantidad de creditos', 'cuantos creditos'] },
  ],
  columnasPorDefecto: ['clienta', 'sucursal', 'fecha_venta', 'vence', 'monto', 'pagado', 'saldo', 'estado', 'dias_mora'],
  medidasAlAgrupar: [{ campo: 'num_creditos' }, { campo: 'monto', agregacion: 'suma' }, { campo: 'saldo', agregacion: 'suma' }],
  ordenPorDefecto: { campo: 'vence', dir: 'asc' },
  campoFecha: 'fecha_venta',
  medidaPrincipal: 'saldo',
};

const inventario: Fuente = {
  clave: 'inventario',
  etiqueta: 'Inventario',
  descripcion: 'Existencias por variante (talla y color) en cada almacén de cada sucursal.',
  sinonimos: ['inventario', 'stock', 'existencia', 'existencias', 'disponible', 'disponibles', 'almacen', 'almacenes', 'deposito', 'reposicion'],
  desde: `stock_almacen sa
  JOIN variantes va ON va.id = sa.variante_id
  JOIN productos p ON p.id = va.producto_id
  JOIN almacenes a ON a.id = sa.almacen_id
  JOIN sucursales s ON s.id = a.sucursal_id`,
  dondeBase: `sa.tienda_id = ${TIENDA}`,
  joins: { proveedor: 'LEFT JOIN proveedores pr ON pr.id = p.proveedor_id' },
  campos: [
    { clave: 'sucursal', etiqueta: 'Sucursal', tipo: 'texto', sql: 's.nombre', sinonimos: ['sucursal', 'sucursales', 'tienda', 'local'] },
    { clave: 'ciudad', etiqueta: 'Ciudad', tipo: 'texto', sql: 's.ciudad', sinonimos: ['ciudad', 'ciudades'] },
    { clave: 'almacen', etiqueta: 'Almacén', tipo: 'texto', sql: 'a.nombre', sinonimos: ['almacen', 'almacenes', 'deposito'] },
    { clave: 'producto', etiqueta: 'Producto', tipo: 'texto', sql: 'p.nombre', sinonimos: ['producto', 'productos', 'prenda', 'prendas', 'articulo', 'articulos', 'nombre'] },
    { clave: 'categoria', etiqueta: 'Categoría', tipo: 'texto', sql: 'p.categoria', sinonimos: ['categoria', 'categorias', 'linea'] },
    { clave: 'ocasion', etiqueta: 'Ocasión', tipo: 'texto', sql: 'p.ocasion', sinonimos: ['ocasion', 'ocasiones', 'estilo'] },
    { clave: 'proveedor', etiqueta: 'Proveedor', tipo: 'texto', sql: "COALESCE(pr.nombre, 'Sin proveedor')", joins: ['proveedor'], sinonimos: ['proveedor', 'proveedores', 'marca'] },
    { clave: 'talla', etiqueta: 'Talla', tipo: 'texto', sql: 'va.talla', sinonimos: ['talla', 'tallas', 'talle'] },
    { clave: 'color', etiqueta: 'Color', tipo: 'texto', sql: 'va.color', sinonimos: ['color', 'colores'] },
    { clave: 'sku', etiqueta: 'SKU', tipo: 'texto', sql: 'va.sku', sinonimos: ['sku', 'codigo'] },
    { clave: 'cantidad', etiqueta: 'Existencia', tipo: 'entero', sql: 'sa.cantidad', agregacionPorDefecto: 'suma', sinonimos: ['existencia', 'existencias', 'cantidad', 'unidades', 'stock fisico'] },
    { clave: 'reservado', etiqueta: 'Reservado', tipo: 'entero', sql: 'sa.reservado', agregacionPorDefecto: 'suma', sinonimos: ['reservado', 'reservados', 'reservas', 'apartado'] },
    { clave: 'disponible', etiqueta: 'Disponible', tipo: 'entero', sql: '(sa.cantidad - sa.reservado)', agregacionPorDefecto: 'suma', sinonimos: ['disponible', 'disponibles', 'stock', 'stock disponible', 'quedan', 'queda'] },
    { clave: 'precio', etiqueta: 'Precio', tipo: 'dinero', sql: 'p.precio_base', agregacionPorDefecto: 'promedio', sinonimos: ['precio', 'precios', 'precio de venta'] },
    { clave: 'valor', etiqueta: 'Valor del stock', tipo: 'dinero', sql: '((sa.cantidad - sa.reservado) * p.precio_base)', agregacionPorDefecto: 'suma', sinonimos: ['valor', 'valorizado', 'valor del stock', 'valor del inventario', 'capital'] },
    { clave: 'num_variantes', etiqueta: 'Variantes', tipo: 'entero', sql: 'COUNT(DISTINCT va.id)', agregado: true, sinonimos: ['numero de variantes', 'variantes', 'cuantas variantes'] },
  ],
  columnasPorDefecto: ['sucursal', 'producto', 'talla', 'color', 'sku', 'cantidad', 'reservado', 'disponible'],
  medidasAlAgrupar: [{ campo: 'disponible', agregacion: 'suma' }, { campo: 'valor', agregacion: 'suma' }],
  ordenPorDefecto: { campo: 'disponible', dir: 'asc' },
  medidaPrincipal: 'disponible',
};

const productos: Fuente = {
  clave: 'productos',
  etiqueta: 'Productos',
  descripcion: 'Una fila por producto del catálogo, con su stock total y lo vendido en toda su historia.',
  sinonimos: ['catalogo', 'productos sin ventas', 'precios del catalogo', 'lista de precios'],
  desde: 'productos p',
  dondeBase: `p.tienda_id = ${TIENDA}`,
  joins: {
    proveedor: 'LEFT JOIN proveedores pr ON pr.id = p.proveedor_id',
    stock: `LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(sa.cantidad - sa.reservado), 0)::int AS disponible
    FROM variantes va JOIN stock_almacen sa ON sa.variante_id = va.id WHERE va.producto_id = p.id) st ON true`,
    vendido: `LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(lv.cantidad - lv.cantidad_devuelta), 0)::int AS unidades,
           COALESCE(SUM((lv.cantidad - lv.cantidad_devuelta) * lv.precio_unitario), 0) AS ingresos,
           MAX(v.creada_en) AS ultima
    FROM variantes va JOIN lineas_venta lv ON lv.variante_id = va.id
    JOIN ventas v ON v.id = lv.venta_id AND v.estado IN ('cobrada', 'devuelta_parcial')
    WHERE va.producto_id = p.id) vd ON true`,
  },
  campos: [
    { clave: 'producto', etiqueta: 'Producto', tipo: 'texto', sql: 'p.nombre', sinonimos: ['producto', 'productos', 'nombre', 'prenda', 'prendas'] },
    { clave: 'categoria', etiqueta: 'Categoría', tipo: 'texto', sql: 'p.categoria', sinonimos: ['categoria', 'categorias'] },
    { clave: 'ocasion', etiqueta: 'Ocasión', tipo: 'texto', sql: 'p.ocasion', sinonimos: ['ocasion', 'ocasiones'] },
    { clave: 'proveedor', etiqueta: 'Proveedor', tipo: 'texto', sql: "COALESCE(pr.nombre, 'Sin proveedor')", joins: ['proveedor'], sinonimos: ['proveedor', 'proveedores', 'marca'] },
    { clave: 'precio', etiqueta: 'Precio', tipo: 'dinero', sql: 'p.precio_base', agregacionPorDefecto: 'promedio', sinonimos: ['precio', 'precios'] },
    { clave: 'descuento', etiqueta: 'Descuento %', tipo: 'numero', sql: 'p.descuento_pct', agregacionPorDefecto: 'promedio', sinonimos: ['descuento', 'descuentos', 'rebaja', 'oferta'] },
    { clave: 'creado', etiqueta: 'Alta', tipo: 'fecha', sql: `${local('p.creado_en')}::date`, sinonimos: ['fecha de alta', 'creado', 'nuevo', 'nuevos'] },
    { clave: 'stock', etiqueta: 'Stock disponible', tipo: 'entero', sql: 'COALESCE(st.disponible, 0)', joins: ['stock'], agregacionPorDefecto: 'suma', sinonimos: ['stock', 'disponible', 'existencia', 'existencias'] },
    { clave: 'unidades_vendidas', etiqueta: 'Unidades vendidas', tipo: 'entero', sql: 'COALESCE(vd.unidades, 0)', joins: ['vendido'], agregacionPorDefecto: 'suma', sinonimos: ['unidades vendidas', 'vendidas', 'vendidos', 'ventas', 'sin ventas'] },
    { clave: 'ingresos', etiqueta: 'Ingresos', tipo: 'dinero', sql: 'COALESCE(vd.ingresos, 0)', joins: ['vendido'], agregacionPorDefecto: 'suma', sinonimos: ['ingresos', 'facturado', 'importe', 'monto'] },
    { clave: 'ultima_venta', etiqueta: 'Última venta', tipo: 'fecha', sql: `${local('vd.ultima')}::date`, joins: ['vendido'], agregacionPorDefecto: 'maximo', sinonimos: ['ultima venta'] },
    { clave: 'num_productos', etiqueta: 'Productos', tipo: 'entero', sql: 'COUNT(*)', agregado: true, sinonimos: ['numero de productos', 'cantidad de productos', 'cuantos productos'] },
  ],
  columnasPorDefecto: ['producto', 'categoria', 'precio', 'stock', 'unidades_vendidas', 'ingresos'],
  medidasAlAgrupar: [{ campo: 'num_productos' }, { campo: 'stock', agregacion: 'suma' }, { campo: 'ingresos', agregacion: 'suma' }],
  ordenPorDefecto: { campo: 'producto', dir: 'asc' },
  campoFecha: 'creado',
  medidaPrincipal: 'ingresos',
};

const movimientos: Fuente = {
  clave: 'movimientos',
  etiqueta: 'Movimientos de inventario',
  descripcion: 'Kardex: cada entrada y salida de stock (venta, ingreso de proveedor, ajuste, traslado, devolución).',
  sinonimos: ['movimiento', 'movimientos', 'kardex', 'entradas', 'salidas', 'ajustes', 'traslados', 'transferencias', 'ingresos de proveedor'],
  desde: `movimientos_inventario m
  JOIN variantes va ON va.id = m.variante_id
  JOIN productos p ON p.id = va.producto_id
  JOIN almacenes a ON a.id = m.almacen_id
  JOIN sucursales s ON s.id = a.sucursal_id`,
  dondeBase: `m.tienda_id = ${TIENDA}`,
  joins: { usuario: 'LEFT JOIN usuarios us ON us.id = m.usuario_id' },
  campos: [
    { clave: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', sql: `${local('m.creado_en')}::date`, sinonimos: ['fecha', 'dia', 'cuando'] },
    { clave: 'mes', etiqueta: 'Mes', tipo: 'texto', sql: `to_char(${local('m.creado_en')}, 'YYYY-MM')`, sinonimos: ['mes', 'meses'] },
    { clave: 'tipo', etiqueta: 'Tipo', tipo: 'texto', sql: 'm.tipo::text', valores: ['venta', 'reserva', 'liberacion', 'ajuste', 'ingreso_proveedor', 'transferencia_salida', 'transferencia_entrada', 'devolucion'], sinonimos: ['tipo', 'tipo de movimiento', 'motivo'] },
    { clave: 'sucursal', etiqueta: 'Sucursal', tipo: 'texto', sql: 's.nombre', sinonimos: ['sucursal', 'sucursales', 'tienda'] },
    { clave: 'almacen', etiqueta: 'Almacén', tipo: 'texto', sql: 'a.nombre', sinonimos: ['almacen', 'almacenes'] },
    { clave: 'producto', etiqueta: 'Producto', tipo: 'texto', sql: 'p.nombre', sinonimos: ['producto', 'productos', 'prenda', 'prendas'] },
    { clave: 'talla', etiqueta: 'Talla', tipo: 'texto', sql: 'va.talla', sinonimos: ['talla', 'tallas'] },
    { clave: 'color', etiqueta: 'Color', tipo: 'texto', sql: 'va.color', sinonimos: ['color', 'colores'] },
    { clave: 'sku', etiqueta: 'SKU', tipo: 'texto', sql: 'va.sku', sinonimos: ['sku', 'codigo'] },
    { clave: 'usuario', etiqueta: 'Usuario', tipo: 'texto', sql: "COALESCE(NULLIF(us.nombre, ''), us.email, 'Sistema')", joins: ['usuario'], sinonimos: ['usuario', 'responsable', 'quien'] },
    { clave: 'nota', etiqueta: 'Nota', tipo: 'texto', sql: 'm.nota', sinonimos: ['nota', 'notas', 'detalle', 'observacion'] },
    { clave: 'cantidad', etiqueta: 'Cantidad', tipo: 'entero', sql: 'm.cantidad', agregacionPorDefecto: 'suma', sinonimos: ['cantidad', 'unidades', 'piezas'] },
    { clave: 'num_movimientos', etiqueta: 'Movimientos', tipo: 'entero', sql: 'COUNT(*)', agregado: true, sinonimos: ['numero de movimientos', 'cuantos movimientos'] },
  ],
  columnasPorDefecto: ['fecha', 'tipo', 'sucursal', 'producto', 'talla', 'color', 'cantidad', 'usuario', 'nota'],
  medidasAlAgrupar: [{ campo: 'num_movimientos' }, { campo: 'cantidad', agregacion: 'suma' }],
  ordenPorDefecto: { campo: 'fecha', dir: 'desc' },
  campoFecha: 'fecha',
  medidaPrincipal: 'cantidad',
};

export const FUENTES: Record<string, Fuente> = { ventas, clientes, creditos, inventario, productos, movimientos };

export function campoDe(fuente: Fuente, clave: string): Campo | undefined {
  return fuente.campos.find((c) => c.clave === clave);
}

export const esMedida = (c: Campo) =>
  !c.dimension && (c.tipo === 'entero' || c.tipo === 'numero' || c.tipo === 'dinero');
