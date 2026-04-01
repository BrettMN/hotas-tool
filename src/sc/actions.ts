import type { ScAction } from "../types.ts";

// Star Citizen action catalog — organized by category.
// inputType: "button" = digital, "axis" = analog, "both" = can be either.

export const SC_ACTIONS: ScAction[] = [
  // ── Flight: Movement ──────────────────────────────────────────────────────
  { name: "v_pitch",                       category: "Flight",    description: "Pitch axis (nose up/down)",              inputType: "axis"   },
  { name: "v_roll",                        category: "Flight",    description: "Roll axis (bank left/right)",            inputType: "axis"   },
  { name: "v_yaw",                         category: "Flight",    description: "Yaw axis (rotate left/right)",           inputType: "axis"   },
  { name: "v_throttle",                    category: "Flight",    description: "Throttle axis",                          inputType: "axis"   },
  { name: "v_throttle_up",                 category: "Flight",    description: "Increase throttle (increment)",          inputType: "button" },
  { name: "v_throttle_down",               category: "Flight",    description: "Decrease throttle (increment)",          inputType: "button" },
  { name: "v_afterburner",                 category: "Flight",    description: "Afterburner / boost",                    inputType: "button" },
  { name: "v_brake",                       category: "Flight",    description: "Space brake",                            inputType: "button" },
  { name: "v_pitch_up",                    category: "Flight",    description: "Pitch up (digital)",                     inputType: "button" },
  { name: "v_pitch_down",                  category: "Flight",    description: "Pitch down (digital)",                   inputType: "button" },
  { name: "v_roll_left",                   category: "Flight",    description: "Roll left (digital)",                    inputType: "button" },
  { name: "v_roll_right",                  category: "Flight",    description: "Roll right (digital)",                   inputType: "button" },
  { name: "v_yaw_left",                    category: "Flight",    description: "Yaw left (digital)",                     inputType: "button" },
  { name: "v_yaw_right",                   category: "Flight",    description: "Yaw right (digital)",                    inputType: "button" },

  // ── Flight: Strafing ──────────────────────────────────────────────────────
  { name: "v_strafe_left",                 category: "Strafe",    description: "Strafe left (axis or digital)",          inputType: "both"   },
  { name: "v_strafe_right",                category: "Strafe",    description: "Strafe right (axis or digital)",         inputType: "both"   },
  { name: "v_strafe_up",                   category: "Strafe",    description: "Strafe up (axis or digital)",            inputType: "both"   },
  { name: "v_strafe_down",                 category: "Strafe",    description: "Strafe down (axis or digital)",          inputType: "both"   },
  { name: "v_strafe_forward",              category: "Strafe",    description: "Strafe forward (axis or digital)",       inputType: "both"   },
  { name: "v_strafe_back",                 category: "Strafe",    description: "Strafe back (axis or digital)",          inputType: "both"   },
  { name: "v_lateral_strafe_axis",         category: "Strafe",    description: "Lateral strafe (full axis)",             inputType: "axis"   },
  { name: "v_vertical_strafe_axis",        category: "Strafe",    description: "Vertical strafe (full axis)",            inputType: "axis"   },
  { name: "v_longitudinal_strafe_axis",    category: "Strafe",    description: "Longitudinal strafe (full axis)",        inputType: "axis"   },

  // ── Flight: Systems ───────────────────────────────────────────────────────
  { name: "v_ifcs_toggle_esp",             category: "Systems",   description: "Toggle Enhanced Stick Precision (ESP)",  inputType: "button" },
  { name: "v_ifcs_toggle_gsafe",           category: "Systems",   description: "Toggle G-Safe",                          inputType: "button" },
  { name: "v_speed_limiter_toggle",        category: "Systems",   description: "Toggle speed limiter",                   inputType: "button" },
  { name: "v_speed_limiter_set_scm",       category: "Systems",   description: "Set speed limiter to SCM speed",         inputType: "button" },
  { name: "v_toggle_landing_system",       category: "Systems",   description: "Toggle landing gear",                    inputType: "button" },
  { name: "v_toggle_vtol",                 category: "Systems",   description: "Toggle VTOL mode",                       inputType: "button" },
  { name: "v_toggle_cruise_control",       category: "Systems",   description: "Toggle cruise control",                  inputType: "button" },
  { name: "v_decoupled_toggle",            category: "Systems",   description: "Toggle decoupled mode",                  inputType: "button" },

  // ── Weapons ───────────────────────────────────────────────────────────────
  { name: "v_weapon_group1_fire",          category: "Weapons",   description: "Fire weapon group 1",                    inputType: "button" },
  { name: "v_weapon_group2_fire",          category: "Weapons",   description: "Fire weapon group 2",                    inputType: "button" },
  { name: "v_weapon_group3_fire",          category: "Weapons",   description: "Fire weapon group 3",                    inputType: "button" },
  { name: "v_weapon_launch_missile",       category: "Weapons",   description: "Launch missile",                         inputType: "button" },
  { name: "v_weapon_missile_lock_toggle",  category: "Weapons",   description: "Toggle missile lock",                    inputType: "button" },
  { name: "v_weapon_cycle_missile_fwd",    category: "Weapons",   description: "Cycle missile type forward",             inputType: "button" },
  { name: "v_weapon_cycle_missile_bwd",    category: "Weapons",   description: "Cycle missile type backward",            inputType: "button" },
  { name: "v_weapon_toggle_group_1",       category: "Weapons",   description: "Toggle weapon group 1",                  inputType: "button" },
  { name: "v_weapon_toggle_group_2",       category: "Weapons",   description: "Toggle weapon group 2",                  inputType: "button" },
  { name: "v_weapon_toggle_group_3",       category: "Weapons",   description: "Toggle weapon group 3",                  inputType: "button" },
  { name: "v_weapon_reload",               category: "Weapons",   description: "Reload / rearm",                         inputType: "button" },

  // ── Targeting ─────────────────────────────────────────────────────────────
  { name: "v_target",                      category: "Targeting", description: "Cycle targets",                          inputType: "button" },
  { name: "v_target_cycle_fwd",            category: "Targeting", description: "Cycle targets forward",                  inputType: "button" },
  { name: "v_target_cycle_bwd",            category: "Targeting", description: "Cycle targets backward",                 inputType: "button" },
  { name: "v_target_nearest_hostile",      category: "Targeting", description: "Target nearest hostile",                 inputType: "button" },
  { name: "v_target_nearest_friendly",     category: "Targeting", description: "Target nearest friendly",                inputType: "button" },
  { name: "v_target_cycle_hostile_fwd",    category: "Targeting", description: "Cycle hostile targets forward",          inputType: "button" },
  { name: "v_target_cycle_hostile_bwd",    category: "Targeting", description: "Cycle hostile targets backward",         inputType: "button" },
  { name: "v_target_cycle_friendly_fwd",   category: "Targeting", description: "Cycle friendly targets forward",         inputType: "button" },
  { name: "v_target_cycle_friendly_bwd",   category: "Targeting", description: "Cycle friendly targets backward",        inputType: "button" },
  { name: "v_target_pin",                  category: "Targeting", description: "Pin / unpin target",                     inputType: "button" },
  { name: "v_target_pinned_toggle",        category: "Targeting", description: "Cycle pinned targets",                   inputType: "button" },
  { name: "v_attack_target",              category: "Targeting", description: "Attack target",                           inputType: "button" },

  // ── Shields ───────────────────────────────────────────────────────────────
  { name: "v_shield_raise_front",          category: "Shields",   description: "Raise front shield",                     inputType: "button" },
  { name: "v_shield_raise_back",           category: "Shields",   description: "Raise rear shield",                      inputType: "button" },
  { name: "v_shield_raise_left",           category: "Shields",   description: "Raise left shield",                      inputType: "button" },
  { name: "v_shield_raise_right",          category: "Shields",   description: "Raise right shield",                     inputType: "button" },
  { name: "v_shield_level",               category: "Shields",   description: "Equalize shield strength",                inputType: "button" },

  // ── Power / Components ────────────────────────────────────────────────────
  { name: "v_power_toggle_all",            category: "Power",     description: "Master power toggle",                    inputType: "button" },
  { name: "v_power_throttle_shields_up",   category: "Power",     description: "More power to shields",                  inputType: "button" },
  { name: "v_power_throttle_shields_down", category: "Power",     description: "Less power to shields",                  inputType: "button" },
  { name: "v_power_throttle_weapons_up",   category: "Power",     description: "More power to weapons",                  inputType: "button" },
  { name: "v_power_throttle_weapons_down", category: "Power",     description: "Less power to weapons",                  inputType: "button" },
  { name: "v_power_throttle_engines_up",   category: "Power",     description: "More power to engines",                  inputType: "button" },
  { name: "v_power_throttle_engines_down", category: "Power",     description: "Less power to engines",                  inputType: "button" },
  { name: "v_power_preset_1",             category: "Power",     description: "Apply power preset 1",                    inputType: "button" },
  { name: "v_power_preset_2",             category: "Power",     description: "Apply power preset 2",                    inputType: "button" },
  { name: "v_power_preset_3",             category: "Power",     description: "Apply power preset 3",                    inputType: "button" },

  // ── Quantum / Navigation ──────────────────────────────────────────────────
  { name: "v_toggle_quantum_drive",        category: "Navigation", description: "Toggle quantum drive spool",            inputType: "button" },
  { name: "v_quantum_travel_engage",       category: "Navigation", description: "Engage quantum travel",                 inputType: "button" },
  { name: "v_quantum_travel_abort",        category: "Navigation", description: "Abort quantum travel",                  inputType: "button" },

  // ── Countermeasures ───────────────────────────────────────────────────────
  { name: "v_flares",                      category: "Countermeasures", description: "Deploy flares",                    inputType: "button" },
  { name: "v_noise",                       category: "Countermeasures", description: "Deploy chaff/noise",               inputType: "button" },
  { name: "v_toggle_venting",              category: "Countermeasures", description: "Toggle EM venting",                inputType: "button" },

  // ── Camera / View ─────────────────────────────────────────────────────────
  { name: "v_view_cycle_fwd",              category: "View",      description: "Cycle view forward",                     inputType: "button" },
  { name: "v_view_cycle_bwd",              category: "View",      description: "Cycle view backward",                    inputType: "button" },
  { name: "v_cam_zoom_in",                 category: "View",      description: "Zoom in",                                inputType: "button" },
  { name: "v_cam_zoom_out",                category: "View",      description: "Zoom out",                               inputType: "button" },
  { name: "v_view_lock_look_behind_hold",  category: "View",      description: "Look behind (hold)",                     inputType: "button" },

  // ── Mining ────────────────────────────────────────────────────────────────
  { name: "v_mining_laser_toggle",         category: "Mining",    description: "Toggle mining laser",                    inputType: "button" },
  { name: "v_mining_laser_increase",       category: "Mining",    description: "Increase mining laser power",            inputType: "button" },
  { name: "v_mining_laser_decrease",       category: "Mining",    description: "Decrease mining laser power",            inputType: "button" },
  { name: "v_mining_arm_toggle",           category: "Mining",    description: "Toggle mining arm",                      inputType: "button" },

  // ── Salvage ───────────────────────────────────────────────────────────────
  { name: "v_salvage_toggle",              category: "Salvage",   description: "Toggle salvage beam",                    inputType: "button" },

  // ── Lights / Misc ─────────────────────────────────────────────────────────
  { name: "v_headlights_toggle",           category: "Misc",      description: "Toggle headlights",                      inputType: "button" },
  { name: "v_toggle_flight_ready",         category: "Misc",      description: "Toggle flight ready",                    inputType: "button" },
  { name: "v_request_landing",             category: "Misc",      description: "Request landing",                        inputType: "button" },
  { name: "v_toggle_cargo_doors",          category: "Misc",      description: "Toggle cargo doors",                     inputType: "button" },
  { name: "v_eject",                       category: "Misc",      description: "Eject",                                  inputType: "button" },
  { name: "v_seat_exit",                   category: "Misc",      description: "Exit seat",                              inputType: "button" },
];

export const SC_CATEGORIES = [...new Set(SC_ACTIONS.map((a) => a.category))];

export function getActionsByCategory(category: string): ScAction[] {
  return SC_ACTIONS.filter((a) => a.category === category);
}
