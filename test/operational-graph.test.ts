import test from "node:test";
import assert from "node:assert/strict";
import { buildMetroGraph } from "../src/lib/routing/graph";
import { findShortestPath } from "../src/lib/routing/dijkstra";
import { StationConnection, MetroStation } from "../src/types/station";

test("Operational Graph: Filters out planned connections and keeps operational connections", () => {
  const stations: MetroStation[] = [
    { id: "A", name: "Station A", lineIds: ["blue"], coordinates: { latitude: 22.5, longitude: 88.3 }, isInterchange: false, confidence: "development" },
    { id: "B", name: "Station B", lineIds: ["blue"], coordinates: { latitude: 22.6, longitude: 88.3 }, isInterchange: false, confidence: "development" },
    { id: "C", name: "Station C", lineIds: ["blue"], coordinates: { latitude: 22.7, longitude: 88.3 }, isInterchange: false, confidence: "development" },
  ];

  const connections: StationConnection[] = [
    {
      id: "conn_AB",
      fromStationId: "A",
      toStationId: "B",
      lineId: "blue",
      distanceMeters: 2000,
      estimatedTravelSeconds: 180,
      verified: true,
      confidence: "verified",
      routingStatus: "operational",
    },
    {
      id: "conn_BC",
      fromStationId: "B",
      toStationId: "C",
      lineId: "blue",
      distanceMeters: 2000,
      estimatedTravelSeconds: 180,
      verified: true,
      confidence: "verified",
      routingStatus: "planned", // NOT operational
    },
  ];

  const graph = buildMetroGraph(stations, connections);

  // A -> B should be connected
  const neighborsA = graph.adjacencyList.get("A") || [];
  assert.equal(neighborsA.length, 1);
  assert.equal(neighborsA[0].toStationId, "B");

  // B should only connect to operational stations (not connect to C via operational graph)
  const neighborsB = graph.adjacencyList.get("B") || [];
  const toC = neighborsB.find((n) => n.toStationId === "C");
  assert.equal(toC, undefined, "Planned connection B->C must not be in operational graph");

  // Path A -> C should fail
  const pathAC = findShortestPath(graph, "A", "C");
  assert.equal(pathAC, null, "Planned connection should prevent route traversal from A to C");

  // Path A -> B should succeed
  const pathAB = findShortestPath(graph, "A", "B");
  assert.ok(pathAB !== null);
  assert.deepEqual(pathAB.stationIds, ["A", "B"]);
});

test("Operational Graph: Interchanges respect routingStatus", () => {
  const stations: MetroStation[] = [
    {
      id: "X1",
      name: "Transfer X (Line 1)",
      lineIds: ["blue"],
      coordinates: { latitude: 22.5, longitude: 88.3 },
      isInterchange: true,
      confidence: "development",
      interchangeConnections: [
        {
          targetStationId: "X2",
          targetLineId: "green",
          estimatedTransferMinutes: 5,
          confidence: "development",
          routingStatus: "unavailable", // Unavailable interchange
        },
      ],
    },
    {
      id: "X2",
      name: "Transfer X (Line 2)",
      lineIds: ["green"],
      coordinates: { latitude: 22.5, longitude: 88.3 },
      isInterchange: true,
      confidence: "development",
    },
  ];

  const graph = buildMetroGraph(stations, []);
  const neighborsX1 = graph.adjacencyList.get("X1") || [];
  const transferEdge = neighborsX1.find((e) => e.isInterchange);
  assert.equal(transferEdge, undefined, "Unavailable interchange must not create operational graph edge");
});

test("Operational Graph: Green Line remains continuous through Esplanade–Sealdah", async () => {
  const { getServerMetroGraph } = await import("../src/server/routing/graph");
  const { graph, stations } = await getServerMetroGraph();

  // 1. Esplanade Green -> Sealdah edge exists in operational graph
  const esplanadeEdges = graph.adjacencyList.get("esplanade_green") || [];
  const toSealdah = esplanadeEdges.find((e) => e.toStationId === "sealdah");
  assert.ok(toSealdah, "Esplanade Green -> Sealdah operational edge must exist");
  assert.equal(toSealdah.routingStatus, "operational");

  // 2. Sealdah -> Esplanade Green reverse edge exists in operational graph
  const sealdahEdges = graph.adjacencyList.get("sealdah") || [];
  const toEsplanade = sealdahEdges.find((e) => e.toStationId === "esplanade_green");
  assert.ok(toEsplanade, "Sealdah -> Esplanade Green operational edge must exist");
  assert.equal(toEsplanade.routingStatus, "operational");

  // 3. Both survive operational-graph filtering
  assert.ok(toSealdah.travelMinutes > 0);
  assert.ok(toEsplanade.travelMinutes > 0);

  // 4. Dijkstra can traverse through Esplanade-Sealdah seamlessly
  const path = findShortestPath(graph, "esplanade_green", "sealdah");
  assert.ok(path !== null, "Dijkstra must find path between Esplanade Green and Sealdah");
  assert.equal(path.interchangeCount, 0);
  assert.deepEqual(path.linesUsed, ["green"]);
  assert.deepEqual(path.stationIds, ["esplanade_green", "sealdah"]);

  // 5. Complete corridor: Howrah Maidan -> Salt Lake Sector V is a continuous through-path
  const fullCorridorPath = findShortestPath(graph, "howrah_maidan", "salt_lake_sector_v");
  assert.ok(fullCorridorPath !== null, "Continuous path must exist from Howrah Maidan to Sector V");
  assert.equal(fullCorridorPath.interchangeCount, 0, "Full Green line corridor must have 0 line interchanges");
  assert.deepEqual(fullCorridorPath.linesUsed, ["green"]);
  assert.equal(fullCorridorPath.totalStops, 11);
  assert.ok(fullCorridorPath.stationIds.includes("esplanade_green"));
  assert.ok(fullCorridorPath.stationIds.includes("sealdah"));
});


