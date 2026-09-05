/**
 * Kolkata Multimodal Journey Optimization Scoring Weights
 * 
 * CRITICAL PRODUCT PRINCIPLE:
 * These penalties exist SOLELY to influence recommendation and ranking algorithms.
 * They DO NOT artificially inflate the user-facing journey travel duration.
 * Total displayed travel duration is strictly computed from actual leg durations.
 */

export interface RoutingScoreWeights {
  /**
   * Added to routing score per metro line interchange.
   * Reflects stairs, security concourse traversal, and headway dwell.
   */
  METRO_INTERCHANGE_SCORE_PENALTY: number;

  /**
   * Added to routing score when changing transport mode (e.g. Bus -> Metro or Metro -> Auto).
   * Penalizes excessive transit hopping for smoother passenger experience.
   */
  MODE_CHANGE_SCORE_PENALTY: number;

  /**
   * Multiplier on walking seconds in the Recommended cost formula.
   * Slightly biases against excessive walking in Kolkata's tropical climate.
   */
  WALKING_SCORE_MULTIPLIER: number;

  /**
   * Added to routing score for informal transit (auto/toto) where schedule is unverified.
   */
  UNCERTAIN_LEG_SCORE_PENALTY: number;
}

export const DEFAULT_ROUTING_WEIGHTS: RoutingScoreWeights = {
  METRO_INTERCHANGE_SCORE_PENALTY: 360, // ~6 minutes score penalty
  MODE_CHANGE_SCORE_PENALTY: 480,       // ~8 minutes score penalty
  WALKING_SCORE_MULTIPLIER: 1.3,        // 30% penalty on walking duration
  UNCERTAIN_LEG_SCORE_PENALTY: 240,     // ~4 minutes uncertainty penalty
};
