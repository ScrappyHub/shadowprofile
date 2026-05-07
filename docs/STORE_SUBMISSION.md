# ShadowProfile Store Submission Notes

## Name

ShadowProfile – Behavior & Tracking Inspector

## Short description

See how websites track, profile, and react to your behavior in real time.

## Full description

ShadowProfile is a local-first browser instrumentation tool that reveals how websites respond to your behavior.

It observes browser-visible network activity, interaction signals, and page behavior to help users understand tracking intensity, personalization activity, telemetry, cart activity, beacon requests, and other behavioral signals.

## Key features

- Real-time behavior analysis
- Deep Inspect mode
- Signal categories for telemetry, cart activity, beacons, tracking pixels, and recommendations
- Request timeline and endpoint summaries
- Deterministic session artifact export with SHA-256 hash
- Local session history and comparison panel

## Privacy statement

ShadowProfile runs locally in the browser. No data is transmitted externally. No analytics, advertising SDKs, or remote code execution are used.

## Permission rationale

ShadowProfile requires access to tabs, storage, cookies, webNavigation, and webRequest to classify browser-visible site behavior and explain how a site responds to user activity. All processing is local.
