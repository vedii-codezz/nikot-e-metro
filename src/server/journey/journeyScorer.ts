import {
  MultimodalJourneyCandidate,
  RoutingOptimizationPreference,
  JourneyLeg,
} from "../../types/multimodal";
import { DEFAULT_ROUTING_WEIGHTS, RoutingScoreWeights } from "../routing/routingWeights";

export class JourneyScorer {
  private weights: RoutingScoreWeights;

  constructor(weights: RoutingScoreWeights = DEFAULT_ROUTING_WEIGHTS) {
    this.weights = weights;
  }

  /**
   * Evaluates and assigns an internal routingScore to a journey candidate based on the user's preference.
   * NOTE: The candidate's `totalActualDurationSeconds` remains untouched (strict separation).
   */
  scoreCandidate(
    candidate: MultimodalJourneyCandidate,
    preference: RoutingOptimizationPreference = "recommended"
  ): number {
    const actualDuration = candidate.totalActualDurationSeconds;
    const walkingSecs = Math.round(candidate.totalWalkingMeters / 1.25); // ~4.5 km/h walking

    // Count uncertain legs (e.g. informal transit without verified schedule)
    const uncertainLegsCount = candidate.legs.filter(
      (l) => l.mode === "auto" || l.mode === "toto" || l.dataQuality === "unknown"
    ).length;

    switch (preference) {
      case "fastest":
        // Prioritize pure door-to-door physical travel duration
        return (
          actualDuration +
          candidate.metroInterchangeCount * 60 + // Minor tie-breaker
          candidate.transportModeChangeCount * 60
        );

      case "least_walking":
        // Heavy penalty on pedestrian effort
        return (
          actualDuration +
          walkingSecs * 4.0 + // 4x penalty on walking time
          candidate.metroInterchangeCount * this.weights.METRO_INTERCHANGE_SCORE_PENALTY
        );

      case "fewest_interchanges":
        // Heavy penalty on every interchange and modal shift
        return (
          actualDuration +
          candidate.metroInterchangeCount * 1800 + // ~30 min score penalty
          candidate.transportModeChangeCount * 1800
        );

      case "public_transport_only": {
        const hasInformal = candidate.legs.some((l) => l.mode === "auto" || l.mode === "toto");
        return (
          actualDuration +
          (hasInformal ? 10000 : 0) +
          candidate.metroInterchangeCount * this.weights.METRO_INTERCHANGE_SCORE_PENALTY +
          walkingSecs * (this.weights.WALKING_SCORE_MULTIPLIER - 1)
        );
      }

      case "recommended":
      default:
        // Balanced product ranking heuristic
        return (
          actualDuration +
          candidate.metroInterchangeCount * this.weights.METRO_INTERCHANGE_SCORE_PENALTY +
          candidate.transportModeChangeCount * this.weights.MODE_CHANGE_SCORE_PENALTY +
          walkingSecs * (this.weights.WALKING_SCORE_MULTIPLIER - 1) +
          uncertainLegsCount * this.weights.UNCERTAIN_LEG_SCORE_PENALTY
        );
    }
  }

  /**
   * Generates deterministic human-readable explanations based on candidate metrics.
   */
  generateExplanation(
    candidate: MultimodalJourneyCandidate,
    preference: RoutingOptimizationPreference
  ): { tag: string; description: string } {
    const isDirectMetro =
      candidate.metroInterchangeCount === 0 &&
      candidate.transportModeChangeCount === 0 &&
      candidate.legs.some((l) => l.mode === "metro");

    const walkKm = Math.round((candidate.totalWalkingMeters / 1000) * 10) / 10;
    const durationMins = Math.round(candidate.totalActualDurationSeconds / 60);

    if (preference === "least_walking") {
      return {
        tag: "Least Walking",
        description: `Minimizes pedestrian effort to ${walkKm} km total walk (${durationMins} min journey).`,
      };
    }

    if (preference === "fewest_interchanges") {
      return {
        tag: "Fewest Changes",
        description: isDirectMetro
          ? `Direct continuous corridor without transfers (${durationMins} mins).`
          : `Lowest number of interchanges (${candidate.metroInterchangeCount} metro transfer).`,
      };
    }

    if (preference === "fastest") {
      return {
        tag: "Fastest Route",
        description: `Shortest estimated door-to-door travel duration (${durationMins} mins).`,
      };
    }

    if (isDirectMetro) {
      return {
        tag: "Recommended · Direct",
        description: `Direct single-line metro journey with ${walkKm} km access walk (${durationMins} mins).`,
      };
    }

    if (candidate.metroInterchangeCount === 1) {
      return {
        tag: "Recommended · 1 Transfer",
        description: `Fastest connected transit corridor with 1 convenient interchange (${durationMins} mins).`,
      };
    }

    return {
      tag: "Multimodal Transit",
      description: `Optimized combination of metro and feeder legs (${durationMins} mins).`,
    };
  }
}

export const journeyScorer = new JourneyScorer();
