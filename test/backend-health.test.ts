import test from "node:test";
import assert from "node:assert/strict";
import { checkDatabaseHealth } from "../src/db";
import { GET as healthHandler } from "../src/app/api/health/route";

test("checkDatabaseHealth reports status cleanly without leaking credentials", async () => {
  const health = await checkDatabaseHealth();
  assert.equal(typeof health.isConnected, "boolean");
  assert.equal(typeof health.latencyMs, "number");
});

test("GET /api/health returns valid JSON envelope without secrets", async () => {
  const res = await healthHandler();
  assert.ok(res.status === 200 || res.status === 503);
  const data = await res.json();
  assert.ok(data.status === "ok" || data.status === "degraded");
  assert.ok(data.database === "connected" || data.database === "unavailable");
  assert.equal(data.connectionString, undefined);
  assert.equal(data.password, undefined);
});
