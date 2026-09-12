# Changelog

Notable changes to `gridfile.html`. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the version numbers are
the ones in `<meta name="app-version">` — see [README](README.md#development) for the
release procedure.

Every downloaded copy shows its version next to the sheet tabs, so an entry here can
always be matched to the file someone is holding.

## [Unreleased]

### Added

- A **+10 columns** button at the right-hand end of the header row, just past the
  last column, matching the **+100 rows** button under the grid. It stays level with
  the header while the sheet scrolls and follows the last column when columns are
  resized.

### Changed

- Both grid extenders now stop at the import guard rails (200 columns, 5000 rows)
  and grey out once there. **+100 rows** previously grew without limit, past the
  point the `.xlsx` importer can fill.

## [1.1.0]

First version under changelog, and the starting point for the entries above: the
single-file spreadsheet as described in the [README](README.md) — multiple sheets,
about 100 Excel-syntax functions with formula help, cell formatting, dropdowns,
conditional formatting, row/column editing with undo and redo, `.xlsx` load and
save, **Download as HTML**, local-storage autosave, and a layout that follows the
window width down to phone size.

Earlier history is not recorded: the project was published as a finished page rather
than developed in the open.
