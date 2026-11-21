# La verificación de la memoria (la memoria de un proyecto existente contra su código)

*Su versión en inglés, con las mismas partes, es `memory-check.md`; se lee mientras la propuesta `p_verificar_memoria`, elegida al final del diagnóstico (`diagnosis.es.md` › «La memoria del proyecto»), está aceptada y sin ejecutar.*

## Para qué es

El titular aceptó que STL compruebe la memoria del propio proyecto (sus instrucciones para agentes de IA y sus documentos de estado) contra el código antes de arrancar desde ella. Deja dos cosas: la imagen que STL tiene del proyecto corregida con el estado real, y lo desactualizado en los archivos del proyecto a la vista, con su evidencia, para que el titular decida si STL los pone al día. En esta revisión no cambia nada en el repositorio del proyecto.

## Los pasos

1. Corre `node tools/director/diagnosticar.ts` si la radiografía es más vieja que el último commit del proyecto, y lee su parte «La memoria del proyecto».
2. Lee entero cada archivo de memoria y, si la radiografía la nombra, la memoria que Claude Code tiene del proyecto en este computador (solo para leerla). Si son muchos o largos, usa un subagente de lectura por archivo, con esta lista.
3. Comprueba contra el código y la historia cada afirmación que se pueda comprobar: rutas, comandos y scripts; la arquitectura y dónde vive cada cosa; las reglas sobre el código (estilo, pruebas, ramas) frente a lo que el código hace de verdad; versiones y dependencias; y lo que dice que está hecho, en curso o pendiente frente a los commits. Cada afirmación, con su evidencia (el archivo o el commit).
4. Pon cada una en su grupo: sigue siendo cierta; desactualizada (lo que dice, lo que es cierto hoy, la evidencia); apunta a lo que ya no existe (código quitado u obsoleto, scripts, carpetas); copias que se contradicen; y lo que falta (las áreas con más trabajo en los últimos meses que la memoria no menciona).
5. Corrige la memoria de STL: lo del diagnóstico, del contexto detectado, de las metas candidatas o de las notas de los frentes que se apoyaba en algo desactualizado se pone al día en el plan, y `diagnostico.memoria` recibe su nivel nuevo. El documento del diagnóstico ya revisado queda sellado (CLAUDE.md › «Always forward»): lo que cambia va en el documento nuevo.
6. Escribe `docs/director/memoria-del-proyecto.md` (su formato: `documents.es.md`): lo que entendiste; qué tan al día estaba, archivo por archivo; lo desactualizado, con su evidencia; lo que falta; y lo que cambió en el diagnóstico de STL. Al final, las decisiones:
   - **Poner al día la memoria de tu proyecto**: STL reescribe las partes desactualizadas de cada archivo en el repositorio del proyecto, un commit local por archivo, con las reglas del proyecto (sus ramas, sus confirmaciones), y nunca sube nada. Recomiéndalo cuando lo desactualizado podría confundir a otro agente o a una persona. Aprobada, la siguiente revisión lo hace y cuenta cada archivo.
   - **Una sola fuente**, solo si hay copias: qué archivo queda como la fuente y cómo apuntan a él los demás.
7. La misión del titular: leerlo parte por parte y responder sus decisiones, con su botón al documento.
8. La propuesta va a `ejecutadas`, con lo que se comprobó y lo que cambió.

## Lo que nunca hace

No escribe en el repositorio del proyecto ni en la memoria de Claude Code en esta revisión, no continúa ni responde conversaciones anteriores y no rehace el diagnóstico: lo corrige donde la memoria lo confundió.
