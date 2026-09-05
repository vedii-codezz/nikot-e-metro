import test from "node:test";
import assert from "node:assert/strict";
import { haversineDistanceKm } from "../src/lib/geo/haversine";

test("haversineDistanceKm returns 0 for identical coordinates", () => {
  const coord = { latitude: 22.5448, longitude: 88.3426 };
  const dist = haversineDistanceKm(coord, coord);
  assert.equal(dist, 0);
});

test("haversineDistanceKm calculates accurate distance between Victoria Memorial & Rabindra Sadan", () => {
  const victoria = { latitude: 22.5448, longitude: 88.3426 };
  const rabindraSadan = { latitude: 22.5376, longitude: 88.3477 };

  const dist = haversineDistanceKm(victoria, rabindraSadan);
  // Expected distance is ~0.95 - 1.0 km
  assert.ok(dist >= 0.9 && dist <= 1.1, `Expected ~0.95-1.05 km, got ${dist}`);
});

test("haversineDistanceKm calculates distance between Esplanade and Park Street", () => {
  const esplanade = { latitude: 22.5636, longitude: 88.3517 };
  const parkStreet = { latitude: 22.5532, longitude: 88.3514 };

  const dist = haversineDistanceKm(esplanade, parkStreet);
  // Expected distance is ~1.15 km
  assert.ok(dist >= 1.0 && dist <= 1.3, `Expected ~1.15 km, got ${dist}`);
});
