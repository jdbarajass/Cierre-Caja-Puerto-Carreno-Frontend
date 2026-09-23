# Plan por fases: experiencia inmersiva WebGL (KOAJ)

Fuente: `# MASTER PROMPT.txt` (transformación inmersiva) sobre la base visual "Arqueo" ya implementada (ver CHANGELOG 2026-09-23).

**Regla que aplica a todas las fases:** la lógica de negocio, endpoints, cálculos, estados, flujos, autenticación y permisos NO cambian. Un botón que hoy hace X sigue haciendo X. Toda la experiencia nueva es una capa visual (DOM de presentación + WebGL) encima del DOM funcional.

**Arquitectura objetivo**

```
┌────────────────────────────────────────────┐
│ Canvas WebGL persistente (fixed, detrás)   │  three + @react-three/fiber
│  - escena cambia de estado según la ruta   │  pointer-events: none (salvo zonas
│  - lee datos YA existentes (solo lectura)  │  interactivas explícitas)
│  - calidad adaptativa + fallback           │
├────────────────────────────────────────────┤
│ DOM funcional (formularios, tablas, texto) │  sin cambios de lógica
└────────────────────────────────────────────┘
```

Estado de cada fase: ⬜ pendiente · 🟨 en curso · ✅ hecha

---

## FASE 0 - Instalación y bloqueos ✅ (2026-09-23, red wifi)

Instalados: `three` 0.186, `@react-three/fiber` 8.18, `@fontsource-variable/geist`, `@fontsource-variable/schibsted-grotesk`. En caché offline (sin agregar a package.json): `postprocessing` 6.39.5, `@react-three/postprocessing` 2.19.1. Playwright MCP verificado.

Objetivo: resolver TODO lo que necesita red en una sola conexión alterna (wifi / hotspot), para no volver a pedir red en fases siguientes.

| Qué | Cómo | Por qué |
|---|---|---|
| `three` (última) | `npm install` | Motor WebGL, partículas, shaders GLSL |
| `@react-three/fiber@8` | `npm install` | Escenas en React. v8 porque el proyecto usa React 18 (v9 exige React 19) |
| `@fontsource-variable/geist` | `npm install` | Fuente de interfaz, pendiente de la fase visual anterior |
| `@fontsource-variable/schibsted-grotesk` | `npm install` | Fuente de títulos/cifras, pendiente |
| `postprocessing`, `@react-three/postprocessing@2` | solo `npm cache add` (NO se agregan a package.json) | Reserva por si una fase necesita bloom/aberración; quedan en caché para instalarse después sin red |
| `@playwright/mcp` | ya está en caché de npx | Reconectar con `/mcp` (no necesita red nueva) |

Consumo estimado de datos: ~15-20 MB.

Verificación de salida: `node_modules` con los 4 paquetes, `package.json` actualizado, build OK, fuentes importadas en `src/main.jsx`, `npm cache ls`/instalación offline de los reservados funciona.

**No necesita red después:** `web-design-guidelines` usa `raw.githubusercontent.com`, que sí funciona en la red cableada.

## FASE 1 - Estudio de referencias ✅ (2026-09-23, red wifi)
Recorrido automatizado con Playwright MCP en cada sitio: carga, inspección técnica (canvas, capas, `pointer-events`, scroll nativo o virtual), barrido de cursor, arrastre, scroll por etapas y scroll rápido, con capturas.

| Referencia | Estado | Qué se observó |
|---|---|---|
| Lusion | ✅ | Un canvas fijo a pantalla completa; la escena 3D se dibuja dentro de "ventanas" que siguen la posición de elementos DOM. Piezas con física rígida que el cursor empuja, estela tipo fluido detrás del cursor. Scroll virtual (`overflow: hidden`): la ventana 3D crece y sale; luego una cinta 3D azul atraviesa las secciones y las conecta. Paleta estricta: blanco, negro y un azul. |
| Active Theory | ✅ | Motor propio ("Hydra"). Canvas con `pointer-events: none`: WebGL es solo visual, el DOM recibe la interacción. El scroll mueve una cámara por un espacio (logo de vidrio entre polvo de partículas → tela 3D deformable con material iridiscente). Loader temático largo (~25 s). |
| Refik Anadol | ✅ | Sin WebGL: video generativo. La UI toma el color de la obra (las tarjetas cambian de tono con el fondo). Datos como textura. |
| Superbien | ✅ | Cursor contextual con acción "HOLD" (mantener presionado); canvas `pointer-events: none` para distorsión; mucho video. |
| igloo.inc (agregada, Awwwards SOTY 2024) | ✅ | El "desarmar / rearmar" exacto: red de líneas y partículas → se ensamblan en un iglú de bloques → al hacer scroll los bloques se levantan y separan con uniones iluminadas y etiquetas de datos → se reasientan. Pesada: ~17 MB. |
| Torus Lab | ❌ | DNS resuelve pero no conecta desde ninguna red: timeout desde la wifi y fallo TLS desde la cableada. Lo más probable es que el sitio esté caído. |
| RESN (`resn.co`) | ❌ | El dominio no tiene dirección IP publicada: sitio fuera de línea (no es un bloqueo de red). |
| Akira (`akira.art`) | ❌ | El dominio ya no existe (NXDOMAIN en DNS de Cloudflare). |

### Principios extraídos (aplicables a KOAJ)
1. **Un canvas, muchas "ventanas".** Un solo `<Canvas>` fijo; cada página declara zonas DOM (un `div` de referencia) y la escena dibuja ahí. La composición la sigue definiendo el layout DOM, no coordenadas mágicas. (Lusion)
2. **WebGL visual, DOM funcional.** Canvas con `pointer-events: none`; el cursor/touch se lee a nivel de ventana y se pasa a la escena. Formularios y botones nunca quedan debajo de algo que capture clics. (Active Theory, Superbien)
3. **Ensamblar como metáfora del proceso.** Partículas → estructura → bloques que se separan y se reasientan. Para el cierre: los billetes/monedas contados son los bloques; el cierre exitoso es la estructura completa asentada. (igloo)
4. **Un hilo conductor entre secciones.** Un elemento 3D continuo (cinta / flujo de partículas) que recorre los pasos al hacer scroll da continuidad y dirección. Candidato: el "flujo de dinero" que baja por los 4 pasos del cierre. (Lusion)
5. **Física, no timelines.** El cursor empuja cuerpos con inercia y resortes; nada vuelve a su sitio con una curva fija. (Lusion)
6. **Paleta estricta, espectáculo en el movimiento.** Una sola tinta de acento; la riqueza viene de luz, profundidad y movimiento. Encaja con el sistema "Arqueo" ya definido. (Lusion)
7. **La UI se tiñe con la escena.** Pequeñas superficies DOM toman tono del estado de la escena (p. ej. meta cumplida). (Refik Anadol)

### Lo que NO se adopta (y por qué)
- **Scroll virtual / secuestro del scroll** (Lusion, igloo): rompe el teclado del celular, el `scroll-padding` de la cinta de total y la accesibilidad del formulario. Aquí el scroll sigue siendo nativo; la escena solo lo lee.
- **Loaders largos y 17 MB de assets** (Active Theory, igloo): el cierre es una herramienta diaria, a veces con datos móviles. La escena carga en segundo plano, todo procedural (sin modelos ni texturas descargadas) y nunca bloquea el formulario.
- **Cursor personalizado que reemplaza al del sistema** (Superbien): la precisión y la accesibilidad del cursor nativo se conservan; el cursor solo influye en la escena.

## FASE 2 - Infraestructura WebGL ✅ (2026-09-23)
- `src/experience/` nuevo: `ExperienceCanvas` (un solo canvas fijo, montado en `App`, carga diferida con `lazy`).
- Store de estado visual (contexto React ligero, sin librería): ruta actual + datos de solo lectura publicados por las páginas (ventas, metas, conteo de denominaciones, totales).
- Calidad adaptativa: detección de GPU/dispositivo, control de DPR, monitor de FPS que baja de HIGH → MEDIUM → LOW automáticamente.
- Fallback: sin WebGL o con `prefers-reduced-motion` → fondo estático (la app funciona igual).
- Pausa del render cuando la pestaña está oculta o la escena no cambia.
- Exclusión explícita: la sección de resultados del cierre (capturada por html2canvas para el PDF/JPEG) queda SIEMPRE sobre fondo blanco sólido, fuera del efecto.
- Criterio: canvas visible detrás de todas las rutas, 60 FPS en desktop, sin afectar INP de formularios.

**Resultado:** `src/experience/` con `store.js`, `capabilities.js`, `motion.js`, `ExperienceLayer.jsx`, `ExperienceCanvas.jsx`, `scenes/BaseField.jsx` (campo de partículas GLSL: deriva por ruido, parallax por profundidad con el scroll, repulsión del puntero con inercia, atributos `aTarget`/`uMorph` listos para las fases siguientes). Verificado con Playwright: 60 FPS en 1440 y 390; canvas y contenedor con `pointer-events: none` (un clic en el fondo cae en `<main>`); con movimiento reducido la escena queda quieta; sin WebGL no se monta y la app funciona igual; flujo completo del cierre + descarga del reporte JPEG intactos (el reporte sale limpio, sin partículas). Lint sin problemas nuevos; build OK.

**Peso:** el chunk `ExperienceCanvas` pesa ~232 kB gzip (three completo: R3F v8 importa el namespace entero de three, no se puede recortar). Mitigaciones: chunk separado y diferido (se pide cuando el navegador está libre, nunca antes del login o del formulario), el service worker lo cachea después de la primera vez, y no se descarga con "Ahorro de datos" activo. El bundle principal no cambió (94 kB).

## FASE 3 - Sistema de motion global ✅ (2026-09-23)
- Un solo módulo de física (`spring`, `damping`, `inertia`) usado por WebGL y por los componentes DOM que animan.
- Tokens: duraciones, curvas, stagger, respuesta al scroll (velocidad), entrada/salida/cambio de estado.
- Sincronizado con los tokens CSS ya existentes (`--ease-out`, etc.).

**Resultado:** `src/experience/motion.js` (tokens `MOTION` espejo de CSS, constantes físicas `PHYSICS`, `damp` y `spring` interrumpible independientes del framerate). `Conductor` lee el scroll y su velocidad cada frame (sin listeners de scroll) y mueve la cámara con el puntero (parallax 3D real). Regla aplicada: ensamblar (2.2/s) es más lento que dispersar (3.2/s).

## FASE 4 - Login: "ambiente / entrar al sistema" ✅ (2026-09-23)
- Campo de partículas que forma la palabra KOAJ, reacciona al cursor (repulsión) y al toque en móvil.
- Deformación por ruido (shader) en reposo; al iniciar sesión con éxito, las partículas convergen y se abren hacia el sistema (transición de entrada).
- El formulario sigue siendo DOM, accesible y usable; estados de error/reintento intactos.

**Resultado:** `SceneDirector` define la escena por ruta; `formations.js` muestrea la palabra KOAJ con la fuente de la marca y la ubica sobre el ancla DOM `[data-scene-anchor="login-mark"]`. Las partículas se ensamblan con morph escalonado, el cursor abre un hueco con inercia y la forma se rearma al alejarse; mientras conecta la palabra "respira" (`loginBusy`), ante un error recula y se rearma (`loginErrorSeq`). Al ingresar, el ambiente pasa de tinta a papel en ~700 ms y la palabra se dispersa en el campo mientras aparece la app. Movimiento reducido: palabra estática ya formada. Sin WebGL: marca KOAJ en DOM (`.scene-fallback`).

**Hallazgo (lógica existente, NO modificada):** con credenciales incorrectas el backend responde 401 y `authenticatedFetch` (`src/services/api.js`) limpia la sesión y recarga `/login` con `window.location.href`. Resultado: el mensaje "Credenciales incorrectas (x/5 intentos)" nunca se alcanza a ver y el contador de intentos se reinicia con la recarga. Pendiente de decisión del usuario.

## FASE 5 - Cierre de caja: "proceso / ensamblaje" ✅ (2026-09-23)
- Escena guiada por los 4 pasos: el scroll por Fecha → Efectivo → Medios de pago → Ajustes mueve cámara y composición.
- Preconsulta: los totales reales por medio de pago (efectivo, transferencia, débito, crédito) aparecen como corrientes de partículas de su color de categoría.
- Conteo: cada denominación digitada agrega partículas proporcionales a la cantidad real y se apilan por denominación (datos reales, sin inventar).
- "Realizar Cierre": las partículas convergen hacia la cinta de total. Éxito → la estructura se ensambla; diferencias detectadas → la escena lo señala (fragmentos que no encajan) sin cambiar el flujo.
- Criterio: el formulario nunca se bloquea ni se vuelve lento al escribir; html2canvas intacto.

**Resultado:** `scenes/CashScene.jsx` dibuja dentro de una ventana DOM transparente (`[data-scene-anchor="cash-window"]`): panel lateral sticky en desktop (el formulario pasa a una columna; Medios de pago y Ajustes se apilan) y vitrina bajo el conteo en móvil (fija la sala del efectivo). Sala 0: totales reales de Alegra por medio de pago (`total` numérico del backend). Sala 1: pilas 3D instanciadas de billetes (6 denominaciones) y monedas (5) con la cantidad digitada (tope visual 40 por pila; el número exacto sigue en el DOM), que caen en su lugar al escribir. Sala 2: Alegra vs registrado (transferencias, datáfono) + ajustes como bloques separados. El paso visible (IntersectionObserver ya existente) desplaza la escena entre salas; el cursor la inclina y la velocidad del scroll la cabecea. Al enviar se comprime; respuesta validada → verde y asentada; diferencias → pilas separadas en ámbar. Antes de enviar no se colorea "cuadra/no cuadra" (veredicto del backend). Sin WebGL la columna/vitrina no existe y el formulario ocupa todo el ancho; con movimiento reducido las pilas se dibujan quietas (redibujo al publicar datos).

**Correcciones durante la fase:** (1) el panel sticky no se pegaba (`items-start` dejaba la columna tan alta como el panel) → `self-stretch`; (2) el anclaje DOM→3D sumaba el desplazamiento de la cámara, inexacto con cámara rotada → proyección exacta rayo-plano; (3) el pivote de rotación estaba en la sala 0 y alejaba las demás salas → grupo de rotación en el centro de la ventana y grupo interno que se desplaza.

**Corrección de lógica autorizada por el usuario:** `authenticatedFetch` ya no trata el 401 de `/auth/login` como sesión expirada (ver CHANGELOG).

## FASE 6 - Métricas del día y del mes: "datos" ✅ (2026-09-23)
- Volumen de partículas que se llena según avance real vs meta (+25%); meta cumplida → cambio de estado visual.
- El número real sigue visible y legible encima.

**Resultado:** `scenes/MetricsScene.jsx`: la barra de meta se convierte en un tanque de partículas (shader) dentro de `[data-scene-anchor="metric-day|metric-month"]`. Nivel = avance real hacia la meta (+25%) que MainLayout ya calcula; la meta es una marca al 80% del ancho. Líquido con volumen (profundidad), menisco brillante, ola de superficie, oleaje con la velocidad del scroll y apertura con el puntero; se llena despacio al cargar. Meta cumplida: verde, sobrepasa la marca y burbujea. Cargando: tanque vacío con polvo. Las tarjetas se vuelven transparentes (conservan su borde) solo con escena; sin WebGL vuelve la barra DOM y el fondo blanco. `role="progressbar"` con los mismos valores en ambos casos.

## FASE 7 - Transiciones entre páginas: "continuidad" ✅ (2026-09-23, primera versión)
- La nube de partículas de una ruta hace morph hacia la configuración de la siguiente (Cierre → Estadísticas → Gestión → Cuentas).
- Navegación sigue siendo React Router; la transición es solo visual y no retrasa la carga de la página.

**Resultado:** el campo de partículas es persistente (nunca se recrea); al cambiar de ruta `SceneDirector` dispara un pulso de "warp" (el campo se abre, avanza hacia la cámara y crece/brilla un instante, luego se asienta en ~1,5 s). El contenido de la página entra con un ascenso corto (`.page-enter`). Las escenas propias de una página (pilas del cierre) desaparecen al instante al salir. Las animaciones de entrada usan `animation-fill-mode: backwards` para no dejar `transform` aplicado (rompería los `position: fixed` de modales y avisos). El *morph* entre formas propias de cada sección llega con las Fases 8 y 9, cuando esas secciones tengan su escena.

## FASE 8 - Estadísticas: "transformación de datos" ✅ (2026-09-23)
- Rutas: Totales de ventas, Documentos, Analytics (7 módulos), Productos, Inventario.
- Partículas que forman/transforman la gráfica al cambiar período o módulo; las tablas y valores exactos permanecen en DOM.

**Resultado:** franja "horizonte de datos" (`DataHorizon` en `MainLayout`, `[data-scene-anchor="data-horizon"]`) en todas las rutas `/estadisticas*`; se abre solo cuando el módulo abierto tiene datos. 9 módulos publican (solo lectura, con `useSceneSeries`) la serie numérica que ya muestran: horas pico, tendencias por día, vendedoras, clientes, cross-selling, top productos (%), categorías (%), totales mensuales por medio de pago e inventario por departamento. `seriesFormation` convierte la serie en columnas de partículas (densidad uniforme) ajustadas al tamaño de la franja. Al cambiar de módulo o período cada partícula viaja en arco desde la gráfica anterior a la nueva (`aPrev` + `uSwap`, "desarmar / rearmar"). Cursor o dedo sobre la franja: la columna se resalta, sube y un tooltip DOM muestra el valor exacto; sobre gráficas el cursor apenas perturba (leer > jugar) y las columnas no "respiran" para ser nítidas. Sin WebGL la franja no existe; con movimiento reducido las columnas quedan quietas. AnalyticsDashboard, Retención, Documentos, Análisis completo y Categoría/talla no publican serie (no tienen una serie única que represente la vista).

## FASE 9 - Gestión: "flujo / conexiones" ✅ (2026-09-23)
- Cuentas y Cuentas Recompras: nodos por cuenta con corrientes proporcionales a saldos/envíos reales; transición entre meses. Las tablas se conservan.
- Control de Empleadas y Notas y Pendientes: tratamiento de conexiones más ligero, coherente con Gestión.

**Resultado:** `scenes/FlowScene.jsx` + `FlowWindow` en `CuentasLayout` (pestaña Resumen). El DOM calcula la posición de cada cuenta (desktop: arco; móvil: dos filas), dibuja rótulo (nombre, saldo) y el punto de origen, y publica esos mismos nodos; la escena traza corrientes de partículas de cada cuenta al centro "Total Recompras" con densidad proporcional al saldo real. Jhonatan (balance de recompras del mes) también fluye al total. Saldo negativo → corriente al revés en ámbar. AHORRO (excluido del total por el backend, `ACCOUNTS_EXCLUDED_FROM_RECOMPRA_TOTAL`) orbita aparte con el rótulo "aparte". Cursor sobre una cuenta: su corriente se resalta y el resto se atenúa. Empleadas, Notas, Cuentas y Cuentas Recompras: el campo de fondo deriva en corrientes horizontales (`uFlow`). Sin WebGL la ventana no existe; con movimiento reducido las corrientes quedan quietas. Las tablas y formularios de Gestión no cambiaron.

## FASE 10 - Pantallas restantes ✅ (2026-09-23)
- Usuarios, Códigos KOAJ, Ventas mensuales (rol ventas), No autorizado, error. Docs es enlace externo: solo en navegación.

**Resultado:** franja "escenario" (`[data-scene-anchor="page-stage"]`) bajo el encabezado. Códigos KOAJ ("exploración"): las partículas escriben el término buscado (con 400 ms de espera tras la última tecla) o, sin búsqueda, la cantidad real de códigos ("48 CÓDIGOS"); al cambiar la búsqueda viajan de una palabra a la otra. Usuarios: un cúmulo por persona con acceso (grande = administrador, mediano = ventas, tenue = inactivo), con leyenda. Ventas Mensuales (vista de ventas) reutiliza el horizonte de datos con sus totales por medio de pago. "Acceso denegado" deja ver el ambiente (sin fondo propio). Error global (ErrorBoundary) se deja sin escena a propósito. Sin WebGL no hay franja; con movimiento reducido las formas quedan quietas.

## FASE 11 - Experiencia móvil deliberada ✅ (2026-09-23)
- Menos partículas, shaders ligeros, DPR limitado, interacción táctil (arrastre/toque); giroscopio solo si es seguro y opcional.
- Nunca interferir con el scroll ni con el teclado del celular en el cierre.

**Resultado:**
- **Bug corregido:** en táctil, al empezar a hacer scroll el navegador dispara `pointercancel` (no `pointerup`); sin manejarlo la escena dejaba un "hueco" fijo en las partículas donde se tocó por última vez.
- **Modo escritura:** en táctil, mientras un campo tiene el foco la escena se dibuja a ~20 FPS (y el monitor de calidad se pausa para no interpretarlo como lentitud); al pasar de un campo a otro no se reactiva entre medio.
- **Giroscopio opcional:** inclinar el teléfono mueve levemente la cámara; solo donde no requiere permiso (Android), nunca muestra avisos en iOS, se apaga con movimiento reducido.
- **320 px:** el total de la cinta se cortaba ("$ 1.13…"); ahora la cifra, el relleno y el ícono del botón se ajustan y el total siempre se ve completo (verificado también con 8 dígitos).
- **Verificación (perfil de teléfono Android con táctil real):** CPU 4× más lenta → calidad `medium`, 61 FPS; CPU 20× más lenta → baja sola de `medium` a `low` y sube de 39 a 53 FPS; gesto real de arrastre → el puntero se libera y la página hace scroll; escritura con el teclado en billetes → modo escritura activo, total correcto ($ 1.120.000); horizontal 844×390 y 320 px revisados.

## FASE 12 - Performance ✅ (2026-09-23)
- Medición de FPS por perfil (HIGH/MEDIUM/LOW), instancing, culling, geometrías reutilizadas, tamaño de bundle (carga diferida de three).

**Mediciones y correcciones (herramientas solo de desarrollo: `?quality=` y contadores del renderer):**
| Medición | Antes | Después |
|---|---|---|
| Costo por frame (login, cierre, estadísticas, cuentas; high/medium/low) | 16,7 ms (tope 60 FPS), 1-6 draw calls | igual |
| Cierre con CPU 6× más lenta, p95 del frame | 33,1 ms | 16,9 ms (las ~440 matrices de las pilas ya no se recalculan si están quietas o la sala está oculta) |
| Monitor de calidad bajando sin necesidad durante la carga de página | medium → low | se mantiene en medium (calentamiento de 3 s tras montar y tras cada cambio de ruta); con CPU 20× sigue bajando cuando hace falta |
| Geometrías en GPU tras 10 ciclos de navegación | 5 → 26 (fuga) | estable en 6 (se liberan al desmontar tanques y constelación) |
| Memoria JS tras 10 ciclos (con GC forzado) | — | estable ≈27 MB |
| Tecla más lenta al escribir en el conteo (CPU 4×, escritorio) | 216-232 ms (compilación de shaders en la 1.ª tecla + escena a 60 FPS) | 104-112 ms = igual que sin escena (shaders precompilados en tiempo libre + modo escritura a 30 FPS en escritorio / 20 en móvil) |
| LCP del login en móvil 3G (build de producción) | 2,69 s con escena vs 2,56 s sin | igual con y sin escena (≈2,7 s): el chunk 3D se pide después de `load` |

Notas: el LCP ≈2,7 s en 3G simulado es de la app base (JS + fuentes), no de la escena; el chunk 3D pesa ≈238 kB gzip y el service worker lo cachea tras la primera visita.

## FASE 13 - Accesibilidad ✅ (2026-09-23)
- Teclado, foco, lectores de pantalla (canvas `aria-hidden`), contraste sobre escenas, reduced motion con alternativa estática.

Auditoría automática en las 15 rutas (estructura, recorrido con Tab, contraste WCAG de cada texto visible) antes y después:

| Medida (15 rutas) | Antes | Después |
|---|---|---|
| Textos bajo AA (4.5:1 / 3:1) | decenas (gris 400, *-600, blanco sobre *-500, pie del login) | **0** |
| Campos sin nombre accesible | 108 en el código (fechas, filtros, búsquedas, formularios) | **0** |
| Botones solo-ícono sin nombre | 32 | **0** |
| Paradas de Tab sin foco visible | fechas y "contempla saldo hasta" | **0** |
| Páginas sin exactamente un h1 | 3 | **0** |
| Modales con Escape + foco atrapado + foco devuelto | 0 de 8 | **8 de 8** |

- **Contraste:** tonos 600 de las familias semánticas desplazados un paso en `tailwind.config.js` (texto *-600 y botones blancos sobre *-600 pasan AA en toda la app); `text-gray-400` → `500` en fondos claros; red de seguridad CSS para gris 400/500 sobre fondos oscuros.
- **Nombres:** `aria-label` con el MISMO texto de la etiqueta visible (59 campos por script, 49 a mano —28 de ellos las fechas de Analytics—, 32 botones de ícono).
- **Foco:** borde de acento en campos sin `focus:border-*` propio, contorno en los que no tienen ring, y respaldo `:focus-within` para los segmentos de los campos de fecha (ahí el input deja de coincidir con `:focus` y su ring se apagaba).
- **Modales:** hook `useDialog` (Escape = mismo botón Cerrar/Cancelar; el de carga no se cierra), `aria-labelledby` al título. Menús de la barra: Escape cierra y devuelve el foco al botón.
- **Regresión:** cierre completo + descarga JPEG (1440 y 390 táctil), login con clave errada/correcta, lint 70 (igual a la base), build OK.
- Nota de método: el servidor de desarrollo debe reiniciarse al cambiar `tailwind.config.js`; con el servidor viejo la primera medición mostraba fallas ya corregidas.

## FASE 14 - Auditoría y antes/después ✅ (2026-09-23)
- Capturas antes/después en 390 / 768 / 1366 / 1920 / 2560.
- Auditorías con las skills: impeccable, web-design-guidelines, emil-design-eng, design-taste-frontend, ui-ux-pro-max, frontend-design.
- Checklist de la sección 40 del Master Prompt (¿parece WebGL?, ¿el scroll controla la escena?, etc.).

**Método:** el último commit (estado previo a toda la transformación) se exportó con `git archive` a una carpeta temporal y se sirvió en otro puerto; ambas versiones se capturaron con los mismos datos simulados: 6 páginas × 5 anchos × 2 = 60 capturas, comparadas en pares.

**Antes → después por auditoría (todo `src/`):**

| Auditoría | Antes | Después |
|---|---|---|
| impeccable (detector) | 120 avisos | 75: 30 falsos positivos verificados + 45 grises sobre tinte (pasan AA, P3) |
| Gradientes decorativos | 95 | 5 (mismo tono, código de categoría) |
| `transition-all` | 83 | 0 |
| "..." en textos visibles | 48 | 0 (→ "…") |
| Animaciones que parpadean (`bounce`/`pulse`) | 2 | 0 |
| Emoji como ícono (fuera de medallas y logs) | 5 | 0 |
| Controles < 24 px en móvil (WCAG 2.5.8) | 1 | 0 |
| Desborde horizontal en 390 px | 0 | 0 |
| Lint de `src/` | 25 | 25 (misma lista exacta) |

**Hallazgos reales corregidos en esta fase:**
- **Cuentas en tablet (768-1024):** los rótulos de la constelación se montaban unos sobre otros (9 cuentas en ~720 px). Ahora la disposición en una o dos filas se decide por el ancho real de la ventana (no del viewport) y cada rótulo lleva un fondo translúcido para que las corrientes no tapen el texto. Medido: 0 solapes en 390 / 640 / 768 / 1024 / 1366 / 1920.
- **Franja de color lateral (`border-l-4`, patrón de plantilla):** los encabezados de Analytics, Productos e Inventario pasan al mismo patrón de las demás páginas (título + subtítulo sin tarjeta, ícono de la sección en una pastilla); los 3 avisos usan un contorno fino completo.
- **`transition-all` → propiedades explícitas:** `transition` estándar (colores, sombra, transform) y `transition-[width]` en las 10 barras de progreso que animan su ancho (metas diaria/mensual, participación, ABC, departamentos, tallas).
- **Emoji como ícono:** 💰/🏦 del reporte del cierre → íconos lucide (`Wallet`, `Landmark`), verificado en el JPEG descargado; 📦📋📊 de Inventario eliminados (el mensaje ya tenía ícono).
- **Marca de la barra (móvil):** área táctil de 27 → ~47 px sin mover el diseño.

**Falsos positivos verificados (no se tocan):** 9 "bordes gruesos en tarjeta redondeada" = spinners de carga; 21 "paleta púrpura de IA" = `indigo`/`purple` ya remapeados a tinta/ciruela del sistema; enlace "Saltar al contenido" de 1 px = visible solo al recibir foco.

**Pendientes documentados (P2/P3, sin tocar a propósito)** — todos resueltos o decididos en la Fase 15:
- 45 textos grises sobre fondos tintados: pasan AA; cambiarlos sería solo estético en 16 archivos.
- Íconos de fila en Códigos/Usuarios de 32 px y campos de 36-42 px: cumplen AA (24 px); llevarlos a 44 px arriesga que editar/eliminar queden superpuestos.
- Medallas 🥇🥈🥉 en rankings: comunican la posición; cambiarlas es decisión de contenido.
- En el JPEG, html2canvas sube unos px los íconos junto a los títulos (igual que el "$" que ya existía); en pantalla van centrados.

**Checklist Master Prompt §40-42:**

| Pregunta | Respuesta |
|---|---|
| ¿Parece una experiencia WebGL? | Sí: un canvas persistente detrás de toda la app con escenas por contexto. |
| ¿Profundidad real? | Sí: cámara en perspectiva con parallax, pilas 3D instanciadas con sombra de contacto (cierre). |
| ¿Interacción real? | Sí: el cursor aparta partículas, resalta barras y cuentas; inclinación del teléfono (Android). |
| ¿El scroll controla lo visual? | Parcial, por decisión: la velocidad del scroll inclina cámara y pilas y las escenas siguen su ancla, pero no hay scroll secuestrado (rompería el formulario del cierre). |
| ¿Partículas reales? | Sí: KOAJ en el login, series de estadística, equipo, corrientes de Cuentas. |
| ¿Geometría deformable? | No como malla deformada; la deformación es de nubes de puntos que se transforman entre formas. |
| ¿Shaders con valor? | Sí: GLSL propio (transformación entre formas, oleaje de rutas, corrientes, resaltado). |
| ¿Física? | Resortes e inercia (no cuerpos rígidos: sin valor para un cierre de caja). |
| ¿Transiciones? | Sí: las partículas viajan de una forma a otra al cambiar de página. |
| ¿Momentos WOW? | KOAJ formándose en el login; el efectivo apilándose mientras se cuenta; la serie real convertida en partículas. |
| ¿Cambia según el contexto? | Sí: login / cierre / métricas / estadísticas / gestión / exploración. |
| ¿Se siente distinto a un dashboard tradicional? | Sí (§41: la diferencia es evidente en las 60 capturas), sin sacrificar la lectura de los datos. |
| Móvil / rendimiento / funcionalidad (§42) | Fases 11 y 12; flujo completo del cierre y descarga verificados en cada fase. |

## FASE 15 - Polish, CHANGELOG y entrega ✅ (2026-09-23)
- CHANGELOG, notas de deploy (solo frontend, Vercel).
- Pendientes heredados: decidir si los archivos `# MASTER PROMPT*.txt` se versionan; opcional rediseño del reporte exportado.

**Cierre de todos los pendientes:**

| Pendiente | Decisión |
|---|---|
| Base de caja EXACTA se veía en rojo (bug previo: backend envía `exacta`, frontend comparaba `exacto`) | ✅ Corregido **con autorización del usuario**: se aceptan ambas formas. Verificado en el JPEG: recuadro verde con ✓. Único cambio de lógica de la fase. |
| Medallas 🥇🥈🥉 en rankings | ✅ Reemplazadas por `RankBadge` (círculo numerado oro/plata/bronce, el mismo patrón que ya usaba la tabla de Top Productos; lector de pantalla: "Puesto N"). |
| Botones de ícono < 44 px en táctil | ✅ Regla CSS solo para `pointer: coarse`: los botones de solo ícono miden 44 px reales (sin superponerse). Los de Usuarios/Códigos que solo tenían `title` recibieron `aria-label`. Códigos 102 → 5 y Usuarios 19 → 3 elementos bajo 44 px (quedan botones de texto y campos de 38-42 px). |
| Íconos del reporte unos px altos en el JPEG | Cerrado como limitación conocida de html2canvas (ya pasaba con el "$" previo). Se probó `leading-none` sin efecto; corregirlo exigiría tocar las funciones de exportación. Solo cosmético y solo en la imagen. |
| Herramientas de medición solo en desarrollo | ✅ `?quality=low|medium|high` ahora funciona en producción y el navegador lo recuerda (`?quality=auto` lo borra). El monitor solo baja de nivel, así que forzar `high` en un PC lento sigue protegido. `window.__koajGL` sigue solo en desarrollo (expone internos). |
| Archivos `# MASTER PROMPT*.txt` | Se versionan (sin datos sensibles: revisado). Son la fuente citada por este plan y el flujo entre máquinas es `git pull`. |
| Rediseño opcional del reporte | No se hace: es el documento diario del equipo; ya heredó paleta, íconos y la corrección de base exacta. Cambiar su estructura tiene costo de adopción y riesgo con html2canvas. |
| Monitoreo de rendimiento de usuarios reales | No se hace: requiere backend y el alcance es solo frontend. |
| 45 textos grises sobre fondos tintados | Aceptado: cumplen AA; el cambio sería solo estético. |

**Entrega:**
- `vercel.json`: caché de un año para `/assets/*` (archivos con hash) y `sw.js` sin caché. Service worker `v1 → v2` (limpia el caché del diseño anterior).
- Notas de despliegue en `README.md` (sección Vercel) y guía breve en `CLAUDE.md` para próximas sesiones.
- Verificación final: 15/15 rutas sin problemas de accesibilidad; login; cierre completo con descarga en escritorio, móvil, sin WebGL y con movimiento reducido; modales con teclado; 320 px sin desborde; lint idéntico al previo a la transformación; build OK.
- Todo el trabajo va en **un solo commit** (a pedido del usuario, para poder deshacerlo con un `git revert`). El push lo decide el usuario.

### Verificación exhaustiva previa al commit
Versión anterior (último commit, exportada con `git archive`) y versión nueva servidas lado a lado, con la API simulada y exactamente las mismas entradas:
- **Código:** script que compara cada archivo contra HEAD ignorando lo visual (clases, `aria-*`, comentarios) → 340 líneas funcionales revisadas a mano. Solo presentación, salvo los 2 cambios autorizados (401 en login, base "exacta"). Casos revisados en detalle: error de preconsulta (condición equivalente: el error siempre implica `preconsultaRealizada = false`), inventario y cuentas por pagar (sin datos → placeholder, igual que antes), metas ×1,25, progreso y redondeos (idénticos).
- **Cierre:** mismos 25 campos en el mismo orden en ambas versiones; 28 valores llenados (incluida la sección de desfases); payload a `/api/sum_payments` idéntico salvo `request_timestamp`; modal de confirmación y 85 cifras de resultados idénticos.
- **Escrituras de gestión:** ajuste manual, transferencia, crear código, crear usuario, pago a empleada → payloads idénticos.
- **Consultas:** 74 peticiones en 14 rutas, idénticas (método, ruta y parámetros).
- **Build de producción** (`vite preview`): login, cierre con descarga en escritorio y móvil, modales y 13 rutas sin errores.

---

## Riesgos vigilados en todas las fases
- **Celulares de las vendedoras:** la escena nunca puede volver lento el cierre diario. Calidad adaptativa obligatoria.
- **Reporte PDF/JPEG (html2canvas):** su área queda fuera del efecto, fondo sólido.
- **Backend de producción:** en local sin backend, el frontend usa la API de Render con datos reales. Las pruebas se hacen con la API simulada (Playwright) y nunca se envían cierres reales.
