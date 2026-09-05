import test from "node:test";
import assert from "node:assert/strict";
import { ValhallaPedestrianProvider } from "../src/server/pedestrian/valhallaProvider";
import { OsrmFootPedestrianProvider } from "../src/server/pedestrian/osrmFootProvider";
import { PedestrianService } from "../src/server/pedestrian/pedestrianService";
import { PedestrianRouteProvider, PedestrianRoute } from "../src/server/pedestrian/provider";

test("ValhallaPedestrianProvider decodes polyline6 and creates normalized PedestrianRoute", async () => {
  // Mock fetch for Valhalla route response
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url: any, options: any) => {
    // Assert headers sent
    assert.equal(options?.headers?.["X-Client-Id"], "nikot-e-metro");
    const reqBody = JSON.parse(options?.body);
    assert.equal(reqBody.costing, "pedestrian");

    return {
      ok: true,
      status: 200,
      json: async () => ({
        trip: {
          summary: {
            length: 1.25, // km
            time: 900, // 15 mins (900 sec)
          },
          legs: [
            {
              // polyline6 encoded string for [[88.34, 22.54], [88.35, 22.55]]
              shape: "w`_rCwv~tN_pe@_pe@",
            },
          ],
        },
      }),
    } as any;
  };

  try {
    const provider = new ValhallaPedestrianProvider("https://mock-valhalla.test");
    const route = await provider.getRoute(
      { latitude: 22.54, longitude: 88.34 },
      { latitude: 22.55, longitude: 88.35 }
    );

    assert.ok(route !== null);
    assert.equal(route.source, "valhalla");
    assert.equal(route.quality, "routed");
    assert.equal(route.distanceMeters, 1250);
    assert.equal(route.durationSeconds, 900);
    assert.ok(route.geometry && route.geometry.coordinates.length >= 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("PedestrianService gracefully falls back to Haversine on provider error or timeout", async () => {
  // Provider that throws an error
  const failingProvider: PedestrianRouteProvider = {
    name: "valhalla",
    getRoute: async () => {
      throw new Error("Connection timeout");
    },
  };

  const service = new PedestrianService(failingProvider, null);

  const origin = { latitude: 22.5448, longitude: 88.3426 }; // Victoria Memorial
  const destination = { latitude: 22.548, longitude: 88.351 }; // Nearby

  const route = await service.getWalkingRoute(origin, destination);

  assert.ok(route !== null);
  assert.equal(route.source, "haversine");
  assert.equal(route.quality, "estimated");
  assert.ok(route.distanceMeters > 0);
  assert.ok(route.durationSeconds > 0);
  // Straight line geometry only (no fake curves)
  assert.equal(route.geometry, undefined);
});

test("Smart Station Reranking reranks candidates by real walking duration/distance", async () => {
  // Station A has shorter straight line (Haversine) but higher walking distance (e.g. wall / barrier / river)
  // Station B has slightly further straight line but direct pedestrian path
  const mockProvider: PedestrianRouteProvider = {
    name: "valhalla",
    getRoute: async (orig, dest) => {
      // If destination matches Station A (lat 22.55, lng 88.34)
      if (Math.abs(dest.latitude - 22.55) < 0.001) {
        return {
          distanceMeters: 1800,
          durationSeconds: 22 * 60, // longer walk due to detour
          geometry: {
            type: "LineString",
            coordinates: [
              [orig.longitude, orig.latitude],
              [dest.longitude, dest.latitude],
            ],
          },
          source: "valhalla",
          quality: "routed",
        };
      }
      // Station B (lat 22.545, lng 88.35)
      return {
        distanceMeters: 900,
        durationSeconds: 11 * 60, // faster walking path
        geometry: {
          type: "LineString",
          coordinates: [
            [orig.longitude, orig.latitude],
            [dest.longitude, dest.latitude],
          ],
        },
        source: "valhalla",
        quality: "routed",
      };
    },
  };

  const service = new PedestrianService(mockProvider, null);

  const origin = { latitude: 22.54, longitude: 88.34 };
  const stationA = { latitude: 22.55, longitude: 88.34 }; // Straight line approx 1.1 km
  const stationB = { latitude: 22.545, longitude: 88.35 }; // Straight line approx 1.2 km

  const [routeA, routeB] = await Promise.all([
    service.getWalkingRoute(origin, stationA),
    service.getWalkingRoute(origin, stationB),
  ]);

  // Real walking route B has lower duration than route A
  assert.ok(routeB.durationSeconds < routeA.durationSeconds);
  assert.ok(routeB.distanceMeters < routeA.distanceMeters);
});

test("PedestrianService caches walking route in-memory", async () => {
  let callCount = 0;
  const mockProvider: PedestrianRouteProvider = {
    name: "valhalla",
    getRoute: async () => {
      callCount++;
      return {
        distanceMeters: 500,
        durationSeconds: 360,
        geometry: { type: "LineString", coordinates: [[88.3, 22.5], [88.31, 22.51]] },
        source: "valhalla",
        quality: "routed",
      };
    },
  };

  const service = new PedestrianService(mockProvider, null);
  const orig = { latitude: 22.50001, longitude: 88.30001 };
  const dest = { latitude: 22.51001, longitude: 88.31001 };

  const res1 = await service.getWalkingRoute(orig, dest);
  const res2 = await service.getWalkingRoute(orig, dest);

  assert.equal(callCount, 1, "Second call within 10 minutes should hit the in-memory cache");
  assert.deepEqual(res1, res2);
});
