import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { asLocale, languageCacheSuffix, languageNote } from "../language";
import { narrativeInstructions } from "../prompts/narrative";
import { VISION_SYSTEM_PROMPT, visionInstructions } from "../prompts/vision";

describe("AI language", () => {
  it("adds nothing for English, so English prompts and cache keys are exactly what they were", () => {
    expect(languageNote("en")).toBe("");
    expect(languageNote(undefined)).toBe("");
    expect(languageNote(null)).toBe("");
    expect(languageCacheSuffix("en")).toBe("");
    expect(languageCacheSuffix(undefined)).toBe("");
    expect(visionInstructions("en")).toBe(VISION_SYSTEM_PROMPT);
    expect(visionInstructions()).toBe(VISION_SYSTEM_PROMPT);
  });

  it("asks for Lithuanian prose but keeps part names, enums, VINs and dollar figures as they are", () => {
    const note = languageNote("lt");
    expect(note).toContain("Lithuanian");
    expect(note).toMatch(/free-text/i);
    expect(note).toMatch(/part names/i);
    expect(note).toMatch(/enum/i);
    expect(note).toContain("$3,100");
  });

  it("puts the language paragraph after the vision rules, and keeps every rule", () => {
    const lt = visionInstructions("lt");
    expect(lt.startsWith(VISION_SYSTEM_PROMPT)).toBe(true);
    expect(lt.endsWith(languageNote("lt"))).toBe(true);
  });

  it("tells the narrative writer the language, and says English only for English", () => {
    expect(narrativeInstructions("lt")).toContain("Lithuanian");
    expect(narrativeInstructions("lt")).not.toMatch(/Write in English/);
    expect(narrativeInstructions("en")).toMatch(/Write in English/);
    expect(narrativeInstructions()).toMatch(/Write in English/);
  });

  it("caches a Lithuanian result apart from the English one", () => {
    expect(languageCacheSuffix("lt")).toBe(":lt");
    expect(languageCacheSuffix("lt")).not.toBe(languageCacheSuffix("en"));
  });

  it("falls back to English for any stored value it does not know", () => {
    expect(asLocale("lt")).toBe("lt");
    expect(asLocale("en")).toBe("en");
    expect(asLocale("de")).toBe("en");
    expect(asLocale(null)).toBe("en");
    expect(asLocale(undefined)).toBe("en");
  });
});
