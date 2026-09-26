import { env } from './env.js';

export interface RankingWeights {
  service: number;
  location: number;
  verification: number;
  rating: number;
  reviews: number;
  experience: number;
  completedJobs: number;
  availability: number;
}

export const rankingWeights: RankingWeights = {
  service: env.RANK_W_SERVICE,
  location: env.RANK_W_LOCATION,
  verification: env.RANK_W_VERIFICATION,
  rating: env.RANK_W_RATING,
  reviews: env.RANK_W_REVIEWS,
  experience: env.RANK_W_EXPERIENCE,
  completedJobs: env.RANK_W_COMPLETED,
  availability: env.RANK_W_AVAILABILITY,
};

// Fail fast at boot rather than silently producing skewed results.
const total = Object.values(rankingWeights).reduce((a, b) => a + b, 0);
if (Math.abs(total - 1) > 0.001) {
  throw new Error(
    `Ranking weights must sum to 1.0 (got ${total.toFixed(3)}). Check RANK_W_* environment variables.`,
  );
}

/** Normalisation ceilings — tunable, documented, not magic numbers buried in a query. */
export const rankingNormalizers = {
  reviews: 20,
  experienceYears: 10,
  completedJobs: 50,
};