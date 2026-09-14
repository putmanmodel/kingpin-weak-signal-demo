# Components

- `Comparison.tsx` displays the deliberately naive recommendation alongside Kingpin's actual decision and valid leases from the same simulation snapshot. It cannot issue authority or change simulation state.
- `AboutDemo.tsx` provides a native dialog explaining interpretation, capability governance, audit behavior, and the demo's limitations.

`src/App.tsx` composes these components with scenario controls, the dashboard, lease inspection, and the audit timeline.
