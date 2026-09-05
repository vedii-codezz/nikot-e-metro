import { getDb, schema } from "./index";
import { METRO_LINES } from "../data/lines";
import { METRO_STATIONS } from "../data/stations";
import { KOLKATA_LANDMARKS } from "../data/landmarks";
import { VERIFIED_BUS_STOPS, VERIFIED_BUS_ROUTES } from "../data/busRoutes";
import { VERIFIED_INFORMAL_STANDS } from "../data/informalTransit";
import { haversineDistanceKm } from "../lib/geo/haversine";

export interface SeedSummary {
  linesCount: number;
  stationsCount: number;
  connectionsCount: number;
  interchangesCount: number;
  landmarksCount: number;
  verifiedStationsCount: number;
  developmentStationsCount: number;
}

export async function seedDatabase(): Promise<SeedSummary | null> {
  const db = getDb();
  if (!db) {
    console.log("[Nikot-e-Metro] No DATABASE_URL configured. Skipping live database seeding.");
    return null;
  }

  console.log("[Nikot-e-Metro] Starting database seeding on PostgreSQL...");

  // 1. Seed Metro Lines
  let linesCount = 0;
  for (const line of METRO_LINES) {
    await db
      .insert(schema.metroLines)
      .values({
        id: line.id,
        slug: line.id,
        name: line.name,
        lineCode: line.lineCode,
        bengaliName: line.bengaliName,
        displayColor: line.color,
        textColor: line.textColor,
        status: line.status,
        confidence: line.confidence,
      })
      .onConflictDoUpdate({
        target: schema.metroLines.id,
        set: {
          name: line.name,
          lineCode: line.lineCode,
          bengaliName: line.bengaliName,
          displayColor: line.color,
          status: line.status,
          confidence: line.confidence,
          updatedAt: new Date(),
        },
      });
    linesCount++;
  }

  // 2. Seed Metro Stations & station_lines
  let stationsCount = 0;
  let verifiedStationsCount = 0;
  let developmentStationsCount = 0;

  for (const station of METRO_STATIONS) {
    if (station.confidence === "verified") verifiedStationsCount++;
    else developmentStationsCount++;

    const stationStatus = station.status || "operational";

    await db
      .insert(schema.metroStations)
      .values({
        id: station.id,
        slug: station.id,
        name: station.name,
        bengaliName: station.bengaliName,
        latitude: station.coordinates.latitude,
        longitude: station.coordinates.longitude,
        status: stationStatus,
        dataConfidence: station.confidence,
        openedYear: station.openedYear,
        sourceName:
          station.confidence === "verified" ? "Metro Railway Kolkata Official" : "Development Mock",
      })
      .onConflictDoUpdate({
        target: schema.metroStations.id,
        set: {
          name: station.name,
          bengaliName: station.bengaliName,
          latitude: station.coordinates.latitude,
          longitude: station.coordinates.longitude,
          status: stationStatus,
          dataConfidence: station.confidence,
          openedYear: station.openedYear,
          updatedAt: new Date(),
        },
      });
    stationsCount++;

    // 3. Seed station_lines junction
    for (let i = 0; i < station.lineIds.length; i++) {
      const lineId = station.lineIds[i];
      await db
        .insert(schema.stationLines)
        .values({
          stationId: station.id,
          lineId: lineId,
          stationOrder: i + 1,
        })
        .onConflictDoNothing();
    }
  }

  // 4. Seed Station Connections (Track Edges)
  let connectionsCount = 0;
  for (const line of METRO_LINES) {
    const lineStations = METRO_STATIONS.filter((s) => s.lineIds.includes(line.id));
    for (let i = 0; i < lineStations.length - 1; i++) {
      const u = lineStations[i];
      const v = lineStations[i + 1];
      const distKm = haversineDistanceKm(u.coordinates, v.coordinates);
      const distMeters = Math.round(distKm * 1000);
      const seconds = Math.round((distKm / 32.0) * 3600 + 30); // 32 km/h avg + 30s dwell

      const connIdFwd = `conn_${line.id}_${u.id}_${v.id}`;
      const connIdRev = `conn_${line.id}_${v.id}_${u.id}`;

      // Connection routing status derives from station operational statuses
      let connRoutingStatus: "operational" | "under_construction" | "planned" = "operational";
      if (u.status === "planned" || v.status === "planned" || line.status === "under_construction") {
        connRoutingStatus = "planned";
      } else if (u.status === "under_construction" || v.status === "under_construction") {
        connRoutingStatus = "under_construction";
      }

      await db
        .insert(schema.stationConnections)
        .values({
          id: connIdFwd,
          fromStationId: u.id,
          toStationId: v.id,
          lineId: line.id,
          distanceMeters: distMeters,
          estimatedTravelSeconds: seconds,
          verified: u.confidence === "verified" && v.confidence === "verified",
          confidence:
            u.confidence === "verified" && v.confidence === "verified" ? "verified" : "development",
          routingStatus: connRoutingStatus,
        })
        .onConflictDoUpdate({
          target: schema.stationConnections.id,
          set: {
            routingStatus: connRoutingStatus,
            distanceMeters: distMeters,
            estimatedTravelSeconds: seconds,
          },
        });
      connectionsCount++;

      await db
        .insert(schema.stationConnections)
        .values({
          id: connIdRev,
          fromStationId: v.id,
          toStationId: u.id,
          lineId: line.id,
          distanceMeters: distMeters,
          estimatedTravelSeconds: seconds,
          verified: u.confidence === "verified" && v.confidence === "verified",
          confidence:
            u.confidence === "verified" && v.confidence === "verified" ? "verified" : "development",
          routingStatus: connRoutingStatus,
        })
        .onConflictDoUpdate({
          target: schema.stationConnections.id,
          set: {
            routingStatus: connRoutingStatus,
            distanceMeters: distMeters,
            estimatedTravelSeconds: seconds,
          },
        });
      connectionsCount++;
    }
  }

  // 5. Seed Interchanges
  let interchangesCount = 0;
  for (const station of METRO_STATIONS) {
    if (station.isInterchange && station.interchangeConnections) {
      for (const conn of station.interchangeConnections) {
        const interchangeId = `int_${station.id}_${conn.targetStationId}`;
        const interchangeRoutingStatus = conn.routingStatus || "operational";

        await db
          .insert(schema.interchanges)
          .values({
            id: interchangeId,
            fromStationId: station.id,
            toStationId: conn.targetStationId,
            estimatedTransferSeconds: (conn.estimatedTransferMinutes ?? 4) * 60,
            verified: conn.confidence === "verified",
            confidence: conn.confidence,
            routingStatus: interchangeRoutingStatus,
            notes: "Concourse transfer walkway",
          })
          .onConflictDoUpdate({
            target: schema.interchanges.id,
            set: {
              routingStatus: interchangeRoutingStatus,
              estimatedTransferSeconds: (conn.estimatedTransferMinutes ?? 4) * 60,
            },
          });
        interchangesCount++;
      }
    }
  }

  // 6. Seed Landmarks
  let landmarksCount = 0;
  for (const lm of KOLKATA_LANDMARKS) {
    await db
      .insert(schema.landmarks)
      .values({
        id: lm.id,
        name: lm.name,
        bengaliName: lm.bengaliName,
        category: lm.type,
        latitude: lm.coordinates.latitude,
        longitude: lm.coordinates.longitude,
        description: lm.description,
        dataConfidence: "verified",
      })
      .onConflictDoUpdate({
        target: schema.landmarks.id,
        set: {
          name: lm.name,
          bengaliName: lm.bengaliName,
          category: lm.type,
          latitude: lm.coordinates.latitude,
          longitude: lm.coordinates.longitude,
          description: lm.description,
          updatedAt: new Date(),
        },
      });
    landmarksCount++;
  }

  // 7. Seed Bus Stops & Routes
  for (const bs of VERIFIED_BUS_STOPS) {
    await db
      .insert(schema.busStops)
      .values({
        id: bs.id,
        name: bs.name,
        bengaliName: bs.bengaliName,
        latitude: bs.coordinates.latitude,
        longitude: bs.coordinates.longitude,
        dataConfidence: bs.dataConfidence,
      })
      .onConflictDoNothing();
  }

  for (const br of VERIFIED_BUS_ROUTES) {
    await db
      .insert(schema.busRoutes)
      .values({
        id: br.id,
        routeNumber: br.routeNumber,
        originName: br.originName,
        destinationName: br.destinationName,
        operator: br.operator,
        dataConfidence: br.dataConfidence,
        sourceName: br.sourceName,
        sourceUrl: br.sourceUrl,
        verifiedAt: br.verifiedAt,
      })
      .onConflictDoNothing();

    for (let i = 0; i < br.stopIds.length; i++) {
      await db
        .insert(schema.busRouteStops)
        .values({
          id: `brs_${br.id}_${br.stopIds[i]}`,
          routeId: br.id,
          stopId: br.stopIds[i],
          stopOrder: i + 1,
        })
        .onConflictDoNothing();
    }
  }

  // 8. Seed Informal Transit Stands
  for (const stand of VERIFIED_INFORMAL_STANDS) {
    await db
      .insert(schema.informalTransitStands)
      .values({
        id: stand.id,
        name: stand.name,
        type: stand.type,
        latitude: stand.coordinates.latitude,
        longitude: stand.coordinates.longitude,
        nearbyMetroStationId: stand.nearbyMetroStationId,
        routesServed: stand.routesServed,
        dataConfidence: stand.dataConfidence,
        sourceName: stand.sourceName,
      })
      .onConflictDoNothing();
  }

  const summary: SeedSummary = {
    linesCount,
    stationsCount,
    connectionsCount,
    interchangesCount,
    landmarksCount,
    verifiedStationsCount,
    developmentStationsCount,
  };

  console.log("\n[Nikot-e-Metro] Database Seed Summary:");
  console.log(`- Metro Lines:        ${linesCount}`);
  console.log(`- Metro Stations:     ${stationsCount} (Verified: ${verifiedStationsCount}, Development: ${developmentStationsCount})`);
  console.log(`- Track Connections:  ${connectionsCount}`);
  console.log(`- Interchanges:       ${interchangesCount}`);
  console.log(`- Curated Landmarks:  ${landmarksCount}`);
  console.log("Database seeded successfully! ✅\n");

  return summary;
}

if (process.argv[1]?.includes("seed")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Nikot-e-Metro] Seeding error:", err);
      process.exit(1);
    });
}
