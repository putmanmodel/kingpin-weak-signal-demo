import type { InterpretationState, SignalEvidence } from '../attention';
import { applyAttention } from '../attention/transition';
import type { SimulationAuditEvent, TransitionAuditEvent } from '../audit';
import type { CapabilityLease } from '../leases';
import { validateLease } from '../leases/validation';
import type { RevocationState } from '../leases/validation';
import type { GovernanceDecision } from '../governance';
import { evaluateRequest } from '../governance/policy';
import type { ScenarioStep, LeaseAttempt } from '../../types/scenario';

export interface OperationResult {
  readonly attempt: LeaseAttempt;
  readonly at: number;
  readonly outcome: 'ALLOW' | 'DENY';
  readonly reason: string;
}
export interface SimulationState {
  readonly operations: readonly OperationResult[];
  readonly currentStepIndex: number;
  readonly now: number;
  readonly interpretation: InterpretationState;
  readonly evidence: readonly SignalEvidence[];
  readonly leases: readonly CapabilityLease[];
  readonly decisions: readonly GovernanceDecision[];
  readonly audit: readonly SimulationAuditEvent[];
  readonly revocations: RevocationState;
  readonly canonicalMemoryWrite: false;
}

const initial = (): SimulationState => ({ currentStepIndex: -1, now: 0,
  interpretation: { kind: 'interpretation', attention: 'OBSERVE', confidence: .08, concern: .11, disagreement: .05, hypothesis: 'No anomaly established', evidenceIds: [], updatedAt: 0, persistence: 'transient' },
  operations: [], evidence: [], leases: [], decisions: [], audit: [], revocations: { epoch: 0, revokedNonces: [] }, canonicalMemoryWrite: false,
});

export function activeLeases(state: SimulationState): readonly CapabilityLease[] {
  return state.leases.filter(lease => validateLease(state.leases, lease.leaseId, lease.target, lease.subjectId, state.now, state.revocations).valid);
}

/** Replay recomputes from declarative inputs. No timers, random IDs, or wall clock. */
export function replayScenario(steps: readonly ScenarioStep[], through = steps.length - 1): SimulationState {
  if (!Number.isInteger(through) || through < -1 || through >= steps.length) throw new Error('Invalid step index');
  let state = initial();
  let cachedAt = 0;
  const requestHistory: NonNullable<import('../governance').GovernanceContext['requestHistory']>[number][] = [];
  const operations: OperationResult[] = [];
  const audit: SimulationAuditEvent[] = [];
  const decisions: GovernanceDecision[] = [];
  let leases: CapabilityLease[] = [];
  const emit = (event: Omit<TransitionAuditEvent, 'kind' | 'eventId'>) => audit.push({ ...event, kind: 'transition-audit', eventId: `event-${audit.length + 1}` });
  const expire = (now: number) => {
    for (const lease of [...leases].sort((a, b) => a.expiresAt - b.expiresAt)) {
      if (lease.status === 'ACTIVE' && lease.expiresAt <= now) {
        leases = leases.map(item => item.leaseId === lease.leaseId ? { ...item, status: 'EXPIRED' } : item);
        emit({ occurredAt: lease.expiresAt, actorId: 'kingpin', eventType: 'LEASE_EXPIRED', leaseId: lease.leaseId, requestId: lease.requestId, previousState: 'ACTIVE', nextState: 'EXPIRED', reason: 'Temporary scoped lease reached its expiration time.' });
      }
    }
  };
  for (let index = 0; index <= through; index++) {
    const step = steps[index]!;
    if (!Number.isFinite(step.at) || step.at < state.now) throw new Error('Scenario time must be monotonic');
    let interpretation = state.interpretation;
    let lastTime = state.now;
    for (const update of step.attentionUpdates) {
      if (!Number.isFinite(update.at) || update.at < lastTime || update.at > step.at) throw new Error('Attention update time must lie in the current step interval');
      expire(update.at);
      const previous = interpretation;
      interpretation = applyAttention(previous, update, step.evidence.filter(item => item.observedAt <= update.at), update.at);
      emit({ occurredAt: update.at, actorId: 'interpretation', eventType: 'ATTENTION_CHANGED', previousState: JSON.stringify(previous), nextState: JSON.stringify(interpretation), reason: update.reason });
      lastTime = update.at;
    }
    expire(step.at);
    if (step.controlPolicyCachedAt !== undefined) {
      emit({ occurredAt: step.at, actorId: 'kingpin', eventType: 'CONTEXT_CHANGED', previousState: `cachedAt=${cachedAt}`, nextState: `cachedAt=${step.controlPolicyCachedAt}`, reason: 'Control-policy cache timestamp updated; interpretation is independent.' });
      cachedAt = step.controlPolicyCachedAt;
    }
    for (const item of step.evidence.filter(item => item.trust === 'UNTRUSTED')) {
      emit({ occurredAt: step.at, actorId: 'input-trust', eventType: 'INPUT_FLAGGED', evidenceId: item.id, previousState: 'RECEIVED', nextState: 'UNTRUSTED', reason: `Evidence ${item.id} is an untrusted operational-note fixture. Instructions inside data are not authority. External content cannot grant capability or change policy.` });
    }
    for (const request of step.capabilityRequests) {
      const previousDecision = [...decisions].reverse().find(decision => 'requestId' in decision && decision.requestId === request.requestId);
      emit({ occurredAt: step.at, actorId: request.requestedBy, eventType: 'REQUESTED', requestId: request.requestId, previousState: previousDecision?.outcome ?? 'NONE', nextState: 'REQUESTED', reason: request.rationale });
      const decision = evaluateRequest(request, { requestHistory, policyId: 'grid-demo-v1', now: step.at, existingLeases: leases, controlPolicyCachedAt: cachedAt, controlPolicyMaxAgeMs: 15_000, epoch: state.revocations.epoch, decisionSequence: decisions.length + 1 });
      requestHistory.push({ subjectId: request.requestedBy, capability: request.target.capability, at: step.at, outcome: decision.outcome });
      decisions.push(decision);
      audit.push(decision.audit);
      if (decision.outcome === 'GRANT' || decision.outcome === 'GRANT_MODIFIED') leases.push(decision.lease);
    }
    for (const attempt of step.leaseAttempts ?? []) {
      const validation = validateLease(leases, attempt.leaseId, attempt.target, attempt.subjectId, step.at, state.revocations);
      const result: OperationResult = { attempt, at: step.at, outcome: validation.valid ? 'ALLOW' : 'DENY', reason: validation.valid ? 'Operation authorized by the existing scoped lease; no new capability issued.' : validation.reason };
      operations.push(result);
      emit({ occurredAt: step.at, actorId: 'kingpin', eventType: validation.valid ? 'OPERATION_ALLOWED' : 'OPERATION_DENIED', leaseId: attempt.leaseId, requestId: attempt.attemptId, previousState: 'LEASE_PRESENTED', nextState: result.outcome, reason: `${attempt.target.capability}: ${result.reason}` });
    }
    state = { ...state, operations, currentStepIndex: index, now: step.at, interpretation, evidence: [...state.evidence, ...step.evidence], leases, decisions, audit };
  }
  return structuredClone(state);
}

export type RunnerStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETE';

/** start/resume enables manual stepping; pause freezes advancement until start. */
export class ScenarioRunner {
  private readonly steps: readonly ScenarioStep[];
  private state: SimulationState = initial();
  private mode: RunnerStatus = 'IDLE';
  constructor(steps: readonly ScenarioStep[]) {
    if (!steps.length) throw new Error('Scenario requires at least one step');
    this.steps = structuredClone(steps);
  }
  get snapshot(): SimulationState { return structuredClone(this.state); }
  get status(): RunnerStatus { return this.mode; }
  start(): SimulationState {
    if (this.mode === 'COMPLETE') return this.snapshot;
    this.mode = 'RUNNING';
    return this.state.currentStepIndex === -1 ? this.next() : this.snapshot;
  }
  pause(): SimulationState { if (this.mode === 'RUNNING') this.mode = 'PAUSED'; return this.snapshot; }
  next(): SimulationState {
    if (this.mode !== 'RUNNING') return this.snapshot;
    this.state = replayScenario(this.steps, Math.min(this.state.currentStepIndex + 1, this.steps.length - 1));
    if (this.state.currentStepIndex === this.steps.length - 1) this.mode = 'COMPLETE';
    return this.snapshot;
  }
  previous(): SimulationState {
    this.state = replayScenario(this.steps, Math.max(-1, this.state.currentStepIndex - 1));
    this.mode = this.state.currentStepIndex === -1 ? 'IDLE' : 'PAUSED';
    return this.snapshot;
  }
  reset(): SimulationState { this.state = initial(); this.mode = 'IDLE'; return this.snapshot; }
  restart(): SimulationState { this.reset(); return this.start(); }
}
