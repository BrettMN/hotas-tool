/** A single button, hat direction, or axis on a physical device */
export interface ControlDef {
  /** Unique ID within the device (e.g. "trigger1", "hat1_up", "axis_x") */
  id: string;
  /** Human-readable label */
  name: string;
  /** SC input suffix — combined with "js{N}_" at runtime (e.g. "button1", "hat1_up", "x") */
  scInput: string;
  /** Control type */
  type: "button" | "hat_direction" | "axis";
  /** Position on the SVG diagram as percentage of viewBox (0–100) */
  svgX: number;
  svgY: number;
  /** Optional grouping label (e.g. "Trigger", "H1 Top Hat") */
  group?: string;
}

export interface DeviceDefinition {
  id: string;
  name: string;
  hand: "left" | "right";
  /** All controls: buttons, hat directions, and axes */
  controls: ControlDef[];
  /** Whether the Omni Throttle adapter can be attached */
  hasOmniThrottleSupport: boolean;
  /** SVG diagram definition */
  svgViewBox: string;
  /** Array of SVG path strings that draw the joystick outline */
  svgOutlinePaths: string[];
}

export interface StickConfig {
  deviceId: string;
  /** DirectInput/SC joystick instance number (1-based) */
  jsInstance: number;
  omniThrottle: boolean;
}

export interface DeviceConfig {
  mode: "single" | "dual";
  rightStick: StickConfig;
  leftStick?: StickConfig;
  /** Saved SC install directory (e.g. C:\Roberts Space Industries\StarCitizen) */
  scInstallDir?: string;
}

/** A Star Citizen install channel found under the install directory */
export interface ScChannel {
  name: string;
  mappingsPath: string;
}

export interface ScBinding {
  action: string;
  actionMap: string;
  /** Full SC input string, e.g. "js1_button3" */
  input: string;
}

export interface ScActionmapFile {
  profileName: string;
  filePath: string;
  bindings: ScBinding[];
}

export interface ScAction {
  name: string;
  category: string;
  description: string;
  inputType: "button" | "axis" | "both";
}

// IPC message types sent from backend to frontend via webview.eval()
export type IpcMessage =
  | { type: "fileLoaded"; file: ScActionmapFile }
  | { type: "fileSaved"; profileName: string }
  | { type: "error"; message: string };
