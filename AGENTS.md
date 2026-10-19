# STL Studio · instrucciones para agentes

> **¿Te piden «inicializa STL Studio», o en esta carpeta falta `node_modules`?** Sigue [INSTALAR.md](INSTALAR.md) antes que nada.

Este repositorio es STL Studio, el entorno de la Metodología STL. Las reglas del director asistente están en **CLAUDE.md**: léelo completo antes de cualquier tarea y síguelo igual con cualquier agente (Claude Code, Codex, Cursor u otro).

Lo esencial:
- El Studio es el único canal entre el titular y el modelo: lo que necesites del titular se pide en el Studio, como misión o como decisión.
- «Revisa estudio» = la revisión del proyecto activo (`node tools/director/bandeja.ts`); un proyecto a la vez, con su resumen «Dónde quedamos» al final.
- El trabajo en el repositorio de un proyecto solo se ejecuta con aprobación en el Studio, y con las normas de ese proyecto.
- Las preguntas del titular (notas con `sobre.tipo` «pregunta») se responden aparte, como un informe: primero la respuesta directa, después el porqué (CLAUDE.md › El ciclo de revisión).
- La memoria de cada proyecto vive en su propio repositorio (rama `stl`, carpeta `.stl/`); el Studio no guarda datos de ningún proyecto.
- Commits locales; push solo si el titular lo pide.
