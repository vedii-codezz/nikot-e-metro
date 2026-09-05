import test from "node:test";
import assert from "node:assert/strict";
import { routingService } from "../src/server/services/routingService";

test("RoutingService plans operational multi-line route with interchange (Howrah to Victoria Memorial via Esplanade)", async () => {
  const route = await routingService.planRoute({
    origin: {
      name: "Howrah Railway Station",
      coordinates: { latitude: 22.5857, longitude: 88.3433 },
    },
    destination: {
      name: "Victoria Memorial",
      coordinates: { latitude: 22.5448, longitude: 88.3426 },
    },
    mode: "recommended",
  });

  assert.ok(route !== null, "Route should exist for operational Howrah -> Esplanade -> Blue -> Victoria Memorial");
  assert.equal(route.originStation.id, "howrah");
  assert.ok(
    route.destinationStation.id === "maidan" || route.destinationStation.id === "rabindra_sadan",
    `Expected Maidan or Rabindra Sadan, got ${route.destinationStation.id}`
  );
  assert.equal(route.interchangeCount, 1);
  assert.ok(route.linesUsed.includes("green"));
  assert.ok(route.linesUsed.includes("blue"));
  assert.ok(route.totalTravelMinutes > 0);
  assert.ok(route.segments.length >= 3);
});

test("RoutingService plans continuous through-route on fully operational Green Line (Howrah to Sector V)", async () => {
  const route = await routingService.planRoute({
    origin: { stationId: "howrah" },
    destination: { stationId: "salt_lake_sector_v" },
    mode: "recommended",
  });

  assert.ok(route !== null, "Through route must exist on operational Green Line corridor");
  assert.equal(route.interchangeCount, 0, "Through Green Line route must have 0 metro-line interchanges");
  assert.equal(route.isDirect, true);
  assert.deepEqual(route.linesUsed, ["green"]);
  assert.ok(route.totalStops >= 10);
});

test("RoutingService plans multimodal journey from Techno India University to Victoria Memorial via operational Green -> Blue link", async () => {
  const route = await routingService.planRoute({
    origin: {
      name: "Techno India University",
      coordinates: { latitude: 22.5768, longitude: 88.4312 }, // Near Salt Lake Sector V
    },
    destination: {
      name: "Victoria Memorial",
      coordinates: { latitude: 22.5448, longitude: 88.3426 }, // Near Maidan
    },
    mode: "recommended",
  });

  assert.ok(route !== null, "Continuous operational path exists via Green Line through Esplanade to Blue Line");
  assert.ok(
    route.originStation.id === "salt_lake_sector_v" || route.originStation.id === "karunamoyee",
    `Expected origin station Sector V or Karunamoyee, got ${route.originStation.id}`
  );
  assert.ok(
    route.destinationStation.id === "maidan" || route.destinationStation.id === "rabindra_sadan",
    `Expected destination station Maidan or Rabindra Sadan, got ${route.destinationStation.id}`
  );
  assert.equal(route.interchangeCount, 1, "Expected single interchange at Esplanade");
  assert.ok(route.linesUsed.includes("green"));
  assert.ok(route.linesUsed.includes("blue"));
});

test("RoutingService handles direct single-line route without interchanges", async () => {
  const route = await routingService.planRoute({
    origin: { stationId: "dakshineswar" },
    destination: { stationId: "kalighat" },
    mode: "recommended",
  });

  assert.ok(route !== null);
  assert.equal(route.interchangeCount, 0);
  assert.equal(route.isDirect, true);
  assert.deepEqual(route.linesUsed, ["blue"]);
});
