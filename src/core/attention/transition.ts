import type { InterpretationState, SignalEvidence } from './index';

/** Scripted interpretation updates cannot return or issue a lease. */
export function applyAttention(
  previous: InterpretationState,
  update: Pick<InterpretationState, 'attention' | 'confidence' | 'concern' | 'disagreement' | 'hypothesis'>,
  evidence: readonly SignalEvidence[], now: number,
): InterpretationState {
  for (const value of [update.confidence, update.concern, update.disagreement]) {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error('Interpretation scores must be in [0, 1]');
  }
  return { kind: 'interpretation', attention: update.attention, confidence: update.confidence,
    concern: update.concern, disagreement: update.disagreement, hypothesis: update.hypothesis,
    evidenceIds: [...new Set([...previous.evidenceIds, ...evidence.map(item => item.id)])],
    updatedAt: now, persistence: 'transient' };
}
