import type { ScenarioStep, AttentionUpdate } from '../../types/scenario';
import type { CapabilityRequest, ScopedCapability } from '../../core/capabilities';

const update = (at: number, attention: AttentionUpdate['attention'], confidence: number, concern: number, disagreement: number, reason: string): AttentionUpdate => ({ at, attention, confidence, concern, disagreement, hypothesis: 'Possible feeder-12 anomaly', reason });
const request = (requestId: string, at: number, target: ScopedCapability, rationale: string): CapabilityRequest => ({ kind: 'capability-request', requestId, requestedBy: 'demo-agent', requestedAt: at, target, requestedDurationMs: 25_000, rationale });
const breaker: ScopedCapability = { capability: 'grid.control.breaker', scope: { gridId: 'feeder-12', breakerId: 'breaker-12', action: 'open' } };

export const gridAnomalyScenario: readonly ScenarioStep[] = [
  { id: 'normal', at: 0, label: 'Normal', evidence: [], attentionUpdates: [update(0, 'OBSERVE', .08, .11, .05, 'Baseline telemetry is normal.')], capabilityRequests: [] },
  { id: 'weak', at: 10_000, label: 'Weak anomaly', evidence: [
    { id: 'a-deviation', source: 'Sensor A', observedAt: 10_000, description: 'Sensor A deviates.' },
    { id: 'b-normal', source: 'Sensor B', observedAt: 10_000, description: 'Sensor B remains normal.' },
  ], attentionUpdates: [update(10_000, 'WATCH', .24, .30, .35, 'One sensor deviates while the other remains normal.')], capabilityRequests: [] },
  { id: 'persistent', at: 20_000, label: 'Persistent disagreement', evidence: [
    { id: 'persistent-deviation', source: 'Estimator pair', observedAt: 20_000, description: 'Deviation persists; estimators disagree.' },
  ], attentionUpdates: [update(20_000, 'ELEVATED', .42, .55, .78, 'Persistence and disagreement justify requesting more telemetry.')], capabilityRequests: [request('read-1', 20_000, { capability: 'grid.telemetry.read', scope: { gridId: 'feeder-12', sensorIds: ['A', 'B'] } }, 'Resolve estimator disagreement')] },
  { id: 'strengthening', at: 30_000, label: 'Evidence strengthens', evidence: [
    { id: 'thermal', source: 'Independent thermal monitor', observedAt: 30_000, description: 'A thermal deviation converges with the electrical anomaly.' },
  ], attentionUpdates: [update(30_000, 'ELEVATED', .74, .78, .30, 'An independent evidence dimension converges.')], capabilityRequests: [request('notify-1', 30_000, { capability: 'operator.notify', scope: { operatorId: 'grid-operator', channel: 'demo-console' } }, 'Notify operator of converging evidence')] },
  { id: 'critical', at: 40_000, label: 'Critical demonstration', controlPolicyCachedAt: 40_000, evidence: [
    { id: 'corroborated', source: 'Independent monitors', observedAt: 40_000, description: 'Electrical and thermal evidence strongly corroborate the anomaly.' },
  ], attentionUpdates: [update(40_000, 'CORROBORATED', .96, .93, .08, 'Strong corroboration raises attention, not authority.')], capabilityRequests: [request('control-1', 40_000, breaker, 'Request breaker isolation for corroborated anomaly')] },
  { id: 'stale', at: 50_000, label: 'Stale governance context', controlPolicyCachedAt: 20_000, evidence: [], attentionUpdates: [update(50_000, 'CORROBORATED', .96, .93, .08, 'Physical evidence remains credible despite stale governance context.')], capabilityRequests: [request('control-1', 50_000, breaker, 'Re-evaluate pending control request with cached policy context')] },
  { id: 'recovery', at: 80_000, label: 'Recovery / decay', evidence: [
    { id: 'recovery', source: 'Independent monitors', observedAt: 60_000, description: 'Electrical and thermal readings return toward baseline.' },
  ], attentionUpdates: [
    update(60_000, 'ELEVATED', .62, .55, .16, 'Anomaly begins weakening.'),
    update(70_000, 'WATCH', .28, .25, .10, 'Recovery persists.'),
    update(80_000, 'OBSERVE', .08, .11, .05, 'Telemetry settles near baseline.'),
  ], capabilityRequests: [request('memory-1', 80_000, { capability: 'memory.canonical.write', scope: { namespace: 'grid', recordId: 'feeder-12-anomaly' } }, 'Consider persisting the earlier corroborated interpretation')] },
];
