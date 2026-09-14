import { compareSnapshot } from '../comparison';
import type { SimulationState } from '../core/simulation';

export function Comparison({ state, request }: { state: SimulationState; request: string }) {
  const comparison = compareSnapshot(state);
  const { confidence, concern, attention } = comparison.interpretation;
  const outcome = comparison.governed.operation?.outcome ?? comparison.governed.decision?.outcome ?? 'AWAITING REQUEST';
  return (
    <section className="comparison" id="comparison" aria-labelledby="comparison-heading">
      <div className="comparison-heading">
        <h2 id="comparison-heading">Concern ≠ confidence ≠ authority</h2>
        <span>Same snapshot · T+{comparison.at / 1000}s · {comparison.evidence.length} evidence records</span>
      </div>
      <p className="shared-input">Shared interpretation: confidence <strong>{Math.round(confidence * 100)}%</strong> · concern <strong>{Math.round(concern * 100)}%</strong>. No alternate evidence or scenario.</p>
      <div className="comparison-grid">
        <article className="naive-path">
          <span className="eyebrow">NAIVE / DELIBERATE TEACHING EXAMPLE</span>
          <p>Confidence &gt; 90% + concern &gt; 80% → automatic control recommendation</p>
          <strong className="comparison-result">{comparison.naive}</strong>
          <small>Intentionally simplistic; does not represent an industry system. Recommendation only—no permission or operation is issued.</small>
        </article>
        <article className="governed-path">
          <span className="eyebrow">KINGPIN / ACTUAL GOVERNED STATE</span>
          <p>Shared scores → attention <strong>{attention}</strong> → capability request <strong>{request}</strong> → <strong>{outcome.replaceAll('_', ' ')}</strong></p>
          <strong className="comparison-result">{outcome.replaceAll('_', ' ')}</strong>
          <small>{comparison.governed.leases.length} valid scoped leases. {(comparison.governed.operation?.reason ?? comparison.governed.decision?.reason) || 'No capability request to adjudicate yet.'}</small>
        </article>
      </div>
      <p className="comparison-boundary">Attention may justify a request. It does not transfer authority.</p>
    </section>
  );
}
