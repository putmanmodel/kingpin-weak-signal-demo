import type { GovernanceDecision, GovernanceTransition } from './index';
import type { AuditEvent, RetryAudit } from '../audit';
import { scopeAllows } from '../leases/validation';
import type { ScopedCapability } from '../capabilities';

/** Trusted history is keyed by subject/capability, independent of wording, ID or scope. */
export const RETRY_POLICY = Object.freeze({ windowMs: 30_000, priorNonGrantLimit: 2 });

const allowed: readonly ScopedCapability[] = [
  { capability: 'grid.telemetry.read', scope: { gridId: 'feeder-12', sensorIds: ['A', 'B'] } },
  { capability: 'operator.notify', scope: { operatorId: 'grid-operator', channel: 'demo-console' } },
];

/** No interpretation input. Need and confidence cannot satisfy a permission rule. */
export const evaluateRequest: GovernanceTransition = (request, context) => {
  const priorFailures = (context.requestHistory ?? []).filter(item =>
    item.subjectId === request.requestedBy && item.capability === request.target.capability &&
    item.at <= context.now && item.at > context.now - RETRY_POLICY.windowMs &&
    ['DENY', 'HUMAN_REVIEW', 'QUARANTINE'].includes(item.outcome));
  const retry: RetryAudit = {
    requestCount: priorFailures.length + 1,
    priorOutcome: priorFailures.at(-1)?.outcome ?? null,
    ...RETRY_POLICY,
    status: priorFailures.length > RETRY_POLICY.priorNonGrantLimit ? 'CLAMPED'
      : priorFailures.length === RETRY_POLICY.priorNonGrantLimit ? 'LIMIT_REACHED' : 'WITHIN_LIMIT',
  };
  const decisionId = `decision-${context.decisionSequence}`;
  const auditBase = {
    kind: 'governance-audit' as const, eventType: 'POLICY_DECISION' as const,
    eventId: `${decisionId}-audit`, decisionId, occurredAt: context.now,
    actorId: 'kingpin', retry, requestId: request.requestId, previousState: 'REQUESTED',
  };
  const nonGrant = <T extends 'DENY' | 'HUMAN_REVIEW' | 'QUARANTINE'>(outcome: T, reason: string) => ({
    decisionId, decidedAt: context.now, requestId: request.requestId, outcome, reason,
    audit: { ...auditBase, outcome, nextState: outcome, reason },
  }) as GovernanceDecision;

  if (context.policyId !== 'grid-demo-v1') return nonGrant('DENY', 'Unknown policy; fail closed.');
  if (!Number.isFinite(request.requestedDurationMs) || request.requestedDurationMs <= 0 || !Number.isFinite(context.now) || request.requestedAt > context.now) {
    return nonGrant('DENY', 'Invalid request time or lease duration.');
  }
  if (retry.status !== 'WITHIN_LIMIT') return nonGrant('DENY',
    `Retry limit: request ${retry.requestCount}; prior outcome ${retry.priorOutcome}. ${retry.status === 'LIMIT_REACHED' ? 'Retry policy activated.' : 'Retry remains clamped.'} Two prior non-grants within 30 seconds block this planner retry; wait for the rolling window to clear. Repetition cannot create authority.`);
  if (request.target.capability === 'grid.control.breaker') {
    const age = context.now - context.controlPolicyCachedAt;
    if (!Number.isFinite(age) || !Number.isFinite(context.controlPolicyMaxAgeMs) || context.controlPolicyMaxAgeMs < 0 || age < 0 || age > context.controlPolicyMaxAgeMs) {
      return nonGrant('QUARANTINE', 'Cached control-policy context is stale; hold the human/control request pending refresh. This governance failure does not disprove the anomaly.');
    }
    return nonGrant('HUMAN_REVIEW', 'High confidence and concern do not satisfy the authority requirement for direct control. A human must review; autonomous breaker control is prohibited.');
  }
  if (request.target.capability === 'memory.canonical.write') {
    return nonGrant('DENY', 'Transient salience and corroboration do not authorize canonical memory writes.');
  }
  if (!allowed.some(target => scopeAllows(target, request.target))) return nonGrant('DENY', 'Requested capability scope is outside the demo policy allowlist.');
  const duration = Math.min(request.requestedDurationMs, 25_000);
  const outcome = duration < request.requestedDurationMs ? 'GRANT_MODIFIED' : 'GRANT';
  const lease = {
    kind: 'capability-lease' as const, leaseId: `lease-${context.decisionSequence}`, requestId: request.requestId,
    subjectId: request.requestedBy, target: structuredClone(request.target), issuedAt: context.now,
    expiresAt: context.now + duration, nonce: `nonce-${context.epoch}-${context.decisionSequence}`,
    epoch: context.epoch, status: 'ACTIVE' as const,
  };
  const reason = `Policy permits temporary scoped ${request.target.capability}; no grid-control authority is conferred.${outcome === 'GRANT_MODIFIED' ? ' Duration capped at 25000 ms.' : ''}`;
  const audit: AuditEvent = { ...auditBase, outcome, nextState: 'ACTIVE', reason, leaseId: lease.leaseId };
  return outcome === 'GRANT'
    ? { decisionId, decidedAt: context.now, requestId: request.requestId, outcome, reason, lease, audit: { ...audit, outcome } }
    : { decisionId, decidedAt: context.now, requestId: request.requestId, outcome, reason, lease, audit: { ...audit, outcome } };
};
