// ── WebView2 setup ────────────────────────────────────────────────────────────
// Ensure WebView2Loader.dll is present. We download it once and keep it;
// we deliberately do NOT use the window-polyfill trick that triggers webview_deno's
// preload(), because preload() always removes and re-downloads the DLL which fails
// when the file is locked after an unclean shutdown.
if (Deno.build.os === "windows") {
  const dllPath = "./WebView2Loader.dll";
  try {
    await Deno.stat(dllPath);
  } catch {
    console.log("Downloading WebView2Loader.dll…");
    const url =
      "https://github.com/webview/webview_deno/releases/download/0.7.3/WebView2Loader.dll";
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to download WebView2Loader.dll: ${resp.status}`);
    await Deno.writeFile(dllPath, new Uint8Array(await resp.arrayBuffer()));
  }
}

// Dynamic import AFTER DLL is in place.
// No globalThis.window polyfill — that would trigger preload() which tries to delete the DLL.
const { Webview } = await import("webview") as { Webview: typeof import("webview").Webview };

import { dirname, fromFileUrl, join, toFileUrl } from "jsr:@std/path@^1";
import type { DeviceConfig, ScActionmapFile, ScBinding } from "./src/types.ts";
import { ALL_DEVICES } from "./src/devices/vkb-gladiator-nxt.ts";
import { SC_ACTIONS } from "./src/sc/actions.ts";
import {
  getDefaultScInstallDir,
  listScProfilesSync,
  loadActionmapFileSync,
  scanScChannelsSync,
} from "./src/sc/parser.ts";
import { saveActionmapFileSync } from "./src/sc/writer.ts";

// ── Persistent config file ────────────────────────────────────────────────────
const CONFIG_DIR = `${Deno.env.get("APPDATA") ?? "."}\\hotas-tool`;
const CONFIG_FILE = `${CONFIG_DIR}\\config.json`;

const DEFAULT_CONFIG: DeviceConfig = {
  mode: "single",
  rightStick: {
    deviceId: "vkb-gladiator-nxt-right",
    jsInstance: 1,
    omniThrottle: false,
  },
};

function saveConfigSync(config: DeviceConfig): void {
  try { Deno.mkdirSync(CONFIG_DIR, { recursive: true }); } catch { /* exists */ }
  Deno.writeTextFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function loadConfigSync(): DeviceConfig {
  try {
    return JSON.parse(Deno.readTextFileSync(CONFIG_FILE)) as DeviceConfig;
  } catch {
    return DEFAULT_CONFIG;
  }
}

// ── Native file dialogs via PowerShell ───────────────────────────────────────
// webview.run() blocks the Deno event loop, so async IPC handlers that await
// long-running processes (dialogs) never deliver their result to the frontend.
//
// Solution: spawn PowerShell non-blocking and have it write the result to a
// temp file.  The frontend polls ipc_pollDialogResult() synchronously until
// the file appears.  Zero async needed.

const TEMP_DIR = Deno.env.get("TEMP") ?? Deno.env.get("TMP") ?? "C:\\Windows\\Temp";

/** Escape a string for use inside a single-quoted PowerShell string. */
function psStr(s: string): string {
  return s.replace(/'/g, "''");
}

/** Common owner-form header used by all dialog scripts. */
const PS_OWNER_FORM = `
Add-Type -AssemblyName System.Windows.Forms
$owner = New-Object System.Windows.Forms.Form
$owner.TopMost = $true
$owner.WindowState = 'Minimized'
$owner.ShowInTaskbar = $false
$owner.Show()`.trim();

/**
 * Build a PowerShell script that shows a dialog and writes the result
 * (or an empty string on cancel) to tmpFile.
 */
function buildFolderScript(description: string, tmpFile: string, initialDir?: string): string {
  const initLine = initialDir ? `$dlg.InitialDirectory = '${psStr(initialDir)}'` : "";
  const tmp = psStr(tmpFile);
  return `
${PS_OWNER_FORM}
$dlg = New-Object System.Windows.Forms.OpenFileDialog
$dlg.Title = '${psStr(description)} — navigate into the folder, then click Open'
$dlg.Filter = 'All Files (*.*)|*.*'
$dlg.FileName = '(click Open to select this folder)'
$dlg.CheckFileExists = $false
$dlg.CheckPathExists = $false
$dlg.ValidateNames = $false
${initLine}
$result = $dlg.ShowDialog($owner)
$owner.Dispose()
if ($result -eq 'OK') {
  $p = $dlg.FileName
  if ([System.IO.Directory]::Exists($p)) { $out = $p }
  else { $out = [System.IO.Path]::GetDirectoryName($p) }
} else { $out = '' }
[System.IO.File]::WriteAllText('${tmp}', $out)
`.trim();
}

function buildOpenFileScript(title: string, filter: string, tmpFile: string, initialDir?: string): string {
  const initLine = initialDir ? `$dlg.InitialDirectory = '${psStr(initialDir)}'` : "";
  const tmp = psStr(tmpFile);
  return `
${PS_OWNER_FORM}
$dlg = New-Object System.Windows.Forms.OpenFileDialog
$dlg.Title = '${psStr(title)}'
$dlg.Filter = '${psStr(filter)}'
${initLine}
$result = $dlg.ShowDialog($owner)
$owner.Dispose()
if ($result -eq 'OK') { $out = $dlg.FileName } else { $out = '' }
[System.IO.File]::WriteAllText('${tmp}', $out)
`.trim();
}

function buildSaveFileScript(
  title: string,
  filter: string,
  defaultName: string,
  tmpFile: string,
  initialDir?: string,
): string {
  const initLine = initialDir ? `$dlg.InitialDirectory = '${psStr(initialDir)}'` : "";
  const tmp = psStr(tmpFile);
  return `
${PS_OWNER_FORM}
$dlg = New-Object System.Windows.Forms.SaveFileDialog
$dlg.Title = '${psStr(title)}'
$dlg.Filter = '${psStr(filter)}'
$dlg.FileName = '${psStr(defaultName)}'
${initLine}
$result = $dlg.ShowDialog($owner)
$owner.Dispose()
if ($result -eq 'OK') { $out = $dlg.FileName } else { $out = '' }
[System.IO.File]::WriteAllText('${tmp}', $out)
`.trim();
}

/** Spawn PowerShell non-blocking; dialog result is written to tmpFile. */
function spawnDialog(script: string, tmpFile: string): void {
  // Delete stale result file if present
  try { Deno.removeSync(tmpFile); } catch { /* ignore */ }

  new Deno.Command("powershell", {
    args: ["-STA", "-NoProfile", "-NonInteractive", "-Command", script],
    stdout: "null",
    stderr: "null",
    stdin: "null",
  }).spawn();

  console.log("[dialog] spawned, result will be written to:", tmpFile);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const webview = new Webview(true);
  webview.title = "HOTAS Tool";
  webview.size = { width: 1280, height: 860, hint: 0 };

  // ── IPC handlers ──────────────────────────────────────────────────────────

  webview.bind("ipc_debugLog", (...args: unknown[]) => {
    console.log("[UI]", ...args);
  });

  webview.bind("ipc_getDevices", () => {
    return ALL_DEVICES.map((d) => ({
      id: d.id,
      name: d.name,
      hand: d.hand,
      hasOmniThrottleSupport: d.hasOmniThrottleSupport,
    }));
  });

  webview.bind("ipc_getDeviceControls", (...args: unknown[]) => {
    const deviceId = args[0] as string;
    const device = ALL_DEVICES.find((d) => d.id === deviceId);
    if (!device) return null;
    return {
      controls: device.controls,
      svgViewBox: device.svgViewBox,
      svgOutlinePaths: device.svgOutlinePaths,
    };
  });

  webview.bind("ipc_getScActions", () => SC_ACTIONS);

  webview.bind("ipc_getConfig", () => loadConfigSync());

  webview.bind("ipc_saveConfig", (...args: unknown[]) => {
    saveConfigSync(args[0] as DeviceConfig);
    return true;
  });

  webview.bind("ipc_getDefaultScInstallDir", () => getDefaultScInstallDir());

  // Dialog bindings: return temp-file path immediately, spawn PowerShell non-blocking.
  // Frontend polls ipc_pollDialogResult() until the file appears.
  webview.bind("ipc_browseForFolder", (...args: unknown[]) => {
    const description = (args[0] as string) ?? "Select Folder";
    const initialDir = args[1] as string | undefined;
    const tmpFile = `${TEMP_DIR}\\hotas-dialog-${crypto.randomUUID()}.txt`;
    spawnDialog(buildFolderScript(description, tmpFile, initialDir), tmpFile);
    return tmpFile;
  });

  webview.bind("ipc_browseForFile", (...args: unknown[]) => {
    const initialDir = (args[0] as string | undefined) ?? getDefaultScInstallDir();
    const tmpFile = `${TEMP_DIR}\\hotas-dialog-${crypto.randomUUID()}.txt`;
    spawnDialog(
      buildOpenFileScript("Open Star Citizen Actionmap", "XML Files (*.xml)|*.xml|All Files (*.*)|*.*", tmpFile, initialDir),
      tmpFile,
    );
    return tmpFile;
  });

  webview.bind("ipc_browseForSave", (...args: unknown[]) => {
    const tmpFile = `${TEMP_DIR}\\hotas-dialog-${crypto.randomUUID()}.txt`;
    spawnDialog(
      buildSaveFileScript(
        "Save Star Citizen Actionmap",
        "XML Files (*.xml)|*.xml|All Files (*.*)|*.*",
        `${args[0] as string}.xml`,
        tmpFile,
        getDefaultScInstallDir(),
      ),
      tmpFile,
    );
    return tmpFile;
  });

  // Synchronous poll: returns {ready:false} until result file exists, then {ready:true,result}.
  webview.bind("ipc_pollDialogResult", (...args: unknown[]) => {
    const tmpFile = args[0] as string;
    try {
      const data = Deno.readTextFileSync(tmpFile).trim();
      try { Deno.removeSync(tmpFile); } catch { /* ignore */ }
      console.log("[dialog] result:", data || "(cancelled)");
      return { ready: true, result: data || null };
    } catch {
      return { ready: false };
    }
  });

  webview.bind("ipc_scanScChannels", (...args: unknown[]) => {
    try {
      return { ok: true, channels: scanScChannelsSync(args[0] as string) };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  webview.bind("ipc_listScProfiles", (...args: unknown[]) => {
    return listScProfilesSync(args[0] as string);
  });

  webview.bind("ipc_loadFile", (...args: unknown[]) => {
    try {
      const file = loadActionmapFileSync(args[0] as string);
      return { success: true, file };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  webview.bind("ipc_saveFile", (...args: unknown[]) => {
    try {
      saveActionmapFileSync(args[0] as ScActionmapFile, args[1] as ScBinding[]);
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  webview.bind("ipc_saveFileAs", (...args: unknown[]) => {
    try {
      const file = { ...(args[0] as ScActionmapFile), filePath: args[2] as string };
      saveActionmapFileSync(file, args[1] as ScBinding[]);
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // ── Build and load UI ──────────────────────────────────────────────────────
  const scriptDir = dirname(fromFileUrl(import.meta.url));
  const uiPath = join(scriptDir, "ui", "index.html");
  webview.navigate(toFileUrl(uiPath).href);
  webview.run();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  Deno.exit(1);
});
