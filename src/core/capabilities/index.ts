import type { Timestamp } from '../../types/common';

/** Capability-specific scope prevents a breaker request from naming a memory scope. */
export type ScopedCapability =
  | { readonly capability: 'grid.telemetry.read'; readonly scope: { readonly gridId: string; readonly sensorIds: readonly string[] } }
  | { readonly capability: 'operator.notify'; readonly scope: { readonly operatorId: string; readonly channel: 'demo-console' } }
  | { readonly capability: 'grid.control.breaker'; readonly scope: { readonly gridId: string; readonly breakerId: string; readonly action: 'open' | 'close' } }
  | { readonly capability: 'memory.canonical.write'; readonly scope: { readonly namespace: string; readonly recordId: string } };

/** Requests express need, never authority. Canonical writes require explicit governance. */
export interface CapabilityRequest {
  readonly kind: 'capability-request';
  readonly requestId: string;
  readonly requestedBy: string;
  readonly requestedAt: Timestamp;
  readonly target: ScopedCapability;
  readonly requestedDurationMs: number;
  readonly rationale: string;
}
