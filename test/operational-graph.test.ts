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

test("Operational Graph: Green Line split prevents through-routing across Bowbazar gap", () => {
  // Model Green Line West + East with Bowbazar unlinked
  const stations: MetroStation[] = [
    { id: "howrah", name: "Howrah", lineIds: ["green"], coordinates: { latitude: 22.58, longitude: 88.34 }, isInterchange: false, confidence: "development" },
    { id: "esplanade_green", name: "Esplanade Green", lineIds: ["green"], coordinates: { latitude: 22.56, longitude: 88.35 }, isInterchange: false, confidence: "development" },
    { id: "sealdah", name: "Sealdah", lineIds: ["green"], coordinates: { latitude: 22.56, longitude: 88.37 }, isInterchange: false, confidence: "development" },
    { id: "sector_v", name: "Sector V", lineIds: ["green"], coordinates: { latitude: 22.57, longitude: 88.43 }, isInterchange: false, confidence: "development" },
  ];

  const connections: StationConnection[] = [
    {
      id: "conn_howrah_esp",
      fromStationId: "howrah",
      toStationId: "esplanade_green",
      lineId: "green",
      distanceMeters: 2500,
      estimatedTravelSeconds: 240,
      verified: true,
      confidence: "verified",
      routingStatus: "operational",
    },
    {
      id: "conn_bowbazar_gap",
      fromStationId: "esplanade_green",
      toStationId: "sealdah",
      lineId: "green",
      distanceMeters: 2000,
      estimatedTravelSeconds: 240,
      verified: false,
      confidence: "development",
      routingStatus: "planned", // Bowbazar is planned/unlinked
    },
    {
      id: "conn_sealdah_secv",
      fromStationId: "sealdah",
      toStationId: "sector_v",
      lineId: "green",
      distanceMeters: 7000,
      estimatedTravelSeconds: 840,
      verified: true,
      confidence: "verified",
      routingStatus: "operational",
    },
  ];

  const graph = buildMetroGraph(stations, connections);

  // Howrah to Esplanade is operational
  const westPath = findShortestPath(graph, "howrah", "esplanade_green");
  assert.ok(westPath !== null);

  // Sealdah to Sector V is operational
  const eastPath = findShortestPath(graph, "sealdah", "sector_v");
  assert.ok(eastPath !== null);

  // Through-path across Bowbazar gap must be null
  const throughPath = findShortestPath(graph, "howrah", "sector_v");
  assert.equal(throughPath, null, "Through-running from Howrah to Sector V must be blocked by planned Bowbazar connection");
});

