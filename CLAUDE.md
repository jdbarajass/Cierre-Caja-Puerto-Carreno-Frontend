# Cierre-Caja-Puerto-Carreno-Frontend

Frontend del sistema de cierre de caja KOAJ (Puerto Carreño). Ver `README.md` para stack, estructura y despliegue.

## Sistema visual y capa WebGL

- Diseño "Arqueo": escalas de color reemplazadas en `tailwind.config.js` (gray→grafito, blue/indigo→tinta, purple→ciruela, tonos 600 semánticos desplazados para WCAG AA). Todo en hex: el reporte del cierre se exporta con html2canvas, que no soporta oklch.
- `src/experience/`: un solo canvas three.js detrás de la app (solo lectura de datos que publican las páginas con `usePublishSceneData`). Nunca modifica lógica de negocio. Historia completa, decisiones y mediciones por fase: `PLAN_EXPERIENCIA_WEBGL.md`.
- Al cambiar `tailwind.config.js` hay que reiniciar el servidor de Vite: no recarga la configuración solo.

## Skills y MCP de diseño (`.claude/skills/`, `.mcp.json`)

Este repo trae 6 skills de diseño/UX de Claude Code y 2 servidores MCP (Playwright, 21st.dev).

| Skill | Fuente |
|---|---|
| `design-taste-frontend` | Leonxlnx/taste-skill |
| `emil-design-eng` | emilkowalski/skills |
| `frontend-design` | anthropics/claude-code |
| `impeccable` | pbakaus/impeccable |
| `ui-ux-pro-max` | nextlevelbuilder/ui-ux-pro-max-skill |
| `web-design-guidelines` | vercel-labs/agent-skills |

Versiones fijadas en `skills-lock.json`. Para reinstalar/actualizar una: `npx skills@latest add <fuente> --skill <nombre> -a claude-code -y` desde la raíz de este repo.

**Importante**: Claude Code carga `.mcp.json` y `.claude/skills/` desde la carpeta abierta como proyecto. Abrir **esta carpeta** (`Cierre-Caja-Puerto-Carreno-Frontend`) en VS Code / Claude Code, no la carpeta padre `CIERRE_KOAJ`.

`git pull` trae solo `.claude/skills/`, `.mcp.json` y `skills-lock.json`. Hay pasos que son **por máquina** y no viajan con git — la primera vez que se abra este proyecto en una máquina nueva, haz esto proactivamente sin que el usuario tenga que pedirlo:

1. **Aprobar los MCP servers** cuando Claude Code lo pida al detectar `.mcp.json`.
2. **21st MCP necesita su API key por máquina**: si `mcp__21st__get_usage` falla o no está disponible, pide al usuario `setx API_KEY_21ST "<su key de https://21st.dev/mcp>"` (misma key de su cuenta, se reutiliza) y que reinicie la terminal/sesión. Si sigue sin conectar después de eso, pide al usuario correr `/mcp` en su sesión interactiva de Claude Code y autorizar el servidor `21st` ahí.
3. **Precalentar `impeccable`**: su binario vive en `~/.impeccable/` de esa máquina, no en el repo. Si no está descargado, correr `/impeccable doctor` una vez — necesita GitHub solo esa primera vez; después queda cacheado y funciona sin red. Si GitHub está bloqueado en esa red, pedir al usuario un hotspot/red alterna un minuto para ese paso.
4. **Playwright MCP** descarga Chromium solo en su primer uso si falta — no depende de GitHub, no requiere nada manual. Si en el primer arranque sale `CONNECT_TIMEOUT` (npx todavía descargando el paquete), correr `npx -y @playwright/mcp@latest --help` una vez y reconectar con `/mcp`.

**`web-design-guidelines` necesita `raw.githubusercontent.com` en CADA uso, sin excepción — no se puede precalentar.**

**Política de red bloqueada**: si una herramienta necesaria no puede conectarse por la red actual, no la descartes, no la reemplaces por otra cosa ni trabajes alrededor del bloqueo. Dile al usuario explícitamente que se conecte a otra red para poder usarla, y espera confirmación antes de continuar.

### Verificación en máquina nueva (después del `git pull`)

Cuando el usuario pida "verificar las skills" (o en la primera sesión en una máquina nueva), correr esta prueba y reportar el resultado en una tabla ✅/❌ con la acción pendiente de cada fallo:

| # | Prueba | Cómo | Resultado esperado |
|---|---|---|---|
| 1 | Skills detectadas | Revisar que las 6 skills de la tabla de arriba aparezcan en la lista de skills disponibles de la sesión | Aparecen las 6 |
| 2 | Archivos íntegros | `Get-ChildItem .claude\skills` y comparar con `skills-lock.json` | 6 carpetas, cada una con `SKILL.md` |
| 3 | MCP 21st | Llamar `mcp__21st__get_usage` | Devuelve `tier` (ej. `free`) sin error |
| 4 | MCP Playwright | Abrir `https://example.com` con `mcp__playwright__browser_navigate` y tomar snapshot | Devuelve el contenido de la página |
| 5 | `impeccable` | `.claude\skills\impeccable\scripts\impeccable.cmd doctor --json` (Windows) | Exit 0 y JSON con `findings` |
| 6 | `web-design-guidelines` | `curl -sI https://raw.githubusercontent.com` | HTTP 200/301 (hay red a GitHub raw) |
| 7 | `ui-ux-pro-max` | `python .claude\skills\ui-ux-pro-max\scripts\search.py "dashboard" --domain style` (si existe el script; requiere Python) | Devuelve resultados |

Requisitos de la máquina: Node.js (para `npx`), Python 3 (para `ui-ux-pro-max`), variable de usuario `API_KEY_21ST`.
