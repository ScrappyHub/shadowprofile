ShadowProfile — Profiling Engine v1

1\. Purpose



This document defines the first implementation contract for the ShadowProfile Profiling Engine.



The Profiling Engine exists to answer:



what a website is likely inferring about the user

what intent signals appear to be active

what interest categories are being reinforced

what value or segment clues are visible



The Profiling Engine does not claim direct visibility into hidden backend profile objects. It produces bounded, explainable profile inference from browser-visible evidence.



2\. Role inside ShadowProfile



ShadowProfile has four engines:



Discovery

Profiling

Risk

Enforcement



The Profiling Engine sits between Discovery and Risk.



Flow



Discovery Engine output → Profiling Engine inference → Risk Engine interpretation → Enforcement options



The Profiling Engine converts raw evidence into likely user-model outputs.



3\. Product law



The Profiling Engine must obey these rules:



Rule 1 — Explainability first



Every inferred profile output must have supporting evidence.



Rule 2 — No hidden-truth overclaiming



The engine must not claim certainty about server-side state it cannot observe.



Rule 3 — Rules before AI



V1 must be deterministic and rules-based. No opaque AI scoring in v1.



Rule 4 — Inference, not fantasy



If evidence is weak, the output must stay weak.



Rule 5 — Confidence required



Every inferred attribute must include a confidence label or score.



4\. Profiling Engine outputs



The Profiling Engine produces an InferredProfileRecord.



4.1 InferredProfileRecord schema



Required fields:



domain

generated\_at

interests

intent

value\_estimate

segment\_clues

confidence

reasoning

limits

4.2 Output meanings

interests



Likely topic or category interests suggested by browsing behavior and site interactions.



Examples:



electronics

gaming

beauty

travel

finance

health

news

intent



Likely near-term action the website may infer.



Examples:



shopping

comparison\_research

account\_management

content\_consumption

sign\_up\_interest

purchase\_intent

value\_estimate



A bounded estimate of how commercially valuable or engaged the user may appear.



Allowed values for v1:



low

low\_mid

mid

mid\_high

high

unknown

segment\_clues



Observed or inferred hints that the user may be bucketed into a segment or treatment.



Examples:



returning\_user

high\_intent\_shopper

experiment\_bucket\_present

anonymous\_but\_persistent

recommendation\_feed\_user

confidence



Overall confidence for the inferred profile.



reasoning



Human-readable explanation of why the profile was inferred.



limits



Explicit limitations of the inference.



5\. Input lanes for v1



The Profiling Engine may use only the following input categories in v1:



A. Domain / site category clues



Examples:



shopping domain

video streaming domain

travel booking domain

news domain

B. URL and request pattern clues



Examples:



/product/

/cart

/checkout

/recommend

/feed

/personalize

/variant

C. Script and vendor category clues



Examples:



recommendation vendor

experimentation vendor

analytics vendor

advertising vendor

D. Persistence clues



Examples:



repeated cookie writes

repeated storage writes

persistent local state

E. Interaction clues



Examples:



repeated click activity

form input activity

repeated page/category transitions

F. Content adaptation clues



Examples:



DOM mutation after interaction

content refresh after interaction

recommendation-related requests after clicks

6\. V1 inference model — locked



The Profiling Engine v1 uses deterministic rules.



6.1 Interest inference



Interest inference should come from:



domain category

page path patterns

repeated site/session focus

recommendation/feed clues



Example: If the user repeatedly interacts with a shopping site whose paths and requests suggest products, carts, and categories tied to electronics, the engine may infer:



interest: electronics

intent: shopping

6.2 Intent inference



Intent inference should prioritize actions and request patterns.



Examples:



product + cart + storage persistence → shopping / purchase\_intent

account/login/auth + repeated input → account\_management

article/video/feed heavy activity → content\_consumption

repeated compare/review/search-like behavior → comparison\_research

6.3 Value estimate inference



V1 value estimate is coarse and should be conservative.



Possible signals:



persistent state across visits

repeated interaction depth

cart or checkout adjacency

retargeting/ad signals

experimentation or profiling emphasis



This must remain bounded. It is not a true monetary value claim.



6.4 Segment clue inference



V1 may infer segment clues from:



experiment/bucket signals

recommendation signals

persistence state

returning-session patterns

profiling storage patterns

7\. Confidence model



Each inference must include confidence.



Allowed confidence labels

low

medium

high

High confidence allowed when

multiple independent evidence lanes agree

repeated signals occur across the same site/session

rule match is strong and specific

Medium confidence allowed when

one or two strong hints exist but the inference is not fully reinforced

Low confidence when

evidence is sparse or mostly heuristic

8\. Reasoning contract



Every inferred profile output must include a reasoning object.



8.1 Reasoning fields



Required:



supporting\_categories

supporting\_events

rules\_fired

explanation



Example:



{

&#x20; "supporting\_categories": \["shopping\_domain", "recommendation\_requests", "persistent\_storage"],

&#x20; "supporting\_events": \["storage\_write", "content\_refresh", "request\_sent"],

&#x20; "rules\_fired": \["profile\_shopping\_intent\_v1", "profile\_returning\_user\_v1"],

&#x20; "explanation": "Repeated shopping-related requests, storage persistence, and dynamic content refresh suggest a shopping-oriented returning profile."

}

9\. Limits contract



Each output must disclose limits.



Required v1 limits:



inference is based only on browser-visible evidence

hidden backend profile objects are not directly visible

value estimate is coarse and heuristic

interests may be partial or site-specific

10\. Rule families for v1



The Profiling Engine should start with a small deterministic rule set.



Rule family A — Domain category mapping



Map domains into coarse activity categories.



Rule family B — Intent rules



Map actions + request/storage evidence into likely intent.



Rule family C — Persistence / returning-user rules



Detect likely returning-user modeling.



Rule family D — Recommendation / segment rules



Detect feed/recommendation/experiment-driven profiling.



Rule family E — Value-estimate rules



Infer coarse value/engagement tier from repeated persistence + deeper interactions.



11\. Example outputs

11.1 Shopping example

{

&#x20; "domain": "amazon.com",

&#x20; "generated\_at": 1710000000000,

&#x20; "interests": \["electronics"],

&#x20; "intent": \["shopping", "purchase\_intent"],

&#x20; "value\_estimate": "mid\_high",

&#x20; "segment\_clues": \["returning\_user", "recommendation\_feed\_user"],

&#x20; "confidence": "medium",

&#x20; "reasoning": {

&#x20;   "supporting\_categories": \["shopping\_domain", "recommendation\_requests", "persistent\_storage"],

&#x20;   "supporting\_events": \["storage\_write", "content\_refresh", "request\_sent"],

&#x20;   "rules\_fired": \["profile\_shopping\_intent\_v1", "profile\_returning\_user\_v1"],

&#x20;   "explanation": "Persistent storage, shopping-related paths, and adaptive content patterns suggest a shopping-oriented returning profile."

&#x20; },

&#x20; "limits": \[

&#x20;   "Inference is based on browser-visible evidence only.",

&#x20;   "The site’s internal server-side profile is not directly observable."

&#x20; ]

}

11.2 Content-consumption example

{

&#x20; "domain": "youtube.com",

&#x20; "generated\_at": 1710000000000,

&#x20; "interests": \["video\_content"],

&#x20; "intent": \["content\_consumption"],

&#x20; "value\_estimate": "mid",

&#x20; "segment\_clues": \["recommendation\_feed\_user"],

&#x20; "confidence": "medium",

&#x20; "reasoning": {

&#x20;   "supporting\_categories": \["media\_domain", "feed\_requests", "content\_refresh"],

&#x20;   "supporting\_events": \["request\_sent", "dom\_mutation", "content\_refresh"],

&#x20;   "rules\_fired": \["profile\_feed\_consumer\_v1"],

&#x20;   "explanation": "Feed-oriented requests and repeated adaptive content changes suggest a recommendation-driven content consumption profile."

&#x20; },

&#x20; "limits": \[

&#x20;   "Inference is based on browser-visible evidence only."

&#x20; ]

}

12\. Non-goals for v1



The Profiling Engine v1 must not attempt:



psychological profiling

demographic certainty

hidden server-state reconstruction

cross-site universal identity truth

AI-generated freeform persona writing

13\. Code-facing implications



The codebase should add:



profile\_inference.js or equivalent profiling module

domain-category mapping rules

intent rule definitions

InferredProfileRecord generator

a UI panel for inferred profile output

14\. Immediate next implementation step



The immediate next code step should be:



File



shadowprofile/extension/src/analysis/profile\_inference.js



Purpose



Generate deterministic v1 inferred profile records from:



events

vendor matches

signal matches

site/domain clues

15\. Lock status



This document locks the Profiling Engine v1 contract.



From this point forward:



ShadowProfile’s profiling layer is explainable and bounded

the engine uses deterministic rules in v1

profile output must include confidence, reasoning, and limits

the project remains aligned to Discovery → Profiling → Risk → Enforcement

