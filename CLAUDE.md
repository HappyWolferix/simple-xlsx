See [AGENTS.md](AGENTS.md).

This project keeps its agent instructions in `AGENTS.md`, which is tool-agnostic.
This file exists only so tools that look for `CLAUDE.md` by name find their way
there; it deliberately holds no instructions of its own. Any other tool-specific
entry point (`GEMINI.md`, `.cursorrules`, …) should be a one-line pointer like
this one rather than a copy that can drift.
