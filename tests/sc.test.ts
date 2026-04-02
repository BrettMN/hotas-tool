import { assertEquals, assertThrows, assertMatch } from "jsr:@std/assert@^1";
import { parseActionmap } from "../src/sc/parser.ts";
import {
  generateActionmapXml,
  saveActionmapFileSync,
} from "../src/sc/writer.ts";
import type { ScActionmapFile, ScBinding } from "../src/types.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeXml(profileName: string, maps: Record<string, Record<string, string>>): string {
  let body = "";
  for (const [mapName, actions] of Object.entries(maps)) {
    let actionBody = "";
    for (const [actionName, input] of Object.entries(actions)) {
      actionBody += input
        ? `\n    <action name="${actionName}">\n      <rebind input="${input}"/>\n    </action>`
        : `\n    <action name="${actionName}">\n    </action>`;
    }
    body += `\n  <actionmap name="${mapName}">${actionBody}\n  </actionmap>`;
  }
  return `<ActionMaps profileName="${profileName}">${body}\n</ActionMaps>`;
}

// ── parseActionmap ─────────────────────────────────────────────────────────────

Deno.test("parseActionmap: extracts profileName", () => {
  const xml = makeXml("TestProfile", {});
  const result = parseActionmap(xml, "/test.xml");
  assertEquals(result.profileName, "TestProfile");
  assertEquals(result.filePath, "/test.xml");
});

Deno.test("parseActionmap: returns empty bindings for no actionmaps", () => {
  const xml = `<ActionMaps profileName="empty"></ActionMaps>`;
  const result = parseActionmap(xml, "/test.xml");
  assertEquals(result.bindings, []);
});

Deno.test("parseActionmap: parses single binding", () => {
  const xml = makeXml("P", { spaceship_movement: { v_pitch: "js1_x" } });
  const { bindings } = parseActionmap(xml, "/test.xml");
  assertEquals(bindings.length, 1);
  assertEquals(bindings[0], { action: "v_pitch", actionMap: "spaceship_movement", input: "js1_x" });
});

Deno.test("parseActionmap: parses multiple actionmaps", () => {
  const xml = makeXml("P", {
    spaceship_movement: { v_pitch: "js1_x", v_roll: "js1_y" },
    seat_general:       { v_eject: "js1_button1" },
  });
  const { bindings } = parseActionmap(xml, "/test.xml");
  assertEquals(bindings.length, 3);
  assertEquals(bindings.map(b => b.action).sort(), ["v_eject", "v_pitch", "v_roll"]);
});

Deno.test("parseActionmap: skips actions with no rebind input", () => {
  const xml = makeXml("P", { seat_general: { v_toggle_mining_mode: "", v_eject: "js1_button1" } });
  const { bindings } = parseActionmap(xml, "/test.xml");
  assertEquals(bindings.length, 1);
  assertEquals(bindings[0].action, "v_eject");
});

Deno.test("parseActionmap: last rebind wins for duplicate rebind elements", () => {
  const xml = `<ActionMaps profileName="P">
  <actionmap name="map">
    <action name="v_pitch">
      <rebind input="js1_x"/>
      <rebind input="js2_x"/>
    </action>
  </actionmap>
</ActionMaps>`;
  const { bindings } = parseActionmap(xml, "/test.xml");
  assertEquals(bindings.length, 1);
  assertEquals(bindings[0].input, "js2_x");
});

Deno.test("parseActionmap: case-insensitive tag matching (SC uses lowercase)", () => {
  const xml = `<ActionMaps profileName="CaseTest">
  <actionmap name="spaceship_movement">
    <action name="v_pitch">
      <rebind input="js1_x"/>
    </action>
  </actionmap>
</ActionMaps>`;
  const { bindings } = parseActionmap(xml, "/test.xml");
  assertEquals(bindings.length, 1);
  assertEquals(bindings[0].input, "js1_x");
});

Deno.test("parseActionmap: uppercase and lowercase produce same result", () => {
  const upper = makeXml("P", { spaceship_movement: { v_pitch: "js1_x" } });
  const lower = upper
    .replace(/ActionMap /g, "actionmap ")
    .replace(/ActionMap>/g, "actionmap>")
    .replace(/\/ActionMap>/g, "/actionmap>")
    .replace(/Action /g, "action ")
    .replace(/\/Action>/g, "/action>");
  const { bindings: ub } = parseActionmap(upper, "/u.xml");
  const { bindings: lb } = parseActionmap(lower, "/l.xml");
  assertEquals(ub.length, lb.length);
  assertEquals(ub[0].input, lb[0].input);
});

Deno.test("parseActionmap: profileName defaults to 'unknown' if missing", () => {
  const xml = `<ActionMaps></ActionMaps>`;
  const { profileName } = parseActionmap(xml, "/test.xml");
  assertEquals(profileName, "unknown");
});

Deno.test("parseActionmap: preserves hat direction input suffixes", () => {
  const xml = makeXml("P", { spaceship_weapons: { v_attack1: "js1_hat1_up" } });
  const { bindings } = parseActionmap(xml, "/test.xml");
  assertEquals(bindings[0].input, "js1_hat1_up");
});

Deno.test("parseActionmap: handles action elements with extra attributes", () => {
  const xml = `<ActionMaps profileName="P">
  <actionmap name="map">
    <action name="v_pitch" ActivationMode="press">
      <rebind input="js1_x"/>
    </action>
  </actionmap>
</ActionMaps>`;
  const { bindings } = parseActionmap(xml, "/test.xml");
  assertEquals(bindings.length, 1);
  assertEquals(bindings[0].input, "js1_x");
});

// ── generateActionmapXml ──────────────────────────────────────────────────────

Deno.test("generateActionmapXml: includes profileName attribute", () => {
  const xml = generateActionmapXml("MyProfile");
  assertMatch(xml, /profileName="MyProfile"/);
});

Deno.test("generateActionmapXml: has valid opening and closing ActionMaps tags", () => {
  const xml = generateActionmapXml("TestProfile");
  assertMatch(xml, /<ActionMaps/);
  assertMatch(xml, /<\/ActionMaps>/);
});

Deno.test("generateActionmapXml: round-trips through parser with empty bindings", () => {
  const xml = generateActionmapXml("RoundTrip");
  const { profileName, bindings } = parseActionmap(xml, "/test.xml");
  assertEquals(profileName, "RoundTrip");
  assertEquals(bindings, []);
});

// ── saveActionmapFileSync ─────────────────────────────────────────────────────

function withTempFile(content: string, fn: (path: string) => void): void {
  const path = `${Deno.env.get("TEMP") ?? "/tmp"}\\hotas-test-${crypto.randomUUID()}.xml`;
  Deno.writeTextFileSync(path, content);
  try {
    fn(path);
  } finally {
    try { Deno.removeSync(path); } catch { /* ignore */ }
  }
}

Deno.test("saveActionmapFileSync: writes bindings to existing file", () => {
  withTempFile(generateActionmapXml("SaveTest"), (path) => {
    const file: ScActionmapFile = { profileName: "SaveTest", filePath: path, bindings: [] };
    const bindings: ScBinding[] = [
      { action: "v_pitch", actionMap: "spaceship_movement", input: "js1_x" },
    ];
    saveActionmapFileSync(file, bindings);
    const parsed = parseActionmap(Deno.readTextFileSync(path), path);
    assertEquals(parsed.bindings.length, 1);
    assertEquals(parsed.bindings[0].input, "js1_x");
  });
});

Deno.test("saveActionmapFileSync: clears old joystick bindings before writing", () => {
  const original = makeXml("P", {
    spaceship_movement: { v_pitch: "js1_x", v_roll: "js1_y" },
  });
  withTempFile(original, (path) => {
    const file: ScActionmapFile = { profileName: "P", filePath: path, bindings: [] };
    saveActionmapFileSync(file, [{ action: "v_pitch", actionMap: "spaceship_movement", input: "js2_rz" }]);
    const parsed = parseActionmap(Deno.readTextFileSync(path), path);
    const inputs = parsed.bindings.map(b => b.input);
    assertEquals(inputs.includes("js1_x"), false, "js1_x should be cleared");
    assertEquals(inputs.includes("js1_y"), false, "js1_y should be cleared");
    assertEquals(inputs.includes("js2_rz"), true,  "js2_rz should be written");
  });
});

Deno.test("saveActionmapFileSync: preserves non-joystick (keyboard) bindings", () => {
  const original = `<ActionMaps profileName="P">
  <actionmap name="spaceship_mining">
    <action name="v_increase_mining_throttle">
      <rebind input="kb1_mwheel_up"/>
    </action>
    <action name="v_pitch">
      <rebind input="js1_x"/>
    </action>
  </actionmap>
</ActionMaps>`;
  withTempFile(original, (path) => {
    const file: ScActionmapFile = { profileName: "P", filePath: path, bindings: [] };
    saveActionmapFileSync(file, []);
    const written = Deno.readTextFileSync(path);
    assertMatch(written, /kb1_mwheel_up/, "keyboard binding should be preserved");
    assertEquals(/js1_x/.test(written), false, "joystick binding should be removed");
  });
});

Deno.test("saveActionmapFileSync: creates new file when original is missing", () => {
  const path = `${Deno.env.get("TEMP") ?? "/tmp"}\\hotas-test-${crypto.randomUUID()}.xml`;
  try {
    const file: ScActionmapFile = { profileName: "NewFile", filePath: path, bindings: [] };
    saveActionmapFileSync(file, [{ action: "v_yaw", actionMap: "spaceship_movement", input: "js1_rz" }]);
    const written = Deno.readTextFileSync(path);
    assertMatch(written, /profileName="NewFile"/);
    assertEquals(parseActionmap(written, path).bindings[0].input, "js1_rz");
  } finally {
    try { Deno.removeSync(path); } catch { /* ignore */ }
  }
});

Deno.test("saveActionmapFileSync: full round-trip write then read", () => {
  const bindings: ScBinding[] = [
    { action: "v_pitch",   actionMap: "spaceship_movement", input: "js1_x"       },
    { action: "v_yaw",     actionMap: "spaceship_movement", input: "js1_rz"      },
    { action: "v_attack1", actionMap: "spaceship_weapons",  input: "js1_hat1_up" },
    { action: "v_eject",   actionMap: "seat_general",       input: "js2_button1" },
  ];
  withTempFile(generateActionmapXml("RoundTrip"), (path) => {
    const file: ScActionmapFile = { profileName: "RoundTrip", filePath: path, bindings: [] };
    saveActionmapFileSync(file, bindings);
    const parsed = parseActionmap(Deno.readTextFileSync(path), path);
    assertEquals(parsed.bindings.length, bindings.length);
    for (const original of bindings) {
      const found = parsed.bindings.find(b => b.action === original.action);
      assertEquals(found?.input, original.input, `binding for ${original.action}`);
    }
  });
});

Deno.test("saveActionmapFileSync: saving empty bindings clears all joystick rebinds", () => {
  const original = makeXml("P", {
    spaceship_movement: { v_pitch: "js1_x", v_yaw: "js1_rz" },
    seat_general:       { v_eject: "js2_button1" },
  });
  withTempFile(original, (path) => {
    const file: ScActionmapFile = { profileName: "P", filePath: path, bindings: [] };
    saveActionmapFileSync(file, []);
    const parsed = parseActionmap(Deno.readTextFileSync(path), path);
    assertEquals(parsed.bindings.filter(b => b.input.startsWith("js")).length, 0);
  });
});
