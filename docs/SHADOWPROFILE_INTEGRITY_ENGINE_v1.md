ShadowProfile — Integrity Engine v1

1\. Purpose



This document defines the first implementation contract for the ShadowProfile Integrity Engine.



The Integrity Engine exists to answer:



is ShadowProfile protected properly

if it is altered, can that be detected

is the running copy behaving as designed

can a user inspect and understand the integrity state without trusting marketing claims



The Integrity Engine is part of the product identity of ShadowProfile. It is not an optional add-on.



2\. Role inside ShadowProfile



ShadowProfile is now composed of six engines:



Discovery

Profiling

Risk

Enforcement

Integrity

Evidence



The Integrity Engine is the trust layer for the whole instrument.



Flow



Code + runtime state → Integrity checks → integrity status → UI + evidence output



3\. Product law



The Integrity Engine must obey these rules:



Rule 1 — Open inspection



The integrity state must be inspectable and understandable.



Rule 2 — Deterministic where possible



The same code and manifest should produce the same integrity interpretation.



Rule 3 — No fake certainty



If the engine cannot verify something in the current environment, it must say so.



Rule 4 — Runtime truth over slogans



The engine must report actual runtime state, not aspirational claims.



Rule 5 — Tamper evidence over tamper fantasy



The engine should focus on detecting unexpected changes and mismatches, not claiming impossible perfect protection.



4\. Core responsibilities



The Integrity Engine v1 must support these responsibilities:



A. Build identity



Identify what build/version of ShadowProfile is currently running.



B. Core file fingerprinting



Track the expected core files and their expected identity values.



C. Runtime state verification



Report whether required modules are present and loading as expected.



D. Integrity status classification



Summarize the current state as one of a small set of bounded statuses.



E. User-facing integrity explanation



Explain why the current integrity status was assigned.



5\. Integrity status model



ShadowProfile v1 must support these integrity states:



verified

modified

incomplete

unknown

5.1 Meanings

verified



The current runtime matches the expected v1 integrity contract for the known core files and runtime signals.



modified



A known expected file or runtime contract appears altered, missing, or mismatched.



incomplete



The engine can inspect some but not all required integrity surfaces.



unknown



The engine cannot currently verify the needed surfaces.



6\. IntegrityRecord schema



The Integrity Engine produces an IntegrityRecord.



Required fields:



generated\_at

engine\_version

build\_identity

integrity\_status

core\_files\_checked

runtime\_checks

mismatches

reasoning

limits

6.1 Field meanings

generated\_at



When the integrity record was produced.



engine\_version



The Integrity Engine contract version.



build\_identity



A structured identifier for the current ShadowProfile build.



integrity\_status



One of: verified / modified / incomplete / unknown.



core\_files\_checked



List of files the engine attempted to validate.



runtime\_checks



List of runtime-level checks performed.



mismatches



List of file or runtime mismatches observed.



reasoning



Human-readable explanation of the result.



limits



Explicit boundaries of what v1 can and cannot prove.



7\. Build identity contract



The Integrity Engine v1 should track a minimal build identity object.



Required fields:



name

version

manifest\_version

build\_mode



Example:



{

&#x20; "name": "ShadowProfile",

&#x20; "version": "0.1.0",

&#x20; "manifest\_version": 3,

&#x20; "build\_mode": "local\_extension"

}

8\. Core files to monitor in v1



The Integrity Engine should begin with a small, meaningful set of files.



Recommended required v1 core files:



manifest.json

src/background/service\_worker.js

src/background/capture\_tabs.js

src/background/aggregate\_sessions.js

src/analysis/event\_schema.js

src/analysis/classify\_signal.js

src/analysis/scoring.js

src/analysis/profile\_inference.js

src/shared/constants.js

src/ui/popup/popup.html

src/ui/popup/popup.js



These files define:



product identity

runtime entry

capture behavior

analysis behavior

UI presentation

9\. Runtime checks for v1



The Integrity Engine v1 should support lightweight runtime checks.



Required checks

service worker loaded

expected core modules reachable/loaded

popup path matches manifest

manifest version matches expectation

required permissions present

Optional checks for v1 if feasible

expected exported functions present in key modules

expected storage keys available

10\. Mismatch model



A mismatch is any meaningful divergence from the expected integrity contract.



Example mismatch types

missing\_core\_file

runtime\_module\_unavailable

manifest\_mismatch

popup\_path\_mismatch

required\_permission\_missing

expected\_export\_missing



Each mismatch should include:



type

target

severity

explanation

11\. Reasoning contract



The Integrity Engine must produce a reasoning object.



Required fields:



checks\_passed

checks\_failed

summary



Example:



{

&#x20; "checks\_passed": \["manifest\_loaded", "service\_worker\_loaded", "popup\_files\_present"],

&#x20; "checks\_failed": \["expected\_export\_missing"],

&#x20; "summary": "Core runtime loaded, but one expected module export was missing. Integrity state is modified."

}

12\. Limits contract



The Integrity Engine v1 must disclose limits.



Required limits:



v1 does not guarantee perfect tamper prevention

v1 focuses on detection and explanation of mismatches

v1 runtime verification is bounded by extension environment visibility

v1 may not prove provenance beyond available local runtime/build identity

13\. UI implications



The popup/workbench should gain an Integrity panel.



Required fields to show:



integrity status

build identity

checks passed count

checks failed count

short summary



The UI must not show dramatic red-warning language unless an actual mismatch exists.



14\. V1 non-goals



The Integrity Engine v1 does not need to include:



heavy cryptographic attestation

remote verification

signed packet export

full source tree hashing across every file

anti-debugging or hostile lockout behavior



Those may come later if desired, but are not required for v1.



15\. Code-facing implications



The codebase should add:



extension/src/integrity/runtime\_integrity.js

integrity check definitions

IntegrityRecord generator

popup/workbench rendering support for integrity state

16\. Immediate next implementation step

File



shadowprofile/extension/src/integrity/runtime\_integrity.js



Purpose



Generate a deterministic v1 integrity record from:



manifest identity

expected core file list

runtime module checks

current extension environment

17\. Lock status



This document locks the Integrity Engine v1 contract.



From this point forward:



ShadowProfile must include integrity as a first-class engine

integrity status must be user-visible

tamper evidence must be explainable

the engine must remain bounded, honest, and inspectable

