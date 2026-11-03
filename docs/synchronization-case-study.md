# Case study — continuing after a stale checkpoint

## Observed product problem

During real Nomi use, an owner workflow change could leave the device with a clock-only checkpoint branch while the server already contained the accepted answers and a closed lesson. Returning to the lesson then surfaced a checkpoint conflict instead of a usable continuation path.

The private production investigation reproduced the issue against saved before/after snapshots. Those snapshots contain learner data and are intentionally not published here.

## Expected behavior

Accepted answers must survive. A technical conflict must not erase local progress, invent a learning result, or permit a stale device to replace a newer checkpoint. A safe recovery can be considered only when the relevant answers are already present on the server and the branch relationship is established.

## Production change represented in the shared client

The exported `alpha20-store.mjs` contains the bounded recovery logic: compare recorded event identities, recognize the explicit workflow closure, archive the obsolete local clock branch and merge against the server snapshot. Unsent answers and unrelated session forks remain blocked rather than discarded.

This is different from replacing the whole saved journal with the most recently received payload.

## Public reproducer and its limits

`tests/python/test_store.py` exercises a smaller synthetic server-side scenario: save revision 1, submit revision 0, observe a conflict containing the accepted state, then perform another valid write. A two-second completion bound detects a lock retained by the conflict path. Other tests reject deleted, rewritten and duplicated events.

`tests/e2e/lesson.spec.ts` separately checks reload continuation through the actual shared lesson UI and checkpoint client.

The public adapter and synthetic tests make the persistence contract inspectable. They are not a claim that the complete private incident or every production recovery branch was replayed here. The private 28 October investigation recorded 23 regression checks plus an exact-snapshot and disposable HTTP verification; that historical result is separate from the tests executed for this export.
