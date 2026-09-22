import { describe, expect, it } from "vitest";
import {
  DEMO_STATE,
  CENSUS_STATE_NAME,
  NFHS_STATE_NAME,
  PMGSY_STATE_FILE,
  KARNATAKA_DISTRICTS,
  normalizeDistrictName,
  getCanonicalDisplayName,
  normalizePmgsyDistrictName
} from "@/scripts/ingest/config";

/**
 * Regression tests (C9) for the Bihar -> Karnataka demo-scope rescope
 * (.squad/task/rescope-demo-state-bihar-to-karnataka.md). These assert the
 * config is actually Karnataka-scoped, not just manually eyeballed - if
 * the rescope were silently reverted (or partially reverted) to Bihar,
 * these should fail.
 */
describe("demo scope constants", () => {
  it("are scoped to Karnataka, not Bihar", () => {
    expect(DEMO_STATE).toBe("Karnataka");
    expect(CENSUS_STATE_NAME).toBe("KARNATAKA");
    expect(NFHS_STATE_NAME).toBe("Karnataka");
    expect(PMGSY_STATE_FILE).toBe("Karnataka");
  });
});

describe("KARNATAKA_DISTRICTS", () => {
  it("has exactly 30 districts (2011-Census vintage), not Bihar's 38", () => {
    expect(KARNATAKA_DISTRICTS).toHaveLength(30);
  });

  it("does not contain any Bihar district names", () => {
    const biharDistricts = ["Patna", "Gaya", "Muzaffarpur", "Purba Champaran", "Jehanabad"];
    for (const name of biharDistricts) {
      expect(KARNATAKA_DISTRICTS).not.toContain(name);
    }
  });

  it("contains the expected Karnataka districts", () => {
    expect(KARNATAKA_DISTRICTS).toEqual(
      expect.arrayContaining([
        "Bagalkot",
        "Bangalore",
        "Bangalore Rural",
        "Belgaum",
        "Bellary",
        "Bidar",
        "Bijapur",
        "Chamarajanagar",
        "Chikkaballapura",
        "Chikmagalur",
        "Chitradurga",
        "Dakshina Kannada",
        "Davanagere",
        "Dharwad",
        "Gadag",
        "Gulbarga",
        "Hassan",
        "Haveri",
        "Kodagu",
        "Kolar",
        "Koppal",
        "Mandya",
        "Mysore",
        "Raichur",
        "Ramanagara",
        "Shimoga",
        "Tumkur",
        "Udupi",
        "Uttara Kannada",
        "Yadgir"
      ])
    );
  });
});

describe("getCanonicalDisplayName", () => {
  it("returns the Census/NFHS spelling unchanged for districts with no alias", () => {
    expect(getCanonicalDisplayName("Mysore")).toBe("Mysore");
    expect(getCanonicalDisplayName("Bidar")).toBe("Bidar");
  });

  it("reconciles the real PMGSY MasterData.xls spelling variants (found via the C1 spike)", () => {
    expect(getCanonicalDisplayName("Bangalore R")).toBe("Bangalore Rural");
    expect(getCanonicalDisplayName("Bangalore U")).toBe("Bangalore");
    expect(getCanonicalDisplayName("Chickballapur")).toBe("Chikkaballapura");
    expect(getCanonicalDisplayName("Chickmagalur")).toBe("Chikmagalur");
    expect(getCanonicalDisplayName("Ramnagar")).toBe("Ramanagara");
  });

  it("reconciles the real boundary-topojson Kannada-transliteration renames (found via the C1 spike)", () => {
    expect(getCanonicalDisplayName("Bagalkote")).toBe("Bagalkot");
    expect(getCanonicalDisplayName("Ballari")).toBe("Bellary");
    expect(getCanonicalDisplayName("Belagavi")).toBe("Belgaum");
    expect(getCanonicalDisplayName("Bengaluru")).toBe("Bangalore");
    expect(getCanonicalDisplayName("Bengaluru Rural")).toBe("Bangalore Rural");
    expect(getCanonicalDisplayName("Chamarajanagara")).toBe("Chamarajanagar");
    expect(getCanonicalDisplayName("Chikkamagaluru")).toBe("Chikmagalur");
    expect(getCanonicalDisplayName("Kalaburagi")).toBe("Gulbarga");
    expect(getCanonicalDisplayName("Mysuru")).toBe("Mysore");
    expect(getCanonicalDisplayName("Shivamogga")).toBe("Shimoga");
    expect(getCanonicalDisplayName("Tumakuru")).toBe("Tumkur");
    expect(getCanonicalDisplayName("Vijayapura")).toBe("Bijapur");
  });

  it("no longer resolves Bihar-era aliases (East/West Champaran, Jahanabad, Chapra, Kaimur)", () => {
    // These should fall through to the generic title-case fallback (not a
    // real Karnataka district), proving the Bihar alias table was actually
    // replaced rather than merely supplemented.
    expect(getCanonicalDisplayName("East Champaran")).not.toBe("Purba Champaran");
    expect(getCanonicalDisplayName("Jahanabad")).not.toBe("Jehanabad");
  });
});

describe("normalizePmgsyDistrictName", () => {
  it("normalizes and aliases raw PMGSY district names to the canonical join key", () => {
    expect(normalizePmgsyDistrictName("Bangalore R")).toBe("BANGALORE RURAL");
    expect(normalizePmgsyDistrictName("Ramnagar")).toBe("RAMANAGARA");
  });
});

describe("normalizeDistrictName", () => {
  it("strips parentheticals, punctuation, and collapses whitespace", () => {
    expect(normalizeDistrictName("Dakshina Kannada")).toBe("DAKSHINA KANNADA");
    expect(normalizeDistrictName("  Mysore  ")).toBe("MYSORE");
  });
});
