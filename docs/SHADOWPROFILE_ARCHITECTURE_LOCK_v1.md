ShadowProfile — Architecture Lock v1

1\. Product identity



ShadowProfile is a local-first browser-state intelligence instrument that explains how websites model, classify, and adapt to the user through browser-visible evidence.



ShadowProfile is not:



a cookie viewer

a blocker-first product

a generic DevTools wrapper



ShadowProfile is an evidence-first product whose job is to:



discover browser-visible state and signals

infer what profile the web is likely building

assess tracking and exposure risk

optionally enforce controls after understanding

2\. Locked product law



ShadowProfile must be built to explain:



what was captured

what that likely means

what risk it creates

what control is possible



ShadowProfile must not collapse into a narrow cookie-only tool.



Cookie inspection is one input lane, not the product.



3\. Four-engine architecture — locked



ShadowProfile is composed of four engines.



3.1 Discovery Engine

Purpose



Capture browser-visible evidence across the main surfaces where web-state and user-modeling signals actually appear.



Required input lanes

cookies

localStorage

sessionStorage

IndexedDB presence and activity clues

network requests

request metadata

response metadata where observable

loaded scripts

third-party domains

DOM mutation activity

interaction events

Output contract



The Discovery Engine outputs structured raw evidence without interpretation.



Example shape:



{

&#x20; "domain": "amazon.com",

&#x20; "signals": {

&#x20;   "cookies": \[],

&#x20;   "storage": \[],

&#x20;   "requests": \[],

&#x20;   "scripts": \[]

&#x20; }

}

Law



The Discovery Engine does not speculate. It captures and normalizes.



3.2 Profiling Engine

Purpose



Infer what profile the website is likely building or using.



V1 method



The first version must use explainable, rule-based inference rather than opaque AI scoring.



Allowed inference inputs

domain categories

request patterns

script/vendor categories

repeated behavior patterns

page categories

time-on-page heuristics

storage/state persistence clues

Example output

{

&#x20; "inferred\_profile": {

&#x20;   "interests": \["electronics", "gaming"],

&#x20;   "intent": \["shopping"],

&#x20;   "value\_estimate": "mid-high",

&#x20;   "confidence": 0.78

&#x20; }

}

Law



The Profiling Engine must remain explainable and bounded. It may infer likely interests, intent, segmentation, or profile state, but it must not claim certainty about hidden backend truth.



3.3 Risk Engine

Purpose



Convert evidence and inferred profile use into user-meaningful exposure assessment.



Core outputs

cross-site tracking likelihood

fingerprinting likelihood

third-party spread

persistence level

data leak surface estimate

personalization intensity estimate

Example output

{

&#x20; "risk": {

&#x20;   "cross\_site\_tracking": true,

&#x20;   "fingerprinting\_likelihood": "high",

&#x20;   "third\_party\_calls": 14,

&#x20;   "data\_leak\_surface": "moderate"

&#x20; }

}

Detection targets

third-party domains

known tracker/vendor patterns

excessive request spread

persistent identifiers

replay/fingerprinting clues

profile-affecting persistence

Law



The Risk Engine is what translates low-level evidence into something the user can understand.



3.4 Enforcement Engine

Purpose



Apply control actions after the user understands what is happening.



V1 positioning



CookieGate is not the whole product. CookieGate is one enforcement lane inside ShadowProfile.



Example actions

block cookies

strip headers where feasible

isolate sessions

reset identity state

reduce persistence

Law



Control comes after explanation. ShadowProfile must not be enforcement-only.



4\. UI architecture — locked



ShadowProfile must present its four-engine model cleanly.



Panel 1 — What Just Happened



Shows:



visited sites

captured signals

event timeline

recent tracking activity

Panel 2 — Your Profile (as seen by the web)



Shows:



inferred interests

inferred intent

likely segmentation

confidence and explanation

Panel 3 — Risk



Shows:



tracking level

exposure score

third-party spread

fingerprinting / persistence indicators

Panel 4 — Control



Shows:



block

isolate

reset

reduce persistence

UI law



The interface must stay clean and evidence-driven. It must avoid DevTools-style clutter.



5\. Why cookie-only scope is rejected



Modern websites often place meaningful state and personalization machinery in:



JavaScript-controlled storage

API requests

dynamic runtime logic

server-side adaptation



Therefore, a cookie-only view is incomplete and misleading.



ShadowProfile must treat cookies as one signal lane among several, not the primary truth surface.



6\. V1 scope — strict lock

Must have

network request logging

storage inspection (cookies + localStorage + sessionStorage at minimum)

basic domain/vendor classification

simple profiling rules

basic risk scoring

simple UI panels

Must not include yet

packet export systems

cryptographic receipts

ecosystem integration

heavy AI scoring

cloud dependence for correctness

Tier posture



ShadowProfile v1 is Tier-0 standalone.



7\. Product category — locked



ShadowProfile is best understood as a:



Personal Data Intelligence Instrument



That means:



explanation-first

evidence-backed

user-facing model visibility

control after understanding

8\. Relationship to CookieGate



CookieGate is not the product. CookieGate is one enforcement engine inside ShadowProfile.



ShadowProfile remains the top-level product.



9\. Build order adjustment — locked



To align the existing build with this architecture, implementation order should now be framed as:



Discovery Engine stabilization

Profiling Engine v1 rule layer

Risk Engine scoring and explanations

Enforcement Engine hooks

UI panel composition in the global workbench style

10\. Immediate implementation implications



The current codebase must evolve toward:



stronger network/request capture

stronger storage capture

IndexedDB presence/detection lane

profiling rule outputs

risk explanations

a UI that renders the four-engine model



The current popup-only score surface is insufficient as the long-term UI shape. It can remain a temporary inspection surface, but the architecture target is the four-panel ShadowProfile workbench.



11\. Lock status



This document locks the intended architecture of ShadowProfile.



From this point forward:



ShadowProfile is the product

CookieGate is one engine within it

the build must stay aligned to discovery → profiling → risk → enforcement

the project must remain standalone-first and evidence-first

