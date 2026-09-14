import type { ScopedCapability } from '../capabilities';
import type { Timestamp } from '../../types/common';

/** Only governance issues leases. IDs/nonces must be unique within a demo run.
 * Sensitive use must validate subject, scope, nonce, status and time:
 * issuedAt <= now < expiresAt. An ACTIVE label alone is not proof of validity.
 */
export interface CapabilityLease {
  readonly kind: 'capability-lease';
  readonly leaseId: string;
  readonly requestId: string;
  readonly subjectId: string;
  readonly target: ScopedCapability;
  readonly issuedAt: Timestamp;
  readonly expiresAt: Timestamp;
  readonly nonce: string;
  readonly epoch: number;
  readonly status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  readonly revocationReason?: string;
}
