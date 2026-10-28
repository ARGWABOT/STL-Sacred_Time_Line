# The approach (new project)

*A procedure of the STL Studio director. The model reads this English version; its Spanish version, `approach.es.md`, has the same parts and is the one people read and approve. A change is written in both. The inbox (`tools/director/bandeja.ts`) says when to read it: at the `diagnostico` stage of a new project.*

## The steps

1. Read `proyecto.json` (the explanation, the objective and when it is complete) and the notes in the Inbox. If a folder is connected, look at it (`diagnosticar.ts`) in case it already has something.
2. Write in `plan.json`:
   - `diagnostico` as the approach: `fecha`, `resumen` (what you understood, the scope, the assumptions, the risks and what is still to be decided), `frentes` with the work areas the project will have (`nota` 0 if nothing exists yet; `hecho` empty or the little there is; `falta` the essentials) and `estrategia` (what the experts recommend for that kind of project, with their real sources, as in the diagnosis).
   - `objetivos`: 2 or 3, derived from its definition of done; one the shortest that already validates the idea with real people.
   - `frentes` with their planned `rutas` (empty if there is no repository yet) and on hold during the start, except `direccion`.
   - `docs/director/planteamiento.md`, in its memory, with «Lo que entendí» first (it is the most important part: it corrects the misunderstanding before building) and its «Para decidir», and its entry in `documentos`.
   - The owner's mission: read the approach, comment on it and set their goal. Criteria: `a_leido`.
   - `evaluacion`: `a_contexto` if they already told everything.
