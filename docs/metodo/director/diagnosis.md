# The diagnosis (existing project)

*A procedure of the STL Studio director. The model reads this English version; its Spanish version, `diagnosis.es.md`, has the same parts and is the one people read and approve. A change is written in both. The inbox (`tools/director/bandeja.ts`) says when to read it: at the `diagnostico` stage of an existing project and for each project of the diagnosis queue.*

## The steps

1. `node tools/director/diagnosticar.ts`: the X-ray (history, structure, languages, tools, tests, documentation, hot spots, debt). They are facts, not judgment.
2. **Really read the repository**: the README and the documentation, the manifests, the entry points, the key code of each area, the tests, the CI, the latest commits. Also read its `proyecto.json` (the context and what the owner wants to achieve) and the notes in the Inbox. If it is large, use reading subagents and put their findings together. **Also research what people who know that kind of project recommend** (an app, a thesis, a site, a product): the real sources you find are reference, never an order.
3. **Define the fronts**: the work areas that make sense for the project (not one per folder), each one with its `rutas` (prefixes of the project's repository), to measure the effort. Keep the `direccion` front.
4. Write in its memory (`.stl/director/plan.json`; the inbox gives the path):
   - `diagnostico`: `fecha` (today), `resumen` (3 to 6 paragraphs: what it really is, what is solid, what is missing, what risks there are, where the effort goes), `frentes` (per front: `nota` from 0 to 5 = how ready it is for what the owner wants, not how much was worked; `hecho`, `falta`, `veredicto` in one sentence), `fuentes` (what you read) and `estrategia` (`texto`: the strategy for this kind of project according to the experts, applied to what you found, in one or two paragraphs; `fuentes`: the real ones, with their address). The Studio shows it in Project, in «El diagnóstico del director»: the summary, the readiest and the weakest fronts in one paragraph, the strategy and the document one click away.
   - `objetivos`: **2 or 3 candidates**, each with `texto` (what is achieved), `exito` (how it is checked: a number or a verifiable fact), `porQue` (why that one, from the diagnosis), `riesgo` and, if it applies, `horizonte` (a milestone, never an imposed date). One must be the shortest one that leaves something truly valuable.
   - `frentes`: the new ones, and in the `arranque` phase each one on hold (`"nivel": "espera"`) except `direccion`.
   - `detectado`: what you already know about the project, so the owner does not have to write it: `contexto` (what it is, for whom and where it stands, in one paragraph) and `meta` (the goal you suggest, in one sentence). The Studio shows it in Project, marked as detected, until the owner writes their own.
   - `evaluacion`: `a_contexto` if the owner already told the context.
   - A document `docs/director/diagnostico.md` in its memory (format: CLAUDE.md › «Los documentos del director») and its entry in `documentos`.
   - **If the owner has no goal yet** (they only want the diagnosis and to run it with STL), what would improve the project goes as `propuestas` (suggested missions), never as missions: they decide which ones. With the goal set, the route is drawn.
   - The owner's mission: read the diagnosis and comment on it part by part, with its button to the document, and set their goal (button to `{ "vista": "proyecto", "ancla": "p-objetivo" }`). Criteria: `a_leido`.
   - `mensaje` and, if you want, a first team `boletin`.
5. Validate and close (CLAUDE.md › «Validar y cerrar»).

## The AI history

If the project brings `historialIA` (previous conversations with AI agents), read it **once**, in the diagnosis, with a reading subagent: look for what was left half done or waiting for approval, and turn it into Studio proposals, missions or decisions (a single channel). Never answer in those conversations or continue them.
