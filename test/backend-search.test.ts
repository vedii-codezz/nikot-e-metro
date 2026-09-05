import test from "node:test";
import assert from "node:assert/strict";
import { serverGeocodingService } from "../src/server/geocoding/geocodingService";

test("ServerGeocodingService finds station by English name and Bengali name", async () => {
  const res1 = await serverGeocodingService.search("Esplanade", 3);
  assert.ok(res1.length > 0);
  assert.ok(res1.some((r) => r.name.toLowerCase().includes("esplanade")));

  const res2 = await serverGeocodingService.search("দক্ষিণেশ্বর", 3);
  assert.ok(res2.length > 0);
  assert.ok(res2.some((r) => r.name.includes("Dakshineswar") || (r.bengaliName && r.bengaliName.includes("দক্ষিণেশ্বর"))));
});

test("ServerGeocodingService finds curated Kolkata landmarks", async () => {
  const res = await serverGeocodingService.search("Techno India", 5);
  assert.ok(res.length > 0);
  assert.ok(res.some((r) => r.name === "Techno India University" || r.name.includes("Sector V")));
});
