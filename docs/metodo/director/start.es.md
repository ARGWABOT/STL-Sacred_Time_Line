# El arranque de un proyecto

*Un procedimiento del director de STL Studio. El modelo lee la versión en inglés, `start.md`; esta es su versión en español, para leerla y aprobarla, con las mismas partes. Un cambio se escribe en las dos. La bandeja (`tools/director/bandeja.ts`) dice cuándo leerlo.*

## Proyecto existente o nuevo

Cada proyecto llega de una de dos formas (`proyecto.json` › `tipo`), y el director lo maneja distinto:

- **Existente** (ya tiene repositorio e historia): el titular solo entrega la carpeta. **El director lo diagnostica primero**: lee lo hecho, detecta lo que está en curso (ramas, commits recientes, planes a medio ejecutar, conversaciones previas) y **las metas que el propio proyecto declara en su documentación** (README, roadmap, planes, CLAUDE.md), y a partir de eso **propone él los objetivos**. La meta del titular es opcional: si la dio, los objetivos la respetan.
- **Nuevo** (aún no existe o apenas empieza): el titular cuenta qué es, qué quiere lograr y **cuándo se considera completo** (`terminado`). El director no diagnostica: hace **el planteamiento** (`approach.md`) y propone objetivos a partir de esa definición de terminado.

## Las etapas del arranque

1. **conectar** (existente): no hay repositorio conectado en este computador. Responde las notas que haya y deja el mensaje recordando la misión de entregar el repositorio. No diagnostiques a ciegas. **contar** (nuevo): falta la explicación, el objetivo o cuándo está completo. Responde las notas (si lo contó por audio, resúmelo en tu respuesta) y pide en el mensaje lo que falta.
2. **diagnostico**: si es existente, haz **el diagnóstico** (`diagnosis.md`); si es nuevo, **el planteamiento** (`approach.md`).
3. **objetivo**: el diagnóstico está; falta que el titular fije su meta en Proyecto. Responde sus notas sobre el diagnóstico y los candidatos. Si lo que dijo cambia los candidatos, ajústalos en `plan.objetivos`. Lo que cambie del documento ya revisado va hacia adelante (CLAUDE.md › «Always forward»).
4. **ruta**: la meta está fijada: **traza la ruta** (`route.md`).
5. **en marcha**: el ciclo normal de revisión (`review-cycle.es.md`).

## Lo que falta configurar, primero

En cuanto la ruta de un proyecto entregado está escrita, sus primeras misiones, **justo después de la lectura corta del diagnóstico y antes de cualquier misión de trabajo**, completan lo que le falta para seguir desarrollándolo: una misión corta cada una, con `"configura"`, y en este orden (notas del titular nmwduwd2ytit, nmwgj2ea4tit):

1. **La cuenta de GitHub** (`"configura": "cuenta"`): si el proyecto no tiene una cuenta aprobada en este computador, la misión la guarda en «Proyecto» › «Dónde está» (`p-repositorio`), sugiriendo al dueño del repositorio (nmwjk03b3tit). **Sin repositorio en GitHub** (`"configura": "repositorio"`), una misión guiada explica cómo crear un repositorio privado desde la cuenta de GitHub de la persona y conectarlo ahí, cada paso con su botón; crearlo es de la persona, y mientras tanto el pie dice «Sin respaldo» (nmwf5valltit). Con remotos de otro servicio, nada.
2. **La identidad de git** (`"configura": "identidad"`), solo si la carpeta no tiene ninguna: la que ya usa, sea de la carpeta o del computador, cuenta; si no hay, la misión guarda el nombre y el correo solo para la carpeta de ese proyecto (nmwimrikjtit).
3. **El modo de permisos** ya no se configura: hay un solo modo, sin selector (nmwp8uot6tit). `"configura": "permisos"` queda solo en los planes de antes.

Los proyectos ya entregados reciben estas misiones en su próxima revisión, solo si les falta algo (nmwgu4c82tit), delante de lo que la persona no empezó. Lo ya preguntado no se vuelve a pedir: una misión de ese `configura` en el plan o en su archivo basta. **Lo comprueba el código**: `bandeja.ts --listo` no cierra sin ellas ni con ellas fuera de su lugar (`src/director/configuracionPrimero.ts`), y `validarPlan` no deja pasar un `configura` que no es de los que hay.
