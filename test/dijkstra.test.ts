import test from "node:test";
import assert from "node:assert/strict";
import { buildMetroGraph } from "../src/lib/routing/graph";
import { findShortestPath, planFullJourney } from "../src/lib/routing/dijkstra";
import { MetroStation } from "../src/types/station";

test("Dijkstra finds shortest path on synthetic branching graph (A-B-C, B-D-E)", () => {
  const syntheticStations: MetroStation[] = [
    {
      id: "node_a",
      name: "Node A",
      coordinates: { latitude: 22.50, longitude: 88.30 },
      lineIds: ["blue"],
      isInterchange: false,
      confidence: "development",
    },
    {
      id: "node_b",
      name: "Node B",
      coordinates: { latitude: 22.51, longitude: 88.30 },
      lineIds: ["blue", "green"],
      isInterchange: true,
      interchangeConnections: [
        {
          targetStationId: "node_d",
          targetLineId: "green",
          estimatedTransferMinutes: 2,
          confidence: "development",
        },
      ],
      confidence: "development",
    },
    {
      id: "node_c",
      name: "Node C",
      coordinates: { latitude: 22.52, longitude: 88.30 },
      lineIds: ["blue"],
      isInterchange: false,
      confidence: "development",
    },
    {
      id: "node_d",
      name: "Node D",
      coordinates: { latitude: 22.51, longitude: 88.31 },
      lineIds: ["green"],
      isInterchange: true,
      interchangeConnections: [
        {
          targetStationId: "node_b",
          targetLineId: "blue",
          estimatedTransferMinutes: 2,
          confidence: "development",
        },
      ],
      confidence: "development",
    },
    {
      id: "node_e",
      name: "Node E",
      coordinates: { latitude: 22.51, longitude: 88.32 },
      lineIds: ["green"],
      isInterchange: false,
      confidence: "development",
    },
  ];

  const graph = buildMetroGraph(syntheticStations);
  const result = findShortestPath(graph, "node_a", "node_e");

  assert.ok(result !== null);
  assert.deepEqual(result.stationIds, ["node_a", "node_b", "node_d", "node_e"]);
  assert.equal(result.interchangeCount, 1);
  assert.ok(result.totalTravelMinutes > 0);
});

test("planFullJourney plans journey with first-mile, metro line ride, interchange, and last-mile walk", () => {
  const stations: MetroStation[] = [
    {
      id: "st_sec5",
      name: "Salt Lake Sector V",
      coordinates: { latitude: 22.5802, longitude: 88.4358 },
      lineIds: ["green"],
      isInterchange: false,
      confidence: "verified",
    },
    {
      id: "st_esplanade_green",
      name: "Esplanade Green",
      coordinates: { latitude: 22.5636, longitude: 88.3517 },
      lineIds: ["green"],
      isInterchange: true,
      interchangeConnections: [
        {
          targetStationId: "st_esplanade_blue",
          targetLineId: "blue",
          estimatedTransferMinutes: 4,
          confidence: "verified",
        },
      ],
      confidence: "verified",
    },
    {
      id: "st_esplanade_blue",
      name: "Esplanade Blue",
      coordinates: { latitude: 22.5636, longitude: 88.3517 },
      lineIds: ["blue"],
      isInterchange: true,
      interchangeConnections: [
        {
          targetStationId: "st_esplanade_green",
          targetLineId: "green",
          estimatedTransferMinutes: 4,
          confidence: "verified",
        },
      ],
      confidence: "verified",
    },
    {
      id: "st_rabindra_sadan",
      name: "Rabindra Sadan",
      coordinates: { latitude: 22.5376, longitude: 88.3477 },
      lineIds: ["blue"],
      isInterchange: false,
      confidence: "verified",
    },
  ];

  const graph = buildMetroGraph(stations);

  // Origin: Techno India (near Sector V), Destination: Victoria Memorial (near Rabindra Sadan)
  const origin = {
    name: "Techno India University",
    coordinates: { latitude: 22.5768, longitude: 88.4312 },
  };
  const destination = {
    name: "Victoria Memorial",
    coordinates: { latitude: 22.5448, longitude: 88.3426 },
  };

  const journey = planFullJourney(graph, stations, origin, destination);

  assert.ok(journey !== null);
  assert.equal(journey.originStation.id, "st_sec5");
  assert.equal(journey.destinationStation.id, "st_rabindra_sadan");
  assert.equal(journey.interchangeCount, 1);
  assert.equal(journey.segments.length, 5); // 1. Walk to Sector V, 2. Green Ride to Esplanade, 3. Transfer, 4. Blue Ride to Rabindra Sadan, 5. Walk to Victoria
  assert.equal(journey.segments[0].type, "first_mile_walk");
  assert.equal(journey.segments[1].type, "metro_ride");
  assert.equal(journey.segments[2].type, "interchange");
  assert.equal(journey.segments[3].type, "metro_ride");
  assert.equal(journey.segments[4].type, "last_mile_walk");
});
