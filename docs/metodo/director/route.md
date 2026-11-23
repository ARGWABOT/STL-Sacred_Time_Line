# The route

*Its Spanish version, with the same parts, is `route.es.md`; it is read at the `ruta` stage and when the goal was reset.*

## The line to the goal

With the goal set (`proyecto.json` › `objetivo`, in its memory), draw **one line to the goal**: no phases and no gates. The plan keeps a single goal, `linea.meta`, and `fases` stays empty; `bandeja.ts --aplicar` turns the start plan into that line by itself as soon as the goal is set (`linea.ts` › `debePasarALinea`), keeping what was done in the start as history. In your patch, write in `linea.meta`:

- `nombre` (the goal in a few words, in the interface's language), `etapa` (the name in its discipline: Prototype, MVP, Pilot, Beta, Launch…), `meta`, `porQue`, `duracion` (**a milestone, never a calendar deadline**).
- `puerta`: its `nombre` and its `prueba`: the goal's success criterion. It is not a gate the person crosses on the way: it is declaring «Goal reached» on the flag of «Hoy», which never blocks (the unmarked items of the checklist are shown, not demanded).
- `criterios`: the goal's checklist, what shows it was reached. Use indicators when it can be measured on its own; you assess the others with what the missions deliver.
- `frentes`: what each front does on the way: `foco` (the priority), `apoyo` (it is worked on, limited to what it says) or `espera` (no new work is opened). Few things in focus.
- `misiones`: the plan to the goal in short sentences, in order.

**Never a mission the person cannot complete** (the owner's hard rule, `reglasDelTitular.ts`): no step is marked by crossing a gate (`hecho` `puerta`) in a plan in line, and `validarPlan` refuses it.

## The order of the line

The missions go in the order of the strategy (deciding.md): the first ones attack the biggest risks and validate with real people as soon as possible, each mission after what it needs (`despuesDe`), and what only serves the closing at the closing (`alCierre`). **But what is still going to change is never tested**: each test (with people, on another computer, with a client) says which risk it attacks, and goes after the approved work that changes what it measures; if its result expires with what is still to be done, it goes at the end of the line. If it is worth checking something earlier, a cheap version that is not repeated is done (for example, a clone in another folder of the same computer instead of a clean computer).

## What is written with it

- **The owner's first mission is a short reading of the diagnosis**: the route's waiting screen ends by sending them to it, so they start knowing where their project stands before any work. Short: two to four steps, each leading with `ir` to one part of `docs/director/diagnostico.md` (`{ "doc", "seccion" }`; in a new project, the approach), with `hecho` `{ "que": "leido", "id", "seccion" }`, saying what to look at there (what is solid, what is missing, the biggest risk) and how the goal they confirmed answers it. It asks nothing to decide, never sends them to reread what they already read and approved, and goes first in their queue: every work mission goes after it (`despuesDe`). If the diagnosis document was already read whole, the reading is its short summary in Project (`{ "vista": "proyecto", "ancla": "p-diagnostico" }`) instead.
- The **first mission**, with its reserve (CLAUDE.md › «One mission at a time, with its reserve»): for the owner, the work missions start after that reading. Every mission goes in `"fase": "meta"`.
- A short document `docs/director/ruta.md` (why this order to the goal, with «Para decidir» if needed) and the owner's mission to read it and comment on it.
- `mensaje`, `ritmo` if something about the project changes, `propuestas` if there are any (each one in `"fase": "meta"`).
- There is no start gate to cross: never ask the owner to cross one.
