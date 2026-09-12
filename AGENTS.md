# Simple xlsx — agent entry point

Instructions for any AI coding agent working in this repository. This file is the
single source of those instructions; tool-specific files such as `CLAUDE.md` only
point here, so add guidance in this file and nowhere else.

One HTML file is the entire product: markup, styles and code, no dependencies, no
network requests. It exists in two copies:

- `gridfile.html` — **the source, and the only file you edit.** Fully commented and
  documented, no size limit.
- `dist/gridfile.html` — the release, what people actually download. Generated from
  the source by `npm run build`; comments and indentation removed, nothing renamed
  or rewritten. **Never edit it — the next build overwrites your change.**

Everything else in this repository is documentation and test scaffolding.

Before changing anything, load `docs/architecture.md` — the project
documentation: section map of `gridfile.html`, the invariants you must not
break, and the develop / debug / test / release workflow.

`README.md` is the human-facing description of features and limits; treat it as
the product spec and update it when behaviour changes. `test/README.md`
documents the test harness.

## Commands

    npm test         # runs every suite and rebuilds dist/gridfile.html
    npm run build    # rebuild the release only

Both are plain Node, no install step and no dependencies. `npm test` is the only
check that matters; run it before you report a change as done.

## Hard rules, always

- The page stays a single self-contained file. No external resources, no
  network requests, no runtime dependencies.
- Size budget applies to `dist/gridfile.html`, not to the source: `npm test`
  fails above 125 kB and warns above the 120 kB goal. The source may spend as
  many bytes as it likes on comments. A feature that costs more *release* bytes
  than it is worth to a household user still does not go in.
- The build only deletes; it never renames or rewrites. If the release ever
  behaves differently from the source, that is a bug in `tools/build.js`.
- Keep it simple. This is deliberately a ~95% spreadsheet; see "What it is
  not" in `README.md` before adding scope.
- UI changes cannot be covered by the headless tests. Verify them in a browser,
  and say plainly which parts you verified and which you did not.
