import type { Timestamp } from '../../types/common';

export type AttentionState = 'OBSERVE' | 'WATCH' | 'ELEVATED' | 'CORROBORATED';

export interface SignalEvidence {
  readonly id: string;
  readonly source: string;
  readonly observedAt: Timestamp;
  readonly description: string;
  readonly value?: number;
  readonly unit?: string;
  /** Fixture provenance only; note content is never policy. */
  readonly trust?: "UNTRUSTED";
}

/** Interpretation is transient. Confidence/concern never change authority. */
export interface InterpretationState {
  readonly kind: 'interpretation';
  readonly attention: AttentionState;
  readonly hypothesis: string;
  readonly evidenceIds: readonly string[];
  /** Intended range [0, 1]; future input validation must enforce this. */
  readonly confidence: number;
  /** Intended range [0, 1]; concern is not permission. */
  readonly concern: number;
  readonly disagreement: number;
  readonly updatedAt: Timestamp;
  readonly persistence: 'transient';
}

/** No governance imports, lease output, capability issuer, or persistence hook. */
export type AttentionTransition = (
  previous: InterpretationState,
  evidence: readonly SignalEvidence[],
  now: Timestamp,
) => InterpretationState;
