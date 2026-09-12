# Tests

No dependencies, no install. From the repository root:

    node test/run.js        # or: npm test

`run.js` executes every `*.test.js` in this folder in its own process and exits
non-zero if any of them fails.

Three files:

- `formulas.test.js` — the formula engine, one group per area of the language.
- `page.test.js` — properties of `gridfile.html` itself: it parses, it carries a
  version, the function table and its signature table agree.
- `release.test.js` — builds `dist/gridfile.html` and checks it is the same program
  as the source. This is also what keeps the release in step: a passing `npm test`
  means `dist/` was rebuilt from the current source.

## Testing the release

`harness.js` reads `gridfile.html` by default, or whatever `GRIDFILE` points at:

    GRIDFILE=dist/gridfile.html node test/formulas.test.js

`release.test.js` uses this to run the entire formula suite a second time against
the built file, so the build is verified as a working program rather than merely
diffed against its source. It also checks the thing a comment stripper is most
likely to break: every string and regex literal must survive byte-identical
(`'http://schemas...'` appears throughout the XLSX writer).

## How it works

The app is a single HTML file with no module boundary, so the tests do not import
the engine — `harness.js` slices it out of `gridfile.html` between two markers and
evaluates that slice in a throwaway VM context:

    const START = "const colName=";                 // first thing the engine needs
    const END   = "/* ---------- reference shifting";  // first thing it does not

Nothing in that slice touches the DOM at load time, which is what makes a headless
run possible. If either marker ever moves, the harness fails loudly instead of
quietly testing nothing — fix the constants in `harness.js` when that happens.

Because a VM context does not share object identity with the outside world, the
workbook under test is the page's own `let wb`, reached through `API.wb`.

## Writing a test

```js
const {load} = require("./harness.js");
const {formula, is, report} = require("./tap.js");

const s = load();                 // sheets "Sheet1" and "Data", both empty
s.set("A1", 10);                  // or s.set("Data!B2", 7)
formula(s, "=A1*2", "20");        // puts the formula in Z99 and compares what it displays
is(s.get("A1"), "10", "label");   // any other assertion
report();                         // prints the tally and sets the exit code
```

`formula()` compares against what the cell would *show*, so error cases read the
way a user sees them: `formula(s, "=1/0", "#DIV/0!")`.

## What is covered

- `formulas.test.js` — operators, every builtin group (math, statistics, logic,
  conditional aggregation, lookup, text, information, dates, finance), error values
  and their propagation through references, cross-sheet references, circular refs.
- `page.test.js` — the page script parses, the version meta is present and well
  formed, the file stays under its size budget, no builtin name would be mangled by
  fill-down reference shifting, and the XLSX import whitelist still derives from the
  function table.
