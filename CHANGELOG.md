# Changelog - Sistema de Gestión Koaj Puerto Carreño

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
