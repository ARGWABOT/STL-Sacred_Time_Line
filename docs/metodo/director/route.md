# The route

*Its Spanish version, with the same parts, is `route.es.md`; it is read at the `ruta` stage and when the goal was reset.*

## The phases

With the goal set (`proyecto.json` › `objetivo`, in its memory), draw the phases **after** `arranque` (do not delete or change it: it is history). For each phase:

- `id`, `nombre` (short, in the project's language), `etapa` (the name in its discipline: Prototype, MVP, Pilot, Beta, Launch…), `meta`, `porQue` (why it goes in that order), `duracion` (**a milestone, never a calendar deadline**).
- `puerta`: its `nombre` and its `prueba` (what has to happen to cross it, checkable).
- `criterios`: what must be at 100 % to cross. Use indicators when it can be measured on its own (`misiones`, `foco`; validating the project with its people is the developer's own work, outside the Studio); you assess the others with what the missions deliver.
- `frentes`: what each front does in the phase: `foco` (the priority), `apoyo` (it is worked on, limited to what it says) or `espera` (no new work is opened). Few things in focus.
- `misiones`: the phase plan in short sentences.

## The order of the phases

Few phases (3 to 6), and the last one is the objective achieved: its gate is the goal's success criterion. The first ones must attack the biggest risks and validate with real people as soon as possible. **But what is still going to change is never tested**: each test (with people, on another computer, with a client) says which risk it attacks, and goes after the approved work that changes what it measures; if its result expires with what is still to be done, it goes at the end of its phase. If it is worth checking something earlier, a cheap version that is not repeated is done (for example, a clone in another folder of the same computer instead of a clean computer).

## What is written with it

- **The owner's first mission is a short reading of the diagnosis**: the route's waiting screen ends by sending them to it, so they start knowing where their project stands before any work. Short: two to four steps, each leading with `ir` to one part of `docs/director/diagnostico.md` (`{ "doc", "seccion" }`; in a new project, the approach), with `hecho` `{ "que": "leido", "id", "seccion" }`, saying what to look at there (what is solid, what is missing, the biggest risk) and how the goal they confirmed answers it. It asks nothing to decide, never sends them to reread what they already read and approved, and goes first in their queue: every work mission goes after it (`despuesDe`). If the diagnosis document was already read whole, the reading is its short summary in Project (`{ "vista": "proyecto", "ancla": "p-diagnostico" }`) instead.
- The **first mission**, with its reserve (CLAUDE.md › «One mission at a time, with its reserve»): for the owner, the work missions start after that reading.
- A short document `docs/director/ruta.md` (why these phases and in this order, with «Para decidir» if needed) and the owner's mission to read it and comment on it.
- `mensaje`, `ritmo` if something about the project changes, `propuestas` if there are any (each one in its phase).
- The start gate **is crossed by the owner**: tell them in the message.
