// ── Tests: src/sc/parser.ts ──────────────────────────────────────────────────
import { assertEquals, assertThrows } from "jsr:@std/assert@^1";
import {
  getDefaultScInstallDir,
  listScProfilesSync,
  parseActionmap,
  scanScChannelsSync,
} from "../../src/sc/parser.ts";

// ── parseActionmap ────────────────────────────────────────────────────────────

Deno.test("parseActionmap: extracts profileName", () => {
  const xml = `<ActionMaps profileName="MyProfile"><actionmap name="m"><action name="a"><rebind input="js1_x"/></action></actionmap></ActionMaps>`;
  const result = parseActionmap(xml, "test.xml");
  assertEquals(result.profileName, "MyProfile");
  assertEquals(result.filePath, "test.xml");
});

Deno.test("parseActionmap: returns empty bindings when no actionmaps", () => {
  const xml = `<ActionMaps profileName="Empty"></ActionMaps>`;
  const result = parseActionmap(xml, "empty.xml");
  assertEquals(result.bindings, []);
});

Deno.test("parseActionmap: parses lowercase tags (real SC export format)", () => {
  const xml = `
<ActionMaps profileName="VKB_NXT">
 <actionmap name="seat_general">
  <action name="v_toggle_mining_mode">
   <rebind input="js1_button17"/>
  </action>
  <action name="v_toggle_missile_mode">
   <rebind input="js1_button3"/>
  </action>
 </actionmap>
</ActionMaps>`;
  const result = parseActionmap(xml, "test.xml");
  assertEquals(result.bindings.length, 2);
  assertEquals(result.bindings[0], {
    action: "v_toggle_mining_mode",
    actionMap: "seat_general",
    input: "js1_button17",
  });
  assertEquals(result.bindings[1], {
    action: "v_toggle_missile_mode",
    actionMap: "seat_general",
    input: "js1_button3",
  });
});

Deno.test("parseActionmap: parses uppercase tags (legacy format)", () => {
  const xml = `
<ActionMaps profileName="Legacy">
 <ActionMap name="spaceship_movement">
  <Action name="v_pitch">
   <rebind input="js1_x"/>
  </Action>
 </ActionMap>
</ActionMaps>`;
  const result = parseActionmap(xml, "test.xml");
  assertEquals(result.bindings.length, 1);
  assertEquals(result.bindings[0].action, "v_pitch");
  assertEquals(result.bindings[0].input, "js1_x");
});

Deno.test("parseActionmap: last rebind wins when multiple exist", () => {
  const xml = `
<ActionMaps profileName="P">
 <actionmap name="m">
  <action name="v_pitch">
   <rebind input="js1_x"/>
   <rebind input="js2_y"/>
  </action>
 </actionmap>
</ActionMaps>`;
  const result = parseActionmap(xml, "test.xml");
  assertEquals(result.bindings.length, 1);
  assertEquals(result.bindings[0].input, "js2_y");
});

Deno.test("parseActionmap: skips actions with no rebind", () => {
  const xml = `
<ActionMaps profileName="P">
 <actionmap name="m">
  <action name="v_unbound">
  </action>
  <action name="v_bound">
   <rebind input="js1_button1"/>
  </action>
 </actionmap>
</ActionMaps>`;
  const result = parseActionmap(xml, "test.xml");
  assertEquals(result.bindings.length, 1);
  assertEquals(result.bindings[0].action, "v_bound");
});

Deno.test("parseActionmap: handles multiple actionmaps", () => {
  const xml = `
<ActionMaps profileName="Multi">
 <actionmap name="map1">
  <action name="a1"><rebind input="js1_button1"/></action>
 </actionmap>
 <actionmap name="map2">
  <action name="a2"><rebind input="js2_button2"/></action>
 </actionmap>
</ActionMaps>`;
  const result = parseActionmap(xml, "test.xml");
  assertEquals(result.bindings.length, 2);
  assertEquals(result.bindings[0].actionMap, "map1");
  assertEquals(result.bindings[1].actionMap, "map2");
});

Deno.test("parseActionmap: unknown profileName defaults to 'unknown'", () => {
  const xml = `<ActionMaps><actionmap name="m"><action name="a"><rebind input="js1_x"/></action></actionmap></ActionMaps>`;
  const result = parseActionmap(xml, "test.xml");
  assertEquals(result.profileName, "unknown");
});

Deno.test("parseActionmap: returns empty on completely empty string", () => {
  const result = parseActionmap("", "empty.xml");
  assertEquals(result.profileName, "unknown");
  assertEquals(result.bindings, []);
});

// ── scanScChannelsSync ────────────────────────────────────────────────────────

Deno.test("scanScChannelsSync: throws on non-existent directory", () => {
  assertThrows(() => scanScChannelsSync("C:\\NoSuchDir_hotas_test_xyz"));
});

Deno.test("scanScChannelsSync: LIVE sorts first", () => {
  const tmp = Deno.makeTempDirSync();
  try {
    Deno.mkdirSync(`${tmp}\\PTU\\USER`, { recursive: true });
    Deno.mkdirSync(`${tmp}\\LIVE\\USER`, { recursive: true });
    Deno.mkdirSync(`${tmp}\\EPTU\\USER`, { recursive: true });
    const channels = scanScChannelsSync(tmp);
    assertEquals(channels[0].name, "LIVE");
  } finally {
    Deno.removeSync(tmp, { recursive: true });
  }
});

Deno.test("scanScChannelsSync: detects known channel names without USER dir", () => {
  const tmp = Deno.makeTempDirSync();
  try {
    Deno.mkdirSync(`${tmp}\\LIVE`, { recursive: true });
    const channels = scanScChannelsSync(tmp);
    assertEquals(channels.length, 1);
    assertEquals(channels[0].name, "LIVE");
    assertEquals(channels[0].mappingsPath, `${tmp}\\LIVE\\USER\\Client\\0\\Controls\\Mappings`);
  } finally {
    Deno.removeSync(tmp, { recursive: true });
  }
});

Deno.test("scanScChannelsSync: detects unknown dir with USER subfolder", () => {
  const tmp = Deno.makeTempDirSync();
  try {
    Deno.mkdirSync(`${tmp}\\CUSTOM_CHANNEL\\USER`, { recursive: true });
    const channels = scanScChannelsSync(tmp);
    assertEquals(channels.length, 1);
    assertEquals(channels[0].name, "CUSTOM_CHANNEL");
  } finally {
    Deno.removeSync(tmp, { recursive: true });
  }
});

Deno.test("scanScChannelsSync: ignores dirs with no USER folder and unknown names", () => {
  const tmp = Deno.makeTempDirSync();
  try {
    Deno.mkdirSync(`${tmp}\\SomeRandomDir`);
    const channels = scanScChannelsSync(tmp);
    assertEquals(channels.length, 0);
  } finally {
    Deno.removeSync(tmp, { recursive: true });
  }
});

Deno.test("scanScChannelsSync: alphabetical sort after LIVE", () => {
  const tmp = Deno.makeTempDirSync();
  try {
    for (const name of ["PTU", "LIVE", "EPTU"]) {
      Deno.mkdirSync(`${tmp}\\${name}\\USER`, { recursive: true });
    }
    const channels = scanScChannelsSync(tmp);
    assertEquals(channels.map(c => c.name), ["LIVE", "EPTU", "PTU"]);
  } finally {
    Deno.removeSync(tmp, { recursive: true });
  }
});

// ── listScProfilesSync ────────────────────────────────────────────────────────

Deno.test("listScProfilesSync: returns empty array for non-existent dir", () => {
  const result = listScProfilesSync("C:\\NoSuchDir_hotas_test_xyz");
  assertEquals(result, []);
});

Deno.test("listScProfilesSync: lists only .xml files", () => {
  const tmp = Deno.makeTempDirSync();
  try {
    Deno.writeTextFileSync(`${tmp}\\profile_a.xml`, "<ActionMaps/>");
    Deno.writeTextFileSync(`${tmp}\\profile_b.xml`, "<ActionMaps/>");
    Deno.writeTextFileSync(`${tmp}\\readme.txt`, "not xml");
    const result = listScProfilesSync(tmp);
    assertEquals(result.length, 2);
    // Both should end with .xml
    for (const p of result) assertEquals(p.endsWith(".xml"), true);
  } finally {
    Deno.removeSync(tmp, { recursive: true });
  }
});

Deno.test("listScProfilesSync: results are sorted", () => {
  const tmp = Deno.makeTempDirSync();
  try {
    Deno.writeTextFileSync(`${tmp}\\z_profile.xml`, "");
    Deno.writeTextFileSync(`${tmp}\\a_profile.xml`, "");
    Deno.writeTextFileSync(`${tmp}\\m_profile.xml`, "");
    const result = listScProfilesSync(tmp);
    const names = result.map(p => p.split("\\").pop()!);
    assertEquals(names, ["a_profile.xml", "m_profile.xml", "z_profile.xml"]);
  } finally {
    Deno.removeSync(tmp, { recursive: true });
  }
});

Deno.test("listScProfilesSync: empty dir returns empty array", () => {
  const tmp = Deno.makeTempDirSync();
  try {
    assertEquals(listScProfilesSync(tmp), []);
  } finally {
    Deno.removeSync(tmp, { recursive: true });
  }
});

// ── getDefaultScInstallDir ────────────────────────────────────────────────────

Deno.test("getDefaultScInstallDir: returns a non-empty string ending with StarCitizen", () => {
  const dir = getDefaultScInstallDir();
  assertEquals(typeof dir, "string");
  assertEquals(dir.endsWith("StarCitizen"), true);
});
