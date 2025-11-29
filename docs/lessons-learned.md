## Lessons Learned from this Interaction:

- **GEMINI.md for Coding Rules:** The primary mechanism to provide persistent coding rules, style guides, architectural constraints, and general instructions to Gemini CLI is through `GEMINI.md` files.
- **Hierarchy of GEMINI.md:**
    - Global: `~/.gemini/GEMINI.md` (applies to all projects)
    - Project-specific: `project_root/GEMINI.md` (or deeper in subfolders)
    - More local contexts override or extend more general ones.
- **Content of GEMINI.md:** Can include indentation rules, naming conventions, architectural guidelines, module boundaries, comment/docstring conventions, persona, etc. It acts as a "system-instruction file" to inform code generation/modification.
- **Consumption:** Gemini CLI loads context from all applicable `GEMINI.md` files (global + project + subdirectory) before executing prompts.
- **Limitations:** `GEMINI.md` provides context but does not "run" code or enforce rules like a linter. It's crucial to be explicit in defining rules; implicit assumptions won't hold.
- **Modularization:** Context can be modularized using `@file.md` imports within a `GEMINI.md` file.
- **Inspection:** The full concatenated context can be inspected with `/memory show` and reloaded with `/memory refresh`.