import type { AuditEvent } from '../audit';
import type { CapabilityRequest } from '../capabilities';
import type { CapabilityLease } from '../leases';
import type { Timestamp } from '../../types/common';

type NonGrantDecision = {
  [Outcome in 'DENY' | 'HUMAN_REVIEW' | 'QUARANTINE']: {
    readonly outcome: Outcome;
    readonly requestId: string;
    readonly lease?: never;
    readonly audit: AuditEvent & { readonly outcome: Outcome };
  }
}['DENY' | 'HUMAN_REVIEW' | 'QUARANTINE'];

interface DecisionBase {
  readonly decisionId: string;
  readonly decidedAt: Timestamp;
  readonly reason: string;
}

/** Mandatory, outcome-matched audit record for every decision.
 * Governance adjudicates permission; it does not establish interpretation truth.
 */
export type GovernanceDecision = DecisionBase & (
  | { readonly outcome: 'GRANT'; readonly requestId: string; readonly lease: CapabilityLease & { readonly status: 'ACTIVE' }; readonly audit: AuditEvent & { readonly outcome: 'GRANT' } }
  | { readonly outcome: 'GRANT_MODIFIED'; readonly requestId: string; readonly lease: CapabilityLease & { readonly status: 'ACTIVE' }; readonly audit: AuditEvent & { readonly outcome: 'GRANT_MODIFIED' } }
  | NonGrantDecision
  | { readonly outcome: 'REVOKE'; readonly lease: CapabilityLease & { readonly status: 'REVOKED' }; readonly audit: AuditEvent & { readonly outcome: 'REVOKE' } }
);

/** Explicit policy input, independent of attention, confidence and concern. */
export interface GovernanceContext {
  readonly requestHistory?: readonly { subjectId: string; capability: CapabilityRequest["target"]["capability"]; at: number; outcome: GovernanceDecision["outcome"] }[];
  readonly policyId: string;
  readonly controlPolicyCachedAt: Timestamp;
  readonly controlPolicyMaxAgeMs: number;
  readonly epoch: number;
  readonly decisionSequence: number;
  readonly now: Timestamp;
  readonly existingLeases: readonly CapabilityLease[];
}

export type GovernanceTransition = (
  request: CapabilityRequest,
  context: GovernanceContext,
) => GovernanceDecision;
