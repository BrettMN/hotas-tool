import type { ScActionmapFile, ScBinding, ScChannel } from "../types.ts";

// ── Star Citizen actionmap XML parser ────────────────────────────────────────
//
// SC stores keybindings in XML files at:
//   %LOCALAPPDATA%\Roberts Space Industries\StarCitizen\LIVE\USER\Client\0\Controls\Mappings\
//
// Format:
//   <ActionMaps profileName="NAME" ...>
//     <ActionMap name="spaceship_movement">
//       <Action name="v_pitch">
//         <rebind input="js1_x" />
//       </Action>
//     </ActionMap>
//   </ActionMaps>
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a Star Citizen actionmap XML string into a structured object.
 */
export function parseActionmap(xmlStr: string, filePath: string): ScActionmapFile {
  const bindings: ScBinding[] = [];

  // Extract profileName from root element
  const profileMatch = xmlStr.match(/profileName\s*=\s*"([^"]*)"/);
  const profileName = profileMatch?.[1] ?? "unknown";

  // Extract all ActionMap blocks (case-insensitive — SC exports use lowercase tags)
  const actionMapRegex = /<actionmap\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/actionmap>/gi;
  let mapMatch: RegExpExecArray | null;

  while ((mapMatch = actionMapRegex.exec(xmlStr)) !== null) {
    const actionMapName = mapMatch[1];
    const mapContent = mapMatch[2];

    // Extract Action elements within this map
    const actionRegex = /<action\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/action>/gi;
    let actionMatch: RegExpExecArray | null;

    while ((actionMatch = actionRegex.exec(mapContent)) !== null) {
      const actionName = actionMatch[1];
      const actionContent = actionMatch[2];

      // Extract rebind input (last wins — SC uses the last rebind)
      const rebindRegex = /<rebind\s+[^>]*input="([^"]+)"[^>]*/gi;
      let rebindMatch: RegExpExecArray | null;
      let lastInput: string | null = null;

      while ((rebindMatch = rebindRegex.exec(actionContent)) !== null) {
        lastInput = rebindMatch[1];
      }

      if (lastInput) {
        bindings.push({
          action: actionName,
          actionMap: actionMapName,
          input: lastInput,
        });
      }
    }
  }

  return { profileName, filePath, bindings };
}

/**
 * Read and parse a Star Citizen actionmap XML file from disk.
 */
export async function loadActionmapFile(filePath: string): Promise<ScActionmapFile> {
  const xml = await Deno.readTextFile(filePath);
  return parseActionmap(xml, filePath);
}

// Well-known SC channel directory names (checked first for fast detection)
const KNOWN_CHANNELS = new Set(["LIVE", "EPTU", "EVOCATI", "PTU", "TECH-PREVIEW", "PREVIEW"]);
const MAPPINGS_SUFFIX = "USER\\Client\\0\\Controls\\Mappings";

export function scanScChannelsSync(installDir: string): ScChannel[] {
  const channels: ScChannel[] = [];
  const MAPPINGS_SUFFIX = "USER\\Client\\0\\Controls\\Mappings";
  let entries: Deno.DirEntry[];
  try {
    entries = [...Deno.readDirSync(installDir)];
  } catch (err) {
    throw new Error(`Cannot read install directory "${installDir}": ${err}`);
  }
  for (const entry of entries) {
    if (!entry.isDirectory) continue;
    const channelDir = `${installDir}\\${entry.name}`;
    const mappingsPath = `${channelDir}\\${MAPPINGS_SUFFIX}`;
    if (KNOWN_CHANNELS.has(entry.name.toUpperCase())) {
      channels.push({ name: entry.name, mappingsPath });
      continue;
    }
    try {
      const s = Deno.statSync(`${channelDir}\\USER`);
      if (s.isDirectory) channels.push({ name: entry.name, mappingsPath });
    } catch { /* no USER dir */ }
  }
  channels.sort((a, b) => {
    if (a.name.toUpperCase() === "LIVE") return -1;
    if (b.name.toUpperCase() === "LIVE") return 1;
    return a.name.localeCompare(b.name);
  });
  return channels;
}

export function listScProfilesSync(mappingsDir: string): string[] {
  try {
    return [...Deno.readDirSync(mappingsDir)]
      .filter(e => e.isFile && e.name.toLowerCase().endsWith(".xml"))
      .map(e => `${mappingsDir}\\${e.name}`)
      .sort();
  } catch {
    return [];
  }
}

export function loadActionmapFileSync(filePath: string): ScActionmapFile {
  const xml = Deno.readTextFileSync(filePath);
  return parseActionmap(xml, filePath);
}

export function getDefaultScInstallDir(): string {
  const localAppData = Deno.env.get("LOCALAPPDATA") ?? "C:\\Users\\Public";
  return `${localAppData}\\Roberts Space Industries\\StarCitizen`;
}
