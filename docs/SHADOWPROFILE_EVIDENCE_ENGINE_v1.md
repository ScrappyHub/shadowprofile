ShadowProfile — Evidence Engine v1

1\. Purpose



This document defines the first implementation contract for the ShadowProfile Evidence Engine.



The Evidence Engine exists to answer:



what did ShadowProfile actually observe

when did it observe it

what analysis was produced from that evidence

what integrity state existed when that analysis was produced

can the result be inspected later without relying on memory or vague claims



The Evidence Engine turns ShadowProfile from a live viewer into a proof-bearing instrument.



2\. Role inside ShadowProfile



ShadowProfile is composed of six engines:



Discovery

Profiling

Risk

Enforcement

Integrity

Evidence



The Evidence Engine records and structures what the other engines produced.



Flow



Captured activity → session/domain summary → scores/profile/integrity → evidence record → UI surface



3\. Product law



The Evidence Engine must obey these rules:



Rule 1 — Record what happened



Evidence must reflect observed or derived runtime facts.



Rule 2 — Keep it inspectable



The evidence format must be understandable and structured.



Rule 3 — Do not invent proof



If a field cannot be supported by captured runtime state, it must remain absent or explicitly unknown.



Rule 4 — Time matters



Evidence must include timing fields so users can understand sequence and duration.



Rule 5 — Integrity context matters



Evidence should include the integrity state associated with the analysis.



4\. EvidenceRecord schema



The Evidence Engine produces an EvidenceRecord.



Required fields:



generated\_at

domain

session\_started\_at

session\_ended\_at

session\_duration\_ms

analysis\_generated\_at

integrity\_checked\_at

event\_counts

storage\_summary

tracker\_summary

scores

inferred\_profile

integrity

reasoning

limits

5\. Timing fields

session\_started\_at



Earliest known start time for the domain session set used in the current analysis.



session\_ended\_at



Latest known end time if the session has ended, otherwise null or absent.



session\_duration\_ms



Computed duration when start/end are both known. If not fully known, may be partial or null.



analysis\_generated\_at



When the analysis output was produced.



integrity\_checked\_at



When the integrity record included in the evidence was generated.



Law



Timing fields are first-class evidence. They are not optional decoration.



6\. Event summary requirements



The Evidence Engine v1 must summarize the captured session/domain activity.



Required event summary fields

total\_events

request\_events

cookie\_events

storage\_events

dom\_mutation\_events

user\_action\_events

Law



The summary should be compact and useful, not a full raw event dump in the popup.



7\. Storage summary requirements



The Evidence Engine must summarize observed state persistence surfaces.



Required fields

cookie\_count

local\_storage\_count

session\_storage\_count

indexeddb\_count

Law



If counts are zero, the evidence should show zero rather than implying persistence happened.



8\. Tracker summary requirements



The Evidence Engine must summarize observed tracker spread.



Required fields

tracker\_domain\_count

top\_tracker\_domains

Law



The Evidence Engine may use compact summaries rather than full per-request output in v1.



9\. Embedded analysis outputs



The Evidence Engine must carry forward the analysis outputs users care about.



Required embedded outputs

scores

inferred\_profile

integrity

Law



The Evidence Engine is not a replacement for these engines. It is the structured record of their outputs.



10\. Reasoning contract



The Evidence Engine must include a concise explanation of what the evidence record represents.



Required fields:



summary

analysis\_basis



Example:



{

&#x20; "summary": "This evidence record summarizes the current observed session/domain state for amazon.com.",

&#x20; "analysis\_basis": "Scores and inferred profile were generated from captured request, interaction, and persistence summaries."

}

11\. Limits contract



The Evidence Engine v1 must disclose limits.



Required limits:



evidence is based on captured runtime state available to the extension

v1 popup shows compact summaries, not full raw forensic dumps

some session timing may be partial if the browser lifecycle was interrupted

12\. UI implications



The popup/workbench should gain an Evidence panel or session-evidence section.



Required fields to show:



session started

session ended

session duration

analysis generated at

integrity checked at

total events

tracker count



The dashboard may later show deeper evidence history and rollups.



13\. V1 non-goals



The Evidence Engine v1 does not need to include:



cryptographic receipts

signed packets

remote witness duplication

full raw event timeline rendering in the popup

full export format design



Those can come later.



14\. Code-facing implications



The codebase should add:



extension/src/evidence/session\_evidence.js

an EvidenceRecord generator

popup rendering support for session timing and evidence summary

15\. Immediate next implementation step

File



shadowprofile/extension/src/evidence/session\_evidence.js



Purpose



Generate deterministic v1 evidence records from:



current domain sessions

derived scores

inferred profile

integrity record

16\. Lock status



This document locks the Evidence Engine v1 contract.



From this point forward:



ShadowProfile must produce structured evidence records

timing fields are part of the product

evidence must remain inspectable and bounded

the popup/dashboard may render evidence summaries derived from those records

