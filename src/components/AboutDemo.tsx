import { useRef } from 'react';

export function AboutDemo() {
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button className="about-button" onClick={() => dialog.current?.showModal()}>About this demo</button>
    <dialog ref={dialog} aria-labelledby="about-heading" className="about-dialog">
      <div className="section-title"><h2 id="about-heading">About this demo</h2><button autoFocus onClick={() => dialog.current?.close()} aria-label="Close about this demo">Close</button></div>
      <p>Weak-signal interpretation decides how much attention evidence deserves. Confidence estimates how credible the interpretation is; concern describes how much it matters.</p>
      <p>Kingpin separately decides which capabilities are authorized. Capability leases have explicit scopes and expiration times; stronger evidence cannot enlarge them.</p>
      <p>The deterministic audit records interpretation changes, requests, governance decisions, and lease transitions. Signals appear alongside those records so you can follow the same sequence forward or backward.</p>
      <p>The failure fixtures illustrate mundane operational problems—stale context, mistaken scores, retries, untrusted notes, and scope mistakes. No malicious agent or real grid operation is simulated.</p>
      <p>The optional comparison applies a deliberately naive score threshold to the same snapshot. Its recommendation cannot issue a lease or affect Kingpin.</p>
      <strong>Concern ≠ confidence ≠ authority</strong>
      <p className="muted">Start with Baseline and advance to step 5 for the central comparison. All times are scenario times.</p>
    </dialog>
  </>;
}
