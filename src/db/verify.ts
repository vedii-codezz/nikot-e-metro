import { getDb, schema, checkDatabaseHealth } from "./index";
import { buildMetroGraph } from "../lib/routing/graph";
import { StationRepository } from "../server/repositories/stationRepository";

export async function verifyDatabaseIntegrity(): Promise<boolean> {
  console.log("=================================================");
  console.log("     NIKOT-E-METRO — DATABASE INTEGRATION CHECK   ");
  console.log("=================================================\n");

  // 1. Connection check
  console.log("1. Checking Neon PostgreSQL connection...");
  const health = await checkDatabaseHealth();
  if (!health.isConnected) {
    console.error(`❌ Connection failed: ${health.error || "Database unreachable"}`);
    console.log("\n⚠️ Please configure DATABASE_URL in .env.local before running verification.\n");
    return false;
  }
  console.log(`✅ Connected to Neon PostgreSQL (Latency: ${health.latencyMs}ms)`);

  const db = getDb();
  if (!db) {
    console.error("❌ Database instance unavailable.");
    return false;
  }

  try {
    // 2. Query Lines
    console.log("\n2. Verifying metro_lines table...");
    const lines = await db.select().from(schema.metroLines);
    if (lines.length === 0) {
      console.error("❌ No records found in metro_lines. Have you run 'npm run db:seed'?");
      return false;
    }
    console.log(`✅ Found ${lines.length} metro lines in PostgreSQL.`);
    for (const l of lines) {
      console.log(`   - ${l.name} (${l.lineCode}) | Color: ${l.displayColor} | Status: ${l.status} | Confidence: ${l.confidence}`);
    }

    // 3. Query Stations
    console.log("\n3. Verifying metro_stations table...");
    const stations = await db.select().from(schema.metroStations);
    if (stations.length === 0) {
      console.error("❌ No records found in metro_stations.");
      return false;
    }
    const verifiedCount = stations.filter((s) => s.dataConfidence === "verified").length;
    const devCount = stations.filter((s) => s.dataConfidence === "development").length;
    console.log(`✅ Found ${stations.length} stations in PostgreSQL (Verified: ${verifiedCount}, Development: ${devCount}).`);

    // Verify coordinate validity
    const invalidCoords = stations.filter(
      (s) => s.latitude < 20 || s.latitude > 25 || s.longitude < 85 || s.longitude > 90
    );
    if (invalidCoords.length > 0) {
      console.warn(`⚠️ Warning: ${invalidCoords.length} stations have coordinates outside standard Kolkata bounding box.`);
    } else {
      console.log("✅ All station coordinates are within valid Kolkata geographic bounds.");
    }

    // 4. Query station_lines junction integrity
    console.log("\n4. Verifying station_lines junction integrity...");
    const stationLines = await db.select().from(schema.stationLines);
    const stationIds = new Set(stations.map((s) => s.id));
    const lineIds = new Set(lines.map((l) => l.id));

    const orphanedStationLines = stationLines.filter(
      (sl) => !stationIds.has(sl.stationId) || !lineIds.has(sl.lineId)
    );
    if (orphanedStationLines.length > 0) {
      console.error(`❌ Found ${orphanedStationLines.length} orphaned station_lines records!`);
      return false;
    }
    console.log(`✅ Found ${stationLines.length} valid station-to-line mappings. Zero orphaned foreign keys.`);

    // 5. Query Connections (Graph Track Edges)
    console.log("\n5. Verifying station_connections table...");
    const connections = await db.select().from(schema.stationConnections);
    const invalidConnections = connections.filter(
      (c) => !stationIds.has(c.fromStationId) || !stationIds.has(c.toStationId)
    );
    if (invalidConnections.length > 0) {
      console.error(`❌ Found ${invalidConnections.length} connections referencing non-existent station IDs!`);
      return false;
    }
    const operationalConns = connections.filter((c) => c.routingStatus === "operational");
    const plannedConns = connections.filter((c) => c.routingStatus === "planned");
    console.log(`✅ Found ${connections.length} bidirectional track connections (Operational: ${operationalConns.length}, Planned/Non-routable: ${plannedConns.length}). All endpoint stations valid.`);

    // 6. Query Interchanges
    console.log("\n6. Verifying interchanges table...");
    const interchanges = await db.select().from(schema.interchanges);
    const invalidInterchanges = interchanges.filter(
      (ic) => !stationIds.has(ic.fromStationId) || !stationIds.has(ic.toStationId)
    );
    if (invalidInterchanges.length > 0) {
      console.error(`❌ Found ${invalidInterchanges.length} interchanges referencing non-existent station IDs!`);
      return false;
    }
    const operationalInterchanges = interchanges.filter((i) => i.routingStatus === "operational");
    console.log(`✅ Found ${interchanges.length} transfer interchange connections (${operationalInterchanges.length} operational).`);

    // 7. Query Landmarks
    console.log("\n7. Verifying landmarks table...");
    const landmarks = await db.select().from(schema.landmarks);
    console.log(`✅ Found ${landmarks.length} curated landmarks in PostgreSQL.`);

    // 8. Query Bus and Informal Transit
    console.log("\n8. Verifying bus and informal transit tables...");
    const [bRoutes, bStops, iStands] = await Promise.all([
      db.select().from(schema.busRoutes),
      db.select().from(schema.busStops),
      db.select().from(schema.informalTransitStands),
    ]);
    console.log(`✅ Found ${bRoutes.length} bus routes, ${bStops.length} bus stops, and ${iStands.length} informal transit stands in PostgreSQL.`);

    // 9. Test Graph Construction from Database
    console.log("\n9. Testing Graph construction from live PostgreSQL records...");
    const stationRepo = new StationRepository();
    const mappedStations = await stationRepo.getAllStations();
    const graph = buildMetroGraph(mappedStations);

    console.log(`✅ Graph built successfully: ${graph.stationsById.size} nodes indexed.`);
    console.log("\n=================================================");
    console.log("   ALL POSTGRESQL INTEGRATION CHECKS PASSED ✅    ");
    console.log("=================================================\n");
    return true;
  } catch (error) {
    console.error("❌ Verification failed with error:", error);
    return false;
  }
}

if (process.argv[1]?.includes("verify")) {
  verifyDatabaseIntegrity()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
