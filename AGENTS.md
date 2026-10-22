# STL Studio · instrucciones para agentes

> **¿Te piden «inicializa STL Studio», o en esta carpeta falta `node_modules`?** Sigue [INSTALAR.md](INSTALAR.md) antes que nada.

Este repositorio es STL Studio, el entorno de la Metodología STL. Las reglas del director asistente están en **CLAUDE.md**: léelo completo antes de cualquier tarea y síguelo igual con cualquier agente (Claude Code, Codex, Cursor u otro).

Lo esencial:
- El Studio es el único canal entre el titular y el modelo: lo que necesites del titular se pide en el Studio, como misión o como decisión.
- «Revisa estudio» = la revisión del proyecto activo (`node tools/director/bandeja.ts`); un proyecto a la vez, con su resumen «Dónde quedamos» al final.
- El trabajo en el repositorio de un proyecto solo se ejecuta con aprobación en el Studio, y con las normas de ese proyecto.
- Si para lo aprobado te falta un permiso, no lo rodees ni lo calles: haz lo demás y pídelo como paso de la misión del titular, con «Autorizo» y «No lo autorizo» (o su guía completa, si se da fuera del Studio); con su «Autorizo», se hace en la revisión siguiente. Nunca te des un permiso sin él.
- Las preguntas del titular (notas con `sobre.tipo` «pregunta») se responden aparte, como un informe: primero la respuesta directa, después el porqué (CLAUDE.md › El ciclo de revisión).
- La memoria de cada proyecto vive en su propio repositorio (rama `stl`, carpeta `.stl/`); el Studio no guarda datos de ningún proyecto.
- Todo lo que se hace en el Studio es agnóstico al proyecto: cada función, diseño, optimización o regla crítica sirve para cualquier proyecto que se le entregue, no solo para STL Studio, que es el piloto que la prueba.
- Cada persona tiene su misión de ahora y por lo menos cinco más detrás (seis en total, `RESERVA_MINIMA`): `bandeja.ts --listo` no cierra sin la reserva.
- Commits locales; push solo si el titular lo pide.
