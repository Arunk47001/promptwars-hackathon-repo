import { describe, expect, it, beforeAll } from "vitest";
import {
  hashPhoneNumber,
  scrubPii,
  generalizeLocation,
  anonymizeSubmission
} from "@/lib/anonymize";

beforeAll(() => {
  process.env.PHONE_HASH_SALT = "test-salt-value";
});

describe("hashPhoneNumber", () => {
  it("produces a deterministic salted hash, not the plaintext number", () => {
    const hash = hashPhoneNumber("+919812345678");
    expect(hash).not.toContain("9812345678");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashPhoneNumber("+919812345678")).toBe(hash);
  });

  it("produces different hashes for different numbers", () => {
    expect(hashPhoneNumber("+919812345678")).not.toBe(hashPhoneNumber("+919812345679"));
  });

  it("produces different hashes under a different salt", () => {
    const a = hashPhoneNumber("+919812345678", "salt-a");
    const b = hashPhoneNumber("+919812345678", "salt-b");
    expect(a).not.toBe(b);
  });

  it("throws if no salt is configured", () => {
    const original = process.env.PHONE_HASH_SALT;
    delete process.env.PHONE_HASH_SALT;
    expect(() => hashPhoneNumber("+919812345678")).toThrow();
    process.env.PHONE_HASH_SALT = original;
  });
});

describe("scrubPii", () => {
  it("redacts a volunteered name after a 'my name is' cue", () => {
    const { scrubbed, redactedCount } = scrubPii(
      "My name is Ramesh Kumar and there is no water in my village."
    );
    expect(scrubbed).not.toContain("Ramesh");
    expect(scrubbed).not.toContain("Kumar");
    expect(redactedCount).toBeGreaterThan(0);
  });

  it("redacts an Indian mobile number volunteered in free text", () => {
    const { scrubbed, redactedCount } = scrubPii(
      "Please call me back on 9812345678 about the broken pump."
    );
    expect(scrubbed).not.toContain("9812345678");
    expect(redactedCount).toBeGreaterThan(0);
  });

  it("leaves ordinary complaint text with no PII untouched", () => {
    const { scrubbed, redactedCount } = scrubPii(
      "The road near the market has been flooded for three weeks."
    );
    expect(scrubbed).toBe(
      "The road near the market has been flooded for three weeks."
    );
    expect(redactedCount).toBe(0);
  });
});

describe("generalizeLocation", () => {
  it("generalizes to district/block/village and drops nothing finer", () => {
    const result = generalizeLocation({
      state: "Karnataka",
      district: "Mysore",
      block: "Nanjangud",
      village: "Hullahalli",
      preciseLat: 12.2958,
      preciseLng: 76.6394
    });
    expect(result).toEqual({
      state: "Karnataka",
      district: "Mysore",
      block: "Nanjangud",
      village: "Hullahalli"
    });
    // Precise coordinates must never appear on the generalized object.
    expect(Object.keys(result)).not.toContain("preciseLat");
    expect(Object.keys(result)).not.toContain("preciseLng");
  });

  it("throws on a missing district (required generalization floor)", () => {
    expect(() => generalizeLocation({ district: "" })).toThrow();
  });
});

describe("anonymizeSubmission (edge case: name + precise GPS in one submission)", () => {
  it("strips the name and only exposes generalized location, while hashing the phone", () => {
    const result = anonymizeSubmission({
      phoneNumber: "+919812345678",
      rawText:
        "This is Sunita Devi calling. The road to our house floods every monsoon.",
      location: {
        district: "Gaya",
        preciseLat: 24.7955,
        preciseLng: 84.9994
      }
    });

    expect(result.cleanText).not.toContain("Sunita");
    expect(result.cleanText).not.toContain("Devi");
    expect(result.location.district).toBe("Gaya");
    expect(result.phoneHash).not.toContain("9812345678");
  });
});
