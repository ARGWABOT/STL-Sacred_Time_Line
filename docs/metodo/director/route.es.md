# La ruta

*Su versión en inglés, con las mismas partes, es `route.md`; se lee en la etapa `ruta` y cuando la meta se replanteó.*

## Las fases

Con la meta fijada (`proyecto.json` › `objetivo`, en su memoria), traza las fases **después** de `arranque` (no la borres ni la cambies: es historia). Para cada fase:

- `id`, `nombre` (corto, en el lenguaje del proyecto), `etapa` (el nombre en su disciplina: Prototipo, MVP, Piloto, Beta, Lanzamiento…), `meta`, `porQue` (por qué va en ese orden), `duracion` (**un hito, nunca un plazo de calendario**).
- `puerta`: su `nombre` y su `prueba` (qué tiene que pasar para cruzarla, comprobable).
- `criterios`: lo que debe estar al 100 % para cruzar. Usa indicadores cuando se pueda medir solo (`misiones`, `foco`; validar el proyecto con su gente es trabajo del desarrollador, fuera del Studio); los demás los evalúas tú con lo que entreguen las misiones.
- `frentes`: lo que hace cada frente en la fase: `foco` (la prioridad), `apoyo` (se trabaja, limitado a lo que dice) o `espera` (no se abre trabajo nuevo). Pocas cosas en foco.
- `misiones`: el plan de la fase en frases cortas.

## El orden de las fases

Pocas fases (de 3 a 6) y la última es el objetivo cumplido: su puerta es el criterio de éxito de la meta. Las primeras deben atacar los riesgos más grandes y validar con gente real lo antes posible. **Pero nunca se prueba lo que todavía va a cambiar**: cada prueba (con gente, en otro computador, con un cliente) dice qué riesgo ataca, y va después del trabajo aprobado que cambia lo que ella mide; si su resultado vence con lo que falta por hacer, va al final de su fase. Si conviene comprobar algo antes, se hace una versión barata que no se repite (por ejemplo, un clon en otra carpeta del mismo computador en vez de un computador limpio).

## Lo que se escribe con ella

- **La primera misión del titular es una lectura corta del diagnóstico**: la pantalla de espera de la ruta termina llevándolo a ella, para que empiece sabiendo dónde está su proyecto antes de cualquier trabajo. Corta: de dos a cuatro pasos, cada uno con `ir` a una parte de `docs/director/diagnostico.md` (`{ "doc", "seccion" }`; en un proyecto nuevo, el planteamiento), con `hecho` `{ "que": "leido", "id", "seccion" }`, diciendo qué mirar ahí (lo sólido, lo que falta, el riesgo mayor) y cómo le responde la meta que confirmó. No pide decidir nada, nunca lo manda a releer lo que ya leyó y aprobó, y va primera en su cola: toda misión de trabajo va después de ella (`despuesDe`). Si el documento del diagnóstico ya se leyó entero, la lectura es su resumen corto en Proyecto (`{ "vista": "proyecto", "ancla": "p-diagnostico" }`).
- La **primera misión**, con su reserva (CLAUDE.md › «One mission at a time, with its reserve»): para el titular, las de trabajo empiezan después de esa lectura.
- Un documento corto `docs/director/ruta.md` (por qué estas fases y en este orden, con «Para decidir» si hace falta) y la misión del titular para leerlo y comentarlo.
- `mensaje`, `ritmo` si cambia algo del proyecto, `propuestas` si las hay (cada una en su fase).
- La puerta del arranque **la cruza el titular**: díselo en el mensaje.
