/**
 * Browser dev mocks — stubs all ipc_* globals so the UI works in a browser.
 * Only loaded when running via `deno task browser` (detected by absence of
 * real webview IPC functions).
 */
'use strict';

// ── Device data (mirrors src/devices/vkb-gladiator-nxt.ts) ──────────────────
const VBW = 220, VBH = 460;
const RIGHT_OUTLINE_PATHS = [
  "M 75,150 Q 60,130 65,100 Q 68,80 110,55 Q 152,80 155,100 Q 160,130 145,150 L 145,370 Q 145,390 130,400 L 90,400 Q 75,390 75,370 Z",
  "M 145,170 Q 175,175 178,200 Q 175,225 145,230",
  "M 75,160 Q 45,165 42,185 Q 45,205 75,210",
];
const LEFT_OUTLINE_PATHS = RIGHT_OUTLINE_PATHS.map(p =>
  p.replace(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g, (_, x, y) => `${VBW - parseFloat(x)},${y}`)
);
const RIGHT_CONTROLS = [
  { id:"axis_x",      name:"X Axis (Pitch)",  scInput:"x",             type:"axis",         svgX:30,  svgY:400, group:"Axes" },
  { id:"axis_y",      name:"Y Axis (Roll)",   scInput:"y",             type:"axis",         svgX:30,  svgY:415, group:"Axes" },
  { id:"axis_rz",     name:"Twist (Yaw)",     scInput:"rz",            type:"axis",         svgX:30,  svgY:430, group:"Axes" },
  { id:"axis_slider", name:"Throttle",        scInput:"slider1",       type:"axis",         svgX:30,  svgY:445, group:"Axes (Omni Throttle)" },
  { id:"h1_up",       name:"H1 Up",           scInput:"hat1_up",       type:"hat_direction",svgX:110, svgY:60,  group:"H1 Top Hat" },
  { id:"h1_down",     name:"H1 Down",         scInput:"hat1_down",     type:"hat_direction",svgX:110, svgY:100, group:"H1 Top Hat" },
  { id:"h1_left",     name:"H1 Left",         scInput:"hat1_left",     type:"hat_direction",svgX:90,  svgY:80,  group:"H1 Top Hat" },
  { id:"h1_right",    name:"H1 Right",        scInput:"hat1_right",    type:"hat_direction",svgX:130, svgY:80,  group:"H1 Top Hat" },
  { id:"h1_push",     name:"H1 Push",         scInput:"button6",       type:"button",       svgX:110, svgY:80,  group:"H1 Top Hat" },
  { id:"trigger1",    name:"Trigger (Stage 1)",scInput:"button1",      type:"button",       svgX:170, svgY:195, group:"Trigger" },
  { id:"trigger2",    name:"Trigger (Stage 2)",scInput:"button2",      type:"button",       svgX:170, svgY:215, group:"Trigger" },
  { id:"a1",          name:"Thumb (A1)",      scInput:"button3",       type:"button",       svgX:55,  svgY:175, group:"Thumb" },
  { id:"h2_up",       name:"H2 Up",           scInput:"hat2_up",       type:"hat_direction",svgX:155, svgY:265, group:"H2 Coolie Hat" },
  { id:"h2_down",     name:"H2 Down",         scInput:"hat2_down",     type:"hat_direction",svgX:155, svgY:305, group:"H2 Coolie Hat" },
  { id:"h2_left",     name:"H2 Left",         scInput:"hat2_left",     type:"hat_direction",svgX:135, svgY:285, group:"H2 Coolie Hat" },
  { id:"h2_right",    name:"H2 Right",        scInput:"hat2_right",    type:"hat_direction",svgX:175, svgY:285, group:"H2 Coolie Hat" },
  { id:"h2_upleft",   name:"H2 Up-Left",      scInput:"hat2_upleft",   type:"hat_direction",svgX:135, svgY:265, group:"H2 Coolie Hat" },
  { id:"h2_upright",  name:"H2 Up-Right",     scInput:"hat2_upright",  type:"hat_direction",svgX:175, svgY:265, group:"H2 Coolie Hat" },
  { id:"h2_downleft", name:"H2 Down-Left",    scInput:"hat2_downleft", type:"hat_direction",svgX:135, svgY:305, group:"H2 Coolie Hat" },
  { id:"h2_downright",name:"H2 Down-Right",   scInput:"hat2_downright",type:"hat_direction",svgX:175, svgY:305, group:"H2 Coolie Hat" },
  { id:"h2_push",     name:"H2 Push",         scInput:"button7",       type:"button",       svgX:155, svgY:285, group:"H2 Coolie Hat" },
  { id:"c1",          name:"C1",              scInput:"button4",       type:"button",       svgX:148, svgY:235, group:"Grip" },
  { id:"d1",          name:"Pinky (D1)",      scInput:"button5",       type:"button",       svgX:52,  svgY:330, group:"Grip" },
];
const LEFT_CONTROLS = RIGHT_CONTROLS.map(c => ({...c, svgX: VBW - c.svgX}));

const MOCK_DEVICES = [
  { id:"vkb-gladiator-nxt-right", name:"VKB Gladiator NXT (Right)", hand:"right", controls:RIGHT_CONTROLS, hasOmniThrottleSupport:true, svgViewBox:`0 0 ${VBW} ${VBH}`, svgOutlinePaths:RIGHT_OUTLINE_PATHS },
  { id:"vkb-gladiator-nxt-left",  name:"VKB Gladiator NXT (Left)",  hand:"left",  controls:LEFT_CONTROLS,  hasOmniThrottleSupport:true, svgViewBox:`0 0 ${VBW} ${VBH}`, svgOutlinePaths:LEFT_OUTLINE_PATHS  },
];

const MOCK_ACTIONS = [
  { name:"v_pitch",              category:"Flight",   description:"Pitch axis",          inputType:"axis"   },
  { name:"v_roll",               category:"Flight",   description:"Roll axis",           inputType:"axis"   },
  { name:"v_yaw",                category:"Flight",   description:"Yaw axis",            inputType:"axis"   },
  { name:"v_throttle",           category:"Flight",   description:"Throttle axis",       inputType:"axis"   },
  { name:"v_afterburner",        category:"Flight",   description:"Afterburner / boost", inputType:"button" },
  { name:"v_brake",              category:"Flight",   description:"Space brake",         inputType:"button" },
  { name:"v_toggle_mining_mode", category:"Mining",   description:"Toggle mining mode",  inputType:"button" },
  { name:"v_toggle_missile_mode",category:"Combat",   description:"Toggle missile mode", inputType:"button" },
  { name:"v_attack1",            category:"Combat",   description:"Fire weapon group 1", inputType:"button" },
  { name:"v_attack2",            category:"Combat",   description:"Fire weapon group 2", inputType:"button" },
  { name:"v_shield_raise_front", category:"Shields",  description:"Raise front shield",  inputType:"button" },
  { name:"v_shield_raise_back",  category:"Shields",  description:"Raise back shield",   inputType:"button" },
  { name:"v_eject",              category:"Survival", description:"Eject",               inputType:"button" },
  { name:"v_toggle_quantum_mode",category:"Travel",   description:"Toggle quantum mode", inputType:"button" },
  { name:"v_toggle_scan_mode",   category:"Scanning", description:"Toggle scan mode",    inputType:"button" },
];

const MOCK_CONFIG = {
  mode: "dual",
  rightStick: { deviceId:"vkb-gladiator-nxt-right", jsInstance:1, omniThrottle:false },
  leftStick:  { deviceId:"vkb-gladiator-nxt-left",  jsInstance:2, omniThrottle:false },
};

const MOCK_CHANNELS = [
  { name:"LIVE",    mappingsPath:"C:\\SC\\LIVE\\USER\\Client\\0\\Controls\\Mappings" },
  { name:"PTU",     mappingsPath:"C:\\SC\\PTU\\USER\\Client\\0\\Controls\\Mappings"  },
];

const MOCK_FILE = {
  profileName: "mock_profile",
  filePath: "C:\\SC\\LIVE\\USER\\Client\\0\\Controls\\Mappings\\mock_profile.xml",
  bindings: [
    { action:"v_pitch",              actionMap:"spaceship_movement", input:"js1_x"       },
    { action:"v_yaw",                actionMap:"spaceship_movement", input:"js1_rz"      },
    { action:"v_afterburner",        category:"Flight",              input:"js1_button1" },
    { action:"v_brake",              actionMap:"spaceship_movement", input:"js1_button3" },
    { action:"v_toggle_missile_mode",actionMap:"seat_general",       input:"js1_button4" },
    { action:"v_attack1",            actionMap:"spaceship_weapons",  input:"js1_hat1_up" },
    { action:"v_shield_raise_front", actionMap:"spaceship_defensive",input:"js2_button1" },
    { action:"v_toggle_scan_mode",   actionMap:"seat_general",       input:"js2_hat1_up" },
  ],
};

// ── Mock IPC implementations ─────────────────────────────────────────────────
window.ipc_getDevices        = ()    => MOCK_DEVICES;
window.ipc_getDeviceControls = (id)  => {
  const d = MOCK_DEVICES.find(x => x.id === id);
  return d ? { controls: d.controls, svgViewBox: d.svgViewBox, svgOutlinePaths: d.svgOutlinePaths } : null;
};
window.ipc_getScActions          = ()    => MOCK_ACTIONS;
window.ipc_getConfig             = ()    => MOCK_CONFIG;
window.ipc_saveConfig            = ()    => true;
window.ipc_getDefaultScInstallDir= ()    => "C:\\SC";
window.ipc_scanScChannels        = ()    => ({ ok: true, channels: MOCK_CHANNELS });
window.ipc_listScProfiles        = ()    => [MOCK_FILE.filePath];
window.ipc_loadFile              = ()    => ({ success: true, file: MOCK_FILE });
window.ipc_saveFile              = ()    => ({ success: true });
window.ipc_saveFileAs            = ()    => ({ success: true });
window.ipc_debugLog              = (...a)=> console.log('[mock ipc]', ...a);

// Template SVG: fetch from dev server (served as static file)
window.ipc_getTemplateSvg = async (deviceId) => {
  const paths = {
    'vkb-gladiator-nxt-right': '/templates/VKB Sim/VKB-Sim Gladiator NXT R.svg',
    'vkb-gladiator-nxt-left':  '/templates/VKB Sim/VKB-Sim Gladiator NXT L.svg',
  };
  const p = paths[deviceId];
  if (!p) return '';
  try {
    const r = await fetch(p);
    return r.ok ? r.text() : '';
  } catch { return ''; }
};

// Dialog mocks — immediately resolve with empty string (cancelled)
// Override in browser console to simulate a real selection, e.g.:
//   window._mockDialogResult = 'C:\\SC\\LIVE\\...\\my_profile.xml'
window.ipc_browseForFolder = () => '_mock_';
window.ipc_browseForFile   = () => '_mock_';
window.ipc_browseForSave   = () => '_mock_';
window.ipc_pollDialogResult = (tmp) => {
  const result = window._mockDialogResult ?? '';
  window._mockDialogResult = undefined;
  return { ready: true, result };
};

console.info('[dev-mocks] Browser IPC stubs active. Set window._mockDialogResult to simulate dialogs.');
