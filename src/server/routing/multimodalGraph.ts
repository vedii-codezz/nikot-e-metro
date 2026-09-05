import { Coordinates } from "../../types/geo";
import { MetroStation } from "../../types/station";
import { TransportMode, DataQuality } from "../../types/multimodal";
import { haversineDistanceKm } from "../../lib/geo/haversine";
import { VERIFIED_BUS_STOPS, VERIFIED_BUS_ROUTES, BusStopData, BusRouteData } from "../../data/busRoutes";
import { VERIFIED_INFORMAL_STANDS, InformalTransitStandData } from "../../data/informalTransit";

export interface MultimodalNode {
  id: string;
  name: string;
  bengaliName?: string;
  mode: TransportMode;
  coordinates: Coordinates;
  metadata?: {
    stationId?: string;
    stopId?: string;
    standId?: string;
    lineIds?: string[];
    routesServed?: string;
    status?: "operational" | "under_construction" | "planned";
  };
}

export interface MultimodalEdge {
  fromNodeId: string;
  toNodeId: string;
  mode: TransportMode;
  distanceMeters: number;
  actualDurationSeconds: number; // Pure physical travel duration
  lineId?: string;
  routeId?: string;
  routeName?: string;
  lineColor?: string;
  isInterchange?: boolean;
  dataQuality: DataQuality;
  source: string;
  uncertaintyPenaltySeconds?: number; // Internal score adjustment only
}

export interface MultimodalGraph {
  nodes: Map<string, MultimodalNode>;
  adjacencyList: Map<string, MultimodalEdge[]>;
}

const METRO_SPEED_KMH = 32.0; // Commercial average for Kolkata Metro
const BUS_SPEED_KMH = 18.0;   // City traffic speed for WBTC buses
const WALK_SPEED_KMH = 4.5;   // Walking transfer speed

/**
 * Builds the multimodal graph containing operational Metro lines,
 * verified WBTC bus routes, and pedestrian transfer connections between them.
 */
export function buildMultimodalGraph(
  operationalMetroStations: MetroStation[],
  busStops: BusStopData[] = VERIFIED_BUS_STOPS,
  busRoutes: BusRouteData[] = VERIFIED_BUS_ROUTES,
  informalStands: InformalTransitStandData[] = VERIFIED_INFORMAL_STANDS
): MultimodalGraph {
  const nodes = new Map<string, MultimodalNode>();
  const adjacencyList = new Map<string, MultimodalEdge[]>();

  function addNode(node: MultimodalNode) {
    nodes.set(node.id, node);
    if (!adjacencyList.has(node.id)) {
      adjacencyList.set(node.id, []);
    }
  }

  function addEdge(edge: MultimodalEdge) {
    if (!adjacencyList.has(edge.fromNodeId)) {
      adjacencyList.set(edge.fromNodeId, []);
    }
    adjacencyList.get(edge.fromNodeId)!.push(edge);
  }

  // 1. Add Operational Metro Stations as Nodes
  const metroStationsById = new Map<string, MetroStation>();
  for (const st of operationalMetroStations) {
    if (st.status && st.status !== "operational") {
      continue; // Filter out construction / planned
    }
    metroStationsById.set(st.id, st);
    addNode({
      id: `metro_${st.id}`,
      name: st.name,
      bengaliName: st.bengaliName,
      mode: "metro",
      coordinates: st.coordinates,
      metadata: {
        stationId: st.id,
        lineIds: st.lineIds,
        status: "operational",
      },
    });
  }

  // 2. Add Metro Track Edges (Sequential stations along same line)
  const lineStationsMap = new Map<string, MetroStation[]>();
  for (const st of operationalMetroStations) {
    if (st.status && st.status !== "operational") continue;
    for (const lineId of st.lineIds) {
      if (!lineStationsMap.has(lineId)) {
        lineStationsMap.set(lineId, []);
      }
      lineStationsMap.get(lineId)!.push(st);
    }
  }

  for (const [lineId, stationsOnLine] of lineStationsMap.entries()) {
    for (let i = 0; i < stationsOnLine.length - 1; i++) {
      const u = stationsOnLine[i];
      const v = stationsOnLine[i + 1];

      const distKm = haversineDistanceKm(u.coordinates, v.coordinates);
      const distMeters = Math.round(distKm * 1000);
      const seconds = Math.max(90, Math.round((distKm / METRO_SPEED_KMH) * 3600));

      const edgeUV: MultimodalEdge = {
        fromNodeId: `metro_${u.id}`,
        toNodeId: `metro_${v.id}`,
        mode: "metro",
        distanceMeters: distMeters,
        actualDurationSeconds: seconds,
        lineId,
        lineColor: getLineColor(lineId),
        isInterchange: false,
        dataQuality: "verified",
        source: "kolkata_metro_timetable",
      };

      const edgeVU: MultimodalEdge = {
        fromNodeId: `metro_${v.id}`,
        toNodeId: `metro_${u.id}`,
        mode: "metro",
        distanceMeters: distMeters,
        actualDurationSeconds: seconds,
        lineId,
        lineColor: getLineColor(lineId),
        isInterchange: false,
        dataQuality: "verified",
        source: "kolkata_metro_timetable",
      };

      addEdge(edgeUV);
      addEdge(edgeVU);
    }
  }

  // 3. Add Metro Interchange Edges (e.g. Esplanade Green <-> Blue, Noapara Blue <-> Yellow)
  for (const st of operationalMetroStations) {
    if (st.isInterchange && st.interchangeConnections) {
      for (const ic of st.interchangeConnections) {
        if (ic.routingStatus && ic.routingStatus !== "operational") continue;
        if (!metroStationsById.has(ic.targetStationId)) continue;

        const transferSeconds = (ic.estimatedTransferMinutes ?? 4) * 60;

        addEdge({
          fromNodeId: `metro_${st.id}`,
          toNodeId: `metro_${ic.targetStationId}`,
          mode: "metro",
          distanceMeters: 100, // Concourse walk
          actualDurationSeconds: transferSeconds,
          lineId: ic.targetLineId,
          isInterchange: true,
          dataQuality: ic.confidence === "verified" ? "verified" : "estimated",
          source: "metro_concourse_interchange",
        });
      }
    }
  }

  // 4. Add WBTC Bus Stops and Route Edges
  const busStopsById = new Map<string, BusStopData>();
  for (const bs of busStops) {
    busStopsById.set(bs.id, bs);
    addNode({
      id: `bus_${bs.id}`,
      name: bs.name,
      bengaliName: bs.bengaliName,
      mode: "bus",
      coordinates: bs.coordinates,
      metadata: {
        stopId: bs.id,
      },
    });
  }

  for (const br of busRoutes) {
    for (let i = 0; i < br.stopIds.length - 1; i++) {
      const u = busStopsById.get(br.stopIds[i]);
      const v = busStopsById.get(br.stopIds[i + 1]);
      if (!u || !v) continue;

      const distKm = haversineDistanceKm(u.coordinates, v.coordinates);
      const distMeters = Math.round(distKm * 1000);
      const travelSeconds = Math.max(120, Math.round((distKm / BUS_SPEED_KMH) * 3600));

      const edgeUV: MultimodalEdge = {
        fromNodeId: `bus_${u.id}`,
        toNodeId: `bus_${v.id}`,
        mode: "bus",
        distanceMeters: distMeters,
        actualDurationSeconds: travelSeconds,
        routeId: br.id,
        routeName: br.routeNumber,
        isInterchange: false,
        dataQuality: "estimated", // Road schedule duration estimate
        source: br.sourceName,
      };

      const edgeVU: MultimodalEdge = {
        fromNodeId: `bus_${v.id}`,
        toNodeId: `bus_${u.id}`,
        mode: "bus",
        distanceMeters: distMeters,
        actualDurationSeconds: travelSeconds,
        routeId: br.id,
        routeName: br.routeNumber,
        isInterchange: false,
        dataQuality: "estimated",
        source: br.sourceName,
      };

      addEdge(edgeUV);
      addEdge(edgeVU);
    }
  }

  // 5. Add Informal Transit Stands (Auto / Toto)
  for (const stand of informalStands) {
    addNode({
      id: `stand_${stand.id}`,
      name: stand.name,
      mode: stand.type,
      coordinates: stand.coordinates,
      metadata: {
        standId: stand.id,
        routesServed: stand.routesServed,
      },
    });

    // Link to nearby metro station if within 400m
    const targetMetro = metroStationsById.get(stand.nearbyMetroStationId);
    if (targetMetro) {
      const distKm = haversineDistanceKm(stand.coordinates, targetMetro.coordinates);
      const distMeters = Math.round(distKm * 1000);
      const walkSeconds = Math.max(30, Math.round((distKm / WALK_SPEED_KMH) * 3600));

      // Stand <-> Metro walking feeder transfer
      addEdge({
        fromNodeId: `stand_${stand.id}`,
        toNodeId: `metro_${targetMetro.id}`,
        mode: "walk",
        distanceMeters: distMeters,
        actualDurationSeconds: walkSeconds,
        isInterchange: false,
        dataQuality: "verified",
        source: "feeder_transfer_walk",
      });

      addEdge({
        fromNodeId: `metro_${targetMetro.id}`,
        toNodeId: `stand_${stand.id}`,
        mode: "walk",
        distanceMeters: distMeters,
        actualDurationSeconds: walkSeconds,
        isInterchange: false,
        dataQuality: "verified",
        source: "feeder_transfer_walk",
      });
    }
  }

  // 6. Connect nearby Bus Stops to Metro Stations (Walk transfer <= 350 meters)
  for (const st of operationalMetroStations) {
    for (const bs of busStops) {
      const distKm = haversineDistanceKm(st.coordinates, bs.coordinates);
      const distMeters = Math.round(distKm * 1000);
      if (distMeters <= 350) {
        const walkSeconds = Math.max(45, Math.round((distKm / WALK_SPEED_KMH) * 3600));

        addEdge({
          fromNodeId: `metro_${st.id}`,
          toNodeId: `bus_${bs.id}`,
          mode: "walk",
          distanceMeters: distMeters,
          actualDurationSeconds: walkSeconds,
          isInterchange: true,
          dataQuality: "verified",
          source: "metro_bus_intermodal_walk",
        });

        addEdge({
          fromNodeId: `bus_${bs.id}`,
          toNodeId: `metro_${st.id}`,
          mode: "walk",
          distanceMeters: distMeters,
          actualDurationSeconds: walkSeconds,
          isInterchange: true,
          dataQuality: "verified",
          source: "metro_bus_intermodal_walk",
        });
      }
    }
  }

  return { nodes, adjacencyList };
}

function getLineColor(lineId: string): string {
  switch (lineId) {
    case "blue":
      return "#0072CE";
    case "green":
      return "#00A651";
    case "purple":
      return "#800080";
    case "orange":
      return "#FF8000";
    case "yellow":
      return "#FCCC0A";
    case "pink":
      return "#E91E63";
    default:
      return "#888888";
  }
}
