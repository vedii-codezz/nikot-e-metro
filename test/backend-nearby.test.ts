import test from "node:test";
import assert from "node:assert/strict";
import { stationRepository } from "../src/server/repositories/stationRepository";

test("StationRepository findNearby accurately returns ranked stations for Victoria Memorial coordinates", async () => {
  const victoriaCoords = { latitude: 22.5448, longitude: 88.3426 };
  const nearby = await stationRepository.findNearby(victoriaCoords, 3);

  assert.equal(nearby.length, 3);
  assert.ok(nearby[0].distanceKm < 1.2);
  assert.ok(nearby[0].station.name === "Rabindra Sadan" || nearby[0].station.name === "Maidan");
  assert.ok(nearby[0].distanceKm <= nearby[1].distanceKm);
  assert.ok(nearby[1].distanceKm <= nearby[2].distanceKm);
});
