import type { Timestamp } from '../../types/common';

export type GovernanceOutcome = 'GRANT' | 'GRANT_MODIFIED' | 'DENY' | 'HUMAN_REVIEW' | 'QUARANTINE' | 'REVOKE';

export interface RetryAudit {
  readonly requestCount: number;
  readonly priorOutcome: GovernanceOutcome | null;
  readonly windowMs: number;
  readonly priorNonGrantLimit: number;
  readonly status: 'WITHIN_LIMIT' | 'LIMIT_REACHED' | 'CLAMPED';
}

/** Every governance transition must return an event for the audit consumer. */
export interface AuditEvent {
  readonly kind: 'governance-audit';
  readonly eventId: string;
  readonly decisionId: string;
  readonly occurredAt: Timestamp;
  readonly actorId: string;
  readonly outcome: GovernanceOutcome;
  readonly reason: string;
  readonly eventType: 'POLICY_DECISION';
  readonly retry: RetryAudit;
  readonly previousState: string;
  readonly nextState: string;
  readonly requestId?: string;
  readonly leaseId?: string;
}

/** Non-policy transitions share the same deterministic audit envelope. */
export interface TransitionAuditEvent {
  readonly kind: 'transition-audit';
  readonly eventId: string;
  readonly occurredAt: Timestamp;
  readonly actorId: string;
  readonly evidenceId?: string;
  readonly eventType: 'ATTENTION_CHANGED' | 'REQUESTED' | 'LEASE_EXPIRED' | 'NONCE_REVOKED' | 'EPOCH_BUMPED' | 'CONTEXT_CHANGED' | 'INPUT_FLAGGED' | 'OPERATION_ALLOWED' | 'OPERATION_DENIED';
  readonly previousState: string;
  readonly nextState: string;
  readonly reason: string;
  readonly requestId?: string;
  readonly leaseId?: string;
}

export type SimulationAuditEvent = AuditEvent | TransitionAuditEvent;
