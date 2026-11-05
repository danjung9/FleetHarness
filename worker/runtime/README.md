# Hosted runtime compatibility

This runtime preserves production checkpoint, verification, and worker contracts from `95b7759918b93b662c4378e5df71fe98ea5cf0d2`. The hosted worker and API use these modules; desktop development continues in the top-level electron/shared/harness modules. This keeps existing hosted builds and resume checkpoints compatible while the application UI advances.

Runtime modules and skills are unchanged copies of that production revision. When upgrading the hosted engine, migrate and test existing checkpoint and report formats explicitly.
