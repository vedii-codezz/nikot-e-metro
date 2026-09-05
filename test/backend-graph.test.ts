import test from "node:test";
import assert from "node:assert/strict";
import { getServerMetroGraph, invalidateServerGraph } from "../src/server/routing/graph";

test("getServerMetroGraph builds and caches graph successfully", async () => {
  const { graph, stations } = await getServerMetroGraph();
  assert.ok(graph.stationsById.size > 0);
  assert.ok(stations.length > 0);

  // Invalidate cache
  invalidateServerGraph();
  const res2 = await getServerMetroGraph();
  assert.ok(res2.graph.stationsById.size === graph.stationsById.size);
});
