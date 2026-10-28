# El arranque de un proyecto

*Un procedimiento del director de STL Studio. El modelo lee la versión en inglés, `start.md`; esta es su versión en español, para leerla y aprobarla, con las mismas partes. Un cambio se escribe en las dos. La bandeja (`tools/director/bandeja.ts`) dice cuándo leerlo.*

## Proyecto existente o nuevo

Cada proyecto llega de una de dos formas (`proyecto.json` › `tipo`), y el director lo maneja distinto:

- **Existente** (ya tiene repositorio e historia): el titular solo entrega la carpeta. **El director lo diagnostica primero**: lee lo hecho, detecta lo que está en curso (ramas, commits recientes, planes a medio ejecutar, conversaciones previas) y **las metas que el propio proyecto declara en su documentación** (README, roadmap, planes, CLAUDE.md), y a partir de eso **propone él los objetivos**. La meta del titular es opcional: si la dio, los objetivos la respetan.
- **Nuevo** (aún no existe o apenas empieza): el titular cuenta qué es, qué quiere lograr y **cuándo se considera completo** (`terminado`). El director no diagnostica: hace **el planteamiento** (`approach.md`) y propone objetivos a partir de esa definición de terminado.

## Las etapas del arranque

1. **conectar** (existente): no hay repositorio conectado en este computador. Responde las notas que haya y deja el mensaje recordando la misión de entregar el repositorio. No diagnostiques a ciegas. **contar** (nuevo): falta la explicación, el objetivo o cuándo está completo. Responde las notas (si lo contó por audio, resúmelo en tu respuesta) y pide en el mensaje lo que falta.
2. **diagnostico**: si es existente, haz **el diagnóstico** (`diagnosis.md`); si es nuevo, **el planteamiento** (`approach.md`).
3. **objetivo**: el diagnóstico está; falta que el titular fije su meta en Proyecto. Responde sus notas sobre el diagnóstico y los candidatos. Si lo que dijo cambia los candidatos, ajústalos en `plan.objetivos`. Lo que cambie del documento ya revisado va en un documento nuevo, corto (siempre hacia adelante).
4. **ruta**: la meta está fijada: **traza la ruta** (`route.md`).
5. **en marcha**: el ciclo normal de revisión (CLAUDE.md › «El ciclo de revisión»).
