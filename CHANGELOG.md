# Changelog - Sistema de Gestión Koaj Puerto Carreño

---

## [2026-10-08] Excedentes en Cuentas y sincronizar solo con Cierre exitoso

Fase 1 de `docs/PLAN_EXCEDENTES_Y_CARGA_EXCEL.md` del backend.
- `CuentasLayout.jsx`: movimiento "Excedente del cierre (no es venta)"; el mensaje de Sincronizar separa los excedentes y avisa en rojo los cierres que no se sincronizaron; junto al botón, "Sin Cierre exitoso: fechas" (`sync-status.blocked`).
- `CuentasMes.jsx`: columna **Excedentes** (resumen y día por día) y "Ventas + excedentes" por cuenta.
- `CuentasAnual.jsx`: columna **Excedentes** junto a Ventas (tabla, celular, total) y en la tarjeta de Ventas.
- `Dashboard.jsx`: si el cierre no sale exitoso, aviso de que no se sincroniza con Cuentas hasta corregirlo y reenviarlo.

## [2026-10-07] (continuación 10) Cuentas → Mes: ventana "lo que falta que llegue"

- En el cuadro "Por llegar", Datáfono y Addi se pueden tocar: abre una ventana con vendido, comisión y lo que llega, y una fila por venta con la fecha en que llega (la más próxima marcada), incluidas las de meses pasados. En Addi, nota para compararlo con su "Reporte de pagos". Usa `useDialog` (Escape cierra) y en celular sale como hoja desde abajo.

## [2026-10-07] (continuación 9) Cuentas → Mes: datáfono y Addi por separado

- Pedido del usuario: llegan a la misma cuenta (…6018) pero con comisión y día de llegada distintos. Las tarjetas "Comisiones del mes" y "Por llegar" muestran el total y, debajo, **Datáfono (débito + crédito)** y **Addi** cada uno con su valor (y el día en que llega lo siguiente). La tabla de plata por llegar dice "Datáfono débito / crédito" y tiene subtotales por grupo antes del total. Solo frontend (`cardGroups` en `CuentasMes.jsx`); el backend ya lo separaba (`commissions.by_medio`, `transit.items[].medio`).

## [2026-10-07] (continuación 8) Cuentas → Mes: corregir el medio de pago de un día

- `CuentasMes.jsx`: lápiz ✎ en cada día (en celular, "Corregir medio de pago" al abrir el día) con De / A / Valor / Nota; los días corregidos llevan ✎ y abajo de la tabla está la lista "Correcciones a mano del mes" con botón para quitar. `monthSheetService.js`: `createCorrection`, `deleteCorrection`. Verificado en Chromium (1366 y 390, sin scroll horizontal).

## [2026-10-07] (continuación 7) Cuentas → Mes: "Traer ventas de Alegra" ya no se rinde

- En producción, la primera carga (todos los recibos desde el 1-sep, ~50 páginas de Alegra) tardaba más de los 80 s de espera y salía "No se pudo conectar con el servidor". `syncPayments` usa ahora 230 s (`SYNC_PAYMENTS_TIMEOUT`; el servidor corta a los 240 s) y la página avisa que la primera vez tarda 1-2 minutos. Las ventas quedan guardadas en la base (`payment_facts`): después, abrir el mes es inmediato y el botón solo trae los últimos días.

## [2026-10-07] (continuación 6) Analytics: clientes únicos con nombre

- `TopSellers.jsx`: la columna dice "Clientes Únicos (con nombre)": el backend ya no cuenta Consumidor final (ver CHANGELOG del backend, continuación 7: % de participación sin bolsa, recurrencia y productos que se compran juntos corregidos).

## [2026-10-07] (continuación 5) Reconstrucción 2025 en Documentos de Venta

- El backend ahora devuelve como vigentes (marca `mass_voided`) las POS de la anulación masiva de 2025 en Totales, Documentos, Ventas Mensuales, Analytics, Productos, Clientes, Prendas, Día y hora y Comparativo. `DirectSalesDocuments.jsx` las marca "Anulada 2025 (venta real)" y avisa cuántas hay en el rango. 2026 no cambia.

## [2026-10-07] (continuación 4) Incentivos por empleada

- `IncentivesPanel.jsx`: campo "Empleada (opcional)" (mismos nombres de Control de Empleadas, solo con categoría sueldo); la lista muestra "para <empleada>". Al registrar el pago queda también en Empleadas → Pagos como comisión.

## [2026-10-07] (continuación 3) Cuentas diarias, Fase 4

- Estadísticas → Metas: panel **"Metas de la tienda e incentivos"** (`src/components/goals/IncentivesPanel.jsx`, `src/services/financeService.js`): META 1 / META 2 / vendido, "Configurar metas" (% de crecimiento y extra de la META 2), incentivos con estado y "Registrar pago" (medio y de dónde sale la plata), plantilla del Excel.
- Cuentas → Año: tabla **"Regla 70/30"** con "Configurar" (% de resurtido y margen).
- Comparativo de tiendas: gastos operativos, inversiones/préstamos/retiros y ganancia real (ventas − recompras − gastos).
- Verificado en Chromium (1366 y 390) con Alegra simulado. Lint, `npm test` y build OK.

## [2026-10-07] (continuación 2) Reconstrucción 2025: revisar en vez de excluir

- Paso 2: "Revisar las anulaciones" lista las POS con otra factura igual poco después (cuentan como venta) con el botón "Sí se anuló de verdad"; aparte, las que no cuentan como venta (electrónicas anuladas o marcadas a mano) con "Quitar marca". La marca por número propone "Sí se anuló de verdad".

## [2026-10-07] (continuación) Reconstrucción 2025: paso 4, crear el ajuste en Alegra

- `History2025.jsx`: paso 4 con casilla de aprobación del contador, escribir AJUSTAR y botón "Crear ajuste (N unidades)"; muestra los números de ajuste creados, o el estado a medias con "Seguir con lo que falta". Aviso en el paso 3 cuando el ajuste ya se hizo. `createInventoryAdjustment` en `history2025Service.js`.
- Verificado en Chromium con Alegra simulado (traer todo 2025 → calcular → aprobar → crear). Lint, `npm test` y build OK.

## [2026-10-07] Estadísticas → Reconstrucción 2025

- Nueva página (`src/pages/History2025.jsx`, `/estadisticas-estandar/reconstruccion-2025`, solo admin; `src/services/history2025Service.js`; entrada en el menú de Estadísticas): traer 2025 de Alegra por tandas ("Traer todo 2025", se puede detener), venta real vs. la que muestra Alegra, revisión de las anulaciones reales (marcar "Fue de la anulación masiva" o por número) e inventario antes de la anulación masiva con descarga en Excel. Plan en `docs/PLAN_RECONSTRUCCION_2025.md` del backend.
- Verificado en Chromium (1366 y 390) con Alegra simulado. Lint, `npm test` y build OK.

## [2026-10-06] Cuentas diarias, Fase 3: pestaña Cuentas → Año

- Nueva **Cuentas → Año** (`src/pages/CuentasAnual.jsx`, `src/services/monthlySummaryService.js`): tarjetas (ventas, ganancia real y %, inventario), gráfico de barras ventas vs. ganancia real por mes (un solo eje, colores validados, recuadro al pasar el mouse o con teclado), **cierre general mes a mes** (ventas, recompras, gastos operativos, ganancia bruta/neta/real, %, inventario, subió/bajó, ganancia real + inventario) con **edición a mano** de cada dato del mes (✎ con nota y valor calculado, "volver al calculado"), enero–agosto opcional para comparar con el Excel, **ventas por medio de pago del año** y **plata que salió y no es gasto** (inversiones, retiros, préstamos, fletes, Jhonatan). Botón "Traer inventario de Alegra" y "Traer" por mes. En celular, tarjetas.
- Verificado en Chromium (1366 y 390) con backend local. Lint, `npm test` y build OK.

## [2026-10-06] Cuentas diarias, Fase 2: pestaña Cuentas → Mes

- Nueva **Cuentas → Mes** (`src/pages/CuentasMes.jsx`, `src/services/monthSheetService.js`), después de Resumen: venta del mes de Alegra con conteo de días mala/bajita/buena/alta; comisiones del mes (datáfono 3,8 %, Addi 7,735 %) con botón "Registrar en Gastos"; plata por llegar; **ventas diarias por los 10 medios** como el Excel (aviso si un pago cayó en una cuenta rara de Alegra); **plata en cada cuenta** (inicial, ventas, recompras, gastos, ajustes, final, día por día) con **saldo real** y "Cuadra"/diferencia; tabla de plata por llegar con fecha y neto; **cerrar / reabrir el mes**. Botón "Traer ventas de Alegra". En celular, tarjetas.
- Ojo: `lucide-react` de este proyecto no tiene `CloudDownload` (es `DownloadCloud`); el lint no lo detecta y la página se rompe en ejecución.
- Verificado en Chromium (1366 y 390) con backend local y las ventas del 1-5 oct del Excel. Lint, `npm test` y build OK.

## [2026-10-06] Cuentas diarias, Fase 1: pestaña Cuentas → Gastos

Plan completo en `docs/PLAN_CUENTAS_DIARIAS.md` del backend.
- Nueva **Cuentas → Gastos** (`src/pages/CuentasGastos.jsx`, `src/services/expensesService.js`): registrar gasto o entrada (concepto, fecha, mes al que corresponde, categoría, empleada u otra tienda según la categoría, gasto fijo, "¿de dónde sale la plata?": cuentas / caja del día / no mover, valor por medio, 4x1000 automático editable, notas); tarjetas del mes; **gastos fijos del mes** con estado (pagado / pendiente / vencido), "Registrar pago" que llena el formulario y botón para cargar los del Excel; tabla de movimientos editable; resumen por categoría (mes al que corresponde) y por medio (lo que movió Resumen); **préstamos entre tiendas** (prestado, devuelto, saldo). En celular las tablas pasan a tarjetas.
- `CuentasLayout.jsx`: pestaña Gastos (refresca Resumen al guardar), etiquetas de movimientos `expense` / `expense_in`, barra de pestañas con desplazamiento en celular.
- `LiveMoneyInput` sale de `CuentasRecompras.jsx` a `src/components/common/LiveMoneyInput.jsx` (compartido, sin cambios de comportamiento).
- Verificado en Chromium (1366 y 390) con backend local. Lint, `npm test` (6/6) y build OK.

## [2026-10-06] Cuentas Recompras: saldo del mes anterior automático

- `src/pages/CuentasRecompras.jsx`: Balance disponible = saldo que traía del mes anterior (`saldo_mes_anterior` del backend, desde sep-2026) + recibido del mes + sobrante manual − compras. La tarjeta lo explica ("$X de septiembre + $Y recibido − $Z en compras") y la tabla muestra una fila fija "Saldo de <mes> (automático)" (no editable, en rojo si es negativo); la fila TOTAL la incluye.
- El campo del formulario pasa a llamarse "Sobrante / ajuste manual", con aviso de que el saldo anterior ya se suma solo (para no contarlo dos veces).
- `src/pages/CuentasLayout.jsx` (Resumen): "Balance disponible (Jhonatan)" y "Total Recompras" también suman el saldo del mes anterior.
- Lint y build OK.

## [2026-10-03] Revisión en producción: Día y hora no se podía adelantar

- **Error**: el panel de facturas/prendas guardadas apagaba los botones ("Todo el periodo está cargado") cuando facturas y prendas estaban completas, aunque faltara recargar los 275 días para la **hora** (Día y hora mostraba "0 días con datos"). Ahora `done` también mira `status.hours.missing_days`.
- Nueva variante `variant="horas"` ("Horas guardadas": días con hora y siguiente día por cargar) en Día y hora; Prendas y Clientes avisan "Falta la hora de N días" con los mismos botones.
- Lint y build OK.

## [2026-10-03] Estadísticas, Fase D4: alertas en el Dashboard + ajustes de celular

- `src/components/alerts/DailyAlertsPanel.jsx` (+ `src/services/alertsService.js`) arriba del cierre de caja, **solo admin**: alertas de los últimos 7 días (advertencias en ámbar, informativas en blanco), "Ver detalle" (prendas agotadas, facturas con descuento, vendedoras atrasadas), descartar (×) y "Recalcular". Si no hay alertas no ocupa espacio.
- `StatTile` (compartido por Clientes, Prendas, Llegadas, Día y hora, Metas): cifra en `text-xl` en celular (`sm:text-3xl`) y `min-w-0`; montos como "$ 10.350.000" se salían de la tarjeta con 2 por fila.
- Mapa de calor: columna de días fija al desplazar de lado en celular.
- Verificado en Chromium (escritorio 1366 y celular 390) con backend local y Alegra simulado. Lint (sin avisos nuevos; Dashboard.jsx conserva sus 2 avisos viejos) y build OK.

## [2026-10-03] Estadísticas, Fase D3: pestaña Metas

- Nueva **Estadísticas → Metas** (`src/pages/SellerGoals.jsx`, `/estadisticas-estandar/metas`, solo admin; `src/services/sellerGoalsService.js`): selector de mes (2026-01 al mes siguiente), meta de la tienda, vendido, proyección y necesario por día; tarjeta por vendedora con barra de avance y línea de "dónde debería ir", estado (va bien / no llega), ticket, prendas por factura y % con cliente. Botón **Ajustar** (monto) y **Automática** (quitar el ajuste).
- Lint OK.

## [2026-10-03] Estadísticas, Fase D2: pestaña Día y hora

- Nueva **Estadísticas → Día y hora** (`src/pages/SalesPatterns.jsx`, `/estadisticas-estandar/dia-hora`, solo admin; `src/services/salesPatternsService.js`): venta promedio por día, mejor día y mejor hora, **mapa de calor día × hora** (un tono, 5 pasos validados con el validador de dataviz; cifra al pasar el mouse o con teclado), tabla por día de la semana y barras por hora. Filtro por vendedora. Periodos rápidos terminan ayer (solo días cerrados).
- Lint y build OK.

## [2026-10-03] Estadísticas, Fase D1: pestaña Llegadas

- Nueva **Estadísticas → Llegadas** (`src/pages/Arrivals.jsx`, `/estadisticas-estandar/llegadas`, solo admin; `src/services/arrivalsService.js`): cada llegada de mercancía con prendas que llegaron, vendidas y % vendido (se despliega por prenda y tallas), "Llegó y no se mueve" y panel "Compras guardadas" con botón "Actualizar compras". Mismo filtro de periodo de Prendas (90 días por defecto) y el panel "Prendas guardadas" (las ventas salen de ahí).
- Lint y build OK.

## [2026-10-02] Prendas: ajustes tras la revisión en producción

- Abre en **"Últimos 90 días"** (con pocos días la curva de tallas y la rotación no son confiables).
- Si el periodo no tiene ningún día con prendas guardadas, muestra **"Todavía no hay prendas guardadas de este periodo"** y oculta las cifras (antes salía todo en $0 y parecía un error; visto con agosto y septiembre mientras la carga iba en enero).
- Textos: no cuentan la bolsa de papel **ni las tarjetas de regalo** (el backend ya las excluye); el panel "Prendas guardadas" explica que la carga va del día más reciente hacia atrás.
- Verificado en Chromium (backend local + Alegra simulado): 90 días por defecto, aviso de agosto sin cifras, rotación por días cargados, "siguiente día por cargar" = el más reciente. Lint (20 avisos viejos), `npm test` y build OK.

## [2026-10-02] Estadísticas, Fase C: pestaña Prendas

Nueva página **Estadísticas → Prendas** (`src/pages/Garments.jsx`, ruta `/estadisticas-estandar/prendas`, solo admin, menú de Estadísticas) con `src/services/garmentsService.js`. No cuenta la bolsa de papel. Por defecto, el mes en curso.
- **Canasta**: prendas vendidas, **prendas por factura**, **precio promedio por prenda** (con descuento) y venta en prendas; tabla por vendedora; lo más vendido por tipo de prenda.
- **Cruce con el stock actual de Alegra** (se carga aparte; la primera vez hasta ~2 min): más vendidos **agotados** y **por agotarse**; **curva de tallas** venta vs. stock (barras pareadas por talla, vendido #4A58D6 / stock #0E8A6E validados con el validador de dataviz, cada barra con su % escrito); **rotación** por tipo de prenda con días de inventario y estado (ícono + texto).
- Aviso si faltan días por cargar prendas (las cifras se quedan cortas) y panel **"Prendas guardadas"** con el avance y los botones para adelantar la carga.
- Solo la consulta más reciente escribe en la página (cambiar el periodo mientras carga el stock no mezcla periodos; error visto en la revisión).
- `InvoiceFactsPanel` (Clientes) cuenta también los días sin prendas: ya no se da por terminado con las facturas completas; `variant="prendas"` en la página nueva.
- Refactor: filtro de periodo, tarjetas y avisos de Clientes pasan a `components/stats/StatsUI.jsx` y las fechas a `utils/statsDates.js` (Clientes y Prendas los comparten; Clientes revisada en el navegador).
- Verificado en Chromium con backend local + Alegra simulado (facturas reales del 30-sep): 12 prendas en 6 facturas sin bolsas; Rita 8/4, Mónica 4/2 con el 45 % de descuento; agotados (medias, camiseta XL), curva y rotación correctas; celular sin desborde. Lint (20 avisos viejos), `npm test` y build OK.

## [2026-10-02] Estadísticas, Fase B: fechas, medios de pago reales, iPhone, paginación y avisos

Plan: `docs/PLAN_ESTADISTICAS.md` del backend. Cálculos nuevos en `src/utils/salesMetrics.js` (puros) con pruebas en `salesMetrics.test.js`: **`npm test`** (node --test, sin instalar nada; 6/6).
- **Totales de Ventas**
  - Fecha inicial por defecto = día 1 del mes en hora de Colombia (`firstDayOfMonth(getColombiaTodayString())`); con `toISOString` salía el día 2 después de las 7 pm.
  - **Medios de pago reales** (`payments[]`), con las mismas categorías del Cierre de Caja (Efectivo, Transferencia, Tarjeta crédito/débito, Otro). Un pago mixto ($100 efectivo + $90.000 transferencia) se reparte; si la factura no trae pagos se usa lo declarado. Columna "Facturas" en vez de "Transacciones". Antes: el medio declarado y en código crudo (`DEBIT_TRANSFER`).
  - **Ingresos por producto con descuento** (`item.total`; el descuento de Alegra viene en %). Antes cantidad × precio de lista.
  - **Hora** leída del texto de `datetime` (`invoiceHour`): `new Date("YYYY-MM-DD HH:MM:SS")` es inválido en Safari/iPhone y dejaba vacío el análisis por hora.
  - **No reintenta** cuando el total es $0 o el rango no tiene facturas (antes ~24-30 s de "El servidor se está iniciando…"); nuevo mensaje "No hay facturas en ese rango". Se quitaron los `console.log` por factura.
- **Documentos de Venta**: paginación real en el navegador (10/30/50/100 por página, "Mostrando 11–15 de 15") sin volver a descargar; "TOTAL DEL PERÍODO" suma todo el rango. Número impreso de la factura (`numberTemplate.fullNumber`, ej. KPC4446; antes salía el id interno por un nombre de campo equivocado) y fecha "30 sep 2026 · 15:47" sin `new Date` (iPhone).
- **Aviso global de días faltantes**: `authenticatedFetch` lee el header `X-Alegra-Failed-Days` (`utils/dataWarnings.js`) y `layout/AlegraFailedDaysBanner.jsx` (en `MainLayout`) muestra "Falta 1 día…" en Productos, Analytics, Ventas Mensuales o cualquier pantalla cuya consulta haya quedado sin días. Comparativo de tiendas: "Incompleto: Alegra no entregó N días" por tienda.
- **Inventario con archivo**: muestra el análisis del archivo (`FileUploadInventory` embebido con `initialData`, que antes no se usaba en ninguna pantalla); las pestañas y el resumen de Alegra solo aparecen con la consulta a Alegra. Antes las pestañas mostraban Alegra aunque se cargara un archivo.
- `SalesDataNotice`: "Falta 1 día" en singular.
- Verificado en Chromium (backend local + Alegra simulado): fecha por defecto 2026-10-01; pagos $775.745 efectivo + $266.200 transferencia = total; camiseta con 45 % = $27.445; hora 10 h y 15 h; rango vacío responde en 3 s; Documentos 1–10 / 11–15 de 15 con KPC…; aviso en Analytics y Comparativo; archivo CSV de 3 productos sin pestañas de Alegra. Lint (20 avisos viejos) y build OK.

## [2026-10-02] Estadísticas, Fase A: errores que cambiaban números

Plan y verificación contra Alegra: `docs/PLAN_ESTADISTICAS.md` del backend (que trae el resto de esta fase).
- **Totales de Ventas → vendedoras**: se agrupan por `seller.id` y se muestra `seller.name` (antes una sola fila "[object Object]").
- **Totales y Documentos**: nuevo `components/direct/SalesDataNotice.jsx`. Avisa en ámbar si Alegra no entregó algún día (`metadata.failed_days`: "Faltan N días: los totales están por debajo del real") y en gris cuántas facturas anuladas se excluyeron (`voided`). El backend ahora quita las anuladas.
- **Inventario**: las pestañas siguen pidiendo `/api/inventory/*`, pero el backend ya entrega el inventario completo (antes 30 productos). Tiempo de espera de esas peticiones a 180 s (`INVENTORY_TIMEOUT_MS`: la primera descarga son ~55 consultas a Alegra; luego caché 5 min). Aviso si el resumen llegó incompleto (`metadata.incomplete`) y aclaración de que, con archivo cargado, las pestañas muestran el inventario actual de Alegra (no el archivo).
- **Analytics**: Top Clientes sin Consumidor final (se muestra aparte: "No incluye Consumidor final: $X en N facturas"); tarjetas renombradas a "Clientes identificados", "Compras de clientes identificados", "Promedio por cliente". Retención: "Nuevos" → "Una compra" (explica que puede ser clienta antigua) y leyenda de Activo/En riesgo/Inactivo.
- Limpieza: imports sin uso en 3 archivos de analytics (lint de 24 a 21 avisos viejos).
- Verificado en Chromium con backend local + Alegra simulado (14 facturas reales del 30-sep, una anulada y un día que falla): Rita $718.200 / 10 y Mónica $323.745 / 5 con nombre; avisos visibles; Alertas de Stock con los 64 productos (= resumen); Top Clientes y Retención correctos. Lint y build OK.

## [2026-10-02] Cierre de Caja: ver las ventas de otro día

Antes las tarjetas "Venta del día" y "Venta del mes" solo mostraban hoy. Ahora arriba de ellas hay un selector **"Ver ventas del [fecha]"** (hasta hoy) y un botón **"Hoy"**:
- Todo se recalcula para el día elegido: venta de ese día y su meta diaria (+25 % sobre el mismo día del año anterior), comparación con ese día y el siguiente del año anterior, y el mes **del 1 hasta ese día** con su meta (mes completo del año anterior +25 %), inventario y cuentas por pagar a esa fecha.
- Títulos: "Venta del 15 de sept de 2026" / "Septiembre 2026 hasta el 15"; en días pasados la meta dice "Faltaba" en vez de "Falta".
- **No cambia el día del cierre de caja** que se está registrando: solo lo que muestran las tarjetas. Vuelve a hoy al recargar o al cambiar de tienda.
- `useSalesComparison(enabled, referenceDate)`: `referenceDate` opcional (null = hoy, como antes; `SalesComparisonYoY` no cambia). Solo la consulta más reciente escribe el estado (cambiar de fecha rápido no mezcla cifras) y solo "hoy" se refresca cada 13 min.
- Solo frontend: el backend ya aceptaba cualquier rango en `/api/sales/quick-summary`.
- Verificado en Chromium con respuestas simuladas: para el 15-sep pide exactamente 15-sep, 1..15-sep, 15 y 16-sep-2025, 14-sep, 1..15-sep-2025 y sep-2025 completo; "Hoy" vuelve a las tarjetas normales; sin desborde en celular. Lint y build OK.

## [2026-10-02] Fase 4 cerrada + ex vendedoras marcadas

Revisado con el usuario en producción (Carreño, "Este año", 2-oct-2026 15:05):
- Fuente: facturas guardadas + hoy. % con cliente: **Mónica 65,1 %, Rita 46,2 %, Astrid 0 %** (coincide con lo calculado con el conector de Alegra).
- Descuentos $3.212.176 = $3.184.751 guardados + $27.425 de hoy. Por vendedora: Mónica $2.082.230 + Rita $1.020.046; la diferencia ($109.900) es exactamente la factura 8423 (2-ene) sin vendedora.
- Equipo por cédula: aparecieron 2 ex vendedoras (Neiby Femayor 12,7 %, Cristhian Muñoz 20 % — esta última facturada a un cliente "Koaj" con su cédula). Mónica 14,4 %, Rita 18,9 %. Total equipo $458.875.
- Descuentos altos a clientes visibles en "Facturas con descuento" (41,4 % y 50 %): para revisar si fueron autorizados.

Ajustes: la marca dice "Ex vendedora" (en vez de "Equipo") para quien ya no está activa en Alegra, y en "Compras del equipo" sale "(ex vendedora)" junto al nombre. El % de descuento del equipo va debajo del valor (antes se partía en dos líneas).

## [2026-10-02] Clientes: descuentos, % por vendedora y cédula (fase 4.3)

Con las facturas guardadas (backend `data.source = 'facts'`) la página muestra lo que antes no tenía datos:
- **Venta con cliente identificado, por vendedora**: vuelve la barra de % de cada una, y al lado los **descuentos que dio**.
- **Descuentos**: tarjeta "Descuentos del periodo" (con el del equipo), columna de descuento y ranking "Por descuento" en Mejores clientes, y descuento de cada vendedora en "Compras del equipo".
- **Tarjeta nueva "Facturas con descuento"**: fecha, número, cliente (marca Equipo), vendedora, descuento en $ y %, y lo que pagó; las 50 con más descuento.
- **Cédula** de cada cliente en el ranking.
- Debajo del periodo se indica de dónde salen los datos (facturas guardadas + ventas de hoy, o reporte de Alegra con sus límites).
- "1 facturas" → "1 factura". Visto en Chromium con datos simulados; lint y build OK.

## [2026-10-02] Panel "Facturas guardadas": carga en curso y redacción

- Si ya hay una carga de la tienda corriendo (respuesta 409 `sync_in_progress`, ej. se salió de la página y se volvió a dar clic, o el cron de la noche), el panel muestra el aviso y el estado actual en vez de fallar.
- Mientras carga, avisa que la carga sigue en el servidor aunque se salga de la página.
- "Se cargaron 1 días" → "Se cargó 1 día".

## [2026-10-02] Clientes: panel "Facturas guardadas" (fase 4.2)

- Nuevo `src/components/customers/InvoiceFactsPanel.jsx`, al final de la página Clientes (solo admin, tienda activa): días cargados desde el 1-ene-2026 con barra de avance, siguiente día por cargar, **calidad de los datos** (% con vendedora, % con cédula, facturas con descuento, venta guardada y anuladas) y dos botones: "Cargar 1 día (prueba)" y "Cargar siguiente tanda (31 días)".
- `customerInsightsService.js`: `getInvoiceFactsStatus()` y `syncInvoiceFacts(maxDays)` (espera hasta 200 s; si Alegra falla a mitad de tanda devuelve lo que alcanzó).
- El cron de las 9 pm completa la carga solo; el panel es para la prueba controlada y para adelantarla. Visto en Chromium con datos simulados; lint y build OK.

## [2026-10-02] Dashboard de clientes: fase 3 cerrada (revisión en producción)

Revisado con el usuario en producción (Carreño, "Este año", 1-ene a 2-oct-2026):
- Venta $380.986.649; 55,3 % con cliente identificado; 3.091 facturas (1.605 con cliente = 51,9 %); 1.109 clientes; compra promedio $190.091. Las cifras cuadran entre sí y con Alegra.
- Ventas por vendedora: Mónica 52,8 %, Rita 45,5 %, Astrid 1,5 % de la venta; $806.700 sin vendedora.
- Equipo (reconocido por nombre): Mónica, Rita y Astrid como clientas, $2.173.465 en total.
- Nuevos 853 ($146,5 M) vs recurrentes 256 ($64,3 M): suman exactamente la venta con cliente. Solo ~1 de cada 4 clientes del año ya había comprado antes.
- Inactivas (90 días): 823 clientas, $135,2 M; fechas de última compra coherentes. Casi la mitad no tiene celular en Alegra; números incompletos (ej. 9 dígitos) salen como "Sin celular" a propósito.
- Primavera: muestra "Alegra rechazó las credenciales de esta tienda" sin romper la página. Significa que en Render YA existen `ALEGRA_USER_PRIMAVERA` / `ALEGRA_PASS_PRIMAVERA` con valores que Alegra no acepta; cuando se cree la cuenta de Primavera basta con poner ahí su correo y token (sin cambiar código).
- Errores encontrados en esta fase y corregidos: montos en $0 (v1 usa `total`) y datos que /api/v1 no entrega (cédula, descuento, filtro por vendedora). Ver entradas anteriores.

Siguiente: fase 4 (detalle de facturas por tienda), ver MEJORAS_PENDIENTES.md del backend.

## [2026-10-02] (continuación) - Clientes: no mostrar datos que Alegra no entrega

En producción, el reporte de Alegra que usa la plataforma resultó no traer cédula ni descuento, ni separar clientes por vendedora (ver CHANGELOG del backend). La página ya no muestra ceros que parecen reales:
- Sin descuentos (`discounts_available: false`): la tarjeta "Descuentos" se reemplaza por "Facturas del periodo" (total y cuántas con cliente); se ocultan la pestaña "Por descuento" y las columnas de descuento del ranking y de "Compras del equipo".
- La línea "CC" solo aparece si hay cédula.
- Vendedoras: si ninguna trae % identificado, la tarjeta pasa a "Ventas por vendedora" con la parte de la venta de la tienda de cada una y **una sola** nota explicando que el % por vendedora llega en la siguiente fase (antes: "No se pudo calcular" tres veces).
- Visto en Chromium con datos simulados copiados del formato real de v1. Lint y build OK.

## [2026-10-02] Clientes: el aviso "no hay ventas" depende de las facturas

- `CustomerInsights.jsx`: el aviso "Todavía no hay ventas" sale solo si no hay **facturas** en el periodo (antes: si el monto total era 0). En producción el backend leía mal el monto (ya corregido en el backend) y la página escondía todo detrás de ese aviso; ahora, si algo así vuelve a pasar, se ven los ceros y se nota el problema.

## [2026-10-01] Fase 2 del dashboard de clientes: limpieza de lint

- `MainLayout.jsx`: se quitó `previousDay`, que se sacaba de `useSalesComparison` y nunca se usaba. `SalesComparisonYoY` sigue usándolo con su propia llamada al hook: no cambia nada visible.
- `eslint.config.js`: se ignora `.claude/` (skills de diseño de terceros, no es código de la app). Quitaba 45 avisos que no eran nuestros.
- `npm run lint` queda con **24 problemas antiguos** en componentes que no se tocaron (variables sin usar, `catch` vacíos, dependencias de hooks). Pendiente para una fase de limpieza aparte, revisando cada uno. Los archivos nuevos o tocados (`CustomerInsights.jsx`, su servicio, `App.jsx`, `MainLayout.jsx`) pasan sin avisos. Build OK.

## [2026-10-01] Nueva página: Clientes (Estadísticas → Clientes)

`/estadisticas-estandar/clientes` (solo admin, por tienda con el selector de siempre). Usa los endpoints nuevos del backend `/api/analytics/customers/summary` e `/inactive` (reportes agregados de Alegra: un año completo en pocas consultas). Archivos: `src/pages/CustomerInsights.jsx`, `src/services/customerInsightsService.js`, ruta en `App.jsx` y entrada en el menú de Estadísticas (`MainLayout.jsx`).

- **Venta con cliente identificado**: % del dinero y de las facturas con cliente (el resto es "Consumidor final"), con barra parte-todo. Es la meta para las vendedoras.
- **Por vendedora**: qué % de lo que vendió cada una quedó con cliente. Si Alegra no permite calcularlo para alguna, se dice en vez de inventar el número.
- **Mejores clientes** por monto, número de compras o descuento (top 25, sin Consumidor final). Las vendedoras que compran siguen en el ranking con la marca "Equipo".
- **Compras del equipo**: lo que compró cada vendedora como clienta y su descuento, con total.
- **Clientes nuevos y recurrentes** (nuevo = primera compra registrada en Alegra dentro del periodo).
- **Clientas que dejaron de venir** (60/90/120/180 días): las 50 que más compraron, con última compra, teléfono y botón de WhatsApp con un mensaje listo (solo celulares colombianos).
- Periodos rápidos (este año por defecto, este mes, mes anterior, últimos 90 días) o fechas libres hasta 3 años.
- Tienda sin Alegra configurado (Primavera hasta tener credenciales): aviso, sin errores. Tienda sin ventas en el periodo: aviso de que todavía no hay datos.
- Visto en Chromium (escritorio 1366 px y celular 390 px) con datos simulados: sin desborde horizontal; en celular se ocultan columnas secundarias (ticket, descuento, teléfono) y la última compra va debajo del nombre.

## [2026-10-01] Portada (login): sin rayado de cuaderno + sistema solar detrás de KOAJ

A pedido del usuario:
- **Quitado el "rayado de libro de caja"** (líneas horizontales) del panel oscuro del login: la portada queda como un fondo de universo limpio.
- **Nuevo `experience/scenes/OrbitScene.jsx`**: un sistema solar pequeño y tenue detrás de la palabra KOAJ, solo en `/login`. Sol con brillo, 8 planetas con su color real (Saturno con anillo), órbitas tenues en un plano inclinado (perspectiva 3D). Velocidades proporcionales a las reales pero comprimidas (ω ∝ 1/√periodo; con las reales Neptuno se vería quieto) y distancias comprimidas (√) para que quepa detrás del logo. Se dibuja antes que las letras y con poca opacidad para no competir con KOAJ ni con el formulario; aparece gradualmente; con "reducir movimiento" queda quieto; 3 llamadas de dibujo, < 600 vértices, geometrías liberadas al salir del login. Para quitarlo basta con borrar su línea en `ExperienceCanvas.jsx`.
- Verificado en Chromium (escritorio y celular): dos capturas con 4 s de diferencia muestran los planetas avanzando, sin errores en consola.

---

## [2026-10-01] Despliegue multi-tienda: sesión sin tiendas se completa sola

Vercel publica el frontend apenas se hace push, pero el backend de Render requiere Manual Deploy: en ese intervalo el login viejo no devuelve `stores`. El frontend ya no manda `X-Store` en ese caso (todo sigue como antes), y ahora además, si la sesión quedó sin tiendas, las vuelve a pedir a `/auth/verify` al recargar: el selector aparece solo una vez desplegado el backend, sin obligar a cerrar sesión.

Push a `main` (ambos repos) hecho el 2026-10-01; ramas `feat/multi-tienda` también en GitHub.

---

## [2026-10-01] Control de Empleadas → Ropa: las notas se ven siempre

A pedido del usuario: en la pestaña **Ropa** las notas/observaciones de cada prenda (ej. "54900 xs 36900 xs…") solo se veían al darle Editar. Ahora la tabla tiene una columna **Notas** siempre visible, igual que ya tenía Préstamos ("—" cuando no hay nota; las notas largas hacen salto de línea en vez de estirar la tabla). Permisos, Vacaciones y Pagos ya mostraban sus notas, no se tocaron. Verificado en el navegador contra backend local.

---

## [2026-10-01] Multi-tienda, Fase 5: Comparativo de tiendas (+ aviso de Alegra no conectado)

- **Nueva página `Estadísticas → Comparativo de Tiendas`** (`/estadisticas-estandar/comparativo-tiendas`, solo admin, `pages/StoreComparison.jsx`), alimentada por `GET /api/stores/comparison` (`services/storesService.js`):
  - Filtros en una fila: Este mes, Mes anterior, Últimos 7 / 30 días y rango personalizado (máx. 92 días, igual que el backend). Al recargar se mantiene el render anterior atenuado (sin saltos).
  - Tarjeta por tienda: ventas del periodo, facturas, ticket promedio, participación y anuladas excluidas. Si una tienda no tiene Alegra conectado, su tarjeta lo dice y el resto del comparativo sale igual.
  - **Ventas por día**: líneas de 2 px (SVG propio, sin librerías nuevas), eje Y en pasos redondos, etiquetas directas al final de cada línea (en celular solo leyenda), crosshair + tooltip con ambas tiendas, navegable con flechas del teclado, y **vista de tabla**. Con 7 días o menos se dibujan los puntos (un solo día era invisible como línea).
  - **Medios de pago**: barras horizontales agrupadas con el valor y el % sobre las ventas de cada tienda pegados a cada barra.
  - **Operación** (datos del sistema, no de Alegra): cierres registrados vs días del periodo, cierres con diferencia y diferencia acumulada vs Alegra, enviado y comprado en recompras, saldo disponible en cuentas hoy.
  - Colores fijos por tienda (nunca por ranking): tinta `#4A58D6` Carreño, naranja `#C2410C` Primavera. Pasan el validador de paletas (CVD ΔE ≥ 28, contraste ≥ 3:1).
- **Cierre de Caja**: aviso ámbar cuando la tienda activa todavía no tiene su cuenta de Alegra conectada (en vez de dejar fallar la preconsulta).

**Cómo se probó**: build OK, sin errores de lint nuevos. E2E con Playwright contra backend LOCAL + **Alegra simulado** (servidor de prueba en el puerto 5055 con facturas distintas por cuenta; nunca Alegra real): 13/13 (menú, presets, tarjetas, 2 líneas, tooltip con mouse y teclado, tabla de 30 días, operación, un solo día con puntos, celular 390 px sin scroll horizontal, vendedora sin acceso). Capturas revisadas a ojo en escritorio y celular.

---

## [2026-10-01] Multi-tienda, Fase 3: selector de tienda (KOAJ Carreño / KOAJ Primavera)

Se abre **KOAJ Primavera**: misma app, mismos módulos, datos 100% separados por tienda (el backend ya los separa, ver su CHANGELOG, Fases 1 y 2).

### Qué cambió
- **Selector de tienda** (`components/layout/StoreSwitcher.jsx`): control segmentado "Carreño | Primavera" en la barra superior (desktop) y filas táctiles grandes al inicio del menú móvil. Solo aparece si el usuario puede operar más de una tienda (hoy: el administrador). Las vendedoras ven solo su tienda, sin selector.
- **Tienda activa** (`utils/activeStore.js`): se guarda en la sesión y se valida siempre contra las tiendas que el backend devuelve para el usuario (`user.stores` en login y `/auth/verify`). Sobrevive a recargar la página.
- **`authenticatedFetch` manda `X-Store`** en cada petición de datos (no en `/auth/*`). Es el único punto de la app que habla con el backend, así que todos los módulos quedan separados por tienda sin tocarlos uno por uno.
- **Cambiar de tienda vuelve a montar layout + página** (`ProtectedRoute` con `key` por tienda): cada módulo recarga sus datos de la tienda nueva, sin recargar el navegador.
- **Sesiones abiertas antes de esta versión** (sin lista de tiendas) se completan solas en segundo plano con `/auth/verify`; mientras tanto el backend usa la tienda asignada al usuario.
- **Nombre de la tienda visible**: en la marca del header (ahora también en celular, para que nadie haga un cierre en la tienda equivocada), en el pie de página, en el título de la pestaña y **dentro del reporte del cierre que se exporta a PNG/PDF/JPEG** ("KOAJ Primavera" bajo "Resultados del Cierre"). Los archivos exportados incluyen la tienda: `Cierre_Caja_Primavera_<fecha>.png`.
- **Cierre de caja**: la base por defecto viene de la tienda activa (configurable por tienda en el backend, $450.000 en ambas); el mensaje "Base de caja exacta" usa el monto real en vez de "$450.000" fijo. El borrador local del conteo es por tienda y fecha (Carreño conserva el formato de clave anterior).
- **Gestión de Usuarios**: columna "Tienda" ("Todas" para administradores) y campo "Tienda" al crear/editar (deshabilitado para administradores, que operan todas).
- Textos genéricos donde no se conoce la tienda: login ("Puerto Carreño · Primavera"), `index.html` y manifiesto PWA ("Cierre de Caja KOAJ").
- Cuentas, Empleadas y Notas ahora tienen título de pestaña propio (antes heredaban el de `index.html`).
- `dist/` reconstruido; de paso queda sincronizado con `public/sw.js` (cache v2) e `icon-koaj.svg`, que el commit anterior no había llevado a `dist/`.

### Cómo se probó
- `npm run build` sin errores; `eslint` sobre los archivos tocados: 0 errores nuevos (los 7 que reporta ya existían en `main`).
- **E2E con Playwright** contra el backend LOCAL con una base SQLite temporal (nunca producción), 23/23 verificaciones, sin errores JS: admin cambia de tienda y ve solo las notas/cuentas de cada una; las peticiones llevan el `X-Store` correcto; la tienda activa persiste al recargar; título de pestaña con la tienda; Gestión de Usuarios muestra/edita la tienda; en celular (390 px) el nombre de la tienda se ve en el header, el selector del menú funciona y no hay scroll horizontal; una vendedora asignada a Primavera no ve selector, todas sus peticiones van a Primavera y nunca cae en `/unauthorized`.

---

## [2026-09-23] RESUMEN - Transformación visual "Arqueo" + experiencia WebGL (un solo commit)

Resumen de todo lo que entra en este commit. El detalle por etapa está en las entradas de abajo (desde "Rediseño visual y de UX Arqueo" hasta la Fase 15) y el plan completo, con decisiones y mediciones, en `PLAN_EXPERIENCIA_WEBGL.md`.

**Para deshacerlo todo:** `git revert <hash de este commit>` (o volver al commit anterior). Todo el trabajo está en este único commit.

### Qué cambió
- **Identidad visual nueva ("Arqueo")** en todas las pantallas: paleta grafito + tinta, tipografías Geist y Schibsted Grotesk (auto-hospedadas), radios, sombras y movimiento consistentes. Contraste WCAG AA en toda la app.
- **Capa 3D (WebGL)** detrás de la app, solo de presentación: KOAJ en partículas en el login, el efectivo apilándose mientras se cuenta en el cierre, metas del día/mes como recipientes, estadísticas convertidas en partículas con los datos reales, corrientes de saldo en Cuentas, transiciones entre páginas. Calidad adaptativa, pausa en segundo plano, versión quieta con "reducir movimiento" y la app funciona igual sin WebGL.
- **Cierre de caja** reorganizado en 4 pasos con cinta de total fija, modales con teclado (Escape, foco atrapado y devuelto).
- **Móvil** diseñado a propósito (320-430 px, áreas táctiles de 44 px, teclado y áreas seguras).
- **Accesibilidad:** nombres en todos los campos y botones, foco visible, un título principal por página; 15/15 rutas sin problemas en la auditoría automática.
- **Rendimiento:** la escena carga después de la página; sin fugas de memoria; teclear en el conteo no se vuelve lento.
- **Despliegue:** `vercel.json` con caché de assets y service worker `v2` (limpia el caché del diseño anterior). Notas en `README.md`.

### Cambios de lógica (solo dos, ambos autorizados por el usuario)
1. **Login con contraseña incorrecta** (`src/services/api.js`): un 401 en el propio login ya no recarga la página; se muestra "Credenciales incorrectas" y el contador de intentos funciona. En el resto de la app, un 401 sigue cerrando la sesión como antes.
2. **Base de caja exacta** (`src/components/Dashboard.jsx`): el backend envía `"exacta"` y la pantalla solo reconocía `"exacto"`, así que la base exacta se mostraba en rojo como si fuera un problema. Ahora se aceptan ambas: verde con ✓.

### Verificación exhaustiva antes del commit
Se compararon la versión anterior (último commit) y la nueva lado a lado, con los mismos datos de prueba:

| Qué se comparó | Resultado |
|---|---|
| Revisión de código: cada línea funcional modificada en `src/` (340) | Solo presentación, salvo los 2 cambios autorizados. Fórmulas de metas, porcentajes y redondeos idénticos |
| Payload del cierre enviado al backend (28 campos llenados, incluidos desfases) | Idéntico; solo cambia la hora de envío |
| Modal de confirmación y pantalla de resultados (85 cifras) | Idénticos (+ el texto "Base de caja exacta - $450.000" de la corrección 2) |
| Escrituras de gestión: ajuste y transferencia de cuentas, crear código, crear usuario, pago a empleada | Payloads idénticos byte a byte |
| Consultas al backend en 14 rutas (74 peticiones) | Idénticas |
| Errores en consola | Los mismos que antes, ninguno nuevo |
| Build de producción: login, cierre con descarga (escritorio y móvil), modales, 13 rutas | Sin errores |
| Lint de `src/` | Exactamente la misma lista que antes de la transformación |

---

## [2026-09-23] (continuación) - Experiencia WebGL: Fase 15 (cierre y entrega)

### 🐛 Corrección (autorizada)
- **Base de caja exacta en rojo:** cuando la base quedaba exacta, el resultado y el reporte la mostraban en un recuadro rojo con ícono de alerta. El backend envía `"exacta"` y la pantalla solo reconocía `"exacto"`. Ahora acepta ambas: recuadro verde con ✓ y "Base de caja exacta - $450.000". No cambia ningún cálculo.

### ✨ Pulido
- **Rankings** (Horas pico, Top vendedoras, Top productos): las medallas emoji pasan a un círculo numerado oro / plata / bronce (`RankBadge`), igual en cualquier dispositivo y legible por lector de pantalla.
- **Botones de ícono en celular/tablet:** 44 px mínimos (editar, eliminar, cerrar, mes anterior/siguiente…). En computador no cambian. Los de Usuarios y Códigos ahora también tienen nombre accesible.
- **Calidad de la escena por equipo:** `?quality=low` (o `medium` / `high`) en la dirección la fija en ese navegador; `?quality=auto` vuelve a automático.

### 🚀 Despliegue
- `vercel.json`: caché largo para `/assets/*` y `sw.js` siempre fresco. Notas completas en `README.md` → "Notas de despliegue".

### ✅ Verificación final
- 15/15 rutas sin problemas de accesibilidad; cierre completo con descarga (escritorio, móvil, sin WebGL, movimiento reducido); login; modales con teclado; 320 px sin desborde; lint idéntico al previo a la transformación; build OK.

---

## [2026-09-23] (continuación) - Experiencia WebGL: Fase 14 (auditoría antes/después)

### 🔍 Auditoría
- Comparación contra el último commit (estado previo a la transformación) con 60 capturas en 390 / 768 / 1366 / 1920 / 2560 y las 6 skills de diseño. Resultados y checklist del Master Prompt en `PLAN_EXPERIENCIA_WEBGL.md` (Fase 14).

### 🛠️ Correcciones que salieron de la auditoría
- **Cuentas en tablet:** los nombres de las cuentas en "Cómo se compone el total" se montaban unos sobre otros entre 768 y 1024 px. Ahora pasa a dos filas según el espacio real y cada nombre tiene fondo propio para que las corrientes no lo tapen.
- **Encabezados de Analytics, Productos e Inventario:** mismo estilo que el resto de páginas (sin tarjeta con franja de color).
- **Avisos** de Ventas mensuales, Estadísticas avanzadas e Inventario: contorno fino en lugar de franja lateral.
- **Reporte del cierre:** los emoji 💰 y 🏦 de "Caja Base" y "Para Consignación" pasan a íconos (se ven igual en cualquier teléfono o PC). Inventario sin emoji en títulos.
- **Transiciones:** se reemplazó `transition-all` por propiedades explícitas (63 lugares); las barras de progreso conservan su animación de ancho.
- **Textos:** "..." → "…" en 40 mensajes de carga y ayudas de campos.
- **Logo de la barra en celular:** área táctil más grande (27 → ~47 px) sin cambiar cómo se ve.

### ✅ Verificación
- Cierre completo con descarga JPEG (escritorio y móvil), login, modales con teclado, auditoría de accesibilidad en las páginas tocadas (0 problemas), lint idéntico al de antes de la transformación, build OK.
- Sin cambios de lógica.

---

## [2026-09-23] (continuación) - Experiencia WebGL: Fase 13 (accesibilidad)

### ♿ Contraste (`tailwind.config.js`, `src/index.css`, 49 componentes)
- Los tonos 600 de verde, esmeralda, teal, naranja, ámbar, amarillo, rojo y rosa bajan un paso: los montos de color y los botones blancos sobre color ahora cumplen WCAG AA (4.5:1). Los fondos suaves (50-500) no cambian. El reporte del cierre sigue en hex (compatible con html2canvas).
- Textos secundarios `gray-400` sobre fondo claro pasan a `gray-500`; red de seguridad para gris sobre fondos oscuros; pie del login legible.
- Resultado en las 15 rutas: 0 textos bajo AA.

### ⌨️ Teclado y lectores de pantalla
- Todos los campos (fechas, filtros, búsquedas, formularios de Empleadas, Cuentas, Recompras, Códigos, Inventario) tienen nombre accesible, igual al texto visible. Los 32 botones de solo ícono (editar, eliminar, cerrar, mes anterior/siguiente, marcar hecho) también.
- Foco visible en todos los campos, incluidos los segmentos día/mes/año de las fechas.
- Nuevo `src/hooks/useDialog.js`: en los 8 modales (confirmar cierre, éxito, error, advertencia, carga, facturas anuladas, código, usuario) Escape cierra con el mismo botón Cerrar/Cancelar, Tab no se sale del modal y el foco vuelve al botón que lo abrió. El modal de carga no se puede cerrar.
- Menús de la barra (Estadísticas, Gestión, usuario): Escape los cierra.
- Un solo `h1` por página (Analytics, Productos, Estadísticas Avanzadas).

### ✅ Verificación
- Auditoría automática en 15 rutas: 0 campos/botones sin nombre, 0 paradas de Tab sin foco visible, 0 fallas de contraste.
- Cierre completo con descarga JPEG (escritorio y móvil), login con clave errada y correcta, lint sin errores nuevos (70 = base), build OK.
- Sin cambios de lógica: solo atributos de accesibilidad, estilos y comportamiento de foco.

---

## [2026-09-23] (continuación) - Experiencia WebGL: Fase 12 (rendimiento)

### ⚡ Correcciones basadas en medición (`CashScene.jsx`, `MetricsScene.jsx`, `FlowScene.jsx`, `ExperienceCanvas.jsx`, `ExperienceLayer.jsx`)
- **Fuga de memoria GPU:** los tanques de métricas y la constelación de Cuentas no liberaban su geometría al salir de la página (5 → 26 geometrías en 10 ciclos). Ahora se liberan; queda estable en 6.
- **Teclas lentas en el conteo:** la primera tecla de monedas y de medios de pago tardaba hasta ~230 ms porque three.js compilaba ahí los shaders de las pilas. Ahora se precompilan cuando el navegador está libre, y mientras hay un campo con foco la escena baja a 30 FPS (20 en teléfono). Resultado: igual que sin escena (~110 ms con CPU 4× más lenta).
- **Pilas del cierre:** ya no recalculan sus ~440 posiciones en cada frame cuando están quietas o su sala no se ve (p95 del frame con CPU 6×: 33 → 17 ms).
- **Monitor de calidad:** 3 s de calentamiento tras montar y tras cada cambio de página; antes bajaba la calidad por la carga de la página, no por la escena.
- **Carga:** el motor 3D se pide después de que la página terminó de cargar (y más tarde en conexiones lentas); en 3G ya no retrasa el login.
- Solo en desarrollo: `?quality=low|medium|high` y `window.__koajGL` para medir.

### ✅ Verificación
- Mediciones por página y nivel, con CPU ralentizada, fugas con GC forzado, INP del conteo con y sin escena, y carga del build de producción en escritorio y móvil 3G (detalle en `PLAN_EXPERIENCIA_WEBGL.md`).
- Regresión: cierre + descarga JPEG (1440/390), login incorrecto/correcto, prueba táctil móvil OK. Lint: 70 problemas (los mismos). Build OK.

**Deploy:** solo frontend, Vercel con auto-deploy.

## [2026-09-23] (continuación) - Experiencia WebGL: Fase 11 (móvil)

### 📱 Móvil (`ExperienceLayer.jsx`, `ExperienceCanvas.jsx`, `SceneDirector.jsx`, `Dashboard.jsx`)
- Fix: al hacer scroll con el dedo el navegador cancela el puntero (`pointercancel`); la escena no lo escuchaba y dejaba un hueco fijo en las partículas.
- Mientras se escribe en un campo en un teléfono, la escena baja a ~20 FPS para dejarle el procesador al teclado y al formulario.
- Giroscopio opcional (solo Android, sin pedir permisos): inclinar el teléfono mueve levemente la cámara. Se apaga con movimiento reducido.
- Cinta del total en teléfonos de 320 px: la cifra ya no se corta.

### ✅ Verificación
- Perfil de teléfono con táctil real y CPU ralentizada (4× y 20×): la calidad baja sola cuando hace falta (39 → 53 FPS); gesto de scroll, escritura en el conteo y total correcto; 320 px y horizontal.
- Regresión: cierre + descarga JPEG (1440/390) y login incorrecto/correcto OK. Lint: 70 problemas (los mismos). Build OK.

**Deploy:** solo frontend, Vercel con auto-deploy.

## [2026-09-23] (continuación) - Experiencia WebGL: Fase 10 (pantallas restantes)

### 🔎 Códigos KOAJ, 👥 Usuarios, 📊 Ventas Mensuales (`KoajCodes.jsx`, `UsersManagement.jsx`, `MonthlySales.jsx`, `SceneDirector.jsx`, `formations.js`)
- Códigos KOAJ: las partículas escriben lo que se busca (tras 400 ms sin teclear) o la cantidad de códigos del catálogo; al cambiar la búsqueda viajan de una palabra a otra. La búsqueda y el filtrado no cambiaron.
- Usuarios: un cúmulo de partículas por persona con acceso (administrador grande, ventas mediano, inactivo tenue) con una leyenda que lo explica.
- Ventas Mensuales: el mismo "horizonte de datos" de Estadísticas con los totales por medio de pago.
- Acceso denegado: sin fondo propio, deja ver el ambiente.

### ✅ Verificación
- Playwright con API simulada: 1440 y 390; búsqueda "jeans" (viaje entre palabras); usuarios con admin/ventas/inactivo; ventas mensuales; movimiento reducido; sin WebGL (páginas iguales que antes).
- Regresión: cierre + descarga JPEG (1440/390) y login incorrecto/correcto OK. Lint: 70 problemas (los mismos). Build OK.

**Deploy:** solo frontend, Vercel con auto-deploy.

## [2026-09-23] (continuación) - Experiencia WebGL: Fase 9 (Gestión: flujo de saldos)

### 💸 Cuentas → Resumen (`CuentasLayout.jsx`, `scenes/FlowScene.jsx`)
- Nueva ventana "Cómo se compone el total": cada cuenta envía una corriente de partículas al "Total Recompras" con densidad proporcional a su saldo real; Jhonatan también suma. Saldo negativo = corriente al revés en ámbar. AHORRO orbita aparte (el backend lo excluye del total) con el rótulo "aparte".
- Pasar el cursor por una cuenta resalta su corriente y atenúa las demás.
- Rótulos (nombre, saldo) y corrientes comparten las mismas coordenadas calculadas en el DOM: nunca se desalinean. Desktop en arco, móvil en dos filas.
- Solo presentación: la lectura de cuentas y del balance de recompras no cambió; ninguna acción (ajustes, transferencias, sincronizar) se tocó.

### 🌊 Ambiente de Gestión (`SceneDirector.jsx`, `scenes/BaseField.jsx`)
- En Cuentas, Cuentas Recompras, Empleadas y Notas el campo de fondo deriva en corrientes horizontales ("flujo / conexiones").

### ✅ Verificación
- Playwright con API simulada (incluye un saldo negativo y AHORRO): 1440 y 390, resaltado al pasar el cursor, movimiento reducido (corrientes quietas), sin WebGL (Cuentas igual que antes); Empleadas y Notas a ~60 FPS.
- Regresión: cierre + descarga JPEG (1440/390) y login incorrecto/correcto OK. Lint: 70 problemas (los mismos). Build OK.

**Deploy:** solo frontend, Vercel con auto-deploy.

## [2026-09-23] (continuación) - Experiencia WebGL: Fase 8 (estadísticas como datos)

### 📈 Horizonte de datos (`MainLayout.jsx`, `SceneDirector.jsx`, `formations.js`, `scenes/BaseField.jsx`, `store.js`)
- Nueva franja en las rutas de estadísticas donde las partículas forman una gráfica de columnas con la serie real del módulo abierto. Se abre solo cuando hay datos.
- Módulos que publican su serie (solo lectura, sin cambiar su lógica): Horas pico, Tendencias, Top vendedoras, Top clientes, Cross-selling, Top productos, Categorías, Totales de ventas (vista mensual) e Inventario por departamento.
- Al cambiar de módulo o período las partículas viajan de la gráfica anterior a la nueva en vez de saltar.
- Cursor o dedo sobre la franja: la columna se resalta y un tooltip muestra el valor exacto (hora/fecha/nombre + monto, cantidad o %).
- `store.js`: suscripción por clave (`useSceneValue`) y `useSceneSeries` para publicar series con firma estable.
- Ajustes de legibilidad: en las gráficas las columnas no "respiran" y el cursor apenas las perturba.

### ✅ Verificación
- Playwright con API simulada: Horas pico (24 columnas) → Top vendedoras (5 columnas) con captura a mitad del viaje; tooltip "18:00 - 19:00 · $ 1.420.000"; móvil 390; movimiento reducido; sin WebGL (sin franja); Productos, Inventario, Totales y Documentos abren sin errores.
- Regresión: flujo completo del cierre + descarga JPEG OK (1440 y 390); login incorrecto/correcto OK. Lint: 70 problemas (los mismos). Build OK.

**Deploy:** solo frontend, Vercel con auto-deploy.

## [2026-09-23] (continuación) - Experiencia WebGL: Fases 6-7 (métricas como datos, transiciones entre páginas)

### 📊 Métricas del día y del mes (`scenes/MetricsScene.jsx`, `MainLayout.jsx`)
- La barra de meta se vuelve un tanque de partículas cuyo nivel es el avance real hacia la meta (+25%) que la página ya calculaba; la meta es una marca al 80% del ancho. Líquido con volumen y menisco, ola de superficie, oleaje con la velocidad del scroll y apertura con el puntero. Meta cumplida: verde, sobrepasa la marca y burbujea. Cargando: tanque vacío.
- Con escena activa las tarjetas de métricas pasan a fondo transparente (conservan su borde); sin WebGL vuelven la barra y el fondo blanco. `role="progressbar"` intacto.

### 🔁 Transiciones entre páginas (`SceneDirector.jsx`, `BaseField.jsx`, `index.css`)
- Al navegar, el campo de partículas hace un pulso de "warp" y se asienta; el contenido entra con un ascenso corto.
- Fix: la escena del cierre desaparece al instante al salir de la página (antes alcanzaba a verse medio segundo sobre la página nueva).
- `.animate-rise` y la nueva `.page-enter` usan `animation-fill-mode: backwards`: no dejan un `transform` aplicado, que rompería los `position: fixed` (modales, avisos) y `sticky` de su interior.

### ✅ Verificación
- Playwright con API simulada: tanques en 1440 y 390, meta cumplida, cursor, movimiento reducido (tanques quietos al nivel real) y sin WebGL (barra DOM); transición Cierre → Analytics capturada a 120/500/1800 ms; flujo completo del cierre + descarga JPEG OK en ambos anchos; login con contraseña incorrecta y correcta OK.
- Lint: 70 problemas (los mismos de antes). Build OK.

**Deploy:** solo frontend, Vercel con auto-deploy.

## [2026-09-23] (continuación) - Fix login con contraseña incorrecta + Experiencia WebGL Fase 5 (cierre de caja)

### 🐛 `src/services/api.js` - el error de credenciales incorrectas nunca se veía (autorizado por el usuario)
- **Causa:** `authenticatedFetch` trataba cualquier 401 como "sesión expirada": limpiaba la sesión y recargaba `/login` con `window.location.href`. En el propio login un 401 significa "credenciales incorrectas", así que la página se recargaba antes de mostrar el mensaje, el formulario se vaciaba y el contador de 5 intentos de `AuthContext` se reiniciaba con cada recarga.
- **Fix:** en los 3 puntos donde se maneja el 401 se excluye la petición `/auth/login` (`isLoginRequest`); esa respuesta vuelve a `AuthContext`, que ya sabía mostrar el mensaje y contar el intento. Cualquier otra petición con 401 sigue redirigiendo a `/login` igual que antes.
- Verificado con Playwright (API simulada): contraseña incorrecta → se queda en `/login`, conserva el correo y muestra el error; contraseña correcta → entra a `/dashboard`.

### 💵 Escena 3D del cierre (`scenes/CashScene.jsx`, `Dashboard.jsx`, `index.css`)
- Ventana de la escena: panel lateral sticky en desktop (el formulario pasa a una columna; Medios de pago y Ajustes quedan apilados) y vitrina bajo el conteo en móvil. Solo existen si la escena está activa (`html.has-scene`); sin WebGL el formulario vuelve a ocupar todo el ancho.
- El Dashboard publica en solo lectura lo que ya calcula (conteo por denominación, totales de Alegra, registrado, ajustes, paso visible, envío y resultado). Ninguna lógica del cierre cambió.
- Salas por paso: Alegra por medio de pago → pilas 3D de billetes y monedas que crecen al digitar → registrado vs Alegra + ajustes. Al enviar se comprime; validado → verde y asentado; diferencias → pilas separadas en ámbar.
- Corrección menor: la línea superior del grupo "Datafono" cruzaba su título.
- Infraestructura: anclaje DOM→3D con proyección exacta rayo-plano (sigue a la cámara que se mueve con el cursor); con movimiento reducido la escena se redibuja cuando la página publica datos.

### ✅ Verificación
- Playwright con API simulada, 1440 y 390: recorrido completo por las 3 salas, estado validado y estado con diferencias; movimiento reducido (pilas quietas) y sin WebGL (sin columna vacía); flujo completo + descarga del reporte JPEG OK en ambos anchos.
- Lint: 70 problemas (los mismos de antes). Build OK; bundle principal sin cambio relevante (94,8 kB).

**Deploy:** solo frontend, Vercel con auto-deploy.

## [2026-09-23] (continuación) - Experiencia WebGL: Fases 3-4 (sistema de movimiento y Login)

### 🌀 Sistema de movimiento (`src/experience/motion.js`, `SceneDirector.jsx`)
- Tokens de movimiento espejo de los CSS, constantes físicas únicas para la escena, `damp` y `spring` interrumpible independientes del framerate.
- `Conductor`: lee scroll y velocidad cada frame (sin listeners de scroll) y mueve la cámara con el puntero.
- `SceneDirector`: el campo de partículas cambia de estado por ruta en vez de recrearse (base de las transiciones de la Fase 7).

### 🔐 Login (`Login.jsx`, `formations.js`, `scenes/BaseField.jsx`)
- Las partículas forman la palabra KOAJ (muestreada con la fuente de la marca) sobre un ancla DOM del panel oscuro; el cursor/dedo las aparta con inercia y la palabra se rearma.
- Conectando: la palabra "respira". Error: recula y se rearma. Ingreso exitoso: el ambiente pasa de tinta a papel y la palabra se dispersa mientras aparece la app.
- El panel de marca ahora es transparente sobre el fondo tinta del body (`html.theme-login`); el formulario queda en un panel claro. Lógica de Formik, validación y reintentos sin cambios.
- Respaldos: movimiento reducido = palabra estática; sin WebGL = marca KOAJ en DOM.

### 🔎 Hallazgo (no modificado, pendiente de decisión)
- Con contraseña incorrecta, `authenticatedFetch` trata el 401 como sesión expirada y recarga `/login`: el mensaje de credenciales incorrectas nunca se muestra y el contador de 5 intentos se reinicia.

### ✅ Verificación
- Playwright: palabra formada y rearmado tras el cursor en 1440 y 390; transición de ingreso capturada a 250/750/2250 ms (llega a `/dashboard`); movimiento reducido y sin WebGL correctos; flujo completo del cierre + descarga JPEG OK.
- Lint: 70 problemas (los mismos de antes). Build OK; bundle principal 94,7 kB (sin cambio relevante).

**Deploy:** solo frontend, Vercel con auto-deploy.

## [2026-09-23] (continuación) - Experiencia WebGL: Fases 0-2 (instalación, estudio de referencias, capa base)

Inicio del plan `PLAN_EXPERIENCIA_WEBGL.md` (a partir de `# MASTER PROMPT.txt`). Solo presentación: ninguna lógica, endpoint, cálculo ni flujo cambió.

### 📦 Dependencias (instaladas con red alterna, la cableada bloquea el registro de npm)
- `three` 0.186 y `@react-three/fiber` 8.18 (v8 porque el proyecto usa React 18).
- `@fontsource-variable/geist` y `@fontsource-variable/schibsted-grotesk`, ahora importadas en `src/main.jsx` (auto-hospedadas, las cachea el service worker). Antes la app caía a la fuente del sistema.

### 🔭 Estudio de referencias (Fase 1)
- Principios extraídos y decisiones documentadas en `PLAN_EXPERIENCIA_WEBGL.md`. `akira.art` ya no existe y `resn.co` está fuera de línea; `toruslab.com` no responde desde ninguna de las dos redes. Se agregó igloo.inc como referencia de "desarmar / rearmar".

### ✨ Capa WebGL base (Fase 2) - `src/experience/`
- Un solo canvas fijo detrás de toda la app (`ExperienceLayer` en `App.jsx`), persistente entre rutas, `aria-hidden` y con `pointer-events: none`: nunca captura clics ni foco.
- Campo de partículas en shader GLSL que deriva, hace parallax con el scroll y se aparta del cursor/dedo con inercia.
- Calidad adaptativa (alta/media/baja según dispositivo y FPS medido), pausa con la pestaña oculta, escena quieta con movimiento reducido, y sin WebGL o con "Ahorro de datos" simplemente no se monta.
- Carga diferida: three viaja en un chunk aparte (~232 kB gzip) que se pide cuando el navegador está libre; el bundle principal no cambió.
- `MainLayout` deja de pintar su propio fondo para que la escena se vea detrás.
- Cifras grandes en fuente display con dígitos proporcionales (las tabulares de Schibsted separaban el punto de miles).

### ✅ Verificación
- Playwright con API simulada: 60 FPS en 1440 y 390; clic en el fondo cae en `<main>`; movimiento reducido = escena quieta; sin WebGL = sin canvas y sin errores; flujo completo del cierre + descarga del reporte JPEG OK en ambos anchos (reporte limpio).
- `npm run lint` sin problemas nuevos (70, los mismos de antes); `vite build` OK.

**Deploy:** solo frontend, Vercel con auto-deploy.

## [2026-09-23] (continuación) - Rediseño visual y de UX "Arqueo" (solo presentación)

El usuario pidió una transformación visual e interactiva completa (documento "MASTER PROMPT - VISUAL & UX TRANSFORMATION") **sin tocar lógica de negocio, endpoints, cálculos, estados ni flujos**. Todos los handlers, `value`, `id`, `aria-label`, condiciones y llamadas a la API quedaron idénticos; solo cambió JSX de presentación y estilos.

### 🎨 Sistema de diseño centralizado (`tailwind.config.js`, `src/index.css`)
- Las escalas de color de Tailwind se **reemplazan** (no se extienden): `gray/slate` → grafito frío, `blue/indigo` → "tinta" (único acento), `purple/violet` → ciruela (categoría transferencias). Así las ~4.500 clases ya escritas en 50+ componentes heredan la nueva identidad sin editarlas una por una. Verde/rojo/ámbar/naranja/teal/rosa se conservan: son semántica o código de módulo.
- Radios, sombras (tintadas, no negras) y curvas de movimiento (`ease-out` fuerte) como tokens. Todo en hex: **html2canvas (reporte PDF/JPEG del cierre) no soporta oklch/color-mix**.
- Capa global: foco visible solo con teclado, `scale: 0.98` al presionar botones (propiedad `scale`, no `transform`, para no romper los `-translate-*` existentes), inputs a 16px en móvil (evita el zoom de iOS), cifras tabulares en toda la app, `prefers-reduced-motion`, `scroll-padding-bottom` para que la cinta fija nunca tape el campo enfocado, `touch-action: manipulation`.
- Tipografías declaradas: **Schibsted Grotesk** (títulos y cifras) + **Geist** (interfaz), con respaldo al sistema. **Pendiente instalarlas** (`npm install @fontsource-variable/geist @fontsource-variable/schibsted-grotesk` + importarlas en `main.jsx`): el registro de npm no respondía desde la red de ese momento. Mientras tanto la app usa la fuente del sistema.

### 🧭 Shell (`MainLayout.jsx`, nuevos `common/BrandMark.jsx` y `common/AppLoader.jsx`)
- Marca KOAJ real en el header (antes: ícono de gráfica en cuadro con degradado). Navegación en texto con subrayado activo; menús con animación desde su disparador; avatar con iniciales; header translúcido cuya sombra aparece al hacer scroll (IntersectionObserver, sin listener de scroll).
- Métricas del día/mes: cifras protagonistas, metas como barras finas con `role="progressbar"`, skeletons en vez de spinners. En móvil las dos tarjetas se deslizan en horizontal (scroll-snap) para que el cierre no quede dos pantallas abajo.
- Menú móvil con objetivos táctiles de 44-48px; enlace "Saltar al contenido"; aviso de cierre pendiente con acción explícita "Hacer el cierre ahora".
- Corrección de paso: `ActiveRule`/`DropdownPanel` se definieron primero como componentes dentro del render; como el reloj re-renderiza cada segundo, se habrían remontado (y re-animado) cada segundo. Se dejaron como funciones de render.

### 💵 Cierre de caja (`Dashboard.jsx`)
- Encabezado de página alineado a la izquierda (se quitó el logo KOAJ gigante duplicado). El formulario se organiza en 4 pasos numerados (Fecha, Efectivo, Medios de pago, Ajustes) con navegación contextual en desktop que resalta el paso visible.
- Monedas/billetes como libro de caja: denominación | cantidad | subtotal alineados; subtotales en cero atenuados.
- Resultado de la preconsulta como recibo (rangos de facturas + totales por medio de pago con marca de color de categoría) y skeleton mientras consulta.
- **Cinta de total fija abajo** (`sticky`) con "Total en Caja" + "Realizar Cierre": el total queda visible mientras se cuenta. Base Caja y Limpiar pasan a una fila propia justo encima.
- Modales: hoja inferior en móvil / diálogo en desktop, fondo con desenfoque leve, `role="dialog"`, `overscroll-contain`, área segura del iPhone. Botones de degradado → sólidos.

### 🧹 Resto de pantallas
- 85 degradados en 21 archivos → colores sólidos con una sola regla (`bg-gradient` claro → tono suave; fuerte azul/morado → negro tinta; fuerte semántico → su color sólido). Se conservaron los de `CategoriasProductos` (codifican categorías en gráficas).
- Botones primarios azules (`bg-blue-600 … text-white … hover:bg-blue-700`) → negro tinta en 23 archivos, para que la acción principal se vea igual en toda la app.
- Modales de Códigos KOAJ, Usuarios y Facturas anuladas con el mismo tratamiento de hoja/diálogo. `MonthlySales` ya no pinta su propio fondo de pantalla completa dentro del layout.
- `Login`, `Unauthorized`, `ErrorBoundary` y cargadores rediseñados con la misma identidad. `index.html` en `lang="es"`, favicon KOAJ, `theme-color` y manifest actualizados; caché del service worker `v1` → `v2` para que los celulares tomen el ícono nuevo (se sirve cache-first).

### ✅ Verificación
- Capturas con Playwright a 390px y 1440px de login, cierre, cuentas, empleadas, analytics, inventario, usuarios, códigos, ventas mensuales, con **toda la API interceptada con datos de prueba** (ninguna petición salió a un backend real, local ni de producción).
- Flujo completo del cierre simulado: preconsulta → conteo → confirmación → modal de éxito → resultados → **descarga real del reporte JPEG con html2canvas** en ambos anchos; el reporte se genera correcto y legible con la nueva paleta.
- `npm run lint`: sin errores nuevos (los 5 de los archivos tocados ya existían). `vite build` sin errores; el chunk de Dashboard pesa lo mismo que antes (~675 kB, por html2canvas/jsPDF), CSS +3,6 kB.
- Auditorías: `impeccable detect` (se corrigieron rebote y animación de `width`), Web Interface Guidelines de Vercel (elipsis tipográfica, skip link, touch-action, scroll-padding).

**Deploy:** solo frontend, Vercel con auto-deploy. No requiere cambios de backend.

## [2026-09-23] - Tooling: skills de diseño/UX y MCP para Claude Code

El usuario pidió instalar en este proyecto el mismo stack de skills y MCP de diseño que usa en su otro proyecto (PlataformaVentasInventariosCierres), versionado aquí para que un `git pull` en otro PC los traiga.

### 🔧 Archivos nuevos
- `.claude/skills/` — 6 skills: `design-taste-frontend`, `emil-design-eng`, `frontend-design`, `impeccable`, `ui-ux-pro-max`, `web-design-guidelines` (instaladas con `npx skills@latest add ... -a claude-code -y`).
- `skills-lock.json` — fuente y hash de cada skill.
- `.mcp.json` — servidores MCP `playwright` y `21st` (la key de 21st se lee de la variable de entorno `API_KEY_21ST`, no está en el repo).
- `CLAUDE.md` — pasos de configuración por máquina y checklist de verificación después del `git pull`.
- `.gitignore` — `.claude` pasa de ignorarse completa a versionar solo `.claude/skills/` (lo local, como `settings.local.json`, sigue ignorado); se ignoran `__pycache__/` y `*.pyc`.

### ✅ Verificación
- Las 6 skills se detectan en la sesión; `mcp__21st__get_usage` responde (tier free); `impeccable doctor --json` termina bien; `ui-ux-pro-max` `search.py` devuelve resultados; `raw.githubusercontent.com` es accesible.
- Playwright MCP dio `CONNECT_TIMEOUT` en su primer arranque (npx descargando el paquete); ya quedó en la caché de npx.

**Deploy:** no afecta la app (ni build ni runtime) — no requiere deploy.

## [2026-09-14] (continuación) - Fix: no se podía escribir el año completo en "Contempla saldo hasta"

El usuario reportó, con captura de pantalla, que al escribir la fecha en el campo nuevo (ver entrada anterior, mismo día) el año se quedaba en solo 2 dígitos (ej. "16/09/0002" en vez de "16/09/2026") — no lo dejaba terminar de escribir.

### 🐛 La causa
- `<input type="date">` dispara un evento `change` en cada tecla del año, aunque esté incompleto (Chromium lo completa con ceros a la izquierda: "2" → año `0002`, "20" → `0020`, etc.). El campo estaba conectado directo a `value={a.contemplated_until || ''}` y guardaba en el backend en cada una de esas teclas — la respuesta del servidor volvía a renderizar el input con ese valor a medio escribir, reiniciando el campo y dejando al usuario sin poder seguir escribiendo el resto del año.

### 🔧 `src/pages/CuentasLayout.jsx`
- Nuevo componente `DateNoteInput` con estado local propio (`draft`), desacoplado del valor del backend mientras el usuario escribe. Solo se sincroniza con el valor externo cuando el campo no está "sucio", y solo guarda (`onSave`) al perder el foco (`onBlur`) — nunca en cada tecla. Reemplaza el `<input type="date">` inline que se había agregado en la entrada anterior.

### ✅ Verificación
- Se reprodujo el mecanismo exacto del bug simulando a nivel de DOM los eventos `input` que dispara el navegador al escribir el año dígito por dígito (`0002-09-16` → `0020-09-16` → `0202-09-16` → `2026-09-16`), confirmando con Playwright que: (1) no se dispara ningún `PATCH` al backend mientras se escribe, (2) el campo conserva el valor completo sin reiniciarse, (3) al perder el foco se dispara exactamente 1 `PATCH` con la fecha final correcta, y (4) recargar la página confirma que quedó persistida en el backend.
- La automatización de teclado nativa contra los segmentos internos del widget resultó poco confiable en Chromium headless (limitación conocida de la herramienta, no del código) — se optó por simular los eventos DOM reales que el navegador dispara, que es lo que efectivamente consume el código de React.
- `npm run build` y `npm run lint` sin errores nuevos.

**Deploy:** solo frontend, sin cambios de backend — auto-deploy en Vercel, no requiere Manual Deploy en Render.

## [2026-09-14] - Fecha "Contempla saldo hasta" editable en la tarjeta ADDI + DATÁFONO

El usuario pidió poder anotar, directamente en la tarjeta "ADDI + DATÁFONO (Tarjetas)" de Gestión → Cuentas → Resumen, hasta qué fecha contempla que ese saldo debería estar consignado (Addi paga días después de la transacción, y él lo sabe manualmente) — para poder corroborar visualmente si ya le toca revisar que Addi hubiera pagado.

### 📅 `src/pages/CuentasLayout.jsx`
- La tarjeta con `payment_key === 'addi_datafono'` (mismo patrón condicional que ya existía para el texto de EFECTIVO) ahora muestra un `<input type="date">` inline bajo el saldo, con la etiqueta "Contempla saldo hasta:". Guarda automáticamente al cambiar (sin botón "Guardar" aparte), actualizando el estado local con la respuesta del backend.

### 🔌 `src/services/accountsService.js`
- Nueva función `updateContemplatedUntil(accountId, dateStr)` — `PATCH /api/accounts/<id>/contemplated-until` (ver CHANGELOG del backend, misma fecha).

### ✅ Verificación
- `npm run build` y `npm run lint` sin errores nuevos.
- Probado con Playwright contra un backend local (nunca producción): login real, se fijó la fecha "2026-09-20" en el campo de la tarjeta, captura de pantalla confirmando la posición y el formato visual, y recarga de página confirmando que el valor persiste (viene del backend, no de estado local del navegador).

**Deploy:** requiere que el backend (mismo día, ver su CHANGELOG) esté desplegado en Render (Manual Deploy) para que el endpoint nuevo exista. Frontend en Vercel con auto-deploy.

## [2026-09-10] (continuación) - "Total" renombrado a "Total Recompras", aclarado que no incluye Ahorro

### 💰 `src/pages/CuentasLayout.jsx`
- La última tarjeta del resumen (Gestión → Cuentas) pasó de decir **"Total"** a **"Total Recompras"**, con la aclaración "(sin Ahorro)" en su descripción — el número en sí ya viene sin el ahorro desde el backend (ver su CHANGELOG, misma fecha).
- "Saldo total (real)" ahora aclara en su descripción "Cuentas de la tienda para recompras (sin Ahorro)", para que quede claro que ese número no incluye lo que hay guardado en Ahorro.

### ✅ Verificación
- `npm run build` sin errores nuevos.
- Verificado visualmente con Playwright contra un backend local: con QR en $1.000.000 y AHORRO en $4.360.000, tanto "Saldo total (real)" como "Total Recompras" muestran $1.000.000 - el ahorro no se mezcla, pero sigue visible en su propia tarjeta más abajo.

**Deploy:** requiere que el backend (mismo día) esté desplegado en Render. Frontend en Vercel con auto-deploy.

## [2026-09-10] - Nueva cuenta AHORRO en Resumen

### 🎨 `src/pages/CuentasLayout.jsx`
- Nuevo color `emerald` en `COLOR_CLASSES` para la tarjeta de la cuenta AHORRO (ver CHANGELOG del backend, misma fecha, donde se agregó la cuenta). Sin este color caería al `blue` por defecto, visualmente igual a ADDI + DATÁFONO.
- No se necesitó ningún otro cambio: la tarjeta, "Ajuste manual de saldo" y "Transferir entre cuentas" ya listan las cuentas dinámicamente desde `GET /api/accounts`, así que AHORRO aparece sola en los 3 lugares en cuanto existe en el backend.

**Deploy:** requiere que el backend (mismo día) esté desplegado en Render. Frontend en Vercel con auto-deploy.

## [2026-09-09] - Cuentas Recompras: fix del campo de comisión y rediseño de las cajas de resumen

El usuario reportó dos problemas al enviar dinero a Jhonatan (Gestión → Cuentas → Cuentas Recompras): (1) era difícil poner un cero o borrar la comisión editable, y (2) el "Valor neto" mostrado no correspondía a lo que realmente pasa con el dinero (ver CHANGELOG del backend, misma fecha, para el fix de fondo de la comisión).

### 🐛 `src/pages/CuentasRecompras.jsx` — campo de comisión no se dejaba borrar
- **Causa:** el campo usaba el string vacío (`''`) tanto para "el usuario nunca tocó este campo, mostrar el 4‰ automático" como para el estado transitorio de "el usuario está borrando el número" - al borrar el último dígito con Backspace, el campo volvía a saltar al valor automático en vez de quedar vacío para poder escribir uno nuevo.
- **Fix:** se separó el sentinel a `null` (nunca tocado → automático) de `''` (el usuario lo vació y está escribiendo algo nuevo, incluido un cero). Verificado con Playwright simulando Backspace tecla por tecla: el campo ahora sí queda vacío y acepta escribir "0" u otro valor sin saltar de vuelta al automático.

### 💰 `src/pages/CuentasRecompras.jsx` — rediseño de las cajas de resumen del envío
- "Enviado (medios)" ahora aclara "Esto es lo que le llega a Jhonatan" (no se le descuenta la comisión).
- La caja "Valor neto" (enviado − comisión) se reemplazó por **"Total a descontar de cuentas"** (enviado + comisión) - la comisión la asume la tienda, se descuenta de la cuenta de origen, no del socio. Mismo cambio en la columna de la tabla de envíos ("Valor neto" → "Total descontado") y en el total del pie de página.

### ✅ Verificación
- `npm run build` y `npm run lint` sin errores nuevos.
- Probado con Playwright contra un backend local (nunca producción): el envío real reportado por el usuario ($189.800 por QR, comisión automática $759) mostró correctamente "Total a descontar de cuentas: $190.559"; tras guardarlo, Resumen mostró QR en **-$190.559** y "Balance disponible (Jhonatan)" en **$189.800** - coincide exactamente con lo esperado.

**Deploy:** requiere que el backend (mismo día, ver su CHANGELOG) esté desplegado en Render (Manual Deploy) para que la comisión se descuente correctamente de las cuentas. Frontend en Vercel con auto-deploy.

## [2026-09-08] - Aviso de cierre de caja pendiente; estado de sincronización y alertas en Cuentas

El usuario reportó que al hacer clic en "Sincronizar ahora" (Gestión → Cuentas) aparecía "No hay cierre de caja registrado para hoy", y preguntó qué pasaba si el cierre de un día no se hacía y se hacía atrasado al día siguiente. Investigado a fondo (ver CHANGELOG del backend, misma fecha): ni el botón ni el cron de las 9pm sincronizaban nada que no fuera la fecha de hoy, así que un cierre atrasado nunca se acreditaba. Esta entrada agrega el aviso recordatorio y corrige ese flujo del lado del frontend.

### 🔔 `src/components/layout/MainLayout.jsx` — aviso fijo de "cierre pendiente"
- Nuevo banner (visible en cualquier página, ámbar) que aparece mientras haya días pasados sin cierre de caja registrado, consultando `GET /api/cash_closing/pending-dates` al montar. Con 1 fecha faltante: "No se registró el cierre de caja del {fecha}."; con más de una: "Hay N cierres de caja sin registrar, el más antiguo del {fecha}."
- Clic en el aviso navega a `/dashboard?date={fecha faltante}` con esa fecha ya cargada en el formulario del cierre.
- Escucha el evento `cash-closing-success` (disparado por `Dashboard.jsx` tras un cierre exitoso) para refrescar la lista al instante, sin esperar a la próxima navegación entre páginas.

### 📅 `src/components/Dashboard.jsx`
- Lee el query param `?date=` (vía `useSearchParams`) para precargar esa fecha en el formulario del cierre al llegar desde el aviso de MainLayout, validando formato y que no sea una fecha futura.
- **Bug real encontrado y corregido durante las pruebas:** como `/dashboard` es la misma ruta, React Router no remonta el componente al cambiar solo el query string — el `useState` inicial solo cubría la primera carga de la página. Se agregó un `useEffect` que sincroniza `closingDate` cada vez que cambia `searchParams`, para que un segundo clic en el aviso (estando ya en el Dashboard) sí mueva la fecha del formulario.
- Tras un envío de cierre exitoso, dispara `window.dispatchEvent(new CustomEvent('cash-closing-success', ...))` para que el aviso de MainLayout se actualice sin recargar la página.

### 🔁 `src/pages/CuentasLayout.jsx`
- `handleSync` ahora llama a `syncDaily()` **sin fecha** (antes siempre pasaba la fecha de hoy) — el backend sincroniza todos los cierres pendientes hasta hoy en una sola llamada, incluyendo cierres atrasados de días anteriores.
- Nueva línea de estado junto al botón "Sincronizar ahora": fecha/hora de la última sincronización exitosa y diferencia con Alegra (verde si es mínima, ámbar si es ≥$100), más un aviso ámbar si hay cierres hechos pero aún sin sincronizar. Alimentado por `GET /api/accounts/sync-status` (nuevo, `getSyncStatus()` en `accountsService.js`).
- Nuevo banner rojo si el cron automático de las 9pm falló (workflow de GitHub Actions, ver backend): "La sincronización automática falló el {fecha}: {mensaje}". Se resuelve solo en la siguiente sincronización exitosa.

### ✅ Verificación
- `npm run build` y `npm run lint` sin errores nuevos en los archivos tocados.
- Probado end-to-end con Playwright contra un backend local (BD SQLite de prueba, nunca producción): login real, banner mostrando "2 cierres de caja sin registrar, el más antiguo del 05 de septiembre de 2026"; clic navega y precarga la fecha correcta en el formulario; al insertar directamente un cierre para esa fecha (simulando un envío exitoso) y disparar el evento, el banner se actualiza solo a la fecha restante sin recargar la página.
- Probado también el estado de sincronización y la alerta de fallo en la pantalla de Cuentas contra el mismo backend local: alerta roja visible con el mensaje correcto, línea de "Última sincronización" con fecha/hora, y confirmación de que la alerta se limpia tras un clic exitoso en "Sincronizar ahora" incluso sin cierres pendientes.

**Deploy:** solo frontend, Vercel tiene auto-deploy activo. Depende de que el backend (misma fecha) esté desplegado en Render (Manual Deploy) para que los endpoints nuevos (`pending-dates`, `sync-status`, `sync-failure`) respondan.

---

## [2026-09-07] - Tarjeta combinada Saldo total + Balance disponible de Jhonatan en Resumen

### 💰 `src/pages/CuentasLayout.jsx`
- La tarjeta superior de la pestaña **Resumen** (Gestión → Cuentas) solo mostraba el "Saldo total (real)" de las cuentas de la tienda, sin ninguna referencia al dinero que tiene el socio **Jhonatan** en un momento dado (visible hasta ahora solo entrando a la pestaña "Cuentas Recompras")
- Ahora muestra 3 números en una sola tarjeta: **Saldo total (real)** + **Balance disponible (Jhonatan)** = **Total**, con el desglose "$X recibido − $Y en compras (este mes)" debajo del segundo número
- Nuevo `loadRepurchaseBalance()`: obtiene los envíos y compras del **mes calendario actual** (`getColombiaDate()`, no acumulado histórico — evita doble-contar el campo `sobrante_mes_anterior` que se llena a mano cada mes) vía `getEntries`/`getPurchases` de `repurchaseService.js`, con la misma fórmula que ya usa `CuentasRecompras.jsx` (`balance = recibido − compras`)
- `onEntriesChanged` (pasado a `CuentasRecompras`) ahora dispara `refreshSummary()` (cuentas + balance de recompras juntos) en vez de solo `loadAccounts()`

### 💰 `src/pages/CuentasRecompras.jsx`
- `handlePurchaseSubmit` y `handleDeletePurchase` ahora también llaman a `onEntriesChanged?.()` — antes solo los envíos lo hacían (porque solo ellos tocan las cuentas de Resumen), pero ahora las compras también afectan el Total combinado mostrado en Resumen y deben refrescarlo

### 🏷️ `src/pages/CuentasLayout.jsx` — nota en la tarjeta EFECTIVO
- Se agregó el texto "Está en el local, aún no se ha enviado" bajo el saldo de la cuenta EFECTIVO (identificada por `payment_key === 'cash'`), para aclarar que ese dinero está físicamente en la tienda y solo pasa a las cuentas de Jhonatan cuando se envía

### ✅ Verificación
- `npm run build` y `npm run lint` sin errores nuevos en los 2 archivos tocados
- Probado en vivo con Playwright contra el backend real de Render (login con credenciales de producción del usuario): Resumen mostró "$6.613.796 + $73.605 = $6.687.401" ("$12.902.322 recibido − $12.828.717 en compras"), y la pestaña Cuentas Recompras (Septiembre 2026) mostró el mismo Balance disponible ($73.605) con idéntico desglose — coinciden
- Probado también en viewport móvil (390×844): la tarjeta se apila correctamente sin overflow

---

## [2026-09-02] - Fix: fechas de facturas corridas un día; peticiones redundantes en cada navegación

Encontrados durante una revisión integral de la sección Estadísticas (login real contra producción + inspección de código), con capturas de red antes/después.

### 🐛 `src/components/direct/DirectSalesDocuments.jsx` — fechas de facturas un día atrás
- Cada factura en "Documentos de Venta" mostraba la fecha del día anterior con una hora idéntica y falsa ("07:00 p. m." en absolutamente todas). Causa: Alegra devuelve `date` como `"2026-09-02"` (solo fecha, sin hora); `new Date("2026-09-02")` lo interpreta como medianoche UTC, y al mostrarlo en Colombia (UTC-5) cae en el día anterior a las 7pm. Afecta a cualquier usuario con el navegador en horario de Colombia, es decir, a todos los usuarios reales del sistema.
- Fix: usar el campo `datetime` que Alegra sí entrega con la hora local real (ej. `"2026-09-02 15:30:23"`), que JS interpreta correctamente como hora local (no UTC). Verificado: antes "1 de sept, 07:00 p. m." en todas las filas → ahora "2 de sept" con la hora real de cada venta (`03:30 p. m.`, `02:28 p. m.`, etc.)

### 🐛 `src/components/common/VoidedInvoicesAlert.jsx` — mismo bug, en el detalle de facturas anuladas
- La fecha mostrada al expandir el detalle de una factura anulada tenía el mismo problema (este endpoint no expone `datetime`, solo `date`). Fix: parsear los componentes de la fecha manualmente (año/mes/día) en vez de dejar que `new Date()` la interprete como UTC.

### 🐛 `src/components/direct/DirectSalesTotals.jsx` — "hora de mayor venta" siempre incorrecta
- El cálculo de ventas-por-hora usaba `doc.date` antes que `doc.datetime` (`new Date(doc.date || doc.datetime)`), así que el 100% de las ventas se agrupaban en la hora 19:00 sin importar la hora real de compra — la métrica de "hora pico" en esta vista nunca fue confiable. Fix: invertir la prioridad (`doc.datetime || doc.date`).

### ⚡ `src/hooks/useSalesComparison.js` + `src/components/layout/MainLayout.jsx` — peticiones redundantes en cada navegación
- `MainLayout` envuelve **todas** las rutas de la app, y como cada ruta declara su propio `<MainLayout>` (no hay layout anidado persistente), React lo remonta por completo en cada navegación. `useSalesComparison()` se ejecutaba sin condición en cada montaje, disparando ~9 peticiones a Alegra (ventas del día/mes, comparación año anterior, inventario, cuentas por cobrar) — aunque esas métricas solo se renderizan en `/dashboard` (el resto de páginas nunca las muestra).
- Confirmado en vivo: navegar a "Documentos de Venta" disparaba las mismas ~9 peticiones que ya se habían hecho al entrar por `/dashboard`, en cada visita.
- Fix: `useSalesComparison` ahora acepta un parámetro `enabled` (default `true`, no rompe el otro consumidor del hook en `SalesComparisonYoY.jsx`); `MainLayout` lo pasa como `location.pathname === '/dashboard'`. Verificado: peticiones de métricas en `/dashboard` siguen disparándose normalmente; en `/estadisticas-avanzadas/documentos` pasaron de ~9 a 0.

### ✅ Verificación
- `npm run build` y `npm run lint` sin errores nuevos en los 4 archivos tocados
- Los 3 fixes de fecha/hora probados en vivo contra el backend real de Render (login con credenciales de producción), comparando capturas antes/después
- Fix de peticiones redundantes probado en vivo contando peticiones de red en `/dashboard` vs. una página de Estadísticas antes y después del cambio

---

## [2026-09-02] - Menú hamburguesa para navegación en móvil/tablet

### 📱 `src/components/layout/MainLayout.jsx`
- La barra de navegación horizontal ("Cierre de Caja", "Ventas Mensuales", "Estadísticas", "Gestión", "Docs") tenía la clase `hidden lg:flex` — por debajo de 1024px desaparecía por completo y no había ningún reemplazo, dejando el sistema inaccesible desde el celular salvo por el menú de usuario (avatar)
- Se agregó un botón de menú hamburguesa (ícono `Menu`/`X` de lucide-react), visible solo con `lg:hidden`, que despliega un panel debajo del header con las mismas opciones que la nav de escritorio: Cierre de Caja / Ventas Mensuales, Estadísticas (acordeón, solo admin), Gestión (acordeón: Cuentas, Control de Empleadas, Notas y Pendientes), Docs (enlace externo a Swagger), y el reloj (que también estaba oculto en móvil)
- El menú respeta los mismos roles/permisos que la nav de escritorio (`canAccess`, `visibleDashboardItems`/`visibleStatsItems`/`visibleGestionItems`) y se cierra automáticamente al navegar a cualquier opción o al cambiar de ruta
- La navegación de escritorio (≥1024px) no se modificó

### ✅ Verificación
- `npm run build` y `npm run lint` sin errores nuevos (los 22 errores preexistentes de lint son de otros archivos, no relacionados a este cambio)
- No se pudo hacer una prueba end-to-end con Playwright en este entorno (el permiso para crear un usuario admin temporal de prueba fue bloqueado por el clasificador de seguridad de la sesión) — verificado por build/lint y revisión manual del JSX, sin confirmación visual en navegador real dentro de esta sesión

---

## [2026-09-01] - Separador de miles EN VIVO en Cuentas Recompras

### 🔢 `src/pages/CuentasRecompras.jsx`
- Nuevo componente `LiveMoneyInput`: a diferencia del `CurrencyInput` de `CuentasLayout.jsx` (que formatea solo al salir del campo), este formatea **mientras se escribe**, recalculando la posición del cursor en cada tecla para que no salte al insertar/borrar dígitos en medio del número
- Aplicado en 3 lugares (a pedido del usuario, con capturas de pantalla señalando cada uno): los campos de "Montos enviados por medio de pago" y "Sobrante mes anterior" del formulario de envío (`NumberField`, usado tanto en "Nuevo envío" como en "Editar envío"), la caja de **Comisión** editable, y el campo **Monto** del formulario "Registrar compra"

### ✅ Verificación
- `npm run build` y `npm run lint` sin errores nuevos
- Probado en navegador: escribir "1234567" en Efectivo se ve formateando en cada tecla (1 → 12 → 123 → 1.234 → ... → 1.234.567); insertar un dígito en medio del número no rompe el cursor; la Comisión editable y el Monto de compra también formatean en vivo

---

## [2026-09-01] - Separador de miles en los campos "Monto" de Cuentas (Resumen)

### 🔢 `src/pages/CuentasLayout.jsx`
- Nuevo componente `CurrencyInput`: muestra el número plano mientras el campo tiene el foco (para no interferir al escribir) y lo formatea con puntos de miles (`Intl`/`toLocaleString('es-CO')`) al salir del campo — mismo patrón ya usado en el input "Base Caja" de `Dashboard.jsx`
- Aplicado a los campos "Monto" de **"Ajuste manual de saldo"** y **"Transferir entre cuentas"** (antes eran `<input type="number">` planos, sin separador)

### ✅ Verificación
- `npm run build` y `npm run lint` sin errores nuevos
- Probado en navegador contra un backend local: al escribir "400000" y salir del campo, se ve "400.000"; el valor enviado al guardar sigue siendo el número correcto (400000)

---

## [2026-09-01] - Comisión editable por envío; quitar "Valor aún no enviado"

### 💰 `src/pages/CuentasRecompras.jsx`
- La caja "Comisión 4‰" del formulario de envío ahora es un input editable: por defecto muestra el 4‰ calculado automáticamente sobre lo enviado, pero se puede sobrescribir a mano (queda marcado "(editada)" con un enlace "Volver a automático" para deshacerlo)
- En la tabla y en el total del mes, la comisión y el "valor neto" ahora vienen resueltos del backend (`row.fee_4mil` / `row.valor_sobrante`, respetando overrides) en vez de recalcularse en el frontend — una fila con comisión editada muestra un ícono ✎ junto al valor
- Se quitó el campo **"Valor aún no enviado"** del formulario y la columna "No enviado" de la tabla (era puramente informativo, no afectaba ningún cálculo — el backend no se tocó para este campo, solo se dejó de enviar/mostrar)

### ✅ Verificación
- `npm run build` y `npm run lint` sin errores nuevos
- Probado end-to-end contra un backend local: envío de $1.000.000 en efectivo mostró $4.000 de comisión automática; al sobrescribirla a $10.000 y guardar, la tabla y el total del mes reflejaron $10.000 de comisión y $990.000 de valor neto correctamente, con el ícono de "editada a mano"

---

## [2026-09-01] - Conectar Cuentas Recompras con Resumen: los envíos descuentan saldo real

### 🔗 `src/pages/CuentasLayout.jsx` / `src/pages/CuentasRecompras.jsx`
- `CuentasRecompras` recibe un nuevo prop opcional `onEntriesChanged`; `CuentasLayout` se lo pasa como `loadAccounts` para que, al crear/editar/eliminar un envío (que ahora puede afectar cuentas de Resumen en el backend), la pestaña Resumen se refresque automáticamente sin tener que recargar la página
- Nuevo color `indigo` en `COLOR_CLASSES` (para la cuenta BBVA) y nueva etiqueta `repurchase_send: 'Envío a socio (recompra)'` en `MOVEMENT_TYPE_LABELS`

### ⚙️ Backend (`Cierre-Caja-Puerto-Carreno-Backend`)
- Ver [CHANGELOG del backend](../Cierre-Caja-Puerto-Carreno-Backend/CHANGELOG.md) — cada envío ahora descuenta automáticamente la cuenta correspondiente en Resumen según el medio de pago usado (efectivo, datáfono, QR, Nequi, Daviplata, BBVA); editar/eliminar revierte correctamente. Se agregó una cuenta BBVA nueva (no existía). No aplica a envíos ya registrados antes de este cambio.

### ✅ Verificación
- `npm run build` y `npm run lint` sin errores nuevos
- Probado end-to-end contra un backend local: con ADDI+DATÁFONO en $8.000.000, se registró un envío con datáfono=$2.000.000 y el "Saldo total" y la tarjeta de esa cuenta en Resumen bajaron a $6.000.000 sin recargar la página. Editar el envío a $5.000.000 dejó el saldo en $3.000.000 (revirtiendo primero el descuento anterior), y eliminarlo repuso el saldo a $8.000.000

---

## [2026-09-01] - Categorizar compras de Cuentas Recompras (ropa vs. gasto operacional)

### 🏷️ `src/pages/CuentasRecompras.jsx`
- El formulario "Registrar compra" ahora incluye un selector de categoría: **"Compra de ropa"** (se soporta con factura) o **"Gasto operacional"** (gasolina, bolsas, cajas, etc.) — por defecto "Compra de ropa" para no cambiar el comportamiento de compras ya existentes
- La tabla de compras muestra una columna **Categoría** con un badge (índigo para ropa, ámbar para operacional)
- El encabezado de la sección "Compras realizadas por el socio" ahora muestra 3 badges: Total, Ropa y Operacional (subtotales), además del total combinado que ya existía
- El cálculo de "Balance disponible" (`recibido − compras`) no cambió — sigue restando el total combinado, sin importar la categoría

### ⚙️ Backend (`Cierre-Caja-Puerto-Carreno-Backend`)
- Ver [CHANGELOG del backend](../Cierre-Caja-Puerto-Carreno-Backend/CHANGELOG.md) — nueva columna `category` en `repurchase_purchases`, migración segura, y `total_ropa`/`total_operacional` en la respuesta de `GET /api/repurchase/purchases`

### ✅ Verificación
- `npm run build` y `npm run lint` sin errores nuevos
- Probado end-to-end contra un backend local (sin tocar producción): se registró un envío de $4.000.000 (efectivo + datáfono + QR, como en el ejemplo real del usuario) y 2 compras (una "Gasolinera Terpel" $50.000 operacional, otra "Distribuidora Ropa XYZ" $2.000.000 ropa) — los badges, subtotales (Ropa: $2.000.000, Operacional: $50.000) y el balance disponible ($1.950.000 = $4.000.000 − $2.050.000) se calcularon y mostraron correctamente

---

## [2026-09-01] - Unificar "Cuentas Recompras" dentro de "Cuentas"; ocultar pestaña "Movimientos"

### 🔀 `src/pages/CuentasLayout.jsx`
- Se agregó una tercera pestaña **"Cuentas Recompras"** junto a "Resumen", que renderiza el componente `CuentasRecompras` (antes solo accesible como página independiente en `/cuentas-recompras`)
- La pestaña **"Movimientos"** se ocultó del selector de pestañas a pedido del usuario — su estado, lógica de carga (`loadMovements`) y el bloque JSX quedaron intactos y comentados para reactivarla fácilmente si se necesita en el futuro

### 🧭 `src/components/layout/MainLayout.jsx`
- Se eliminó del menú lateral (sección Gestión) la entrada duplicada "Cuentas Recompras", ya que ahora se accede desde dentro de "Cuentas"
- Se quitó el import del ícono `Repeat` (quedó sin uso tras el cambio anterior)
- La ruta `/cuentas-recompras` se dejó activa en `App.jsx` (sin cambios) por compatibilidad con enlaces existentes, aunque ya no aparece en el menú

### ✅ Verificación
- `npm run build`: exitoso, sin errores
- `npm run lint`: mismos ~22 errores/4 warnings preexistentes de siempre (ninguno en los archivos tocados)
- Prueba funcional con Playwright contra el backend real (Render) autenticado como admin: se confirmó que el selector de pestañas muestra solo "Resumen" y "Cuentas Recompras" (sin "Movimientos"), y que la pestaña "Cuentas Recompras" carga sus datos reales (balance disponible, envíos/compras del mes) correctamente integrada dentro de la página de Cuentas
- La pestaña "Resumen" no logró confirmarse con saldo cargado durante la prueba (se quedó en "Cargando...") por lentitud del cold-start del backend gratuito de Render en ese endpoint — no se tocó código de carga de cuentas (`accountsService.js`, `api.js`), por lo que no es una regresión de este cambio

---

## [2026-08-21] - Re-verificación del cambio del 2026-08-19 (sin cambios de código)

### ✅ Re-confirmado, todo sigue pasando
- `npm run build`: exitoso y **100% determinístico** — el rebuild no generó ningún diff contra el `dist/` ya commiteado el 2026-08-19
- `npm run lint`: mismos ~22 errores/4 warnings preexistentes de siempre, ninguno nuevo en archivos tocados por el cambio anterior
- Pruebas manuales de `cashClosingDraft.js` (guardar/cargar/limpiar por fecha, no persistir vacío, poda de borradores): 7/7 pasaron de nuevo

### ⚠️ Nota (relacionada al backend, no al frontend)
- Se detectó que Render no había desplegado el backend con los cambios del 2026-08-19 (ver [CHANGELOG del backend](../Cierre-Caja-Puerto-Carreno-Backend/CHANGELOG.md)). No se pudo verificar de la misma forma si Vercel sí desplegó este frontend porque la URL de producción de Vercel no está documentada en este repo — pendiente confirmar.

---

## [2026-08-19] - Cold-start visible, borrador local del cierre, PWA básica y accesibilidad

### 🐢 Indicador de cold-start en el login
- `AuthContext.jsx` (`login()`): el callback `onRetryUpdate` ahora se dispara desde el **primer** intento de login (antes solo avisaba a partir del segundo reintento), mostrando "Conectando con el servidor..." de inmediato
- Si el primer intento tarda más de 7s, el mensaje escala a "El servidor está iniciando (puede tardar hasta 45s la primera vez del día)..." — cubre el cold-start del backend en el plan gratuito de Render sin cancelar la petición en curso
- `Login.jsx`: se agregó una barra de progreso visual bajo el mensaje de reintento (`retryInfo.attempt / retryInfo.maxAttempts`)

### 💾 Borrador local del cierre en curso (nuevo: `src/utils/cashClosingDraft.js`)
- Si se pierde la conexión o se recarga la página a mitad del conteo de monedas/billetes, los valores ya ingresados (monedas, billetes, métodos de pago, ajustes, base de caja) se autoguardan en `localStorage`, **por fecha de cierre**, con debounce de 800ms
- Al completar la preconsulta de una fecha con borrador guardado, se restaura automáticamente y se muestra un aviso "Borrador recuperado" (descartable)
- El borrador se limpia solo cuando el cierre se envía y procesa con éxito; nunca se guardan datos de Alegra (preconsulta), solo lo que el usuario escribió
- Poda automática: máximo 5 borradores guardados a la vez (se eliminan los más antiguos)
- Verificado con pruebas unitarias manuales (guardar/cargar/limpiar por fecha, no persistir formularios vacíos, poda de borradores viejos) — 7/7 pasaron

### 📱 PWA básica (nuevo: `public/manifest.webmanifest`, `public/sw.js`)
- App instalable (manifest con ícono `public/icon-koaj.svg`, tema azul `#2563eb`)
- Service worker mínimo: cachea solo el app-shell del propio origen (HTML + JS/CSS con hash) para que la app siga cargando sin conexión; **nunca** intercepta peticiones a `/api/`, `/auth/` ni al backend en Render (evita interferir con el auto-discovery/reintentos de `src/services/api.js` o con cookies de sesión)
- Registrado en `src/main.jsx` solo en build de producción (`import.meta.env.PROD`)

### 🖱️ Modal de error en vez de `alert()`
- `Dashboard.jsx`: los 3 `alert()` nativos (error al generar PDF/PNG/JPEG) se reemplazaron por un modal consistente con el resto de la UI (estado `errorModalMessage`)

### ♿ Accesibilidad mínima en el formulario de cierre
- `Dashboard.jsx`: se agregaron `htmlFor`/`id` (o `aria-label` cuando no hay `<label>` visible) a todos los inputs del cierre — monedas, billetes, métodos de pago (Nequi, Daviplata, QR, Addi, Débito, Crédito), gastos operativos, préstamos, desfases, base de caja y fecha del cierre

### ✅ Verificación realizada
- `npm run build` exitoso
- `npm run lint`: sin errores nuevos en archivos tocados (`Dashboard.jsx`, `Login.jsx`, `AuthContext.jsx`, `main.jsx`) ni en el archivo nuevo `cashClosingDraft.js`; quedan ~22 errores/4 warnings preexistentes en archivos no tocados por este cambio
- `vite preview` sirvió correctamente `index.html`, `manifest.webmanifest`, `sw.js`, `icon-koaj.svg` y una ruta SPA (`/dashboard`) — todos con 200
- `node --check public/sw.js` y `JSON.parse` de `manifest.webmanifest` sin errores

---

## [2026-08-19] - Filtro rápido por empleada + horas/minutos en Permisos

### ✨ Filtro rápido por empleada
- Se agregan botones "Todas / Mónica Vargas / Rita Infante" junto al buscador de Control de Empleadas — un clic filtra la sección activa sin escribir el nombre a mano
- Aplica a las 5 secciones (Ropa, Préstamos, Permisos, Vacaciones, Pagos) porque comparten el mismo estado de filtro en `EmployeesLayout.jsx`
- El buscador de texto libre se mantiene como alternativa (útil para casos no cubiertos por los botones)

### 🐛 Fix: campo "Horas" de Permisos generaba confusión (30 se leía como 30 horas)
- Se reemplaza el input único de horas (decimal) por dos campos: **Horas** (entero) y **Minutos** (15/30/45), que se combinan en el decimal que ya espera el backend
- Las horas guardadas ahora se muestran como "1h 30min" en vez de "1.5h", tanto en la tabla como en las tarjetas de resumen por empleada

---

## [2026-07-30] - Selector obligatorio de empleada (evita typos)

### 🐛 Fix: registros que no se agrupaban por variaciones/typos del nombre
- Se detectó que registros escritos como "monika vargas" (con "k") no se agrupaban con el resto de Mónica y caían en "Otras" — el campo "Nombre empleada" era de texto libre y cualquier variante o error de tipeo generaba un grupo distinto
- El matcher de agrupamiento (`src/utils/employeeGroups.js`) ahora reconoce variantes como "monika" además de "monica", para que los registros históricos con errores de tipeo se sumen correctamente en la tarjeta de Mónica

### ✨ Selector obligatorio de empleada en todos los formularios
- El campo "Nombre empleada" (texto libre) fue reemplazado por un **selector obligatorio** (`EmployeeSelect`) con los nombres canónicos **"Mónica Vargas"** y **"Rita Infante"**, aplicado en las 5 secciones: Ropa, Préstamos, Permisos, Vacaciones y Pagos
- Ya no es posible registrar una empleada escribiendo el nombre a mano, eliminando la causa raíz de las variantes/typos hacia adelante
- Nuevo archivo: `src/components/employees/EmployeeSelect.jsx`
- El buscador/filtro superior de "Control de Empleadas" se mantiene como texto libre (sirve para buscar también registros históricos con nombres no canónicos)

---

## [2026-07-30] - Totales separados por empleada + ESLint

### ✨ Control de Empleadas: totales separados por empleada
- En **todas las secciones** (Ropa, Préstamos, Permisos, Vacaciones, Pagos) ahora se muestran tarjetas de totales **separadas por empleada** (Mónica y Rita, más "Otras" si aparece algún otro nombre), además del total general ya existente
- **Permisos**: cada tarjeta desglosa por tipo (Permiso, Incapacidad, Llegada tarde, Salida temprana) sumando **horas**. Un registro sin horas especificadas se cuenta como **jornada completa (9h)**, tanto en el resumen como en la tabla de detalle
- **Ropa / Préstamos / Pagos**: cada tarjeta suma el valor en pesos (COP) por empleada
- **Vacaciones**: cada tarjeta suma los días tomados por empleada
- El agrupamiento por nombre ignora mayúsculas y tildes (ej. "Mónica", "monica", "MONICA" se agrupan igual), evitando que se pierdan registros por variaciones de escritura
- Nuevos archivos: `src/utils/employeeGroups.js` (agrupamiento reutilizable) y `src/components/employees/EmployeeSummaryCards.jsx` (tarjetas de totales reutilizables)

### 🔧 Herramientas de desarrollo
- **ESLint** instalado y configurado (`npm run lint`) usando `eslint.config.js` (flat config) ya presente en el proyecto
- Se fijó `eslint-plugin-react-hooks` en la línea estable v5 (la v7 trae reglas experimentales orientadas al React Compiler que generaban decenas de falsos positivos en código no relacionado)
- Se agregó override de globals de Node para archivos `*.config.js` (corrige falso positivo de `__dirname` en `vite.config.js`)
- Quedan ~23 issues de lint preexistentes en archivos no tocados por este cambio (variables no usadas, dependencias de `useEffect`, etc.) — no se modificaron para mantener este cambio acotado

---

## [2026-06-02] - Módulo Control de Empleadas y Cuentas Recompras

### ✨ Nuevo Módulo: Control de Empleadas
- **Ruta**: `/empleadas` — accesible para `admin` y `sales`
- **Botón**: "Empleadas" en el navbar principal
- **5 secciones en tabs**:
  - **Ropa**: Registro de prendas tomadas con precio, porcentaje de descuento y cálculo automático del valor a pagar
  - **Préstamos**: Registro de dinero prestado con cargo a quincena
  - **Permisos**: Registro de permisos, incapacidades, llegadas tarde y salidas tempranas con contadores por tipo
  - **Vacaciones**: Períodos de vacaciones con cálculo automático de días
  - **Pagos** (solo admin): Quincenas, primas, comisiones y otros pagos
- **Identificación por nombre libre**: Campo "Nombre empleada" de texto libre (ej: Mónica, Camila) — no depende de la sesión del usuario
- **Buscador/filtro**: Filtrar todos los registros de cualquier tab por nombre de empleada
- **Reglas de acceso**:
  - Cualquier usuario autenticado puede crear y ver registros
  - Solo `admin` puede editar y eliminar
  - La sección "Pagos" es exclusiva para `admin`

### ✨ Nuevo Módulo: Cuentas Recompras
- **Ruta**: `/cuentas-recompras` — solo `admin`
- **Botón**: "Recompras" en el navbar (solo admin)
- **Tabla estilo Excel** para seguimiento mensual de dinero enviado al socio:
  - Columnas: Descripción, Fecha, Valor no enviado, EFECTIVO, DATAFONO, QR, DAVIPLATA, NEQUI, BBVA, TOTAL
  - Sección "Factura Recompra Ropa": Fecha compra, Comisión 4‰ (calculada automáticamente), Valor sobrante
  - Sobrante mes anterior: campo manual para carryover entre meses
- Navegación por mes (← Junio 2026 →)
- Fila de TOTALES al final de la tabla
- Cálculo en tiempo real de totales mientras se llena el formulario

### 🔧 Mejoras técnicas
- **Migración segura de base de datos**: patrón `ALTER TABLE ADD COLUMN` — nunca borra datos
- **6 nuevas tablas**: `employee_clothing`, `employee_loans`, `employee_permissions`, `employee_vacations`, `employee_payments`, `repurchase_entries`
- **Nuevo servicio**: `employeesService.js`, `repurchaseService.js`
- **Actualización gestión de usuarios**: nuevo rol `partner` disponible (para futuros usos)

---

## [2024-12-02] - Ajuste de Layout: Barra de Hora Centrada

### 🎨 Optimización de Diseño de la Barra de Hora
- **Archivo modificado**: `src/components/layout/MainLayout.jsx`
- **Cambios realizados**:
  - Ajuste del ancho de la barra morada de hora para coincidir exactamente con el contenedor de 'Ventas Mensuales'
  - Barra ahora centrada usando `max-w-7xl mx-auto` en lugar de ocupar todo el ancho de la pantalla
  - Fondo degradado morado (`bg-gradient-to-r from-blue-600 to-purple-600`) movido del contenedor externo al interno
  - Texto del reloj actualizado a color blanco para mejor visibilidad sobre fondo morado
  - Subtítulo "Hora de Colombia (UTC-5)" con opacidad 90% para mejor jerarquía visual
  - Bordes redondeados (`rounded-xl`) para consistencia con otros componentes
  - Diseño más cohesivo y profesional

## [2024-12-02] - Mejoras en Cierre de Caja, Layout y Validación de Fechas

### 📥 Nueva Funcionalidad: Descarga de Imagen en Cierre de Caja
- **Archivo modificado**: `src/components/Dashboard.jsx`
- **Nuevas funcionalidades**:
  - Botón "Descargar Imagen" que genera PNG de alta calidad (scale 2.5)
  - Botón "Descargar PDF" renombrado y rediseñado con color rojo
  - Descarga optimizada para WhatsApp con buena resolución y tamaño reducido
  - Ambos botones deshabilitados mientras se genera cualquiera de los dos formatos
  - Estado `generatingImage` para controlar la generación de imágenes
  - Función `downloadImage()` que usa canvas.toBlob() para mejor compresión

### 🎨 Mejoras de Layout
- **Archivo modificado**: `src/components/layout/MainLayout.jsx`
- **Cambios en sección de hora**:
  - Ahora la hora se muestra en un recuadro blanco con bordes redondeados
  - Mismo ancho máximo (`max-w-7xl`) que los contenidos de otras secciones
  - Mejor integración visual con el resto del sistema
  - Diseño más consistente con las tarjetas de Ventas Mensuales, Análisis de Productos y Analytics

### ✅ Validación de Fechas Futuras
- **Archivos modificados**:
  - `src/components/Dashboard.jsx`
  - `src/components/MonthlySales.jsx`
- **Funcionalidades agregadas**:
  - Validación que previene selección de fechas futuras
  - Mensaje de advertencia visual cuando se intenta seleccionar fecha futura
  - Establecimiento automático de la fecha actual como fecha máxima
  - Atributo `max={getColombiaTodayString()}` en inputs de fecha
  - Notificaciones emergentes con auto-cierre a los 5 segundos
  - Validación tanto en Dashboard como en Ventas Mensuales

### 🔧 Mejoras Técnicas
- Importación de icono `Image` de lucide-react
- Importación de icono `X` para cerrar notificaciones
- Estado `validationWarning` en MonthlySales para mostrar alertas
- Uso de `setTimeout()` para auto-cierre de notificaciones
- Mejora en UX con deshabilitación cruzada de botones durante generación

## [2024-12-02] - Mejoras en Análisis de Inventario Completo

### ✨ Nueva Vista: Inventario Completo con Paginación y Búsqueda
- **Archivo modificado**: `src/components/inventory/FileUploadInventory.jsx`
- **Funcionalidades agregadas**:
  - Tabla paginada con todos los items del inventario
  - Barra de búsqueda en tiempo real por item o categoría
  - Selector de items por página (25, 50, 100, 200)
  - Controles de navegación de páginas con botones anterior/siguiente
  - Visualización numerada de páginas con elipsis para páginas distantes
  - Contadores de totales: cantidad total de items, unidades, valor total y costo promedio
  - Información de resultados: muestra rango actual y total filtrado
  - Iconos agregados: `Search`, `ChevronLeft`, `ChevronRight`

### 🔄 Cambios en la Vista de Inventario Completo
- Reemplazada vista por departamentos con tabla completa de items
- Cada fila muestra: número, item, categoría, cantidad, costo promedio y total
- Diseño responsivo con colores degradados en encabezado de tabla
- Estados adicionales para paginación: `currentPage`, `itemsPerPage`, `searchTerm`
- Reseteo automático de paginación al cargar nuevo archivo o realizar búsqueda

### 🎯 Mejoras de UX
- Filtrado instantáneo sin necesidad de enviar formularios
- Mensajes informativos cuando no hay datos disponibles
- Navegación fluida entre páginas con indicadores visuales
- Diseño consistente con el resto del sistema usando gradientes indigo/blue

## [2024-12-01] - Mejoras de UI/UX y Análisis de Inventario

### 🎨 Reestructuración de Layout Principal
- **MainLayout Component**: Creado nuevo componente de layout unificado (`src/components/layout/MainLayout.jsx`)
  - Header con logo y navegación principal
  - Navbar con reloj en tiempo real (hora de Colombia UTC-5)
  - Información de usuario con botón de cerrar sesión visible
  - Footer con información del sistema
  - Navegación entre secciones: Cierre de Caja, Ventas Mensuales, Análisis de Productos, Analytics Avanzado, Análisis de Inventario

- **Eliminación de Redundancia**: Removidos elementos duplicados de navegación en todas las secciones
  - Dashboard (Cierre de Caja): Removido reloj, navegación, logout duplicados
  - ProductosLayout: Removida navegación redundante
  - AnalyticsLayout: Removida navegación redundante

### 📊 Módulo de Análisis de Inventario - Carga de Archivos

#### Nueva Funcionalidad: FileUploadInventory
- **Archivo**: `src/components/inventory/FileUploadInventory.jsx`
- **Funcionalidad Principal**:
  - Carga de archivos CSV/Excel con análisis de inventario
  - Consulta de inventario actual desde Alegra
  - Sistema de navegación con 4 vistas diferentes

#### Vistas Disponibles:

1. **Resumen General**
   - 6 tarjetas de métricas principales:
     - Total Items
     - Valor Inventario
     - Margen Total
     - Margen Porcentual
     - Total Categorías
     - Valor Costo
   - Gráfico de barras de departamentos ordenados por valor

2. **Departamentos**
   - Tabla detallada con análisis por departamento
   - Columnas: Departamento, Cantidad, Valor Costo, Valor Precio, Margen $, Margen %, % Inventario
   - Indicadores visuales de margen (verde/amarillo/rojo)
   - Gráfico de barras con distribución por valor

3. **Top Categorías**
   - Top 20 categorías con número de items
   - Gráfico de barras con distribución visual del top 10
   - Porcentajes relativos al máximo

4. **Todas las Categorías**
   - Resumen estadístico (total categorías, total items, promedio)
   - Tabla completa de todas las categorías
   - Barras de progreso mostrando porcentaje de cada categoría

### 🔄 Navegación Jerárquica en Inventario
- **Nivel 1**: Selección entre "Cargar Archivo" y "Análisis de Inventario"
- **Nivel 2**: Subsecciones de análisis (Dashboard, Departamentos, Alertas, ABC, Top Productos, Categorías y Tallas)
- Estado por defecto: "Cargar Archivo" como primera opción

### ⚡ Optimización de Consultas
- **Consultas Manuales**: Implementado patrón de carga manual para evitar peticiones innecesarias
  - InventoryDashboard: Requiere click explícito del usuario
  - DepartmentAnalysis: Requiere click explícito del usuario
  - Botón prominente: "Consultar Inventario desde Alegra"
  - Estado inicial sin datos, sin loading automático

### 🔧 Mejoras en Servicios

#### API Service (`src/services/api.js`)
- Detección automática de FormData
- Manejo correcto de headers para uploads (browser maneja Content-Type con boundary)

#### Inventory Service (`src/services/inventoryService.js`)
- Nueva función `uploadFile()`: Carga de archivos CSV/Excel
- Nueva función `getFullAnalysis()`: Obtener análisis completo desde Alegra
- Timeout de 60 segundos para operaciones de archivo

### 🎯 Branding
- Título actualizado: "Sistema de Gestión Koaj Puerto Carreño"
- Subtítulo: "Panel de Control"

### 📦 Build
- Build exitoso generado en `/dist`
- Chunks optimizados:
  - Dashboard: 640.67 kB (gzip: 179.34 kB)
  - InventoryLayout: 82.64 kB (gzip: 11.42 kB)
  - React vendor: 171.78 kB (gzip: 56.19 kB)

### 🗂️ Archivos Modificados
- `src/App.jsx` - Integración de MainLayout
- `src/components/Dashboard.jsx` - Limpieza de elementos redundantes
- `src/components/analytics/AnalyticsLayout.jsx` - Limpieza de navegación
- `src/components/productos/ProductosLayout.jsx` - Limpieza de navegación
- `src/components/inventory/InventoryLayout.jsx` - Navegación jerárquica de dos niveles
- `src/components/inventory/InventoryDashboard.jsx` - Consultas manuales
- `src/components/inventory/DepartmentAnalysis.jsx` - Consultas manuales
- `src/services/api.js` - Soporte para FormData
- `src/services/inventoryService.js` - Nuevas funciones de upload y análisis

### 📁 Archivos Nuevos
- `src/components/layout/MainLayout.jsx` - Layout principal unificado
- `src/components/inventory/FileUploadInventory.jsx` - Componente de carga y análisis de archivos
- `src/components/inventory/index.js` - Actualizado con nueva exportación

### ✨ Mejoras de UX
- Reloj en tiempo real actualizado cada segundo
- Navegación clara y organizada
- Indicadores visuales de estado (loading, success, error)
- Validación de tipos de archivo (CSV, XLSX, XLS)
- Feedback inmediato al usuario
- Diseño responsive con Tailwind CSS
- Animaciones suaves en transiciones
- Código modular y mantenible

### 🔒 Seguridad
- Validación de tipos de archivo antes de enviar al servidor
- Manejo apropiado de errores
- Limpieza de input después de upload para permitir recargar el mismo archivo

---

## Notas Técnicas
- Node.js: Compatible con versiones LTS
- Vite: v5.4.21
- React: Hooks modernos (useState, useRef, useEffect)
- Tailwind CSS: Diseño utility-first
- Hot Module Replacement (HMR) activo para desarrollo
