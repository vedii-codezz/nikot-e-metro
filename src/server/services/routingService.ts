import { RouteRequest } from "../validation/routeValidation";
import { JourneyRoute } from "../../types/routing";
import { getServerMetroGraph } from "../routing/graph";
import { planFullJourney } from "../../lib/routing/dijkstra";

export class RoutingService {
  async planRoute(request: RouteRequest): Promise<JourneyRoute | null> {
    const { graph, stations } = await getServerMetroGraph();

    const origin = {
      name: request.origin.name || "Origin Location",
      coordinates: request.origin.coordinates,
      stationId: request.origin.stationId,
    };

    const destination = {
      name: request.destination.name || "Destination Location",
      coordinates: request.destination.coordinates,
      stationId: request.destination.stationId,
    };

    return planFullJourney(graph, stations, origin, destination);
  }
}

export const routingService = new RoutingService();
