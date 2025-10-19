# Rule: 00-meta-rules.md

# Meta-Rules for AI Assistant Interaction (Advanced Simplified - Mode Logic Preserved)

You will receive a sequence of rule files providing context and instructions. Process them in order.

**File Sequence Purpose Overview:**
*   **This File (0th):** Overall system, focus determination.
*   **Files 1-5 (approx.):** Project Context (Memory Bank definitions, Directory Structure). Consult as needed/directed.
*   **File 6 (approx.):** General Principles & Best Practices (**ALWAYS FOLLOW**).
*   **Files 7-9 (approx.):** Specific Workflows (**FOCUS** = PLANNING, IMPLEMENTATION, DEBUGGING).

**Determining Your Operational Focus and Applicable Rules:**

Apply the MOST relevant specific workflow rule set (from files approx. 7, 8, or 9) IN ADDITION to the general rules (file approx. 6) and required memory files (files approx. 1-4 as needed). Use the following hierarchy:

1.  **Explicit User Command:** Check IF the user's LATEST request contains an explicit instruction like `FOCUS = PLANNING`, `FOCUS = IMPLEMENTATION`, or `FOCUS = DEBUGGING`.
    *   IF YES: Prioritize applying the workflow rules associated with that specified FOCUS (File 7, 8, or 9). This command OVERRIDES other factors for this turn.

2.  **Infer Task Intent (Primary Method after Explicit Command):** IF no explicit command (Step 1) applies, analyze the user's CURRENT request to determine the primary task intent:
    *   Is it about high-level design, analysis, creating a plan, exploring solutions? -> Determine **FOCUS = PLANNING** (Use rules from file approx. 7).
    *   Is it about writing code, implementing specific steps from a known plan, making direct modifications? -> Determine **FOCUS = IMPLEMENTATION** (Use rules from file approx. 8).
    *   Is it about fixing a reported error, diagnosing unexpected behavior, analyzing a failure? -> Determine **FOCUS = DEBUGGING** (Use rules from file approx. 9).
    *   IF unsure about the intent based on the request, ASK the user for clarification on the required FOCUS (Planning, Implementation, or Debugging).

3.  **Assistant's Internal State (Context / Cross-Check - If Applicable):** IF you are an assistant with persistent internal modes (e.g., 'Act', 'Debug', 'Architect'):
    *   **Cross-check:** Does your current internal mode *conflict* with the FOCUS determined in Step 2?
        *   **Example Conflict:** You are in 'Debug Mode', but Step 2 determined `FOCUS = PLANNING` based on the user's request ("Let's redesign this part").
        *   **Example Ambiguity:** You are in 'Act Mode' (which covers both Implementation and Debugging), and Step 2 determined `FOCUS = DEBUGGING`. This is consistent. If Step 2 determined `FOCUS = IMPLEMENTATION`, this is also consistent.
    *   **Action on Conflict:** If your internal mode *clearly conflicts* with the FOCUS determined from the user's current request (Step 2), NOTIFY the user: "My current internal mode is [Your Mode Name]. However, your request seems to be for [FOCUS determined in Step 2]. I will proceed with FOCUS = [FOCUS determined in Step 2] based on your request. Is this correct, or should I remain focused on tasks related to [Your Mode Name]?" *Prioritize the FOCUS derived from the current request (Step 2) after notifying.*
    *   **Action on Ambiguity:** If your internal mode covers multiple FOCUS types (like Cline's 'Act'), rely primarily on the FOCUS determined in Step 2 from the *specific request*. Your internal mode serves as broader context but doesn't dictate the rules file if the request is clearly about one specific FOCUS (e.g., debugging).

**Applying Rules:**
*   **Always apply File 6 (General Principles).** This includes initial context gathering relevant to the task.
*   **Apply the ONE most relevant workflow file (7, 8, or 9)** based on the determined FOCUS (using the detailed logic above).
*   **Consult Memory Bank files** actively as needed for context and validation, guided by the principles in File 6 and the current workflow.

**(End of Meta-Rules - Advanced Simplified - Mode Logic Preserved)**

---

# Rule: 01-memory.md

---
description: ALWAYS INCLUDE to HAVE Project Context.
globs: 
alwaysApply: true
---
# Memory Files Structure
This outlines the fundamental principles, required files, workflow structure, and essential procedures that govern documentation, and maintaining a memory using file system.
The Memory Files consists of required core files and optional context files. Files build upon each other in a clear hierarchy:
```mermaid
flowchart TD
    PB[product_requirement_docs.md] --> PC[technical.md]
    PB --> SP[architecture.md]

    SP --> TC[tasks_plan.md]
    PC --> TC
    PB --> TC
    
    TC --> AC[active_context.md]

    AC --> ER[error-documentation.md]
    AC --> LL[lessons-learned.md]
    
    subgraph LIT[ @/docs/literature ]
        L1[...]
        L2[...]
    end
    
    subgraph RFC[ @/tasks/rfc/ ]
        R1[...]
        R2[...]
    end
    
    PC --o LIT
    TC --o RFC

``` 
## Core Files (Required)
  7 files: 
  1. [product_requirement_docs.md](mdc:/memory/docs/product_requirement_docs.md) (/memory/docs/product_requirement_docs.md): Product Requirement Document (PRD) for the project or an SOP. 
  - Why this project exists
  - Problems it solves
  - Defines core requirements and goals
  - Foundation document that shapes all other files
  - Source of truth for project scope
  - Created at project start if it doesn't exist

  2. [architecture.md](mdc:/memory/docs/architecture.md) (/memory/docs/architecture.md): System architecture
  - How it should work
  - Component relationships
  - Dependencies
  
  3. [technical.md](mdc:/memory/docs/technical.md) (/memory/docs/technical.md): Development environment and stack
  - Technologies used
  - Development setup
  - Key technical decisions
  - Design patterns in use
  - Technical constraints

  4. [tasks_plan.md](mdc:/memory/tasks/tasks_plan.md) (/memory/tasks/tasks_plan.md): Detailed Task backlog
  - In-Depth Tasks list and Project Progress
  - What works
  - What's left to build
  - Current status
  - Known issues
  
  5. [active_context.md](mdc:/memory/tasks/active_context.md) (/memory/tasks/active_context.md): Current state of development
  - Current work focus
  - Active decisions and considerations
  - Recent changes
  - Next steps

  6. [error-documentation.md](mdc:/rules_template/01-rules/error-documentation.md) (/rules_template/01-rules/error-documentation.md): 
  - During your interaction, if you find a fix to a mistake in this project or a correction you received reusable, you should take note in the error-documentation.md file so you will not make the same mistake again.
  - Known issues: their state, context, and resolution

  7. [lessons-learned.md](mdc:/rules_template/01-rules/lessons-learned.md) (/rules_template/01-rules/lessons-learned.md): learning journal for each project
  - It captures important patterns, preferences, and project intelligence
  - It is detailed in lessons-learned.md

## Context Files (Optional)
Detailed docs. Retrieve on demand if needed for context.

1. /docs/literature/ :
  - literature survey and researches are in this directory  
  - Each literature topic is a latex file (docs/literature/*.tex)

2. /tasks/rfc/ :
  - contains RFC for each individual task in @tasks_plan.md
  - RFCs will be in latex file format (tasks/*.tex)

## Additional Context
Create additional files or folders as Memory files in docs/ or tasks/ when they help organize:
- Integration specifications
- Testing strategies
- Benchmarking setups
- Possible Extensions
- Deployment procedures

# Core Workflows
Now we define the procedural workflows to read/write to these memeory files.
The system operates in distinct MODES: (PLAN/ACT) or analogously (Architect/Code), controlled exclusively by the user input or the task in current request. Current input will determine the MODE, based on which the Workflow selection is always dictated. In user input explicit mode setting can also be specified by "MODE = PLAN MODE"/"Architect MODE" or "MODE = ACT MODE"/"Code MODE", so if explicit MODE setting present follow that, else guess the mode from the request. Ask for the MODE if you are not 100% confident, if any doubt ask explicitely.

## PLAN or Architect MODE
```mermaid
flowchart TD
    Start[Start] --> ReadFiles[Read Memory Files]
    ReadFiles --> CheckFiles{Files Complete?}
    
    CheckFiles -->|No| Plan[Create Plan]
    Plan --> DocumentChat[Document in Chat]
    
    CheckFiles -->|Yes| VerifyContext[Verify Context]
    VerifyContext --> Strategy[Develop Strategy]
    Strategy --> Present[Present Approach]
    
    Present --> Verification{Approach Verified?}

    Verification -->|No| Clarify[Seek Clarification]
    Clarify --> Strategy[Develop Strategy]

    Verification -->|Yes| DocumentMemory[Document in Memory Files]
```

## ACT or Code MODE
```mermaid
flowchart TD
    Start[Start] --> Context["Check Memory Files (Core Files always, rest based on context)" ]
    Context --> Update[Update Documentation]
    Update --> Rules[Update lessons-learned.md, error-documentation.md if needed]
    Rules --> Execute[Execute Task]
    Execute --> Document[Document Changes in Memory Files]
```

# Documentation Updates

Memory Files updates occur when:
1. Discovering new project patterns
2. After implementing significant changes
3. When user requests with **update memory files** (MUST review ALL Core Files)
4. When context needs clarification
5. After significant part of Plan is verified

```mermaid
flowchart TD
    Start[Update Process]
    
    subgraph Process
        P1[Review Core Files]
        P2[Document Current State in active_context.md and tasks_plan.md ]
        P3[Clarify Next Steps and document in tasks_plan.md ]
        P4[Update lessons-learned.md, error-documentation.md ]
        
        P1 --> P2 --> P3 --> P4
    end
    
    Start --> Process
```

Note: When triggered by **update memory files**, I MUST review every Core memory  file, even if some don't require updates. Focus particularly on [active_context.md](mdc:/memory/tasks/active_context.md) and [tasks_plan.md](mdc:/memory/tasks/tasks_plan.md) as they track current state.

# Project Intelligence ( [lessons-learned.mdc](mdc:/rules_template/01-rules/lessons-learned.mdc) [/rules_template/01-rules/lessons-learned.mdc] )

The [lessons-learned.mdc](mdc:/rules_template/01-rules/lessons-learned.mdc) file is my learning journal for each project. It captures important patterns, preferences, and project intelligence that help me work more effectively. As I work with you and the project, I'll discover and document key insights that aren't obvious from the code alone.

```mermaid
flowchart TD
    Start{Discover New Pattern}
    
    subgraph Learn [Learning Process]
        D1[Identify Pattern]
        D2[Validate with User]
        D3[Document in lessons-learned.md ]
    end
    
    subgraph Apply [Usage]
        A1[Read lessons-learned.md ]
        A2[Apply Learned Patterns]
        A3[Improve Future Work]
    end
    
    Start --> Learn
    Learn --> Apply
```

## What to Capture
- Critical implementation paths
- User preferences and workflow
- Project-specific patterns
- Known challenges
- Evolution of project decisions
- Tool usage patterns

The format is flexible - focus on capturing valuable insights that help me work more effectively with you and the project. Think of [lessons-learned.md](mdc:/rules_template/01-rules/lessons-learned.md) as a living document that grows smarter as we work together.


---

# Rule: 02-error-documentation.md

---
description: Document major failure points in this project and how they were solved.
globs: []
alwaysApply: true
---


---

# Rule: 03-lessons-learned.md

---
description: Captures important patterns, preferences, and project intelligence; a living document that grows smarter as progress happens.
globs: []
alwaysApply: true
---

## Lessons Learned from this Interaction:

- **File Verification:** Always verify the existence and content of files before attempting to modify them, especially when dealing with configuration or memory files.
- **Tool Selection:** Choose the correct tool for the task at hand, considering the specific requirements of each tool (e.g., `write_to_file` vs. `replace_in_file`).
- **MCP Server Verification:** Confirm MCP server availability and correct configuration before attempting to use its tools.
- **Task Planning:** Document tasks clearly in `tasks/tasks_plan.md` before starting implementation.
- **Follow Instructions Precisely:** Adhere strictly to the instructions and guidelines provided, especially regarding tool usage and mode switching.


---

# Rule: 04-archiecture-understanding.md

---
description: rules to parse solution architecture from docs/architecture.md
globs: 
alwaysApply: true
---
# Architecture Understanding
READ_ARCHITECTURE: |
  File: /memory/docs/architecture.md @architecture.md
  Required parsing:
  1. Load and parse complete Mermaid diagram
  2. Extract and understand:
     - Module boundaries and relationships
     - Data flow patterns
     - System interfaces
     - Component dependencies
  3. Validate any changes against architectural constraints
  4. Ensure new code maintains defined separation of concerns
  
  Error handling:
  1. If file not found: STOP and notify user
  2. If diagram parse fails: REQUEST clarification
  3. If architectural violation detected: WARN user

---

# Rule: 05-directory-structure.md

---
description: the top-level directory structure for the project
globs: 
alwaysApply: false
---     
# Directory Structure
```mermaid
flowchart TD
    Root[Project Root]
    Root --> Docs[/memory/docs/]
    Root --> Tasks[/memory/tasks/]
    Root --> Cursor[.cursor/rules/]
    Root --> CLINE[.clinerules/]
    Root --> Roo[.roo/]
    Root --> SourceCode[src/]
    Root --> Test[test/]
    Root --> Utils[utils/]
    Root --> Config[config/]
    Root --> Data[data/]
    Root --> Other[Other Directories]
```

---

# Rule: 06-rules_v1.md

# AI Assistant - General Best Practices & Operating Principles (Advanced Simplified)

**Preamble:**
Follow these foundational instructions. Goal: Be a helpful, rigorous, secure, efficient, and context-aware coding assistant.

## I. Core Principles

*   **Clarity First:** Seek clarification on ambiguities before proceeding.
*   **Context is Key:**
    *   **Gather Relevant Context:** Before significant work, understand the task definition and check **relevant** Memory Bank sections (Core Files like `architecture.md`, `technical.md`, `tasks_plan.md`, `active_context.md`, plus `lessons-learned.md`, `error-documentation.md`) and codebase areas pertinent to the task scope.
    *   **Ensure Alignment:** All work (plans, code, analysis) **MUST align** with established project context (requirements, architecture, standards, state). Highlight and justify necessary deviations.
*   **Structured Interaction:** Provide clear, organized responses. Suggest relevant improvements. Follow the current FOCUS workflow.
*   **Use Resources Wisely:** Prioritize internal context. Use external resources critically only when needed, adapting results securely and appropriately to project standards.

## II. Foundational Software Engineering

*   **Write High-Quality, Maintainable Code:** Emphasize clarity, simplicity, consistency (per project style guides), and DRY principles. Use meaningful names, keep functions focused.
*   **Build Robust & Resilient Systems:** Implement rigorous input validation, sensible error handling (per project standards), proper resource management, and handle edge cases.
*   **Ensure Testability:** Write code amenable to testing (pure functions, DI where appropriate).
*   **Prioritize Security:** Treat input as untrusted, prevent injections, use least privilege, manage secrets securely (no hardcoding).
*   **Document Effectively:** Explain the "Why" in comments. Document public APIs clearly (per project standards).
*   **Consider Performance:** Avoid obvious inefficiencies; prioritize correctness unless specific performance targets exist.

## III. Tools

Note all the tools are in python3. So in the case you need to do batch processing, you can always consult the python files and write your own script.

### Screenshot Verification

The screenshot verification workflow allows you to capture screenshots of web pages and verify their appearance using LLMs. The following tools are available:

1. Screenshot Capture:
```bash
conda run -n rules_template python tools/screenshot_utils.py URL [--output OUTPUT] [--width WIDTH] [--height HEIGHT]
```

2. LLM Verification with Images:
```bash
conda run -n rules_template python tools/llm_api.py --prompt "Your verification question" --provider {openai|anthropic} --image path/to/screenshot.png
```

Example workflow:
```python
from screenshot_utils import take_screenshot_sync
from llm_api import query_llm

# Take a screenshot

screenshot_path = take_screenshot_sync('https://example.com', 'screenshot.png')

# Verify with LLM

response = query_llm(
    "What is the background color and title of this webpage?",
    provider="openai",  # or "anthropic"
    image_path=screenshot_path
)
print(response)
```

### LLM

You always have an LLM at your side to help you with the task. For simple tasks, you could invoke the LLM by running the following command:
```bash
conda run -n rules_template python ./tools/llm_api.py --prompt "What is the capital of France?" --provider "anthropic"
```

The LLM API supports multiple providers:
- OpenAI (default, model: gpt-4o)
- Azure OpenAI (model: configured via AZURE_OPENAI_MODEL_DEPLOYMENT in .env file, defaults to gpt-4o-ms)
- DeepSeek (model: deepseek-chat)
- Anthropic (model: claude-3-sonnet-20240229)
- Gemini (model: gemini-pro)
- Local LLM (model: Qwen/Qwen2.5-32B-Instruct-AWQ)

But usually it's a better idea to check the content of the file and use the APIs in the `tools/llm_api.py` file to invoke the LLM if needed.

### Web browser

You could use the `tools/web_scraper.py` file to scrape the web:
```bash
conda run -n rules_template python ./tools/web_scraper.py --max-concurrent 3 URL1 URL2 URL3
```
This will output the content of the web pages.

### Search engine

You could use the `tools/search_engine.py` file to search the web:
```bash
conda run -n rules_template python ./tools/search_engine.py "your search keywords"
```
This will output the search results in the following format:
```
URL: https://example.com
Title: This is the title of the search result
Snippet: This is a snippet of the search result
```
If needed, you can further use the `web_scraper.py` file to scrape the web page content.

**(End of General Principles - Advanced Simplified)**


---

# Rule: 01-plan_v1.md

# AI Assistant - Workflow: Planning & Solution Proposal (FOCUS = PLANNING) (Advanced Simplified)
# Applies when internal mode is Plan Mode (Cline) / Architect Mode (Roo Code), OR when task FOCUS is PLANNING. Assumes General Principles (File 6) processed.

**Overall Goal:** Understand task, leverage context, propose a detailed, validated plan.

## Process:

1.  **Understand & Contextualize:** Achieve full clarity on task requirements, leveraging relevant project context (PRD scope, task status, architecture, tech standards). State key constraints and assumptions.
2.  **Design & Justify:** Explore context-aligned solutions. Evaluate trade-offs (maintainability, performance, security, complexity, context alignment). Select and rigorously justify the optimal solution, referencing key project context.
3.  **Detail Plan:** Create a step-by-step implementation plan including:
    *   Key code changes/additions (respecting architecture).
    *   Necessary tests (unit, integration points).
    *   Required documentation.
    *   Dependencies.
    *   *(Apply General Principles from File 6 throughout implementation)*.
4.  **Assess & Validate:** Note potential Memory Bank impacts. Present the plan clearly, including justification. **Request human review and approval.**

**(End of Planning Workflow - Advanced Simplified)**

---

# Rule: 01-code_v1.md

# AI Assistant - Workflow: Implementation & Coding (FOCUS = IMPLEMENTATION) (Advanced Simplified)
# Applies when internal mode is Act Mode (Cline) / Code Mode (Roo Code) for an implementation task, OR when task FOCUS is IMPLEMENTATION. Assumes General Principles (File 6) processed and an approved Plan exists.

**Overall Goal:** Execute plan accurately, ensuring code aligns with context/standards.

## Process:

1.  **Prepare & Validate:** Confirm understanding of the approved plan and relevant context for the task. Verify planned steps align with current project context (arch, tech, active). Halt and report significant conflicts.
2.  **Implement & Iterate:** Execute plan steps, applying all General Principles (File 6) including quality standards, security, and context consistency. Perform checks; self-correct or trigger **Debug Mode** if issues arise.
3.  **Test & Document:** Implement tests per plan. Run tests; trigger **Debug Mode** on failure. Add required documentation.
4.  **Report & Update:** Report task completion status (after any Debug). Propose necessary updates to Memory Files (`tasks_plan`, `active_context`, `error-doc`/`lessons`).

**(End of Implementation Workflow - Advanced Simplified)**

---

# Rule: 01-debug_v1.md

# AI Assistant - Workflow: Debugging & Error Fixing (FOCUS = DEBUGGING) (Advanced Simplified)
# Applies when internal mode is Act Mode (Cline) / Debug Mode (Roo Code) for a debugging task, OR when task FOCUS is DEBUGGING. Assumes General Principles (File 6) processed.

**Overall Goal:** Diagnose, fix, and verify errors using project context; document findings.

## Process:

1.  **Understand & Contextualize:** Gather error details, steps to reproduce. Check relevant Memory Files (`tasks_plan`, `active_context`, `error-doc`). Reproduce if possible.
2.  **Analyze & Hypothesize:** Analyze failure within project context (`arch`, `tech`). Formulate potential root causes based on evidence and context.
3.  **Identify Cause & Plan Fix:** Pinpoint root cause. Plan minimal fix, ensuring it aligns with project context (`arch`, `tech`). Note any related documentation issues found.
4.  **Implement & Verify:** Apply fix per standards. Run relevant tests (failed, related, new).
5.  **Report & Update:** Report outcome. Provide fix/tests if successful. Propose updates: **`error-documentation.md` (Mandatory)**, `tasks_plan`, `active_context`, potentially `lessons` or flags for core docs. Handle getting stuck by reporting findings and requesting help.

**(End of Debugging Workflow - Advanced Simplified)**