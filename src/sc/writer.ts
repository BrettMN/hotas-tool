import type { ScActionmapFile, ScBinding } from "../types.ts";

// ── Star Citizen actionmap XML writer ────────────────────────────────────────
//
// Strategy:
//   1. Load (or generate) the original XML.
//   2. Remove all joystick rebinds (<rebind input="js*_...">) so that cleared
//      bindings are properly erased and we start from a clean slate.
//   3. Insert the new set of bindings by finding/creating the relevant
//      <ActionMap> and <Action> elements.
//   4. Write back to disk.
//
// Keyboard, mouse, and other non-joystick bindings are never touched.
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a new minimal actionmap XML. */
export function generateActionmapXml(profileName: string): string {
  return [
    '<?xml version="1.0" ?>',
    `<ActionMaps version="1" optionsVersion="2" rebindVersion="2" profileName="${profileName}">`,
    "  <modifiers />",
    "</ActionMaps>",
    "",
  ].join("\n");
}

/**
 * Remove all joystick rebind lines (js1_…, js2_…, etc.) from XML.
 * Leaves keyboard/mouse bindings intact.
 */
function removeJoystickRebinds(xml: string): string {
  return xml.replace(/[ \t]*<rebind\s+[^>]*input="js\d+_[^"]*"[^>]*\/?>\s*\n?/g, "");
}

/**
 * Ensure an <ActionMap name="…"> block exists; create it if not.
 * Returns the (possibly modified) XML string.
 */
function ensureActionMap(xml: string, actionMapName: string): string {
  const tag = `<ActionMap name="${actionMapName}"`;
  if (xml.includes(tag)) return xml;
  const block = `\n  <ActionMap name="${actionMapName}">\n  </ActionMap>`;
  return xml.replace("</ActionMaps>", block + "\n</ActionMaps>");
}

/**
 * Ensure an <Action name="…"> element exists inside the given ActionMap.
 * Returns the (possibly modified) XML string.
 */
function ensureAction(xml: string, actionMapName: string, actionName: string): string {
  const mapTagRx = new RegExp(`<ActionMap\\s+name="${escapeRegex(actionMapName)}"[^>]*>`);
  const mapMatch = mapTagRx.exec(xml);
  if (!mapMatch) return xml;

  const mapStart = mapMatch.index + mapMatch[0].length;
  const mapEnd = xml.indexOf("</ActionMap>", mapStart);
  if (mapEnd === -1) return xml;

  const mapContent = xml.slice(mapStart, mapEnd);
  const actionTag = `<Action name="${actionName}"`;
  if (mapContent.includes(actionTag)) return xml;

  const newAction = `\n    <Action name="${actionName}">\n    </Action>`;
  return xml.slice(0, mapEnd) + newAction + "\n  " + xml.slice(mapEnd);
}

/**
 * Insert a <rebind> element inside the matching <Action> within the given <ActionMap>.
 */
function insertRebind(xml: string, actionMapName: string, actionName: string, input: string): string {
  const mapTagRx = new RegExp(`<ActionMap\\s+name="${escapeRegex(actionMapName)}"[^>]*>`);
  const mapMatch = mapTagRx.exec(xml);
  if (!mapMatch) return xml;

  const mapStart = mapMatch.index + mapMatch[0].length;
  const mapEnd = xml.indexOf("</ActionMap>", mapStart);
  if (mapEnd === -1) return xml;

  const before = xml.slice(0, mapStart);
  let mapContent = xml.slice(mapStart, mapEnd);
  const after = xml.slice(mapEnd);

  const actionRx = new RegExp(`(<Action\\s+name="${escapeRegex(actionName)}"[^>]*>)([\\s\\S]*?)(</Action>)`);
  mapContent = mapContent.replace(actionRx, (_, open, body, close) => {
    const rebind = `\n      <rebind input="${input}" />`;
    return `${open}${body}${rebind}\n    ${close}`;
  });

  return before + mapContent + after;
}

/**
 * Apply a full set of bindings to an XML string.
 * Assumes joystick rebinds have already been cleared.
 */
function applyBindings(xml: string, bindings: ScBinding[]): string {
  for (const { action, actionMap, input } of bindings) {
    if (!input || !action || !actionMap) continue;
    xml = ensureActionMap(xml, actionMap);
    xml = ensureAction(xml, actionMap, action);
    xml = insertRebind(xml, actionMap, action, input);
  }
  return xml;
}

/**
 * Write the current bindings back to disk (sync version for use in webview bind callbacks).
 */
export function saveActionmapFileSync(
  file: ScActionmapFile,
  updatedBindings: ScBinding[],
): void {
  let xml: string;
  try {
    xml = Deno.readTextFileSync(file.filePath);
  } catch {
    xml = generateActionmapXml(file.profileName);
  }
  xml = removeJoystickRebinds(xml);
  xml = applyBindings(xml, updatedBindings);
  Deno.writeTextFileSync(file.filePath, xml);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
