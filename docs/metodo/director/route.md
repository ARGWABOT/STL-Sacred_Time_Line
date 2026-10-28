# The route

*A procedure of the STL Studio director. The model reads this English version; its Spanish version, `route.es.md`, has the same parts and is the one people read and approve. A change is written in both. The inbox (`tools/director/bandeja.ts`) says when to read it: at the `ruta` stage and when the goal was reset.*

## The phases

With the goal set (`proyecto.json` › `objetivo`, in its memory), draw the phases **after** `arranque` (do not delete or change it: it is history). For each phase:

- `id`, `nombre` (short, in the project's language), `etapa` (the name in its discipline: Prototype, MVP, Pilot, Beta, Launch…), `meta`, `porQue` (why it goes in that order), `duracion` (**a milestone, never a calendar deadline**).
- `puerta`: its `nombre` and its `prueba` (what has to happen to cross it, checkable).
- `criterios`: what must be at 100 % to cross. Use indicators when it can be measured on its own (`validaciones_personas`, `validaciones_logran`, `validaciones_aprueban` with `tipos` and `meta`; `misiones`; `foco`); you assess the others with what the missions deliver.
- `frentes`: what each front does in the phase: `foco` (the priority), `apoyo` (it is worked on, limited to what it says) or `espera` (no new work is opened). Few things in focus.
- `misiones`: the phase plan in short sentences.

## The order of the phases

Few phases (3 to 6), and the last one is the objective achieved: its gate is the goal's success criterion. The first ones must attack the biggest risks and validate with real people as soon as possible. **But what is still going to change is never tested** (the owner's voice note of 22 October 2026, about an installation test asked for with half the Studio still to build): each test (with people, on another computer, with a client) says which risk it attacks, and goes after the approved work that changes what it measures; if its result expires with what is still to be done, it goes at the end of its phase. If it is worth checking something earlier, a cheap version that is not repeated is done (for example, a clone in another folder of the same computer instead of a clean computer).

## What is written with it

- The **first mission of each person**, with its reserve: at least nine more behind it (CLAUDE.md › «Una misión a la vez»).
- A short document `docs/director/ruta.md` (why these phases and in this order, with «Para decidir» if needed) and the owner's mission to read it and comment on it.
- `mensaje`, `ritmo` if something about the project changes, `propuestas` if there are any (each one in its phase).
- The start gate **is crossed by the owner**: tell them in the message.
