/**
 * Regras first/last seen / misses — testáveis sem DB.
 * Não marcar removed em 1 miss. Após MISS_THRESHOLD runs completas → possibly_removed
 * → depois removed_from_operator_network. Runs com limit baixo não aplicam misses.
 */

export const DEFAULT_MISS_THRESHOLD = 3;
export const LIMITED_RUN_SKIP_MISSES = 50;

export type MissDecision = {
  apply: boolean;
  reason: string;
  nextMisses?: number;
  nextStatus?: string;
};

export function shouldSkipMissesForLimitedRun(limit: number | undefined | null): boolean {
  return limit != null && limit > 0 && limit < LIMITED_RUN_SKIP_MISSES;
}

export function nextMissStatus(opts: {
  consecutiveMisses: number;
  currentStatus: string;
  missThreshold?: number;
}): { consecutiveMisses: number; status: string } {
  const threshold = opts.missThreshold ?? DEFAULT_MISS_THRESHOLD;
  const misses = opts.consecutiveMisses + 1;
  let status = opts.currentStatus;
  if (misses >= threshold && status === "possibly_removed") {
    status = "removed_from_operator_network";
  } else if (misses >= threshold) {
    status = "possibly_removed";
  }
  return { consecutiveMisses: misses, status };
}

export function evaluateMiss(opts: {
  seenInRun: boolean;
  limit?: number | null;
  consecutiveMisses: number;
  currentStatus: string;
  missThreshold?: number;
}): MissDecision {
  if (opts.seenInRun) {
    return { apply: false, reason: "seen_in_run" };
  }
  if (shouldSkipMissesForLimitedRun(opts.limit)) {
    return { apply: false, reason: "limited_run" };
  }
  const next = nextMissStatus({
    consecutiveMisses: opts.consecutiveMisses,
    currentStatus: opts.currentStatus,
    missThreshold: opts.missThreshold,
  });
  return {
    apply: true,
    reason: "miss",
    nextMisses: next.consecutiveMisses,
    nextStatus: next.status,
  };
}
