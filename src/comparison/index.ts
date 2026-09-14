import type { InterpretationState } from '../core/attention';
import { activeLeases } from '../core/simulation';
import type { SimulationState } from '../core/simulation';

/** Deliberately naive teaching example. Returns a recommendation, never a lease.
 * This module is not imported by governance, interpretation, or the runner.
 */
export function naiveRecommendation(input: Pick<InterpretationState, 'confidence' | 'concern'>) {
  return input.confidence > .90 && input.concern > .80
    ? 'AUTO_ISOLATE_FEEDER' as const
    : 'NO_AUTOMATIC_CONTROL' as const;
}

/** One snapshot, one evidence stream. Kingpin's actual decision is read, not rerun. */
export function compareSnapshot(state: SimulationState) {
  return {
    at: state.now,
    evidence: state.evidence,
    interpretation: state.interpretation,
    naive: naiveRecommendation(state.interpretation),
    governed: {
      decision: state.decisions.at(-1),
      operation: [...state.operations].reverse().find(item => item.at === state.now),
      leases: activeLeases(state),
    },
  };
}
