import { getDb, schema } from "../src/db";
import { METRO_LINES } from "../src/data/lines";

async function reportNetworkStatus() {
  const db = getDb();
  if (!db) {
    console.error("No database connection");
    process.exit(1);
  }

  const [stations, stationLines, connections] = await Promise.all([
    db.select().from(schema.metroStations),
    db.select().from(schema.stationLines),
    db.select().from(schema.stationConnections),
  ]);

  console.log(`\n======================================================`);
  console.log(`          NIKOT-E-METRO DATABASE AUDIT REPORT        `);
  console.log(`======================================================\n`);
  console.log(`Total Metro Stations in DB: ${stations.length}`);
  console.log(`Total Station-Line Links:   ${stationLines.length}`);
  console.log(`Total Track Connections:   ${connections.length}`);

  console.log("\n| Line | Operational Stations | Construction | Planned | Operational Termini |");
  console.log("| :--- | :---: | :---: | :---: | :--- |");

  for (const line of METRO_LINES) {
    const stationIdsForLine = stationLines
      .filter((sl) => sl.lineId === line.id)
      .map((sl) => sl.stationId);

    const lineStations = stations.filter((s) => stationIdsForLine.includes(s.id));

    const operationalCount = lineStations.filter((s) => s.status === "operational").length;
    const constructionCount = lineStations.filter((s) => s.status === "under_construction").length;
    const plannedCount = lineStations.filter((s) => s.status === "planned" || s.status === "approved").length;

    console.log(
      `| ${line.name.padEnd(16)} | ${operationalCount.toString().padStart(20)} | ${constructionCount.toString().padStart(12)} | ${plannedCount.toString().padStart(7)} | ${line.terminus.join(" ↔ ").padEnd(36)} |`
    );
  }

  console.log(`\n======================================================\n`);
  process.exit(0);
}

reportNetworkStatus().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
