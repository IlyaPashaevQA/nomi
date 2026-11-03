# Export review

## Included

- An allowlisted dependency graph of the shared Hebrew lesson runtime.
- Eight ordinary vocabulary cards and original geometric SVG illustrations.
- Eight existing single-word pronunciation clips, linked to source file hashes.
- New synthetic profiles, local adapter, TypeScript tests and documentation.

## Excluded

Real learner databases, events, checkpoints, family profiles, authentication configuration, tokens, deployment routes, logs from the private application, screenshots of private accounts, schoolbook passages, original picture/character packs and Nomi 0.6 candidates are not export inputs.

The new test reports contain synthetic accounts only. `.demo-data`, dependencies, browser traces and generated reports are excluded from Git by default. A source manifest is supplied instead of the source repository's mixed historical Git state.

## Media provenance and publication decision

The geometric SVG illustrations and neutral leaf were authored for this portable edition. No private child photograph or physical voice recording was intentionally selected. The pronunciation clips come from existing generated teaching assets, but file provenance and previous content review do not independently establish redistribution terms. On 3 November 2026 the owner explicitly approved public release with the existing eight MP3 files, accepted that uncertainty and committed to remove the audio upon request. MP3 files remain outside MIT; the publication decision is not a provider permission.

On 3 November 2026 the owner approved the MIT License for source code, tests and documentation. See `LICENSE`. Audio and other media are excluded from that grant unless explicitly licensed in `ASSETS.md`. Dependencies retain their respective upstream licenses.

## Verification boundaries

Browser checks use actual localhost HTTP, SQLite and Chromium with its sandbox enabled. No paid service, AI API, production session or real learner endpoint is called. Desktop and phone-sized Chromium runs are not physical Safari acceptance.
