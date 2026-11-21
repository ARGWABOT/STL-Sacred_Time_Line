# The start of a project

*Its Spanish version, with the same parts, is `start.es.md`; it is read in the start stages, when the inbox names it.*

## Existing or new project

Each project arrives in one of two ways (`proyecto.json` › `tipo`), and the director handles each one differently:

- **Existing** (it already has a repository and a history): the owner only hands over the folder. **The director diagnoses it first**: it reads what was done, detects what is in progress (branches, recent commits, half-executed plans, previous conversations) and **the goals the project itself declares in its documentation** (README, roadmap, plans, CLAUDE.md), and from that **it proposes the objectives**. The owner's goal is optional: if they gave one, the objectives respect it.
- **New** (it does not exist yet or is just starting): the owner tells what it is, what they want to achieve and **when it counts as complete** (`terminado`). The director does not diagnose: it writes **the approach** (`approach.md`) and proposes objectives from that definition of done.

## The start stages

1. **conectar** (existing): no repository is connected on this computer. Answer the notes there are and leave the message reminding the mission of handing over the repository. Do not diagnose blindly. **contar** (new): the explanation, the objective or when it is complete is missing. Answer the notes (if they told it by audio, summarize it in your answer) and ask in the message for what is missing.
2. **diagnostico**: if it is existing, do **the diagnosis** (`diagnosis.md`); if it is new, **the approach** (`approach.md`).
3. **objetivo**: the diagnosis is there; the owner still has to set their goal in Project. Answer their notes on the diagnosis and the candidates. If what they said changes the candidates, adjust them in `plan.objetivos`. Whatever changes in the already reviewed document goes forward (CLAUDE.md › «Always forward»).
4. **ruta**: the goal is set: **draw the route** (`route.md`).
5. **en marcha**: the normal review cycle (`review-cycle.md`).

## The missing configuration, first

As soon as the route of a handed-over project is written, its first missions, **right after the short reading of the diagnosis and before any work mission**, complete what it lacks to keep developing it: one short mission each, with `"configura"`, and in this order (owner's notes nmwduwd2ytit, nmwgj2ea4tit):

1. **The GitHub account** (`"configura": "cuenta"`): if the project has no approved account on this computer, the mission saves it in «Project» › «Where it is» (`p-repositorio`), suggesting the repository's owner (nmwjk03b3tit). **Without a GitHub repository** (`"configura": "repositorio"`), one guided mission explains how to create a private repository from the person's own GitHub account and connect it there, each step with its button; creating it is the person's, and meanwhile the foot says «No backup» (nmwf5valltit). With remotes of another service, nothing.
2. **The git identity** (`"configura": "identidad"`), only if the folder has none: the one it already uses, set for the folder or for the computer, counts; if there is none, the mission saves the name and email only for that project's folder (nmwimrikjtit).
3. **The permissions mode** is no longer configured: there is a single mode, with no selector (nmwp8uot6tit). `"configura": "permisos"` stays only in old plans.

Projects already handed over get these missions in their next review, only if something is missing (nmwgu4c82tit), ahead of what the person has not started. What was already asked is not asked again: one mission with that `configura` in the plan or its archive is enough. **The code checks it**: `bandeja.ts --listo` does not close without them or with them out of place (`src/director/configuracionPrimero.ts`), and `validarPlan` does not let through a `configura` that is not one of those.
