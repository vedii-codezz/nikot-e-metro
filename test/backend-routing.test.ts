import test from "node:test";
import assert from "node:assert/strict";
import { routingService } from "../src/server/services/routingService";

test("RoutingService plans multi-line route with interchange via server graph", async () => {
  const route = await routingService.planRoute({
    origin: {
      name: "Techno India University",
      coordinates: { latitude: 22.5768, longitude: 88.4312 }, // Salt Lake Sector V
    },
    destination: {
      name: "Victoria Memorial",
      coordinates: { latitude: 22.5448, longitude: 88.3426 }, // Near Maidan / Rabindra Sadan
    },
    mode: "recommended",
  });

  assert.ok(route !== null);
  assert.equal(route.originStation.id, "salt_lake_sector_v");
  assert.ok(
    route.destinationStation.id === "maidan" || route.destinationStation.id === "rabindra_sadan",
    `Expected Maidan or Rabindra Sadan, got ${route.destinationStation.id}`
  );
  assert.equal(route.interchangeCount, 1);
  assert.ok(route.linesUsed.includes("green"));
  assert.ok(route.linesUsed.includes("blue"));
  assert.ok(route.totalTravelMinutes > 0);
  assert.ok(route.segments.length >= 4);
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
