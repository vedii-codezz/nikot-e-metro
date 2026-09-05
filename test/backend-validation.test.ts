import test from "node:test";
import assert from "node:assert/strict";
import { NearbyStationsQuerySchema } from "../src/server/validation/stationValidation";
import { SearchQuerySchema } from "../src/server/validation/searchValidation";
import { RouteRequestSchema } from "../src/server/validation/routeValidation";

test("NearbyStationsQuerySchema parses valid lat/lng/limit", () => {
  const valid = { lat: "22.5448", lng: "88.3426", limit: "3" };
  const result = NearbyStationsQuerySchema.safeParse(valid);
  assert.ok(result.success);
  if (result.success) {
    assert.equal(result.data.lat, 22.5448);
    assert.equal(result.data.lng, 88.3426);
    assert.equal(result.data.limit, 3);
  }
});

test("NearbyStationsQuerySchema rejects invalid coordinates", () => {
  const invalidLat = { lat: "192.5448", lng: "88.3426" };
  const res1 = NearbyStationsQuerySchema.safeParse(invalidLat);
  assert.equal(res1.success, false);

  const invalidLng = { lat: "22.5448", lng: "200.3426" };
  const res2 = NearbyStationsQuerySchema.safeParse(invalidLng);
  assert.equal(res2.success, false);
});

test("SearchQuerySchema validates query length", () => {
  const valid = { q: "Victoria", limit: "5" };
  const res1 = SearchQuerySchema.safeParse(valid);
  assert.ok(res1.success);

  const empty = { q: "   " };
  const res2 = SearchQuerySchema.safeParse(empty);
  assert.equal(res2.success, false);
});

test("RouteRequestSchema validates presence of coordinates or stationId", () => {
  const validCoords = {
    origin: { coordinates: { latitude: 22.5768, longitude: 88.4312 } },
    destination: { coordinates: { latitude: 22.5448, longitude: 88.3426 } },
    mode: "recommended",
  };
  const res1 = RouteRequestSchema.safeParse(validCoords);
  assert.ok(res1.success);

  const validStationId = {
    origin: { stationId: "salt_lake_sector_v" },
    destination: { stationId: "rabindra_sadan" },
  };
  const res2 = RouteRequestSchema.safeParse(validStationId);
  assert.ok(res2.success);

  const invalidMissingBoth = {
    origin: { name: "Nowhere" },
    destination: { stationId: "rabindra_sadan" },
  };
  const res3 = RouteRequestSchema.safeParse(invalidMissingBoth);
  assert.equal(res3.success, false);
});
