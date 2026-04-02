// ── Tests: src/devices/vkb-gladiator-nxt.ts ──────────────────────────────────
import { assertEquals, assertExists } from "jsr:@std/assert@^1";
import {
  ALL_DEVICES,
  VKB_GLADIATOR_NXT_LEFT,
  VKB_GLADIATOR_NXT_RIGHT,
  getDevice,
} from "../../src/devices/vkb-gladiator-nxt.ts";

// ── Device definition sanity checks ──────────────────────────────────────────

Deno.test("ALL_DEVICES contains right and left variants", () => {
  assertEquals(ALL_DEVICES.length, 2);
  const ids = ALL_DEVICES.map(d => d.id);
  assertEquals(ids.includes("vkb-gladiator-nxt-right"), true);
  assertEquals(ids.includes("vkb-gladiator-nxt-left"), true);
});

Deno.test("getDevice: returns correct device by id", () => {
  const d = getDevice("vkb-gladiator-nxt-right");
  assertExists(d);
  assertEquals(d!.id, "vkb-gladiator-nxt-right");
});

Deno.test("getDevice: returns undefined for unknown id", () => {
  assertEquals(getDevice("nonexistent"), undefined);
});

Deno.test("VKB_GLADIATOR_NXT_RIGHT: hand is 'right'", () => {
  assertEquals(VKB_GLADIATOR_NXT_RIGHT.hand, "right");
});

Deno.test("VKB_GLADIATOR_NXT_LEFT: hand is 'left'", () => {
  assertEquals(VKB_GLADIATOR_NXT_LEFT.hand, "left");
});

Deno.test("both devices have same number of controls", () => {
  assertEquals(VKB_GLADIATOR_NXT_RIGHT.controls.length, VKB_GLADIATOR_NXT_LEFT.controls.length);
});

Deno.test("both devices share the same svgViewBox", () => {
  assertEquals(VKB_GLADIATOR_NXT_RIGHT.svgViewBox, VKB_GLADIATOR_NXT_LEFT.svgViewBox);
});

Deno.test("right device has expected buttons", () => {
  const ids = VKB_GLADIATOR_NXT_RIGHT.controls.map(c => c.id);
  for (const expected of ["trigger1", "trigger2", "a1", "h1_push", "h2_push", "c1", "d1"]) {
    assertEquals(ids.includes(expected), true, `Missing control: ${expected}`);
  }
});

Deno.test("right device has H1 hat directions (4-way)", () => {
  const hatIds = VKB_GLADIATOR_NXT_RIGHT.controls
    .filter(c => c.id.startsWith("h1_") && c.type === "hat_direction")
    .map(c => c.id);
  assertEquals(hatIds.sort(), ["h1_down", "h1_left", "h1_right", "h1_up"]);
});

Deno.test("right device has H2 hat directions (8-way)", () => {
  const hatIds = VKB_GLADIATOR_NXT_RIGHT.controls
    .filter(c => c.id.startsWith("h2_") && c.type === "hat_direction")
    .map(c => c.id);
  assertEquals(hatIds.length, 8);
});

Deno.test("right device has axes (x, y, rz)", () => {
  const axisInputs = VKB_GLADIATOR_NXT_RIGHT.controls
    .filter(c => c.type === "axis")
    .map(c => c.scInput);
  for (const expected of ["x", "y", "rz"]) {
    assertEquals(axisInputs.includes(expected), true, `Missing axis: ${expected}`);
  }
});

Deno.test("left device mirrors right device X coordinates", () => {
  const [,, viewBoxW] = VKB_GLADIATOR_NXT_RIGHT.svgViewBox.split(" ").map(Number);
  for (let i = 0; i < VKB_GLADIATOR_NXT_RIGHT.controls.length; i++) {
    const r = VKB_GLADIATOR_NXT_RIGHT.controls[i];
    const l = VKB_GLADIATOR_NXT_LEFT.controls[i];
    assertEquals(l.svgX, viewBoxW - r.svgX, `X not mirrored for control ${r.id}`);
    assertEquals(l.svgY, r.svgY, `Y changed for control ${r.id}`);
  }
});

Deno.test("left and right devices have same control ids and scInputs", () => {
  for (let i = 0; i < VKB_GLADIATOR_NXT_RIGHT.controls.length; i++) {
    assertEquals(VKB_GLADIATOR_NXT_RIGHT.controls[i].id,      VKB_GLADIATOR_NXT_LEFT.controls[i].id);
    assertEquals(VKB_GLADIATOR_NXT_RIGHT.controls[i].scInput, VKB_GLADIATOR_NXT_LEFT.controls[i].scInput);
  }
});

Deno.test("all control ids are unique within each device", () => {
  for (const device of ALL_DEVICES) {
    const ids = device.controls.map(c => c.id);
    const unique = new Set(ids);
    assertEquals(unique.size, ids.length, `Duplicate ids in ${device.id}`);
  }
});

Deno.test("all controls have valid types", () => {
  const validTypes = new Set(["button", "hat_direction", "axis"]);
  for (const device of ALL_DEVICES) {
    for (const ctrl of device.controls) {
      assertEquals(validTypes.has(ctrl.type), true, `Invalid type '${ctrl.type}' on ${ctrl.id}`);
    }
  }
});

Deno.test("svgViewBox has 4 numeric components", () => {
  for (const device of ALL_DEVICES) {
    const parts = device.svgViewBox.split(" ").map(Number);
    assertEquals(parts.length, 4);
    for (const n of parts) assertEquals(isNaN(n), false);
  }
});

Deno.test("devices have at least one SVG outline path", () => {
  for (const device of ALL_DEVICES) {
    assertEquals(device.svgOutlinePaths.length > 0, true);
  }
});
