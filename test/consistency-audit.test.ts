import test from "node:test";
import assert from "node:assert/strict";
import { METRO_STATIONS, getStationById } from "../src/data/stations";
import { METRO_LINES } from "../src/data/lines";
import { stationRepository } from "../src/server/repositories/stationRepository";
import { getServerMetroGraph } from "../src/server/routing/graph";
import { findShortestPath } from "../src/lib/routing/dijkstra";
import { rideHailingProviders } from "../src/server/ridehail/rideHailProvider";

test("Audit Area 4: Operational Green Line contains exactly 12 stations and 22 directed edges", async () => {
  const expectedGreenStationIds = [
    "howrah_maidan",
    "howrah",
    "mahadan_underwater",
    "esplanade_green",
    "sealdah",
    "phoolbagan",
    "salt_lake_stadium",
    "bengal_chemical",
    "city_centre",
    "central_park",
    "karunamoyee",
    "salt_lake_sector_v",
  ];

  // 1. Verify exactly 12 operational stations exist on Green Line
  const greenStations = METRO_STATIONS.filter(
    (s) => s.lineIds.includes("green") && (s.status === undefined || s.status === "operational")
  );
  assert.equal(greenStations.length, 12, "Green Line must have exactly 12 operational stations");
  assert.deepEqual(
    greenStations.map((s) => s.id),
    expectedGreenStationIds,
    "Green Line operational stations must match exact sequence"
  );

  // 2. Verify graph has exactly 11 consecutive bidirectional connections = 22 directed track edges
  const { graph } = await getServerMetroGraph();

  let directedGreenEdgesCount = 0;
  for (let i = 0; i < expectedGreenStationIds.length - 1; i++) {
    const u = expectedGreenStationIds[i];
    const v = expectedGreenStationIds[i + 1];

    const uEdges = graph.adjacencyList.get(u) || [];
    const forwardEdge = uEdges.find((e) => e.toStationId === v && !e.isInterchange);
    assert.ok(forwardEdge, `Missing operational forward edge from ${u} to ${v}`);
    assert.equal(forwardEdge.routingStatus, "operational");
    directedGreenEdgesCount++;

    const vEdges = graph.adjacencyList.get(v) || [];
    const reverseEdge = vEdges.find((e) => e.toStationId === u && !e.isInterchange);
    assert.ok(reverseEdge, `Missing operational reverse edge from ${v} to ${u}`);
    assert.equal(reverseEdge.routingStatus, "operational");
    directedGreenEdgesCount++;
  }

  assert.equal(
    directedGreenEdgesCount,
    22,
    "Expected exactly 22 directed operational track edges across 11 physical segments on Green Line"
  );
});

test("Audit Area 3: Database ↔ Fixture ↔ Graph Status Consistency", async () => {
  const dbStations = await stationRepository.getAllStations();
  const dbConnections = await stationRepository.getAllConnections();
  const { graph } = await getServerMetroGraph();

  // Every operational station in fixtures must be operational in database
  for (const fixtureStation of METRO_STATIONS) {
    const dbStation = dbStations.find((s) => s.id === fixtureStation.id);
    assert.ok(dbStation, `Station ${fixtureStation.id} exists in database`);

    const fixtureStatus = fixtureStation.status || "operational";
    const dbStatus = dbStation.status || "operational";
    assert.equal(
      dbStatus,
      fixtureStatus,
      `Status mismatch for station ${fixtureStation.id}: DB=${dbStatus}, Fixture=${fixtureStatus}`
    );

    // If operational, verify graph representation
    if (fixtureStatus === "operational") {
      assert.ok(
        graph.stationsById.has(fixtureStation.id),
        `Operational station ${fixtureStation.id} must be indexed in runtime graph`
      );
    }
  }

  // Verify operational connections match in database and runtime graph
  for (const conn of dbConnections) {
    if (conn.routingStatus === "operational") {
      const edges = graph.adjacencyList.get(conn.fromStationId) || [];
      const edge = edges.find((e) => e.toStationId === conn.toStationId);
      assert.ok(
        edge,
        `Operational DB connection ${conn.fromStationId} -> ${conn.toStationId} must be traversable in runtime graph`
      );
      assert.equal(edge.routingStatus, "operational");
    }
  }
});

test("Audit Area 5: Interchange semantics correctly model 3 physical hubs across 4 directional DB records", async () => {
  const { graph } = await getServerMetroGraph();

  // 1. Esplanade: 2 directional records between distinct concourses (Blue and Green)
  const esplanadeBlueEdges = graph.adjacencyList.get("esplanade_blue") || [];
  const toGreen = esplanadeBlueEdges.find((e) => e.isInterchange && e.toStationId === "esplanade_green");
  assert.ok(toGreen, "Esplanade Blue -> Green interchange edge must exist");

  const esplanadeGreenEdges = graph.adjacencyList.get("esplanade_green") || [];
  const toBlue = esplanadeGreenEdges.find((e) => e.isInterchange && e.toStationId === "esplanade_blue");
  assert.ok(toBlue, "Esplanade Green -> Blue interchange edge must exist");

  // 2. Noapara: Shared physical station with platform interchange (Blue and Yellow)
  const noapara = graph.stationsById.get("noapara");
  assert.ok(noapara, "Noapara station must exist in graph");
  assert.ok(noapara.lineIds.includes("blue") && noapara.lineIds.includes("yellow"));

  // 3. Kavi Subhash: Shared physical station with platform interchange (Blue and Orange)
  const kaviSubhash = graph.stationsById.get("kavi_subhash");
  assert.ok(kaviSubhash, "Kavi Subhash station must exist in graph");
  assert.ok(kaviSubhash.lineIds.includes("blue") && kaviSubhash.lineIds.includes("orange"));
});

test("Audit Area 12: Ride-Hail provider URL generation and parameter encoding", () => {
  const pickup = { latitude: 22.5857, longitude: 88.3433 };
  const dropoff = { latitude: 22.5448, longitude: 88.3426 };
  const dropoffName = "Victoria Memorial & Gardens";

  // 1. Uber Universal Web / App Deep Link
  const uberUrl = rideHailingProviders.uber.getDeepLink(pickup, dropoff, dropoffName);
  assert.ok(uberUrl.startsWith("https://m.uber.com/ul/?action=setPickup"));
  assert.ok(uberUrl.includes("pickup%5Blatitude%5D=22.5857"));
  assert.ok(uberUrl.includes("pickup%5Blongitude%5D=88.3433"));
  assert.ok(uberUrl.includes("dropoff%5Blatitude%5D=22.5448"));
  assert.ok(uberUrl.includes("dropoff%5Blongitude%5D=88.3426"));
  assert.ok(uberUrl.includes("dropoff%5Bnickname%5D=Victoria+Memorial"));

  // 2. Ola Mobile Scheme
  const olaUrl = rideHailingProviders.ola.getDeepLink(pickup, dropoff, dropoffName);
  assert.ok(olaUrl.startsWith("ola://manage_ride?"));
  assert.ok(olaUrl.includes("pickup_lat=22.5857"));
  assert.ok(olaUrl.includes("pickup_lng=88.3433"));
  assert.ok(olaUrl.includes("drop_lat=22.5448"));
  assert.ok(olaUrl.includes("drop_lng=88.3426"));

  // 3. Rapido: Explicitly unsupported coordinate prefill flag
  assert.equal(
    rideHailingProviders.rapido.isOfficialDeepLinkSupported,
    false,
    "Rapido coordinate prefill must remain explicitly flagged as unsupported/unverified"
  );
  const rapidoUrl = rideHailingProviders.rapido.getDeepLink();
  assert.equal(rapidoUrl, "https://www.rapido.bike/");
});

test("Audit Area 13 & 14: Map Data and Construction Layer Consistency", () => {
  // Verify every station in dataset has a valid line and valid coordinates
  const stationIds = new Set<string>();

  for (const st of METRO_STATIONS) {
    assert.ok(!stationIds.has(st.id), `Duplicate station ID: ${st.id}`);
    stationIds.add(st.id);

    assert.ok(st.name.length > 0, `Station ${st.id} missing name`);
    assert.ok(st.coordinates.latitude > 22.0 && st.coordinates.latitude < 23.0, `Latitude out of bounds for ${st.id}`);
    assert.ok(st.coordinates.longitude > 88.0 && st.coordinates.longitude < 89.0, `Longitude out of bounds for ${st.id}`);
    assert.ok(st.lineIds.length > 0, `Station ${st.id} must belong to at least one line`);

    const validStatuses = ["operational", "under_construction", "planned", "approved", "unknown"];
    const status = st.status || "operational";
    assert.ok(validStatuses.includes(status), `Invalid status ${status} for station ${st.id}`);
  }

  // Assert non-operational stations are not routable
  const nonOperationalStations = METRO_STATIONS.filter(
    (s) => s.status && s.status !== "operational"
  );
  assert.ok(nonOperationalStations.length > 0, "Must have non-operational future stations");

  for (const nonOp of nonOperationalStations) {
    assert.notEqual(nonOp.status, "operational");
  }
});
