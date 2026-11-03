# Architecture and extraction scope

## Runtime

The portable home mounts `mountAlpha20Lesson` from the existing shared Nomi lesson UI. The original planner, exercise renderers, active clock and checkpoint client are retained. A lesson introduces its selected words before practice and uses version-bound card references.

The client saves an event and its next checkpoint in one local operation. It then synchronizes with the local adapter using an expected SQLite snapshot revision. A conflicting revision returns HTTP 409 and the current snapshot. The client decides whether its branches can be reconciled; a conflict is never silently reported as a successful save.

The adapter has one journal per synthetic profile. It rejects duplicate event IDs and deletion or rewriting of accepted events. Each request owns a SQLite transaction, including conflict returns. The adapter intentionally does not certify learning, implement production account security or reproduce all production source-admission checks.

## Layout

| Path | Responsibility |
| --- | --- |
| `web/languages-v05/alpha20-lesson-ui.mjs` | Existing timed Hebrew lesson controller and rendering lifecycle |
| `web/languages-v05/alpha20-store.mjs` | Existing local checkpoint and synchronization client |
| `web/languages-v05/hebrew-daily-priority.mjs` | Existing shared task selection |
| `web/languages-v05/portfolio.mjs` | New portable entry and vocabulary home |
| `demo_server.py` | New localhost HTTP and SQLite adapter |
| `demo-catalog.json` | Eight synthetic sample cards, no real learner history |
| `tests/e2e/pages/` | TypeScript Page Objects |
| `tests/e2e/fixtures.ts` | Fresh server, port, database and teardown for every test |

## Preserved and adapted

`source-manifest.json` identifies the code copied unchanged and the deliberate export adaptations. School-reading payloads are omitted; no synthetic replacement is described as the real school curriculum. Original geometric vocabulary illustrations and a neutral leaf replace the private picture/character presentation. System fonts replace private font/theme dependencies.

Legacy internal role identifiers in the shared code are implementation names, not copied user records. Displayed profiles are Demo Learner A and B. The two public demo paths never point to the private service. No service configuration, production hostname, credentials, database or account backup is required to run this repository.

The original application continues independently. This repository has no deployment or merge-back connection to it.
