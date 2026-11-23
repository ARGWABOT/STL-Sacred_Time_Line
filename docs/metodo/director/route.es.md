# La ruta

*Su versión en inglés, con las mismas partes, es `route.md`; se lee en la etapa `ruta` y cuando la meta se replanteó.*

## La línea hacia la meta

Con la meta fijada (`proyecto.json` › `objetivo`, en su memoria), traza **una sola línea hacia la meta**: sin fases ni puertas. El plan guarda una sola meta, `linea.meta`, y `fases` queda vacía; `bandeja.ts --aplicar` pasa el plan del arranque a esa línea por sí solo en cuanto la meta está fijada (`linea.ts` › `debePasarALinea`), y guarda lo hecho en el arranque como historia. En tu parche, escribe en `linea.meta`:

- `nombre` (la meta en pocas palabras, en el idioma de la interfaz), `etapa` (el nombre en su disciplina: Prototipo, MVP, Piloto, Beta, Lanzamiento…), `meta`, `porQue`, `duracion` (**un hito, nunca un plazo de calendario**).
- `puerta`: su `nombre` y su `prueba`: el criterio de éxito de la meta. No es una puerta que la persona cruce en el camino: es declarar «Meta cumplida» en la bandera de «Hoy», que nunca bloquea (lo que falte de la lista se muestra, no se exige).
- `criterios`: la lista de la meta, lo que muestra que se alcanzó. Usa indicadores cuando se pueda medir solo; los demás los evalúas tú con lo que entreguen las misiones.
- `frentes`: lo que hace cada frente en el camino: `foco` (la prioridad), `apoyo` (se trabaja, limitado a lo que dice) o `espera` (no se abre trabajo nuevo). Pocas cosas en foco.
- `misiones`: el plan hacia la meta en frases cortas, en orden.

**Nunca una misión que la persona no pueda cumplir** (regla dura del titular, `reglasDelTitular.ts`): ningún paso se marca al cruzar una puerta (`hecho` `puerta`) en un plan en línea, y `validarPlan` lo rechaza.

## El orden de la línea

Las misiones van en el orden de la estrategia (deciding.md): las primeras atacan los riesgos más grandes y validan con gente real lo antes posible, cada misión después de lo que necesita (`despuesDe`), y lo que solo sirve al cierre, al cierre (`alCierre`). **Pero nunca se prueba lo que todavía va a cambiar**: cada prueba (con gente, en otro computador, con un cliente) dice qué riesgo ataca, y va después del trabajo aprobado que cambia lo que ella mide; si su resultado vence con lo que falta por hacer, va al final de la línea. Si conviene comprobar algo antes, se hace una versión barata que no se repite (por ejemplo, un clon en otra carpeta del mismo computador en vez de un computador limpio).

## Lo que se escribe con ella

- **La primera misión del titular es una lectura corta del diagnóstico**: la pantalla de espera de la ruta termina llevándolo a ella, para que empiece sabiendo dónde está su proyecto antes de cualquier trabajo. Corta: de dos a cuatro pasos, cada uno con `ir` a una parte de `docs/director/diagnostico.md` (`{ "doc", "seccion" }`; en un proyecto nuevo, el planteamiento), con `hecho` `{ "que": "leido", "id", "seccion" }`, diciendo qué mirar ahí (lo sólido, lo que falta, el riesgo mayor) y cómo le responde la meta que confirmó. No pide decidir nada, nunca lo manda a releer lo que ya leyó y aprobó, y va primera en su cola: toda misión de trabajo va después de ella (`despuesDe`). Si el documento del diagnóstico ya se leyó entero, la lectura es su resumen corto en Proyecto (`{ "vista": "proyecto", "ancla": "p-diagnostico" }`).
- La **primera misión**, con su reserva (CLAUDE.md › «One mission at a time, with its reserve»): para el titular, las de trabajo empiezan después de esa lectura. Toda misión va con `"fase": "meta"`.
- Un documento corto `docs/director/ruta.md` (por qué este orden hacia la meta, con «Para decidir» si hace falta) y la misión del titular para leerlo y comentarlo.
- `mensaje`, `ritmo` si cambia algo del proyecto, `propuestas` si las hay (cada una con `"fase": "meta"`).
- No hay puerta del arranque que cruzar: nunca le pidas al titular cruzar una.
