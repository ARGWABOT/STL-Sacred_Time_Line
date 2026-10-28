# El diagnóstico (proyecto existente)

*Un procedimiento del director de STL Studio. El modelo lee la versión en inglés, `diagnosis.md`; esta es su versión en español, para leerla y aprobarla, con las mismas partes. Un cambio se escribe en las dos. La bandeja (`tools/director/bandeja.ts`) dice cuándo leerlo: en la etapa `diagnostico` de un proyecto existente y en cada proyecto de la cola de diagnósticos.*

## Los pasos

1. `node tools/director/diagnosticar.ts`: la radiografía (historia, estructura, lenguajes, herramientas, pruebas, documentación, puntos calientes, deuda). Son hechos, no juicio.
2. **Lee el repositorio de verdad**: el README y la documentación, los manifiestos, los puntos de entrada, el código clave de cada área, las pruebas, la CI, los últimos commits. Lee también su `proyecto.json` (el contexto y lo que quiere lograr el titular) y las notas del Buzón. Si es grande, usa subagentes de lectura y junta sus hallazgos. **Investiga también qué recomiendan quienes saben de ese tipo de proyecto** (una app, una tesis, un sitio, un producto): las fuentes reales que encuentres son referencia, nunca una orden.
3. **Define los frentes**: las áreas de trabajo con sentido para el proyecto (no una por carpeta), cada una con sus `rutas` (prefijos del repositorio del proyecto), para medir el esfuerzo. Deja el frente `direccion`.
4. Escribe en su memoria (`.stl/director/plan.json`; la bandeja da la ruta):
   - `diagnostico`: `fecha` (hoy), `resumen` (de 3 a 6 párrafos: qué es de verdad, qué está sólido, qué falta, qué riesgos hay, en qué se va el esfuerzo), `frentes` (por frente: `nota` de 0 a 5 = qué tan listo está para lo que el titular quiere, no cuánto se trabajó; `hecho`, `falta`, `veredicto` en una frase), `fuentes` (lo que leíste) y `estrategia` (`texto`: la estrategia para este tipo de proyecto según los expertos, aplicada a lo que encontraste, en uno o dos párrafos; `fuentes`: las reales, con su dirección). El Studio lo muestra en Proyecto, en «El diagnóstico del director»: el resumen, lo más listo y lo más flojo de los frentes en un párrafo, la estrategia y el documento a un clic.
   - `objetivos`: **2 o 3 candidatos**, cada uno con `texto` (qué se logra), `exito` (cómo se comprueba: un número o un hecho verificable), `porQue` (por qué ese, a partir del diagnóstico), `riesgo` y, si aplica, `horizonte` (un hito, nunca una fecha impuesta). Uno debe ser el más corto que deja algo valioso de verdad.
   - `frentes`: los nuevos, y en la fase `arranque` cada uno en espera (`"nivel": "espera"`) salvo `direccion`.
   - `detectado`: lo que ya sabes del proyecto, para que el titular no tenga que escribirlo: `contexto` (qué es, para quién y en qué punto está, en un párrafo) y `meta` (la meta que sugieres, en una frase). El Studio lo muestra en Proyecto, marcado como detectado, hasta que el titular escriba lo suyo.
   - `evaluacion`: `a_contexto` si el titular ya contó el contexto.
   - Un documento `docs/director/diagnostico.md` en su memoria (su formato: `documents.es.md`) y su entrada en `documentos`.
   - **Si el titular todavía no tiene meta** (solo quiere el diagnóstico y llevarlo con STL), lo que mejoraría el proyecto va como `propuestas` (misiones sugeridas), nunca como misiones: él decide cuáles. Con la meta fijada, se traza la ruta.
   - La misión del titular: leer el diagnóstico y comentarlo parte por parte, con su botón al documento, y fijar su meta (botón a `{ "vista": "proyecto", "ancla": "p-objetivo" }`). Criterios: `a_leido`. Cada paso dice qué mirar ahí, qué hacer y cómo volver (CLAUDE.md › «Llevar de la mano»): en el diagnóstico, qué buscar (lo sólido, lo que falta, los candidatos a meta), «Entendido» en cada idea, cada decisión respondida al final de su parte y «← Volver a tu misión» para volver; en «La meta», cómo se fija («Usar este» en un candidato, o con sus palabras).
   - `mensaje` y, si quieres, un primer `boletin` del equipo.
5. Valida y cierra (`review-cycle.es.md` › «Validar y cerrar»).

## El historial de IA

Si el proyecto trae `historialIA` (conversaciones previas con agentes de IA), léelo **una vez**, en el diagnóstico, con un subagente de lectura: busca lo que quedó a medias o esperando aprobación, y conviértelo en propuestas, misiones o decisiones del Studio (un solo canal). Nunca respondas en esas conversaciones ni las continúes.
