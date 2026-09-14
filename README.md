# Kingpin Weak-Signal Governance Demo

**Kingpin separates what an agent notices from what it is allowed to do.**

**Live Demo:**\
[https://putmanmodel.github.io/kingpin-weak-signal-demo/](https://putmanmodel.github.io/kingpin-weak-signal-demo/)

**Video Walkthrough:**\
[https://youtu.be/mOaUrcVkink](https://youtu.be/mOaUrcVkink)

*For best readability of the interface, watch in 1080p.*

Kingpin is a deterministic demonstration of runtime capability governance for AI agents: evidence can raise attention and justify capability requests without itself granting authority.

This local React + TypeScript + Vite demo uses scripted scenarios, scoped temporary capability leases, runtime policy decisions, and replayable audit behavior. It runs without a model or external service.

**Concern ≠ confidence ≠ authority.**

**Attention may justify a request. It does not transfer authority.**

## How the demo works
```text
EVIDENCE
   ↓
INTERPRETATION / ATTENTION
   ↓
may justify
   ↓
CAPABILITY REQUEST
   ↓
KINGPIN
   ↓
GRANT / MODIFY / DENY / HUMAN REVIEW / QUARANTINE
```

**Interpretation / Attention** asks: what does the evidence deserve? Weak signals may raise attention. Evidence, confidence, concern, and estimator disagreement belong here. This side cannot grant authority.

**Capability Request** asks: what does the agent want to do because of what it noticed? Attention may justify requesting more telemetry, notifying an operator, or asking for control. A request is not permission.

**Kingpin / Authority** asks: what is the agent actually allowed to do? Kingpin independently evaluates requests and grants, narrows, denies, quarantines, or routes them to human review. Authority is granted through valid, scoped, temporary capability leases; in this implementation, narrowing caps a lease's requested duration.

**The two sides do not move together.** High confidence or high concern can coexist with read-only authority, a human-review-only route, or no authority. Routing a control request to human review does not issue a control lease.

## A grid anomaly, from signal to request

In the fictional baseline scenario, Sensor A deviates while Sensor B stays normal. Attention rises without authority. Persistent disagreement justifies a telemetry-read request, and Kingpin grants temporary read-only access scoped to feeder-12.

An independent evidence dimension then converges. The agent requests notification, which Kingpin separately permits. At **96% confidence and 93% concern**, direct breaker control still routes to **HUMAN_REVIEW**.

Stale governance context later quarantines that request without pretending the physical anomaly became less credible. During recovery, attention decays; the temporary leases have expired and final authority is none.

## Quick start

Requires Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
```

Open the localhost URL Vite prints. Select a scenario variation, then press **Next** to advance one step, or **Play** to advance every 2.4 seconds. **Pause** stops playback; manual Next remains available. **Previous** reconstructs the preceding step and pauses. **Reset** returns the selected variation to its ready state. Switching variations resets the runner, audit selection, and playback. The timer only advances scripted steps: lease expiration and policy windows use deterministic scenario time, never wall time.

To check the project, build it, and serve the production build locally:

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

## Seven-step baseline scenario

| Step | Interpretation | Governance |
| --- | --- | --- |
| Normal, 0s | OBSERVE, confidence .08, concern .11 | No capabilities |
| Weak anomaly, 10s | Sensor A deviates, B stays normal; WATCH | No grants |
| Persistent disagreement, 20s | ELEVATED; estimator disagreement .78 | Read-only feeder-12 telemetry lease, expires 45s |
| Evidence strengthens, 30s | Independent thermal evidence converges | Operator notification lease, expires 55s |
| Critical, 40s | CORROBORATED, confidence .96, concern .93 | Breaker request routes to HUMAN_REVIEW; no control lease |
| Stale context, 50s | Confidence and concern remain unchanged | Same control request QUARANTINED: cached policy is 30s old, exceeding its 15s window |
| Recovery, 60–80s | ELEVATED → WATCH → OBSERVE | Temporary leases expired; no active authority; canonical write denied |

Recovery is one manual step containing three declarative attention updates. The audit retains each update and exact lease expiration times. The quarantined request remains in decision history; recovery does not approve it or pretend to refresh its policy.

The policy allowlist is limited to feeder-12 sensors A/B and the demo-console grid operator. Allowed requests receive at most 25 seconds of authority; longer durations produce `GRANT_MODIFIED`. No autonomous breaker or canonical-memory capability is granted.

## Security cases included

- **Prompt injection:** instructions embedded in data cannot create authority.
- **Runaway retries:** repetition does not turn denial into permission.
- **Stale context:** strong evidence does not override invalid governance context.
- **Mistaken confidence:** an erroneously high confidence score cannot manufacture capability.
- **Scope violation:** possession of one valid lease does not authorize unrelated actions.

## Naive vs governed comparison

**Want to see the architectural difference immediately?** Choose **Baseline**, enable **Compare naive vs governed**, and press **Next** five times from Ready to reach **Critical demonstration / T+40s**. Toggle comparison at any time; it neither advances nor resets the scenario. Both sides read the same evidence array, scenario timestamp, confidence, and concern from one engine snapshot. There is no alternate world or duplicate simulation.

```text
Same evidence:
Confidence: 96%
Concern:    93%

Naive coupling        Kingpin
-------------------   ------------
AUTO_ISOLATE_FEEDER    HUMAN_REVIEW
```

The deliberately naive teaching policy is exactly:

```ts
confidence > 0.90 && concern > 0.80
  ? 'AUTO_ISOLATE_FEEDER'
  : 'NO_AUTOMATIC_CONTROL'
```

This is an intentionally simplistic educational rule, not a claim about any real industry system. It produces a display recommendation only. It cannot issue capability leases, execute control, change interpretation, or append to the governed audit.

At 96% confidence and 93% concern, the naive path recommends automatic isolation. The actual Kingpin state remains CORROBORATED attention, two valid scoped read/notification leases, and HUMAN_REVIEW for breaker control. At the next stale-context step the naive recommendation remains the same while Kingpin routes to QUARANTINE. The governed comparison reads existing decisions and lease-validation results; it never reimplements policy.

The normal governed dashboard remains the default. The comparison, six scenario selections, lease details, event inspection, and About dialog work on laptop and narrow layouts. Transitions respect reduced-motion preferences. Metric hover explanations distinguish credibility, significance, and estimator disagreement.

## Two independent systems and hard architectural invariants

- **Interpretation / Attention:** evidence, hypothesis, confidence, concern, estimator disagreement, and `OBSERVE`, `WATCH`, `ELEVATED`, or `CORROBORATED` attention. Scripted updates return only transient interpretation state.
- **Kingpin governance:** explicit capability requests, policy evaluation, temporary scoped leases, denial, human review, quarantine, expiration, and revocation. Policy receives no interpretation, confidence, or concern fields and never establishes whether the anomaly is true.

### Hard invariants

1. Attention state cannot grant capability. It may justify a request.
2. Confidence or concern cannot directly change authority. Only Kingpin issues leases.
3. Sensitive capability use requires a valid scoped lease, checked against the governance-owned registry for ID, subject, capability, scope, time, status, revoked nonce, and global epoch.
4. Every meaningful transition returns an audit event. The runner collects attention, request, policy-context, decision, and expiration events. Revocation helpers return both updated revocation state and a required audit event for their caller to append.
5. The naive comparison consumes the same snapshot and cannot issue leases, alter audit, or affect the runner.
6. Temporary salience never silently becomes durable memory. Interpretation is transient; `memory.canonical.write` is explicitly denied. No memory store exists.

## Failure variations — detailed

The selector uses fixtures in `src/scenarios/variations`. Each can be replayed forward/backward without randomness or external services.

| Selection | Boundary | Demonstration |
| --- | --- | --- |
| Baseline | Normal replay | Original seven steps, unchanged |
| Stale context | Governance / authority | Strong evidence plus stale policy quarantines control; refresh restores human review, never automatic control |
| Mistaken confidence | Epistemic / interpretation | Injected .98 confidence with .78 disagreement; the score remains wrong and no authority is created |
| Runaway retry | Governance / authority | First two requests remain in human review; subsequent retries are denied by the rolling-window policy |
| Prompt injection | Input trust | Explicitly untrusted maintenance-note text is retained as data and flagged in audit; decisions are identical with or without it |
| Scope violation | Lease / capability | A valid operation succeeds; a different feeder, breaker operation, and exact-expiry use fail validation |

Retry policy counts prior DENY, HUMAN_REVIEW, and QUARANTINE outcomes for the same subject and capability in `(now - 30000, now]`. Two prior non-grants deny subsequent retries. Denials also count, so an agent must allow the rolling window to clear. Request IDs and scope changes do not reset the counter. The replay engine supplies trusted request history to governance; no interpretation inputs enter this policy. This is in-memory deterministic demo retry control, not a distributed rate limiter.

Lease-use attempts are distinct from requests to issue capabilities. Replay resolves the presented lease ID against its registry and invokes `validateLease`, then records an ALLOW/DENY operation result and OPERATION_ALLOWED/OPERATION_DENIED audit event. ALLOW issues no new lease and executes no grid operation.

The untrusted note is an explicitly tagged fixture, not a text classifier or natural-language security system. INPUT_FLAGGED records its provenance warning. Its content is never passed to policy evaluation. The fixture does not correct interpretation or introduce a memory subsystem.

Focused tests cover all variations, exact retry-window boundaries, subject/capability isolation, unchanged policy outcomes with/without the note, valid lease use followed by denial, and unique chronological audit events for every replay prefix.

## Runtime security cases — detailed

In the existing scenario selector choose **Prompt injection**, then press **Next** three times to see the untrusted maintenance note and its INPUT_FLAGGED audit event. The interpretation panel shows **INPUT TRUST: UNTRUSTED** and **External content cannot grant capability**. A fourth step adds legitimate independent corroboration at .96 confidence; breaker control still routes to HUMAN_REVIEW. Note text is fixture data rendered as text, never parsed as policy or executable instructions.

Choose **Runaway retry** and press **Next** four times to reach the third request. **RETRY LIMIT REACHED** appears in the governance panel. Subsequent steps remain DENY / CLAMPED. The first two requests preserve the existing HUMAN_REVIEW routing. Each decision's structured `retry` audit field records the window's non-granted request count (including the current request), prior outcome, fixed limit/window, and WITHIN_LIMIT / LIMIT_REACHED / CLAMPED status. IDs, rationale wording, and scope changes do not reset the subject/capability counter. This demonstrates an ordinary planner retry failure.

## Code layout

- `src/core/attention` — interpretation contracts and update helper; no governance imports.
- `src/core/governance` — decision contracts and deterministic policy evaluator.
- `src/core/capabilities` — concrete, capability-specific scopes and request contracts.
- `src/core/leases` — lease contracts, scope validation, per-nonce revocation and global epoch bump.
- `src/core/audit` — deterministic policy and transition event contracts.
- `src/core/simulation` — replay, active-lease selection, and manual runner.
- `src/scenarios/grid-anomaly` — declarative scenario data.
- `src/scenarios/variations` — baseline plus five deterministic failure fixtures.
- `src/comparison` — isolated naive teaching policy and shared-snapshot comparison projection.
- `src/components` — comparison panel and accessible native About dialog.
- `src/types` — shared types and scenario contract.
- `src/App.tsx` — dashboard, variation selection, lease inspection, and audit timeline; no permission rules.
- `tests` — contract and runtime tests.

## Testing, deterministic replay, and implementation notes

The suite contains **29 runtime tests plus compile-time contract checks**. `npm test` runs the TypeScript contract checks followed by Node's test runner with the `tsx` loader. `npm run build` typechecks application source before building with Vite.

```sh
npm ci
npm run typecheck
npm test
npm run build
```

Tests cover authority separation, policy routing, scope and expiration checks, per-nonce/global revocation, runner controls, recovery, canonical-memory denial, and all failure variations. Comparison tests cover strict threshold boundaries, shared evidence identity, actual Kingpin routing, and unchanged leases/audit/navigation. Variation-prefix tests check deterministic replay and unique chronological audit events.

### Deterministic time and replay

`replayScenario` is pure. `ScenarioRunner` reconstructs state when navigating and returns detached snapshots. Its core API supports start, pause, next, previous, reset, and restart; the UI exposes manual stepping and optional playback. Every decision and lease expiration uses the scenario clock. Pausing the UI does not advance that clock.

IDs/nonces are predictable and unique within this fixed demo run; restarting intentionally reproduces them. **They are not cryptographic credentials.** The policy evaluator's caller supplies a monotonic decision sequence and trusted request history.

### Lease validation and revocation

A lease identifies its request, subject, capability-specific scope, issuance and expiration times, nonce, epoch, and status, with an optional revocation reason. `validateLease` resolves its ID from the trusted registry and checks active status, `issuedAt <= now < expiresAt`, subject, capability, scope, revoked nonce, and global epoch. Telemetry access may narrow the leased sensor set; it cannot expand it.

`revokeNonce` invalidates an individual nonce. `revokeAll` bumps the global epoch, invalidating all leases from the prior epoch. Both helpers return updated revocation state and a deterministic audit event for the caller to append. These helpers are exposed through core code and tests; there are no revocation UI controls yet. An ACTIVE registry label alone is not sufficient proof of usable authority.

### Audit and provisional state

The runner retains attention transitions, requests, policy-context changes, governance decisions, input-trust flags, lease expirations, and operation-validation results. Audit records include deterministic time, event type, previous/next state, rationale, and relevant identifiers. Decisions include structured retry metadata. The UI places signal observations alongside the audit and lets readers inspect source records.

Interpretation is transient. `memory.canonical.write` is denied, canonical belief writes remain false, and no baseline-update subsystem or durable memory store exists. Retaining an in-memory audit trace does not promote an interpretation to a canonical belief.

## Scope and non-goals

This is an educational runtime-governance demo, not a complete AI-safety solution or a production security product.

- There is no LLM, backend, authentication, database, durable memory store, or external service integration. npm accesses its registry during installation; Vite serves the local page.
- No actual grid operation occurs. Operation ALLOW/DENY results and naive recommendations are simulated records or display output.
- TypeScript is not a security boundary. Lease validation assumes a trusted registry and revocation state; predictable demo IDs/nonces are not secure credentials.
- Prompt injection is a deterministic tagged fixture, not a natural-language security classifier. The demo does not claim to detect arbitrary injection text.
- Retry handling is demo-local deterministic control, not a distributed rate limiter.
- Human review is a routing outcome. No human-approval execution workflow or autonomous breaker-control grant is implemented.

The dashboard includes responsive layout rules, reduced-motion support, lease details, event inspection, metric hover explanations, and a native About dialog. The checked-in automated suite covers contracts and runtime logic; it does not contain browser UI tests.

## Optional future work

UI controls for the already-tested revocation helpers and an audit-export button are possible extensions. Neither is implemented or required for the current demonstration.

## Contact

- Email: [putmanmodel@pm.me](mailto:putmanmodel@pm.me)
- X: [@putmanmodel](https://x.com/putmanmodel)

Technical feedback, research discussion, collaboration, licensing, and permission inquiries are welcome.

## Copyright and Use

Copyright © 2026 Stephen A. Putman. All rights reserved.

This repository is public for evaluation, demonstration, and research discussion. No permission to copy, modify, redistribute, create derivative works, or otherwise reuse the project is granted without prior written permission.

Licensing and permission inquiries: [putmanmodel@pm.me](mailto:putmanmodel@pm.me).

See [NOTICE.md](NOTICE.md) for the fuller terms.
