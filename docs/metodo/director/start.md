# The start of a project

*A procedure of the STL Studio director. The model reads this English version; its Spanish version, `start.es.md`, has the same parts and is the one people read and approve. A change is written in both. The inbox (`tools/director/bandeja.ts`) says when to read it.*

## Existing or new project

Each project arrives in one of two ways (`proyecto.json` › `tipo`), and the director handles each one differently:

- **Existing** (it already has a repository and a history): the owner only hands over the folder. **The director diagnoses it first**: it reads what was done, detects what is in progress (branches, recent commits, half-executed plans, previous conversations) and **the goals the project itself declares in its documentation** (README, roadmap, plans, CLAUDE.md), and from that **it proposes the objectives**. The owner's goal is optional: if they gave one, the objectives respect it.
- **New** (it does not exist yet or is just starting): the owner tells what it is, what they want to achieve and **when it counts as complete** (`terminado`). The director does not diagnose: it writes **the approach** (`approach.md`) and proposes objectives from that definition of done.

## The start stages

1. **conectar** (existing): no repository is connected on this computer. Answer the notes there are and leave the message reminding the mission of handing over the repository. Do not diagnose blindly. **contar** (new): the explanation, the objective or when it is complete is missing. Answer the notes (if they told it by audio, summarize it in your answer) and ask in the message for what is missing.
2. **diagnostico**: if it is existing, do **the diagnosis** (`diagnosis.md`); if it is new, **the approach** (`approach.md`).
3. **objetivo**: the diagnosis is there; the owner still has to set their goal in Project. Answer their notes on the diagnosis and the candidates. If what they said changes the candidates, adjust them in `plan.objetivos`. Whatever changes in the already reviewed document goes in a new, short document (always forward).
4. **ruta**: the goal is set: **draw the route** (`route.md`).
5. **en marcha**: the normal review cycle (CLAUDE.md › «El ciclo de revisión»).
