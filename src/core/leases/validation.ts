import type { CapabilityLease } from './index';
import type { ScopedCapability } from '../capabilities';
import type { TransitionAuditEvent } from '../audit';

export interface RevocationState {
  readonly epoch: number;
  readonly revokedNonces: readonly string[];
}
export type LeaseValidation = { readonly valid: true } | { readonly valid: false; readonly reason: string };

/** Explicit field checks; telemetry access may narrow an issued sensor scope. */
export function scopeAllows(granted: ScopedCapability, requested: ScopedCapability): boolean {
  switch (granted.capability) {
    case 'grid.telemetry.read':
      return requested.capability === granted.capability && requested.scope.gridId === granted.scope.gridId &&
        requested.scope.sensorIds.length > 0 && requested.scope.sensorIds.every(id => granted.scope.sensorIds.includes(id));
    case 'operator.notify':
      return requested.capability === granted.capability && requested.scope.operatorId === granted.scope.operatorId && requested.scope.channel === granted.scope.channel;
    case 'grid.control.breaker':
      return requested.capability === granted.capability && requested.scope.gridId === granted.scope.gridId && requested.scope.breakerId === granted.scope.breakerId && requested.scope.action === granted.scope.action;
    case 'memory.canonical.write':
      return requested.capability === granted.capability && requested.scope.namespace === granted.scope.namespace && requested.scope.recordId === granted.scope.recordId;
  }
}

/** Resolve by ID from the governance-owned registry, never trust a supplied lease object. */
export function validateLease(
  leases: readonly CapabilityLease[], leaseId: string, target: ScopedCapability,
  subjectId: string, now: number, revocations: RevocationState,
): LeaseValidation {
  const lease = leases.find(item => item.leaseId === leaseId);
  const fail = (reason: string): LeaseValidation => ({ valid: false, reason });
  if (!lease) return fail('Lease does not exist');
  if (lease.status !== 'ACTIVE') return fail(`Lease is ${lease.status}`);
  if (!Number.isFinite(now) || now < lease.issuedAt) return fail('Lease is not yet valid');
  if (now >= lease.expiresAt) return fail('Lease expired');
  if (lease.subjectId !== subjectId) return fail('Wrong subject');
  if (lease.target.capability !== target.capability) return fail('Wrong capability');
  if (!scopeAllows(lease.target, target)) return fail('Out of scope');
  if (revocations.revokedNonces.includes(lease.nonce)) return fail('Nonce revoked');
  if (lease.epoch !== revocations.epoch) return fail('Global epoch invalidated lease');
  return { valid: true };
}

/** Caller appends the required event to its audit trail before publishing state. */
export function revokeNonce(state: RevocationState, nonce: string, now: number, eventId: string, reason: string): { state: RevocationState; audit: TransitionAuditEvent } {
  return {
    state: { ...state, revokedNonces: [...new Set([...state.revokedNonces, nonce])] },
    audit: { kind: 'transition-audit', eventId, occurredAt: now, actorId: 'kingpin', eventType: 'NONCE_REVOKED', previousState: state.revokedNonces.includes(nonce) ? 'REVOKED' : 'NOT_REVOKED', nextState: 'REVOKED', reason: `${reason} (nonce: ${nonce})` },
  };
}

export function revokeAll(state: RevocationState, now: number, eventId: string, reason: string): { state: RevocationState; audit: TransitionAuditEvent } {
  return {
    state: { ...state, epoch: state.epoch + 1 },
    audit: { kind: 'transition-audit', eventId, occurredAt: now, actorId: 'kingpin', eventType: 'EPOCH_BUMPED', previousState: String(state.epoch), nextState: String(state.epoch + 1), reason },
  };
}
