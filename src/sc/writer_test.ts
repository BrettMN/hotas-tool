// ── Tests: src/sc/writer.ts ──────────────────────────────────────────────────
import { assertEquals, assertMatch, assertStringIncludes } from "jsr:@std/assert@^1";
import { generateActionmapXml, saveActionmapFileSync } from "../../src/sc/writer.ts";
import { parseActionmap } from "../../src/sc/parser.ts";
import type { ScActionmapFile, ScBinding } from "../../src/types.ts";

// ── generateActionmapXml ─────────────────────────────────────────────────────

Deno.test("generateActionmapXml: contains profileName", () => {
  const xml = generateActionmapXml("MyProfile");
  assertStringIncludes(xml, 'profileName="MyProfile"');
});

Deno.test("generateActionmapXml: valid XML structure", () => {
  const xml = generateActionmapXml("Test");
  assertStringIncludes(xml, "<?xml version");
  assertStringIncludes(xml, "<ActionMaps");
  assertStringIncludes(xml, "</ActionMaps>");
  assertStringIncludes(xml, "<modifiers />");
});

// ── saveActionmapFileSync (round-trip) ────────────────────────────────────────

function makeTmpFile(content: string): string {
  const tmp = Deno.makeTempFileSync({ suffix: ".xml" });
  Deno.writeTextFileSync(tmp, content);
  return tmp;
}

Deno.test("saveActionmapFileSync: round-trip — write then parse returns same bindings", () => {
  const tmp = makeTmpFile(generateActionmapXml("RoundTrip"));
  try {
    const file: ScActionmapFile = { profileName: "RoundTrip", filePath: tmp, bindings: [] };
    const bindings: ScBinding[] = [
      { action: "v_pitch",   actionMap: "spaceship_movement", input: "js1_x"       },
      { action: "v_attack1", actionMap: "spaceship_weapons",  input: "js1_button1" },
      { action: "v_brake",   actionMap: "spaceship_movement", input: "js2_button3" },
    ];

    saveActionmapFileSync(file, bindings);

    const saved = Deno.readTextFileSync(tmp);
    const parsed = parseActionmap(saved, tmp);

    assertEquals(parsed.bindings.length, 3);
    // Sort both to compare regardless of order
    const sort = (b: ScBinding[]) => [...b].sort((a, x) => a.action.localeCompare(x.action));
    assertEquals(sort(parsed.bindings), sort(bindings));
  } finally {
    Deno.removeSync(tmp);
  }
});

Deno.test("saveActionmapFileSync: removes old joystick rebinds before writing", () => {
  const original = `<?xml version="1.0" ?>
<ActionMaps profileName="OldProfile">
  <modifiers />
  <ActionMap name="spaceship_movement">
    <Action name="v_pitch">
      <rebind input="js1_x" />
    </Action>
    <Action name="v_yaw">
      <rebind input="js1_rz" />
    </Action>
  </ActionMap>
</ActionMaps>`;
  const tmp = makeTmpFile(original);
  try {
    const file: ScActionmapFile = { profileName: "OldProfile", filePath: tmp, bindings: [] };
    // Save with only v_pitch, different input — v_yaw should be gone
    saveActionmapFileSync(file, [
      { action: "v_pitch", actionMap: "spaceship_movement", input: "js2_y" },
    ]);
    const saved = Deno.readTextFileSync(tmp);
    const parsed = parseActionmap(saved, tmp);

    // Only the new binding should exist
    assertEquals(parsed.bindings.length, 1);
    assertEquals(parsed.bindings[0].action, "v_pitch");
    assertEquals(parsed.bindings[0].input, "js2_y");
  } finally {
    Deno.removeSync(tmp);
  }
});

Deno.test("saveActionmapFileSync: preserves non-joystick bindings", () => {
  const original = `<?xml version="1.0" ?>
<ActionMaps profileName="Mixed">
  <modifiers />
  <ActionMap name="spaceship_weapons">
    <Action name="v_attack1">
      <rebind input="kb1_space" />
    </Action>
    <Action name="v_attack2">
      <rebind input="js1_button1" />
    </Action>
  </ActionMap>
</ActionMaps>`;
  const tmp = makeTmpFile(original);
  try {
    const file: ScActionmapFile = { profileName: "Mixed", filePath: tmp, bindings: [] };
    saveActionmapFileSync(file, []);
    const saved = Deno.readTextFileSync(tmp);
    // Keyboard binding preserved
    assertStringIncludes(saved, 'input="kb1_space"');
    // Joystick binding removed
    assertEquals(saved.includes('input="js1_button1"'), false);
  } finally {
    Deno.removeSync(tmp);
  }
});

Deno.test("saveActionmapFileSync: creates file from scratch if not found", () => {
  const tmp = Deno.makeTempFileSync({ suffix: ".xml" });
  Deno.removeSync(tmp); // ensure it doesn't exist
  try {
    const file: ScActionmapFile = { profileName: "NewProfile", filePath: tmp, bindings: [] };
    saveActionmapFileSync(file, [
      { action: "v_yaw", actionMap: "spaceship_movement", input: "js1_rz" },
    ]);
    const parsed = parseActionmap(Deno.readTextFileSync(tmp), tmp);
    assertEquals(parsed.profileName, "NewProfile");
    assertEquals(parsed.bindings.length, 1);
    assertEquals(parsed.bindings[0].action, "v_yaw");
  } finally {
    try { Deno.removeSync(tmp); } catch { /* already gone */ }
  }
});

Deno.test("saveActionmapFileSync: empty bindings clears all joystick rebinds", () => {
  const original = generateActionmapXml("Clear");
  const withBindings = original.replace(
    "</ActionMaps>",
    `  <ActionMap name="m"><Action name="a"><rebind input="js1_button1"/></Action></ActionMap>\n</ActionMaps>`,
  );
  const tmp = makeTmpFile(withBindings);
  try {
    const file: ScActionmapFile = { profileName: "Clear", filePath: tmp, bindings: [] };
    saveActionmapFileSync(file, []);
    const saved = Deno.readTextFileSync(tmp);
    assertEquals(saved.includes('input="js1_button1"'), false);
  } finally {
    Deno.removeSync(tmp);
  }
});

Deno.test("saveActionmapFileSync: creates new ActionMap block when needed", () => {
  const tmp = makeTmpFile(generateActionmapXml("NewMap"));
  try {
    const file: ScActionmapFile = { profileName: "NewMap", filePath: tmp, bindings: [] };
    saveActionmapFileSync(file, [
      { action: "v_brake", actionMap: "spaceship_movement", input: "js1_button5" },
    ]);
    const saved = Deno.readTextFileSync(tmp);
    assertStringIncludes(saved, 'name="spaceship_movement"');
    assertStringIncludes(saved, 'input="js1_button5"');
  } finally {
    Deno.removeSync(tmp);
  }
});
