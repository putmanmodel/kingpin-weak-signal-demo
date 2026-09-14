import type { SignalEvidence, AttentionState } from '../core/attention';
import type { CapabilityRequest, ScopedCapability } from '../core/capabilities';
import type { Timestamp } from './common';

export interface AttentionUpdate {
  readonly at: Timestamp;
  readonly attention: AttentionState;
  readonly confidence: number;
  readonly concern: number;
  readonly disagreement: number;
  readonly hypothesis: string;
  readonly reason: string;
}

/** Declarative evidence/interpretation and policy inputs remain separate. */
export interface LeaseAttempt {
  readonly attemptId: string;
  readonly leaseId: string;
  readonly subjectId: string;
  readonly target: ScopedCapability;
}

export interface ScenarioStep {
  readonly leaseAttempts?: readonly LeaseAttempt[];
  readonly id: string;
  readonly at: Timestamp;
  readonly label: string;
  readonly evidence: readonly SignalEvidence[];
  readonly attentionUpdates: readonly AttentionUpdate[];
  readonly capabilityRequests: readonly CapabilityRequest[];
  readonly controlPolicyCachedAt?: Timestamp;
}
