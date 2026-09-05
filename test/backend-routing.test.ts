import test from "node:test";
import assert from "node:assert/strict";
import { routingService } from "../src/server/services/routingService";

test("RoutingService plans operational multi-line route with interchange (Howrah Maidan to Victoria Memorial via Esplanade)", async () => {
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

  assert.ok(route !== null, "Route should exist for operational Howrah -> Esplanade (Green West) -> Blue -> Victoria Memorial");
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

test("RoutingService correctly returns null for unlinked Bowbazar passenger transit (Sector V to Victoria Memorial)", async () => {
  // Sector V is on Green Line East (Sealdah to Salt Lake Sector V)
  // Victoria Memorial connects to Blue Line (Maidan/Rabindra Sadan)
  // The connecting Bowbazar link (Esplanade Green <-> Sealdah) is non-operational ('planned').
  // Therefore, no continuous operational metro path exists.
  const route = await routingService.planRoute({
    origin: {
      name: "Techno India University",
      coordinates: { latitude: 22.5768, longitude: 88.4312 }, // Salt Lake Sector V
    },
    destination: {
      name: "Victoria Memorial",
      coordinates: { latitude: 22.5448, longitude: 88.3426 }, // Near Maidan
    },
    mode: "recommended",
  });

  assert.equal(route, null, "Should return null because Bowbazar section is planned/non-operational");
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
