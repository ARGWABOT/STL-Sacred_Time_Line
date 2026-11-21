# The memory check (an existing project's memory against its code)

*A procedure of the STL Studio director. The model reads this English version; its Spanish version, `memory-check.es.md`, has the same parts and is the one people read and approve. A change is written in both. The inbox (`tools/director/bandeja.ts`) names it while the proposal `p_verificar_memoria` is accepted and not executed: the owner chose it at the end of the diagnosis (`diagnosis.md` › «The project's memory»).*

## What it is for

The owner accepted that STL checks the project's own memory (its instructions for AI agents and its state documents) against the code before starting from it. It leaves two things: STL's own picture of the project corrected with the real state, and what is outdated in the project's files shown with its evidence, for the owner to decide whether STL updates them. Nothing changes in the project's repository in this review.

## The steps

1. Run `node tools/director/diagnosticar.ts` if the X-ray is older than the project's last commit, and read its part «La memoria del proyecto».
2. Read each memory file whole and, if the X-ray names it, Claude Code's own memory of the project on this computer (only to read it). If they are many or long, use one reading subagent per file, with this list.
3. Check every claim that can be checked against the code and the history: paths, commands and scripts; the architecture and where each thing lives; the rules about the code (style, tests, branches) against what the code really does; versions and dependencies; and what it says is done, in progress or pending against the commits. Each claim, with its evidence (the file or the commit).
4. Put each one in its group: still true; outdated (what it says, what is true now, the evidence); points to what no longer exists (removed or deprecated code, scripts, folders); copies that contradict each other; and what is missing (the areas with most work in recent months that the memory does not mention).
5. Correct STL's memory: whatever of the diagnosis, the detected context, the candidate goals or the fronts' notes rested on something outdated is brought up to date in the plan, and `diagnostico.memoria` gets its new level. The diagnosis document already reviewed stays sealed (CLAUDE.md › «Always forward»): what changes goes in the new document.
6. Write `docs/director/memoria-del-proyecto.md` (its format: `documents.md`): what you understood; how up to date it was, file by file; what is outdated, with its evidence; what is missing; and what changed in STL's diagnosis. At the end, the decisions:
   - **Update your project's memory**: STL rewrites the outdated parts of each file in the project's repository, one local commit per file, with the project's rules (its branches, its confirmations), and never pushes. Recommend it when what is outdated could mislead another agent or person. Approved, the next review does it and reports each file.
   - **One source**, only if there are copies: which file remains the source and how the others point to it.
7. The owner's mission: read it part by part and answer its decisions, with its button to the document.
8. The proposal goes to `ejecutadas`, saying what was checked and what changed.

## What it never does

It does not write in the project's repository or in Claude Code's memory in this review, it does not continue or answer earlier conversations, and it does not redo the diagnosis: it corrects it where the memory misled it.
