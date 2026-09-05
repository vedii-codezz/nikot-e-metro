import test from "node:test";
import assert from "node:assert/strict";
import { routingService } from "../src/server/services/routingService";
import { getServerMetroGraph } from "../src/server/routing/graph";
import { findShortestPath } from "../src/lib/routing/dijkstra";

test("Yellow Line: Continuous operational transit from Noapara to Jai Hind (Airport)", async () => {
  const { graph } = await getServerMetroGraph();

  const path = findShortestPath(graph, "noapara", "jai_hind");
  assert.ok(path !== null, "Direct operational path should exist between Noapara and Jai Hind");
  assert.equal(path.interchangeCount, 0, "Direct Yellow line ride has 0 interchanges");
  assert.deepEqual(path.linesUsed, ["yellow"]);
  assert.equal(path.totalStops, 3); // Noapara -> Dum Dum Cantt -> Jessore Rd -> Jai Hind
  assert.ok(path.stationIds.includes("dum_dum_cantonment"));
  assert.ok(path.stationIds.includes("jessore_road"));
});

test("Yellow Line: Operational transfer to Blue Line via Noapara interchange (Jai Hind to Park Street)", async () => {
  const route = await routingService.planRoute({
    origin: { stationId: "jai_hind" },
    destination: { stationId: "park_street" },
    mode: "recommended",
  });

  assert.ok(route !== null, "Journey should exist from Jai Hind to Park Street");
  assert.equal(route.originStation.id, "jai_hind");
  assert.equal(route.destinationStation.id, "park_street");
  assert.equal(route.interchangeCount, 1, "Expected single interchange at Noapara");
  assert.ok(route.linesUsed.includes("yellow"));
  assert.ok(route.linesUsed.includes("blue"));
});

test("Yellow Line Extension Safety: Unfinished stations towards Barasat are excluded from operational routing", async () => {
  const { graph } = await getServerMetroGraph();

  // 'barasat' is planned/under_construction and must NOT have operational edges
  const path = findShortestPath(graph, "jai_hind", "barasat");
  assert.equal(path, null, "Under-construction Barasat extension must not be routable in passenger graph");
});
