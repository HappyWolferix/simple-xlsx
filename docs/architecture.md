# Simple xlsx — project documentation

`gridfile.html` is the whole program: one classic `<script>` (no modules), one
`<style>` block, and a `<script id="gfdata" type="application/json">` element
that holds baked-in workbook data when the user downloads a copy of the page.

It ships in two copies. `gridfile.html` is the source: commented, indented,
documented, no size limit — the only copy anyone edits. `dist/gridfile.html` is
the release: the same program with comments and indentation removed, built by
`npm run build`. Users download the release; developers read the source.

`README.md` is the product spec (features, limits, non-goals) — update it when
behaviour changes. `test/README.md` documents the test harness. `AGENTS.md` is the
entry point for AI coding agents and the single place their instructions live
(`CLAUDE.md` and any other tool-specific file are pointers to it). This file
covers everything else: internal structure, invariants, and the develop /
debug / test / release workflow.

## Invariants — do not break these

- **Single self-contained file.** No external scripts, styles, fonts or images;
  no fetch/XHR/WebSocket of any kind. "No network requests" is a promise made
  in the README that users can verify.
- **The source stays directly runnable.** `gridfile.html` opens in a browser and
  works as-is — the build is for shipping, not for developing. Edit, reload; never
  edit `dist/`.
- **The build only deletes.** `tools/build.js` removes comments, indentation and
  blank lines. It does not rename identifiers, join lines (automatic semicolon
  insertion makes that unsafe) or rewrite expressions, so the release cannot
  diverge in behaviour. `release.test.js` proves it: every string and regex
  literal must come through byte-identical, and the whole formula suite is run a
  second time against the built file.
- **Size budget — on the release.** `npm test` fails above 125 kB and warns above
  120 kB, measured on `dist/gridfile.html`. The source is not capped; spend bytes
  on comments freely, but weigh features against what they cost the release.
- **Headless-testable engine slice.** `test/harness.js` extracts the script text
  between the markers `const colName=` and `/* ---------- reference shifting`
  and evaluates it in a Node VM. Everything between those markers must stay
  DOM-free at load time (defining functions that touch the DOM is fine;
  executing DOM access at top level is not). If you move either marker, update
  the constants in `harness.js` in the same change.
- **No section markers in the CSS.** `tools/build.js` strips CSS comments but
  keeps `/* ---------- name ---------- */` in the script, and `release.test.js`
  compares the two marker lists. A comment in that shape inside `<style>` exists
  in the source and not in the release, and fails the build. Comment the CSS in
  any other shape.
- **The phone layout borrows, it does not copy.** Below 700px the toolbar groups
  are moved into the bottom sheet and moved back on close, so there is exactly
  one `#fgBtn`, one `#cellType` and so on, with their original wiring. Anything
  that reaches for a group must hold a reference or search the document, not
  `#toolbar`, because a group on loan is not a child of the toolbar.
- **Popups must be re-pinned below 700px.** `#cpop`, `#dvpanel` and `#cfpanel`
  place themselves from their trigger button's `getBoundingClientRect()` and sit
  at z-index 20/40. On a phone the trigger is inside the bottom sheet (z-index
  46), so an unmodified popup opens off the bottom of the screen *and* behind the
  sheet — it looks like the button does nothing. The narrow-screen CSS overrides
  `top`/`left` with `!important` and lifts them to 47. Any new popup positioned
  from a rect needs the same treatment.
- **Version.** `<meta name="app-version">` in `<head>` is the single version
  source (`APP_VERSION` reads it). Bump it on release.

## Section map

The script is organised by `/* ---------- name ---------- */` comment markers,
in this order. Navigate by grepping for the marker name, not by line number.

| Marker | Contents |
|---|---|
| version | `APP_VERSION` from the meta tag |
| state | `wb` (workbook: sheets → cells/colW/rowH/rules), `sel`, `colName`/`colIdx`, `sheet()`, `addr()`, `cell()`/`ensure()` |
| formula engine | tokenizer, parser, `evalNode`, `resolveRef`, `evalCache` |
| values, errors, coercion | Excel error values (`#DIV/0!` …) and type coercion |
| criteria | `"<=5"` / `"*ltd"` matching shared by SUMIF/COUNTIF family |
| dates | ISO text storage; D.M.YYYY and M/D/YYYY parsing |
| built-in functions | the `FNS` table (~100 functions) and the `FNSIG`/`SIG` signature table that documents it. XLSX import's function whitelist derives from `FNS`; `page.test.js` asserts `FNS` and `SIG` hold exactly the same names |
| reference shifting | `$A$1`-aware reference rewriting for fill/drag — **harness END marker** |
| rendering | grid redraw |
| conditional formatting | rule evaluation and colouring |
| editing | cell entry, insert/delete plumbing |
| formula reference picking | click-to-insert refs while typing a formula |
| formula autocomplete | the `#fapop` popup: name completion while a function name is being typed, signature and current-argument hint once inside the brackets. `faCtx` does the parsing and is the piece worth unit-testing |
| clipboard | copy/cut/paste incl. values-only, format-only |
| colour palette / borders | formatting UI |
| header selection & sizing | row/column resize & select |
| events / tabs | keyboard/mouse wiring, sheet tabs |
| XLSX export / XLSX import | hand-rolled xlsx read/write (zip + XML) |
| persistence & export | localStorage autosave; "Download as HTML" rewrites `#gfdata` in a pristine copy of the page |
| undo / redo | snapshot stack |
| row / column insert & delete | with reference fix-up |
| dropdown UI / conditional format UI / document name / boot | remaining UI and startup |
| phone layout | below 700px: the icon strip under the app bar, the bottom sheet, and the long-press context menus. Builds no second copy of any control — `openSheet()` moves the live `.grp` node into the sheet and `putBack()` restores it |

## Data model in one paragraph

A workbook is `{sheets:[...], active}`; a sheet is
`{name, cells:{}, colW:{}, rowH:{}, rules:[]}`; a cell is a plain object keyed
by address string (`"B7"`) holding value/formula/format fields. Dates are
stored as ISO text, not serial numbers. Formulas are strings re-evaluated
through `evalCache`; cross-sheet references use `Sheet!A1` syntax.

## Develop

Edit `gridfile.html`, reload it in a browser. There is nothing to install or
serve, and no need to build while developing — the source runs directly. Match
the existing style: terse, comment only where the code can't say it, section
markers as above.

Section markers matter more than they look: `tools/build.js` keeps them (and drops
the prose under them), so they survive into the release and remain the slice points
`test/harness.js` uses. Write them as `/* ---------- name ---------- */`; a marker
in any other shape loses its name in the release.

For any behaviour change, also check whether `README.md` still tells the
truth, and keep the change inside the size budget.

## Test

    npm test        # or: node test/run.js

- Runs headlessly in Node, no dependencies. The harness slices the formula
  engine out of the HTML — see `test/README.md` for the markers and the
  `formula()` / `is()` helpers.
- Every formula-engine change needs a test in `test/formulas.test.js`.
  `formula(s, "=1/0", "#DIV/0!")` asserts what the cell *displays*.
- `test/page.test.js` guards the invariants (parseability, version meta, size
  budget, import whitelist). If it fails after your change, the invariant is
  the bug's location, not the test.
- UI changes (rendering, events, clipboard, dialogs) are outside the harness:
  verify them by hand in a browser. Say so when reporting.

## Debug

- Open `gridfile.html` in a browser and use devtools. It is one classic
  script, so top-level names (`wb`, `sheet()`, `evalCache`, `FNS`, …) are
  reachable from the console.
- For engine-only questions, the Node harness is faster than a browser:
  `const {load}=require("./test/harness.js"); const s=load();` then poke
  `s.set/get/formula` or `s.API` in `node -i` / a scratch script.
- Autosave lives in localStorage; clear it there when a corrupt saved state is
  suspected.
- XLSX issues: export a file and inspect it (`unzip -p file.xlsx xl/worksheets/sheet1.xml`);
  round-trip through the import to confirm.

## Release

1. Bump `<meta name="app-version">` in `<head>` (single source of the version).
2. `npm test` — it builds `dist/gridfile.html` and checks it, so a passing test
   run means the release is current and valid.
3. Ship `dist/gridfile.html`.

`npm run build` writes the release on its own if you want to look at it without
running the tests.

## README screenshot

`docs/img/screenshot.png` is generated, not hand-made: `tools/screenshot-fixture.js`
writes a copy of the page with a sample budget baked into `#gfdata`, which is then
screenshotted headlessly and downscaled. The commands are in the header of that
file. Regenerate it when the toolbar or grid changes shape; it is not covered by
`npm test`.
