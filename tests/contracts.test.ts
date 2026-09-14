import type { AttentionTransition, InterpretationState, CapabilityRequest, CapabilityLease, GovernanceDecision, GovernanceContext, SignalEvidence } from '../src/types';

type Assert<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

export type AttentionOnlyReturnsInterpretation = Assert<Equal<ReturnType<AttentionTransition>, InterpretationState>>;
export type AttentionFields = Assert<Equal<keyof InterpretationState, 'kind' | 'attention' | 'hypothesis' | 'evidenceIds' | 'confidence' | 'concern' | 'disagreement' | 'updatedAt' | 'persistence'>>;
export type RequestsAreNotLeases = Assert<Equal<CapabilityRequest extends CapabilityLease ? true : false, false>>;
export type LeasesAreNotRequests = Assert<Equal<CapabilityLease extends CapabilityRequest ? true : false, false>>;
export type EveryDecisionHasAudit = Assert<Equal<GovernanceDecision extends { readonly audit: unknown } ? true : false, true>>;
export type SalienceIsTransient = Assert<Equal<InterpretationState['persistence'], 'transient'>>;

declare const request: CapabilityRequest;
declare const lease: CapabilityLease;
// @ts-expect-error Requesting capability does not issue a lease.
const invalidLease: CapabilityLease = request;
// @ts-expect-error The attention contract cannot return authority.
const invalidAttention: AttentionTransition = () => lease;
// @ts-expect-error Governance decisions cannot omit audit events.
const unaudited: GovernanceDecision = { decisionId: 'd1', decidedAt: 0, reason: 'policy', outcome: 'DENY', requestId: 'r1' };
void [invalidLease, invalidAttention, unaudited];

export type PolicyHasNoInterpretationInput = Assert<Equal<Extract<keyof GovernanceContext, 'attention' | 'confidence' | 'concern' | 'interpretation'>, never>>;

export type EvidenceIsNotAuthority = Assert<Equal<SignalEvidence extends CapabilityLease ? true : false, false>>;
export type PolicyHasNoEvidenceInput = Assert<Equal<Extract<keyof GovernanceContext, 'evidence' | 'description' | 'note'>, never>>;
