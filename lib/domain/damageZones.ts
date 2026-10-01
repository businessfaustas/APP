import type { DamageZone } from "./schemas";

export const ZONE_LABELS: Record<DamageZone, string> = {
  front: "Front",
  front_left: "Front left",
  front_right: "Front right",
  left_side: "Left side",
  right_side: "Right side",
  rear: "Rear",
  rear_left: "Rear left",
  rear_right: "Rear right",
  roof: "Roof",
  undercarriage: "Undercarriage",
  interior: "Interior",
  engine_bay: "Engine bay",
};

export interface DamageHint {
  zones: DamageZone[];
  flags: ("FLOOD" | "FIRE" | "HAIL" | "MECHANICAL" | "ROLLOVER" | "VANDALISM" | "BIOHAZARD" | "STRIPPED" | "UNDERCARRIAGE")[];
}

/** Interprets auction damage descriptions (e.g. "FRONT END", "WATER/FLOOD"). */
export function interpretDamageText(raw: string | null | undefined): DamageHint {
  const hint: DamageHint = { zones: [], flags: [] };
  if (!raw) return hint;
  const s = raw.toUpperCase();
  const add = (z: DamageZone) => {
    if (!hint.zones.includes(z)) hint.zones.push(z);
  };
  if (/FRONT/.test(s)) add("front");
  if (/REAR/.test(s)) add("rear");
  if (/LEFT|DRIVER/.test(s)) add(/FRONT/.test(s) ? "front_left" : /REAR/.test(s) ? "rear_left" : "left_side");
  if (/RIGHT|PASSENGER/.test(s)) add(/FRONT/.test(s) ? "front_right" : /REAR/.test(s) ? "rear_right" : "right_side");
  if (/\bSIDE(S)?\b/.test(s) && !/LEFT|RIGHT/.test(s)) {
    add("left_side");
    add("right_side");
  }
  if (/TOP|ROOF/.test(s)) add("roof");
  if (/ROLL/.test(s)) {
    add("roof");
    hint.flags.push("ROLLOVER");
  }
  if (/UNDER/.test(s)) {
    add("undercarriage");
    hint.flags.push("UNDERCARRIAGE");
  }
  if (/WATER|FLOOD/.test(s)) {
    add("interior");
    hint.flags.push("FLOOD");
  }
  if (/BURN|FIRE/.test(s)) {
    add("engine_bay");
    hint.flags.push("FIRE");
  }
  if (/HAIL/.test(s)) {
    add("roof");
    hint.flags.push("HAIL");
  }
  if (/MECHANICAL|ENGINE|TRANSMISSION/.test(s)) {
    add("engine_bay");
    hint.flags.push("MECHANICAL");
  }
  if (/VANDAL/.test(s)) hint.flags.push("VANDALISM");
  if (/BIOHAZARD|CHEMICAL/.test(s)) hint.flags.push("BIOHAZARD");
  if (/STRIP/.test(s)) hint.flags.push("STRIPPED");
  if (/ALL\s*OVER/.test(s)) ["front", "rear", "left_side", "right_side", "roof"].forEach((z) => add(z as DamageZone));
  return hint;
}
