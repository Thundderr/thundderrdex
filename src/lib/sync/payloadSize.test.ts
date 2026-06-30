import { describe, it, expect } from "vitest";
import {
  serializedByteLength,
  exceedsPayloadLimit,
  MAX_PAYLOAD_BYTES,
} from "./payloadSize";

describe("serializedByteLength", () => {
  it("measures the UTF-8 byte length of the JSON encoding", () => {
    expect(serializedByteLength({})).toBe(2); // "{}"
    expect(serializedByteLength({ a: 1 })).toBe(7); // '{"a":1}'
  });

  it("counts multi-byte characters by their UTF-8 size, not code units", () => {
    // JSON.stringify("€") -> '"€"' : quote + 3-byte euro sign + quote = 5 bytes.
    expect(serializedByteLength("€")).toBe(5);
  });
});

describe("exceedsPayloadLimit", () => {
  it("is false for a payload under the limit", () => {
    expect(exceedsPayloadLimit({ a: 1 }, 100)).toBe(false);
  });

  it("is true for a payload over the given limit", () => {
    expect(exceedsPayloadLimit({ a: "x".repeat(50) }, 10)).toBe(true);
  });

  it("treats the boundary as inclusive (equal is allowed)", () => {
    const value = {}; // 2 bytes
    expect(exceedsPayloadLimit(value, 2)).toBe(false);
    expect(exceedsPayloadLimit(value, 1)).toBe(true);
  });

  it("defaults to the ~1 MB ceiling", () => {
    expect(exceedsPayloadLimit({ a: 1 })).toBe(false);
    expect(MAX_PAYLOAD_BYTES).toBeGreaterThan(500_000);
  });
});
