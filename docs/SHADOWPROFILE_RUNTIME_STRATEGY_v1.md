ShadowProfile — Runtime Strategy v1

1\. Purpose



This document defines the runtime law for ShadowProfile so the product remains:



lightweight

quiet by default

observant

explainable

capable of deeper analysis when needed



The runtime strategy exists to prevent ShadowProfile from becoming a heavy always-on browser drag while preserving meaningful detection and confidence scoring.



2\. Core runtime principle



ShadowProfile must separate:



signal capture

interpretation

control actions



The engine should not continuously perform full analysis on every browser event. Instead, it should capture compact evidence cheaply and perform heavier analysis only when justified.



3\. Runtime modes — locked



ShadowProfile v1 operates in three modes.



3.1 Passive Watch Mode

Purpose



Continuously observe browser-visible changes with minimal overhead.



Allowed work in this mode

detect page/site transitions

record request counts and bursts

record cookie/storage change markers

record major DOM/content shift markers

record interaction markers

record cart/checkout-related markers

update compact counters

Not allowed in this mode

full scoring recomputation on every event

full inferred profile regeneration on every event

heavy cross-session recomputation on every event

UI-wide re-render triggers on every event

Law



Passive Watch Mode must be as lightweight and silent as possible.



3.2 Deferred Analysis Mode

Purpose



Run the heavier interpretation work only when needed.



Triggers



Deferred Analysis Mode may run when:



the popup is opened

the dashboard is opened

a session ends

a significant site change is detected

a debounce threshold is reached

an explicit analysis request is made

Work done in this mode

compute scores

generate inferred profile

generate integrity record

generate evidence summary

produce user-facing reasoning

Law



Analysis should happen in batches, not continuously.



3.3 Action Mode

Purpose



Perform explicit user-requested control actions.



Actions

wipe cookies for current site

wipe local/session storage for current site

wipe observed site state

reduce persistence

prepare future isolation behavior

Law



Action Mode only runs on explicit user action. It must not silently perform destructive state changes.



4\. Lightweight event model



In Passive Watch Mode, ShadowProfile should record compact evidence markers rather than perform full recomputation.



Example marker types

request\_count\_increment

request\_burst\_detected

cookie\_changed\_marker

storage\_write\_marker

dom\_shift\_detected

cart\_signal\_detected

checkout\_signal\_detected

post\_click\_state\_change

third\_party\_spread\_changed

Law



Markers should be small, cheap, and summary-oriented.



5\. Cart and checkout detection law



ShadowProfile must still be able to notice cart and checkout behavior while remaining lightweight.



Allowed lightweight cart signals

request paths containing cart, checkout, basket, bag

click events on likely cart/add-to-cart controls

DOM changes suggesting cart count updates

storage/cookie changes immediately after cart interactions

request bursts following product interaction

Output requirement



The engine may produce:



cart\_activity\_likely

purchase\_intent\_increased

confidence based on observed evidence lanes

Law



Cart detection is allowed in passive mode as compact evidence marking. Heavier confidence synthesis may be finalized in Deferred Analysis Mode.



6\. Confidence model law



ShadowProfile may assign confidence levels to what it notices, but confidence must reflect available evidence.



Confidence sources

repeated matching markers

multi-lane agreement (request + DOM + storage + interaction)

repeated occurrence within a session

repeated occurrence across sessions where recorded

Confidence constraint



The engine must not claim high confidence from a single weak hint.



7\. Popup vs dashboard boundary



ShadowProfile must keep the popup lightweight and the dashboard broader.



7.1 Popup



The popup is the current-site inspection surface.



Popup contents

current domain

current scores

current inferred profile

integrity summary

session summary

quick control actions

Law



The popup must render precomputed or cached summaries where possible. It must not trigger a full-system heavy scan every time it opens.



7.2 Dashboard



The dashboard is the broader state explorer.



Dashboard contents

observed sites

strongest tracking sites

strongest personalization sites

persistent state summaries

cookie/storage overview

evidence timeline

selective wipe/control surface

Law



The dashboard may perform deeper aggregation than the popup, but still should prefer cached summaries and batch recomputation.



8\. Persistence and device-state visibility



ShadowProfile should eventually support broader persistence visibility, but v1 must stay staged.



8.1 V1

current-site persistence summary

top observed persistence clues

top sites by persistence score

8.2 Later stage

broader persistent cookie/storage explorer

repeated identifier patterns

cross-site persistence overview

Law



Do not overload v1 with a full device-wide forensic explorer if it harms responsiveness.



9\. Performance law



ShadowProfile must prioritize responsiveness.



Required runtime protections

debounce or batch full analysis

avoid recomputation on every raw event

avoid repeated heavy writes on every raw event

prefer compact counters and markers during passive capture

perform expensive derivation only on trigger points

Example protections

one refresh per domain per debounce window

session-end recomputation

popup-open recomputation if stale

dashboard-open recomputation if stale

10\. Data law



ShadowProfile must maintain a distinction between:



raw compact event markers

session summaries

derived analysis cache

user-visible summaries

Layers

compact passive capture

session/domain summary objects

derived analysis objects

UI surfaces

Law



The UI should prefer derived summaries and not scan raw event streams unnecessarily.



11\. Control law



Wipe and cleanup features belong inside ShadowProfile, but they must remain explicit and user-directed.



* Required future controls
* wipe cookies for site
* wipe storage for site
* wipe observed site state
* selective wipe by state category



Law



No automatic destructive wipe behavior by default.



12\. V1 non-goals



ShadowProfile v1 runtime strategy must not require:



* full continuous deep analysis
* device-wide heavy forensic scans on every page change
* constant recalc of all scores on every event
* background destructive actions without user intent



13\. Code-facing implications



The codebase should evolve toward:



* passive marker collection
* debounced domain refresh
* stale-aware cached summaries
* popup-on-demand analysis refresh
* dashboard-specific deeper aggregation
* explicit action handlers for wipe/control



14\. Immediate implementation implications



Near-term engineering changes should include:



* keeping debounce/batching in aggregation
* reducing reasoning overclaiming when evidence is absent
* preparing a lightweight evidence summary object
* keeping popup reads cheap
* treating dashboard as a larger derived-summary surface



15\. Lock status



This document locks ShadowProfile’s runtime strategy.



From this point forward:



* the project is passive by default
* deeper analysis is deferred and batched
* cart/purchase signals remain detectable
* the popup stays lightweight
* the dashboard becomes the broader explorer
* control actions remain explicit and user-driven

