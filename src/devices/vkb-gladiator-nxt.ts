import type { ControlDef, DeviceDefinition } from "../types.ts";

// ── VKB Gladiator NXT button/axis layout ────────────────────────────────────
//
// Physical controls and their default SC input names.
// Hat pushes (H1, H2) are reported as buttons in DirectInput.
//
// Right-hand button numbering (default VKB firmware):
//   button1  = Trigger stage 1 (B1)
//   button2  = Trigger stage 2 (B2)
//   button3  = Thumb (A1)
//   button4  = C1
//   button5  = D1 (Pinky)
//   button6  = H1 push
//   button7  = H2 push
//   hat1     = H1 top 4-way hat (up/down/left/right)
//   hat2     = H2 coolie 8-way hat (up/down/left/right + diagonals)
//   x, y     = Primary axes
//   rz       = Twist (yaw)
//   slider1  = Throttle (Omni Throttle only)
// ─────────────────────────────────────────────────────────────────────────────

// SVG viewBox: "0 0 220 460" — front-view schematic of right-hand NXT
// All x/y values are within this coordinate space.

const RIGHT_CONTROLS: ControlDef[] = [
  // ── Axes ──────────────────────────────────────────────────────────────────
  { id: "axis_x",      name: "X Axis (Pitch)",  scInput: "x",       type: "axis",         svgX: 30,  svgY: 400, group: "Axes" },
  { id: "axis_y",      name: "Y Axis (Roll)",   scInput: "y",       type: "axis",         svgX: 30,  svgY: 415, group: "Axes" },
  { id: "axis_rz",     name: "Twist (Yaw)",     scInput: "rz",      type: "axis",         svgX: 30,  svgY: 430, group: "Axes" },
  { id: "axis_slider", name: "Throttle",        scInput: "slider1", type: "axis",         svgX: 30,  svgY: 445, group: "Axes (Omni Throttle)" },

  // ── H1 top 4-way hat ──────────────────────────────────────────────────────
  { id: "h1_up",    name: "H1 Up",    scInput: "hat1_up",    type: "hat_direction", svgX: 110, svgY: 60,  group: "H1 Top Hat" },
  { id: "h1_down",  name: "H1 Down",  scInput: "hat1_down",  type: "hat_direction", svgX: 110, svgY: 100, group: "H1 Top Hat" },
  { id: "h1_left",  name: "H1 Left",  scInput: "hat1_left",  type: "hat_direction", svgX: 90,  svgY: 80,  group: "H1 Top Hat" },
  { id: "h1_right", name: "H1 Right", scInput: "hat1_right", type: "hat_direction", svgX: 130, svgY: 80,  group: "H1 Top Hat" },
  { id: "h1_push",  name: "H1 Push",  scInput: "button6",    type: "button",        svgX: 110, svgY: 80,  group: "H1 Top Hat" },

  // ── Main trigger ──────────────────────────────────────────────────────────
  { id: "trigger1", name: "Trigger (Stage 1)", scInput: "button1", type: "button", svgX: 170, svgY: 195, group: "Trigger" },
  { id: "trigger2", name: "Trigger (Stage 2)", scInput: "button2", type: "button", svgX: 170, svgY: 215, group: "Trigger" },

  // ── Thumb (A1) ────────────────────────────────────────────────────────────
  { id: "a1",       name: "Thumb (A1)",    scInput: "button3",  type: "button", svgX: 55,  svgY: 175, group: "Thumb" },

  // ── H2 coolie 8-way hat ───────────────────────────────────────────────────
  { id: "h2_up",        name: "H2 Up",        scInput: "hat2_up",        type: "hat_direction", svgX: 155, svgY: 265, group: "H2 Coolie Hat" },
  { id: "h2_down",      name: "H2 Down",      scInput: "hat2_down",      type: "hat_direction", svgX: 155, svgY: 305, group: "H2 Coolie Hat" },
  { id: "h2_left",      name: "H2 Left",      scInput: "hat2_left",      type: "hat_direction", svgX: 135, svgY: 285, group: "H2 Coolie Hat" },
  { id: "h2_right",     name: "H2 Right",     scInput: "hat2_right",     type: "hat_direction", svgX: 175, svgY: 285, group: "H2 Coolie Hat" },
  { id: "h2_upleft",    name: "H2 Up-Left",   scInput: "hat2_upleft",    type: "hat_direction", svgX: 135, svgY: 265, group: "H2 Coolie Hat" },
  { id: "h2_upright",   name: "H2 Up-Right",  scInput: "hat2_upright",   type: "hat_direction", svgX: 175, svgY: 265, group: "H2 Coolie Hat" },
  { id: "h2_downleft",  name: "H2 Down-Left", scInput: "hat2_downleft",  type: "hat_direction", svgX: 135, svgY: 305, group: "H2 Coolie Hat" },
  { id: "h2_downright", name: "H2 Down-Right",scInput: "hat2_downright", type: "hat_direction", svgX: 175, svgY: 305, group: "H2 Coolie Hat" },
  { id: "h2_push",      name: "H2 Push",      scInput: "button7",        type: "button",        svgX: 155, svgY: 285, group: "H2 Coolie Hat" },

  // ── Grip buttons ──────────────────────────────────────────────────────────
  { id: "c1",      name: "C1",              scInput: "button4", type: "button", svgX: 148, svgY: 235, group: "Grip" },
  { id: "d1",      name: "Pinky (D1)",      scInput: "button5", type: "button", svgX: 52,  svgY: 330, group: "Grip" },
];

// Left-hand: mirrors the right-hand layout horizontally within the same viewBox
function mirrorControls(controls: ControlDef[], viewBoxWidth: number): ControlDef[] {
  return controls.map((c) => ({ ...c, svgX: viewBoxWidth - c.svgX }));
}

const VIEWBOX_WIDTH = 220;
const VIEWBOX_HEIGHT = 460;

// SVG outline paths for the right-hand stick (front view schematic)
// Drawn as a simplified joystick silhouette
const RIGHT_OUTLINE_PATHS = [
  // Outer grip body
  "M 75,150 Q 60,130 65,100 Q 68,80 110,55 Q 152,80 155,100 Q 160,130 145,150 L 145,370 Q 145,390 130,400 L 90,400 Q 75,390 75,370 Z",
  // Trigger guard area (right side bump)
  "M 145,170 Q 175,175 178,200 Q 175,225 145,230",
  // Thumb rest (left side)
  "M 75,160 Q 45,165 42,185 Q 45,205 75,210",
];

const LEFT_OUTLINE_PATHS = RIGHT_OUTLINE_PATHS.map((path) => {
  // Mirror path around x = VIEWBOX_WIDTH/2 (x = 110)
  // Replace all x coordinates in the path - simplified: flip M/Q/L/Z x values
  return path.replace(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g, (_, x, y) => {
    return `${VIEWBOX_WIDTH - parseFloat(x)},${y}`;
  });
});

export const VKB_GLADIATOR_NXT_RIGHT: DeviceDefinition = {
  id: "vkb-gladiator-nxt-right",
  name: "VKB Gladiator NXT (Right)",
  hand: "right",
  controls: RIGHT_CONTROLS,
  hasOmniThrottleSupport: true,
  svgViewBox: `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`,
  svgOutlinePaths: RIGHT_OUTLINE_PATHS,
};

export const VKB_GLADIATOR_NXT_LEFT: DeviceDefinition = {
  id: "vkb-gladiator-nxt-left",
  name: "VKB Gladiator NXT (Left)",
  hand: "left",
  controls: mirrorControls(RIGHT_CONTROLS, VIEWBOX_WIDTH),
  hasOmniThrottleSupport: true,
  svgViewBox: `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`,
  svgOutlinePaths: LEFT_OUTLINE_PATHS,
};

/** All registered device definitions */
export const ALL_DEVICES: DeviceDefinition[] = [
  VKB_GLADIATOR_NXT_RIGHT,
  VKB_GLADIATOR_NXT_LEFT,
];

export function getDevice(id: string): DeviceDefinition | undefined {
  return ALL_DEVICES.find((d) => d.id === id);
}
