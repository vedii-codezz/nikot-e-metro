import test from "node:test";
import assert from "node:assert/strict";
import { getServerMetroGraph } from "../src/server/routing/graph";
import { findShortestPath } from "../src/lib/routing/dijkstra";
import { findShortestPathAStar } from "../src/server/routing/astar";
import { routingService } from "../src/server/services/routingService";
import { journeyScorer } from "../src/server/journey/journeyScorer";
import { MultimodalJourneyCandidate } from "../src/types/multimodal";

test("Dijkstra vs A* Equivalence: Both algorithms compute identical optimal travel cost", async () => {
  const { graph } = await getServerMetroGraph();

  const testPairs = [
    { start: "dakshineswar", end: "kavi_subhash" },
    { start: "howrah_maidan", end: "salt_lake_sector_v" },
    { start: "jai_hind", end: "kalighat" },
    { start: "joka", end: "majerhat" },
    { start: "kavi_subhash", end: "beleghata" },
  ];

  for (const pair of testPairs) {
    const dijkstraStart = performance.now();
    const dijkstraResult = findShortestPath(graph, pair.start, pair.end);
    const dijkstraDuration = performance.now() - dijkstraStart;

    const astarStart = performance.now();
    const { result: astarResult, nodesExpanded } = findShortestPathAStar(graph, pair.start, pair.end);
    const astarDuration = performance.now() - astarStart;

    assert.ok(dijkstraResult !== null);
    assert.ok(astarResult !== null);
    assert.equal(
      astarResult.totalTravelMinutes,
      dijkstraResult.totalTravelMinutes,
      `Optimal cost mismatch for ${pair.start} -> ${pair.end}`
    );
    assert.equal(astarResult.interchangeCount, dijkstraResult.interchangeCount);
    assert.deepEqual(astarResult.linesUsed, dijkstraResult.linesUsed);

    console.log(
      `[Benchmark] ${pair.start} -> ${pair.end}: Dijkstra ${dijkstraDuration.toFixed(2)}ms | A* ${astarDuration.toFixed(2)}ms (${nodesExpanded} nodes expanded)`
    );
  }
});

test("Purple Line: Operational corridor Joka to Majerhat succeeds; central extension is blocked", async () => {
  const { graph } = await getServerMetroGraph();

  // Operational section
  const operationalPath = findShortestPath(graph, "joka", "majerhat");
  assert.ok(operationalPath !== null);
  assert.deepEqual(operationalPath.linesUsed, ["purple"]);
  assert.equal(operationalPath.interchangeCount, 0);

  // Attempt route through unfinished Majerhat -> Victoria / Esplanade
  const unfinishedPath = findShortestPath(graph, "joka", "victoria_purple");
  assert.equal(
    unfinishedPath,
    null,
    "Unfinished Purple Line central extension to Victoria must be excluded from passenger routing"
  );
});

test("Orange Line: Operational corridor Kavi Subhash to Beleghata succeeds; airport extension blocked", async () => {
  const { graph } = await getServerMetroGraph();

  // Operational section up to Beleghata
  const operationalPath = findShortestPath(graph, "kavi_subhash", "beleghata");
  assert.ok(operationalPath !== null);
  assert.deepEqual(operationalPath.linesUsed, ["orange"]);
  assert.ok(operationalPath.stationIds.includes("vip_bazar"));
  assert.ok(operationalPath.stationIds.includes("barun_sengupta"));

  // Attempt route along unfinished Orange airport extension
  const unfinishedPath = findShortestPath(graph, "beleghata", "chinar_park");
  assert.equal(
    unfinishedPath,
    null,
    "Unfinished Orange Line extension north of Beleghata must be excluded from passenger routing"
  );
});

test("Architecture: Routing score penalties DO NOT inflate displayed actual travel duration", () => {
  const candidate: MultimodalJourneyCandidate = {
    id: "test_cand_1",
    legs: [
      {
        mode: "walk",
        origin: { name: "Origin", coordinates: { latitude: 22.5, longitude: 88.3 } },
        destination: { name: "Station A", coordinates: { latitude: 22.51, longitude: 88.31 } },
        distanceMeters: 600,
        durationSeconds: 480, // 8 mins walk
        dataQuality: "routed",
      },
      {
        mode: "metro",
        origin: { name: "Station A", coordinates: { latitude: 22.51, longitude: 88.31 } },
        destination: { name: "Station B", coordinates: { latitude: 22.55, longitude: 88.35 } },
        distanceMeters: 4500,
        durationSeconds: 600, // 10 mins ride
        routeId: "blue",
        stopCount: 4,
        dataQuality: "verified",
      },
    ],
    totalActualDurationSeconds: 1080, // Exactly 18 minutes
    totalWalkingMeters: 600,
    metroInterchangeCount: 1,
    transportModeChangeCount: 1,
    routingScore: 0,
    quality: "verified",
  };

  const scoreRecommended = journeyScorer.scoreCandidate(candidate, "recommended");
  // Recommended adds score penalties for interchange (+360s) and mode change (+480s)
  assert.ok(
    scoreRecommended > candidate.totalActualDurationSeconds,
    "Routing score must incorporate product-ranking penalties"
  );

  // Crucial test: displayed travel time is NOT changed
  assert.equal(
    candidate.totalActualDurationSeconds,
    1080,
    "User-visible travel duration must remain strictly unchanged"
  );
});

test("Multi-Criteria Routing: Modes prioritize appropriate metrics", () => {
  const fastCandidate: MultimodalJourneyCandidate = {
    id: "fast",
    legs: [],
    totalActualDurationSeconds: 900, // 15 mins
    totalWalkingMeters: 1200,        // more walking
    metroInterchangeCount: 1,
    transportModeChangeCount: 0,
    routingScore: 0,
    quality: "verified",
  };

  const walkCandidate: MultimodalJourneyCandidate = {
    id: "least_walk",
    legs: [],
    totalActualDurationSeconds: 1100, // 18.3 mins
    totalWalkingMeters: 250,          // minimal walking
    metroInterchangeCount: 1,
    transportModeChangeCount: 0,
    routingScore: 0,
    quality: "verified",
  };

  const fastScore = journeyScorer.scoreCandidate(fastCandidate, "fastest");
  const walkScoreForFast = journeyScorer.scoreCandidate(walkCandidate, "fastest");
  assert.ok(fastScore < walkScoreForFast, "Fastest mode should favor lower actual duration");

  const fastScoreLeastWalk = journeyScorer.scoreCandidate(fastCandidate, "least_walking");
  const walkScoreLeastWalk = journeyScorer.scoreCandidate(walkCandidate, "least_walking");
  assert.ok(
    walkScoreLeastWalk < fastScoreLeastWalk,
    "Least walking mode should favor candidate with minimal walking meters"
  );
});
