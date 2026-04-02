# HOTAS Tool — Copilot Instructions

## Workflow

- **Commit after every completed request** with a concise, relevant commit message.
- Always include the co-authored-by trailer:
  `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`

## Stack

- **Runtime**: Deno 2.x + TypeScript
- **UI**: WebView2 (webview_deno 0.7.6) — HTML/CSS/JS served from `ui/`
- **Target OS**: Windows only

## Critical: WebView IPC Constraints

`webview.run()` blocks the Deno event loop. All `webview.bind()` callbacks **must be synchronous**.
- Use `Deno.readTextFileSync`, `Deno.readDirSync`, `Deno.statSync`, `Deno.writeTextFileSync`
- Never `await` inside a bind callback — the promise will never resolve
- File dialogs use a temp-file + polling pattern (`ipc_browseForFolder`, `ipc_pollDialogResult`)

## Architecture

| Path | Purpose |
|------|---------|
| `main.ts` | Entry point: WebView window, all IPC handlers, dialog system |
| `src/types.ts` | Shared TypeScript interfaces |
| `src/devices/vkb-gladiator-nxt.ts` | VKB Gladiator NXT device model (controls, SVG layout) |
| `src/sc/parser.ts` | SC actionmap XML parser — all sync, case-insensitive tag matching |
| `src/sc/writer.ts` | SC actionmap XML writer |
| `src/sc/actions.ts` | SC action definitions |
| `ui/index.html` | App shell |
| `ui/app.js` | Frontend logic — all state, rendering, IPC calls |
| `ui/styles.css` | Dark theme, blue accent (`--accent: #1e88e5`) |
| `ui/templates/` | SVG joystick diagrams (diagrams.net exports, organised by brand) |

## Conventions

- Config persisted to `%APPDATA%\hotas-tool\config.json`
- SC install dir picked by user; channels (LIVE/PTU/etc.) scanned from subdirs
- `renderDiagram()` is `async` — always `await` every call site
- Template SVGs: strip XML preamble before `innerHTML`; use `createElementNS` for overlay elements
