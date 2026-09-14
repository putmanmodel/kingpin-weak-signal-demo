import { useEffect, useState } from 'react';
import { ScenarioRunner, activeLeases } from './core/simulation';
import { Comparison } from './components/Comparison';
import { AboutDemo } from './components/AboutDemo';
import { scenarioVariations } from './scenarios/variations';

const percent = (value: number) => `${Math.round(value * 100)}%`;
const time = (value: number) => `T+${(value / 1000).toFixed(0).padStart(2, '0')}s`;
const words = (value: string) => value.replaceAll('_', ' ');
const scope = (value: object) => Object.entries(value).map(([key, item]) => `${key}: ${Array.isArray(item) ? item.join(', ') : item}`).join(' · ');

export function App() {
  const [variation, setVariation] = useState(scenarioVariations[0]!);
  const steps = variation.steps;
  const [runner, setRunner] = useState(() => new ScenarioRunner(steps));
  const [state, setState] = useState(runner.snapshot);
  const [comparing, setComparing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const advance = () => {
    const next = runner.snapshot.currentStepIndex < 0 ? runner.start() : (runner.start(), runner.next());
    runner.pause();
    setState(next);
  };
  useEffect(() => {
    if (!playing) return;
    if (state.currentStepIndex === steps.length - 1) { setPlaying(false); return; }
    const timer = window.setTimeout(advance, 2400);
    return () => window.clearTimeout(timer);
  }, [playing, state.currentStepIndex, runner]);
  const step = steps[state.currentStepIndex];
  const interpretation = state.interpretation;
  const leases = activeLeases(state);
  const decision = state.decisions.at(-1);
  const operation = [...state.operations].reverse().find(item => item.at === state.now);
  const outcome = operation?.outcome ?? decision?.outcome;
  const rationale = operation?.reason ?? decision?.reason;
  const requests = step?.capabilityRequests ?? [];
  const evidence = state.evidence.filter(item => interpretation.evidenceIds.includes(item.id));
  const untrusted = evidence.some(item => item.trust === 'UNTRUSTED');
  const retry = decision?.audit.retry;
  const breaker = leases.some(item => item.target.capability === 'grid.control.breaker');
  const critical = requests.some(item => item.target.capability === 'grid.control.breaker');
  const events = [
    ...state.evidence.map(item => ({ id: `signal-${item.id}`, at: item.observedAt, category: 'SIGNAL', title: item.source, reason: item.description, data: item })),
    ...state.audit.map(item => ({ id: item.eventId, at: item.occurredAt, category: item.kind === 'governance-audit' ? 'KINGPIN' : item.eventType === 'ATTENTION_CHANGED' ? 'ATTENTION' : item.eventType === 'REQUESTED' ? 'REQUEST' : item.eventType === 'INPUT_FLAGGED' ? 'INPUT TRUST' : item.eventType === 'CONTEXT_CHANGED' ? 'DATA' : 'LEASE', title: item.kind === 'governance-audit' ? words(item.outcome) : words(item.eventType), reason: item.reason, data: item })),
  ].sort((a, b) => a.at - b.at);
  const selectedEvent = events.find(item => item.id === selected);
  const authority = [
    { label: 'None', active: leases.length === 0, detail: leases.length ? 'Capability leases are active' : 'No active capability leases' },
    { label: 'Read-only', active: leases.some(item => item.target.capability === 'grid.telemetry.read'), detail: 'Scoped telemetry access' },
    { label: 'Notify', active: leases.some(item => item.target.capability === 'operator.notify'), detail: 'Scoped operator notification' },
    { label: 'Human-approved action', active: breaker, detail: breaker ? 'Breaker capability lease present' : 'No breaker capability lease' },
  ];
  return <main>
    <header><div><p className="eyebrow">KINGPIN / SYSTEMS DEMONSTRATION</p><h1>Strong evidence. Bounded authority.</h1><p className="subtitle">A weak signal becomes credible. Permission remains a separate decision.</p></div><div className="header-actions"><span className="demo-tag">DETERMINISTIC · GRID 12</span><AboutDemo /></div></header>
    <section className="variation" aria-label="Failure injection"><div><label className="eyebrow" htmlFor="variation">FAILURE INJECTION / SCENARIO VARIATION</label><select id="variation" value={variation.id} onChange={event => {
      const nextVariation = scenarioVariations.find(item => item.id === event.target.value)!;
      const nextRunner = new ScenarioRunner(nextVariation.steps);
      setPlaying(false); setSelected(null); setVariation(nextVariation); setRunner(nextRunner); setState(nextRunner.snapshot);
    }}>{scenarioVariations.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div><div><strong>{variation.boundary}</strong><p>{variation.description}</p></div></section>
    <section className="controls" aria-label="Scenario controls"><div role="status"><span className="eyebrow">STEP {state.currentStepIndex + 1} / {steps.length}</span><strong>{step?.label ?? 'Ready to observe'}</strong><span className="clock">{time(state.now)}</span></div><nav><button onClick={() => { setPlaying(false); setState(runner.reset()); setSelected(null); }}>Reset</button><button disabled={state.currentStepIndex < 0} onClick={() => { setPlaying(false); setState(runner.previous()); }}>Previous</button><button onClick={() => setPlaying(!playing)} disabled={state.currentStepIndex === steps.length - 1}>{playing ? 'Pause' : 'Play'}</button><button className="primary" disabled={state.currentStepIndex === steps.length - 1} onClick={() => { setPlaying(false); advance(); }}>Next <span aria-hidden="true">→</span></button></nav></section>
    <div className="mode-bar"><strong>Concern ≠ confidence ≠ authority</strong><button aria-pressed={comparing} aria-controls="comparison" onClick={() => setComparing(!comparing)}>{comparing ? 'Hide comparison' : 'Compare naive vs governed'}</button></div>
    {comparing && <Comparison state={state} request={requests.map(item => item.target.capability).join(', ') || (operation ? 'existing lease validation' : 'none')} />}
    <div className="story" aria-label="Governance flow"><span>Evidence</span><b>→</b><span>Attention</span><b>→</b><span>Capability request</span><b>→</b><span>Kingpin</span><b>→</b><span>Grant / Deny / Human review</span></div>
    <div className="dashboard">
      <section className="panel attention"><div className="panel-heading"><span className="eyebrow">01 / INTERPRETATION</span><span className="chip">ATTENTION ONLY</span></div><h2>Attention lane</h2><ol className="lane">{['OBSERVE', 'WATCH', 'ELEVATED', 'CORROBORATED'].map(label => <li key={label} className={interpretation.attention === label ? 'current' : ''}><span className="node"/><span>{label}</span>{interpretation.attention === label && <small>Current</small>}</li>)}</ol><div className="metrics">{[['Confidence', interpretation.confidence], ['Concern', interpretation.concern], ['Estimator disagreement', interpretation.disagreement]].map(([label, value]) => <div key={label}><div><span title={label === 'Confidence' ? 'Credibility of the provisional interpretation; not permission.' : label === 'Concern' ? 'Potential significance of the anomaly; independent of confidence.' : 'How strongly estimators differ about the evidence.'}>{label}</span><strong>{percent(value as number)}</strong></div><meter min="0" max="1" value={value as number} aria-label={label as string}/></div>)}</div><h3>Current evidence sources</h3>{untrusted && <p role="status"><strong>INPUT TRUST: UNTRUSTED</strong><br/>External content cannot grant capability</p>}<ul className="evidence">{evidence.map(item => <li key={item.id}><strong>{item.source} {item.trust && <em className="trust-label">{item.trust} · DATA ONLY</em>}</strong><span>{item.description}</span></li>)}</ul>{!evidence.length && <p className="muted">No current anomaly evidence.</p>}<div className="interpretation"><span className="eyebrow">PROVISIONAL INTERPRETATION</span><p>{interpretation.hypothesis}</p><small>Transient · directs attention, never permission</small></div></section>
      <div className="boundary"><section className="panel request"><span className="eyebrow">02 / AGENT REQUEST</span><h2>{operation ? 'Present existing lease' : 'Request permission'}</h2>{operation && <div><code>{operation.attempt.target.capability}</code><dl><dt>Attempted scope</dt><dd>{scope(operation.attempt.target.scope)}</dd><dt>Lease presented</dt><dd>{operation.attempt.leaseId}</dd><dt>Agent</dt><dd>{operation.attempt.subjectId}</dd></dl></div>}{requests.length ? requests.map(request => <div key={request.requestId}><code>{request.target.capability}</code><p>{request.rationale}</p><dl><dt>Requested scope</dt><dd>{scope(request.target.scope)}</dd><dt>Requested duration</dt><dd>{request.requestedDurationMs / 1000} seconds</dd></dl></div>) : !operation && <p className="empty">No capability requested at this step.</p>}</section><div className="boundary-label"><strong>NO AUTHORITY TRANSFER</strong><p>Attention may justify a request.<br/>It does not transfer authority.</p><span aria-hidden="true">↓</span></div><section className={`panel decision ${critical ? 'critical' : ''}`}><span className="eyebrow">03 / KINGPIN GOVERNANCE</span><h2 className="outcome">{outcome ? words(outcome) : 'AWAITING REQUEST'}</h2>{critical && <div className="breaker-verdict">Autonomous breaker authority: <strong>{breaker ? 'LEASE PRESENT' : 'NOT GRANTED'}</strong></div>}<>{retry && retry.status !== 'WITHIN_LIMIT' && <p role="status"><strong>RETRY LIMIT REACHED</strong><br/>Request {retry.requestCount} · Prior outcome: {words(retry.priorOutcome ?? 'NONE')} · {words(retry.status)}<br/>Planner retry held by governance.</p>}</><p>{rationale ?? 'Governance evaluates explicit requests against policy and capability scope.'}</p>{critical && <div className="critical-summary"><div><span>Confidence / Concern</span><strong>{percent(interpretation.confidence)} / {percent(interpretation.concern)}</strong></div><div><span>Attention</span><strong>{interpretation.attention}</strong></div><div><span>Autonomous breaker authority</span><strong>{breaker ? 'LEASE PRESENT' : 'NOT GRANTED'}</strong></div><div><span>Route</span><strong>{decision && words(decision.outcome)}</strong></div></div>}</section></div>
      <section className="panel authority"><div className="panel-heading"><span className="eyebrow">04 / CAPABILITIES</span><span className="chip">LEASE-BASED</span></div><h2>Authority lane</h2><ol className="lane">{authority.map(item => <li key={item.label} className={item.active ? 'current' : ''}><span className="node"/><div>{item.label}<small>{item.detail}</small></div></li>)}</ol><p className="muted summary-note">Human-facing summary. Permissions come only from valid, scoped capability leases.</p><div className="lease-count"><strong>{leases.length.toString().padStart(2, '0')}</strong><span>active leases</span></div><h3>Requested capability</h3><p className="capability-name">{operation?.attempt.target.capability ?? (requests.map(item => item.target.capability).join(', ') || 'None')}</p>{outcome && ['DENY', 'HUMAN_REVIEW', 'QUARANTINE'].includes(outcome) && <div className="withheld"><span className="eyebrow">CAPABILITY WITHHELD</span><p>{operation?.attempt.target.capability ?? requests.map(item => item.target.capability).join(', ')}</p><strong>{words(outcome)}</strong></div>}</section>
    </div>
    <section className="panel lease-panel"><div className="section-title"><div><span className="eyebrow">CAPABILITY REGISTRY</span><h2>Leases & lifecycle</h2></div><span className="muted">Scenario clock · inspect a lease for its nonce</span></div>{!state.leases.length ? <p className="empty">No leases issued. Attention alone cannot create one.</p> : state.leases.map(lease => <details className="lease" key={lease.leaseId}><summary><code>{lease.target.capability}</code><span className={`status ${lease.status.toLowerCase()}`}>{lease.status}</span><span>Expires {time(lease.expiresAt)}</span></summary><dl><dt>Scope</dt><dd>{scope(lease.target.scope)}</dd><dt>Nonce</dt><dd><code>{lease.nonce}</code></dd><dt>Lease / subject</dt><dd>{lease.leaseId} / {lease.subjectId}</dd><dt>Issued / expires</dt><dd>{time(lease.issuedAt)} / {time(lease.expiresAt)}</dd><dt>Registry status</dt><dd>{lease.status}</dd></dl></details>)}</section>
    <div className="lower"><section className="panel audit"><div className="section-title"><div><span className="eyebrow">CHRONOLOGICAL RECORD</span><h2>Audit timeline</h2></div><span className="muted">{state.audit.length} audit events · {state.evidence.length} signals</span></div><p className="muted">Signal observations are shown alongside the engine audit.</p><div className="audit-layout"><ol className="timeline" aria-label="Scenario events">{events.map(event => <li key={event.id}><button aria-pressed={selected === event.id} className={selected === event.id ? 'selected' : ''} onClick={() => setSelected(event.id)}><time>{time(event.at)}</time><span className="event-category">{event.category}</span><span><strong>{event.title}</strong><small>{event.reason}</small></span></button></li>)}</ol><div className="event-detail" aria-live="polite">{selectedEvent ? <><h3>{selectedEvent.title}</h3><pre>{JSON.stringify(selectedEvent.data, null, 2)}</pre></> : <p>Select an event to inspect its source record.</p>}</div></div></section><section className="panel memory"><span className="eyebrow">MEMORY / SUBORDINATE</span><h2>Provisional only</h2><dl><dt>Episode / provisional trace</dt><dd>{state.currentStepIndex >= 0 ? 'Yes' : 'No'}</dd><dt>Audit record</dt><dd>{state.audit.length ? 'Yes' : 'No events yet'}</dd><dt>Canonical belief write</dt><dd>{state.canonicalMemoryWrite ? 'Yes' : 'No'}</dd><dt>Baseline update</dt><dd>No</dd></dl><p className="muted">Transient interpretation and retained audit. No baseline-update subsystem.</p></section></div><footer>Kingpin · Weak-signal governance <span>Deterministic replay / no model inference</span></footer>
  </main>;
}
