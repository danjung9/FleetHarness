---
type: research
status: complete
owner: mukul
updated: 2026-11-04
summary: "Challenge 8 is an honest routing demonstration that misses essential CASREP requirements."
---

# Challenge 8 judgment

VERDICT: NOT
WHY: The app rehearses approvals but cannot produce the formatted CASREP required by the challenge.
FIX: [R] Make the planning skill preserve essential card requirements as mandatory acceptance tests backed by reviewed synthetic examples, rather than deferring them.

[E, source, README and screenshots] A Sailor could follow the README example through return, revision and simulated CO release. Opening the app alone gives empty fields, no loaded sample and manual role switching. The screens are readable, including the narrow view. Starting another report requires browser tools or another profile.

[E, source and acceptance plan] Only INITIAL is supported. Category is optional and unofficial; NWP formatting is not checked. Anyone can select any role. The app clearly discloses these omissions and labels release as simulated.

[E, test source and saved receipt] No canned results or dead buttons were found in source. Fifteen substantive tests exercise actual application code, including wrong-role rejection, stale approvals and storage failure. The receipt reports all 15 tests and eight browser runs passing, including revised export content. It still records requirementsMet=false.

[A] A judge would appreciate the honest, functioning routing demonstration but be disappointed by the missing CASREP substance.

[E] Review used supplied files and captures; no fresh browser run or Sailor trial.
