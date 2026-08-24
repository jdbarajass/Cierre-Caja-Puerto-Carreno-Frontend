# Mejoras Pendientes - Frontend (Sistema de Gestión Koaj Puerto Carreño)

Lista de mejoras identificadas en la auditoría técnica del 2026-08-19 que **no** se implementaron todavía. Para cada una: qué cambio concreto hay que hacer, qué efectos/riesgos tiene hacerlo, y qué beneficio trae.

---

## 1. Extraer la lógica del cierre de `Dashboard.jsx` a hooks (`useCashClosing`, `useDenominations`)

**Qué cambiar:**
- Crear `src/hooks/useCashClosing.js` y/o `src/hooks/useDenominations.js` (o similar) y mover ahí el estado y la lógica de negocio hoy mezclados en `Dashboard.jsx`: `coins`, `bills`, `metodosPago`, `adjustments`, `excedentes`, los cálculos de totales, y las funciones `handleSubmit`/`handleConfirmSubmit`
- `Dashboard.jsx` quedaría solo con el JSX (la UI) y llamadas a estos hooks, en vez de mezclar estado + cálculos + llamadas a API + generación de PDF/imagen + JSX todo en un mismo componente de ~2700 líneas

**Efectos de hacer este cambio:**
- Es el refactor de **mayor riesgo** de esta lista: toca el componente más usado del sistema (el cierre de caja diario, que usan las vendedoras todos los días) y su lógica de cálculo financiero
- No debería hacerse de una sola vez — conviene extraer un pedazo a la vez (ej. primero solo `coins`/`bills` y sus totales, probar a fondo, luego seguir con métodos de pago, luego ajustes) y probar manualmente el flujo completo de un cierre real después de cada extracción, incluida la interacción con el borrador local (`cashClosingDraft.js`) agregado el 2026-08-19, que depende de estos mismos estados
- Buen candidato para hacerse en una rama separada con pruebas exhaustivas antes de mergear a `main`

**Beneficios:**
- Reduce un archivo de ~2700 líneas a algo mantenible, separando claramente "qué calcula" de "cómo se ve"
- Permite testear la lógica de suma/validación del cierre de forma aislada (sin necesidad de renderizar la UI completa) — hoy esa lógica no tiene ningún test automatizado
- Facilita detectar y arreglar re-renders innecesarios (el componente genera PDF/imagen con `html2canvas` a `scale: 3.0`, costoso en móvil)

---

## 2. Centralizar `formatCurrency` (duplicado en ~15 archivos)

**Qué cambiar:**
- Mover la función a `src/utils/formatters.js` (o el archivo equivalente que corresponda) como única fuente de verdad
- Reemplazar las ~15 definiciones locales repetidas por un `import { formatCurrency } from '../utils/formatters'`

**Efectos de hacer este cambio:**
- Riesgo técnico bajo, pero **alto blast radius**: toca ~15 archivos distintos
- Antes de unificar, hay que revisar las 15 copias una por una — es posible que alguna tenga una variación sutil (redondeo, cantidad de decimales, símbolo de moneda) que se perdería al reemplazarla por la versión centralizada sin darse cuenta
- Cambio puramente de refactor, no debería alterar ningún comportamiento visible si se hace con cuidado

**Beneficios:**
- Una sola fuente de verdad para el formato de moneda en toda la app
- Previene bugs de redondeo/formato inconsistente entre pantallas (ej. que el cierre de caja muestre un monto formateado distinto al de Ventas Mensuales para el mismo valor)
- Reduce ligeramente el tamaño del bundle y facilita el mantenimiento futuro (un solo lugar para cambiar el formato si algún día se necesita)

---

## 3. Tests automatizados en el frontend (no existe Vitest/Jest instalado)

**Qué cambiar:**
- Instalar Vitest (recomendado por ser el runner nativo de Vite, ya usado en este proyecto) + React Testing Library
- Agregar el script `npm run test` a `package.json`
- Empezar por lo más crítico: la lógica de cálculo del cierre (sumas de denominaciones, validación de desfases) — idealmente después o en paralelo con el punto 1 de esta lista, ya que sería mucho más fácil de testear una vez que esa lógica esté en hooks separados
- Agregar también un test automatizado para `src/utils/cashClosingDraft.js` (el borrador local agregado el 2026-08-19 — se probó manualmente con un mock de `localStorage` en esa sesión, pero no quedó como test automatizado en el repo)

**Efectos de hacer este cambio:**
- Agrega una dependencia de desarrollo nueva (Vitest) y un script nuevo; no afecta el build de producción ni el bundle final
- Riesgo bajo — es aditivo, no modifica código existente

**Beneficios:**
- La lógica financiera más sensible del sistema (sumas y validaciones del conteo de caja) hoy no tiene ninguna red de seguridad automatizada en el cliente
- Un test que falla detectaría un bug de cálculo antes de que llegue a producción y afecte el cierre real de una vendedora, en vez de descubrirlo por un reporte manual

---

## Notas
- Documento creado el 2026-08-24 a partir de la auditoría técnica y las mejoras ya implementadas el 2026-08-19 (ver [CHANGELOG.md](CHANGELOG.md))
- Ver también la lista de mejoras pendientes del backend en `MEJORAS_PENDIENTES.md` del repo `Cierre-Caja-Puerto-Carreno-Backend`
