# Ecosystem Integration — ShadowProfile

## Canonical service identity

| Field | Value |
|---|---|
| Service ID | `shadowprofile` |
| Canonical name | ShadowProfile |
| Ecosystem layer | `protection.browser-forensics` |
| Standalone-first | `true` |

## Role

Forensic browser-visible tracking and personalization inspector.

## This service owns

- Browser signal discovery
- Signal classification
- Tracking-intensity scoring
- Personalization scoring
- Persistence scoring
- Transparency scoring
- Cross-domain comparison

## This service does not own

- Cookie enforcement
- DNS enforcement
- Identity policy

## Upstream services

- `cookiegate`

## Downstream consumers or operators

- `operators`
- `contract-registry`

## Contract families

- `browser.*`
- `signal.*`
- `score.*`
- `session.*`
- `comparison.*`
- `report.*`

## Integration rules

1. This repository must remain independently understandable, testable, buildable, and releasable.
2. Ecosystem integrations extend capability but do not replace standalone correctness.
3. Integrations use explicit, versioned schemas and receipts.
4. No undocumented database sharing, hidden filesystem coupling, or implicit trust is permitted.
5. Producer claims must be independently verified by the receiving boundary where verification is required.
6. Integration failure must not silently corrupt local authoritative state.
7. Missing upstream services must produce an explicit unavailable, unknown, deferred, or failed state according to the local contract.
8. This repository's current implementation must not be treated as the complete product definition.

## Authoritative ecosystem sources

- `../Constellation/ecosystem/SERVICE_MAP.md`
- `../Constellation/registry/services.json`
- `../Constellation/ecosystem/AGENT_POLICY.md`
- `../Constellation/ecosystem/SHARED_INVARIANTS.md`

## Change governance

Changes to this service's ecosystem role, ownership boundaries, upstream dependencies, or downstream responsibilities require:

1. A proposal under `docs\proposals`.
2. A documented compatibility impact.
3. Updated service-map and registry entries.
4. Updated positive and negative integration tests.
5. A new service-map receipt.
