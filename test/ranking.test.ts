import test from "node:test";
import assert from "node:assert/strict";
import { rankNearbyStations } from "../src/lib/geo/haversine";
import { MetroStation } from "../src/types/station";

const mockStations: MetroStation[] = [
  {
    id: "st_rabindra_sadan",
    name: "Rabindra Sadan",
    coordinates: { latitude: 22.5376, longitude: 88.3477 },
    lineIds: ["blue"],
    isInterchange: false,
    confidence: "verified",
  },
  {
    id: "st_maidan",
    name: "Maidan",
    coordinates: { latitude: 22.5447, longitude: 88.3486 },
    lineIds: ["blue"],
    isInterchange: false,
    confidence: "verified",
  },
  {
    id: "st_belgachia",
    name: "Belgachia",
    coordinates: { latitude: 22.6074, longitude: 88.3846 },
    lineIds: ["blue"],
    isInterchange: false,
    confidence: "verified",
  },
];

test("rankNearbyStations deterministically ranks nearest stations for Victoria Memorial", () => {
  const victoriaCoords = { latitude: 22.5448, longitude: 88.3426 };
  const ranked = rankNearbyStations(victoriaCoords, mockStations, 3);

  assert.equal(ranked.length, 3);
  // Maidan and Rabindra Sadan are adjacent to Victoria Memorial (within ~0.9 - 1.1km)
  // Belgachia is far north (> 7km)
  assert.ok(ranked[0].distanceKm < 1.2);
  assert.ok(ranked[1].distanceKm < 1.2);
  assert.equal(ranked[2].station.id, "st_belgachia");
  assert.ok(ranked[2].distanceKm > 7.0);

  // Check ordering is strictly ascending
  assert.ok(ranked[0].distanceKm <= ranked[1].distanceKm);
  assert.ok(ranked[1].distanceKm <= ranked[2].distanceKm);
});
