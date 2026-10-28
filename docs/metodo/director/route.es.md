# La ruta

*Un procedimiento del director de STL Studio. El modelo lee la versión en inglés, `route.md`; esta es su versión en español, para leerla y aprobarla, con las mismas partes. Un cambio se escribe en las dos. La bandeja (`tools/director/bandeja.ts`) dice cuándo leerlo: en la etapa `ruta` y cuando la meta se replanteó.*

## Las fases

Con la meta fijada (`proyecto.json` › `objetivo`, en su memoria), traza las fases **después** de `arranque` (no la borres ni la cambies: es historia). Para cada fase:

- `id`, `nombre` (corto, en el lenguaje del proyecto), `etapa` (el nombre en su disciplina: Prototipo, MVP, Piloto, Beta, Lanzamiento…), `meta`, `porQue` (por qué va en ese orden), `duracion` (**un hito, nunca un plazo de calendario**).
- `puerta`: su `nombre` y su `prueba` (qué tiene que pasar para cruzarla, comprobable).
- `criterios`: lo que debe estar al 100 % para cruzar. Usa indicadores cuando se pueda medir solo (`validaciones_personas`, `validaciones_logran`, `validaciones_aprueban` con `tipos` y `meta`; `misiones`; `foco`); los demás los evalúas tú con lo que entreguen las misiones.
- `frentes`: lo que hace cada frente en la fase: `foco` (la prioridad), `apoyo` (se trabaja, limitado a lo que dice) o `espera` (no se abre trabajo nuevo). Pocas cosas en foco.
- `misiones`: el plan de la fase en frases cortas.

## El orden de las fases

Pocas fases (de 3 a 6) y la última es el objetivo cumplido: su puerta es el criterio de éxito de la meta. Las primeras deben atacar los riesgos más grandes y validar con gente real lo antes posible. **Pero nunca se prueba lo que todavía va a cambiar** (nota de voz del titular, 22 de octubre de 2026, sobre una prueba de instalación pedida con medio Studio por construir): cada prueba (con gente, en otro computador, con un cliente) dice qué riesgo ataca, y va después del trabajo aprobado que cambia lo que ella mide; si su resultado vence con lo que falta por hacer, va al final de su fase. Si conviene comprobar algo antes, se hace una versión barata que no se repite (por ejemplo, un clon en otra carpeta del mismo computador en vez de un computador limpio).

## Lo que se escribe con ella

- La **primera misión de cada persona**, con su reserva: por lo menos nueve más detrás (CLAUDE.md › «Una misión a la vez»).
- Un documento corto `docs/director/ruta.md` (por qué estas fases y en este orden, con «Para decidir» si hace falta) y la misión del titular para leerlo y comentarlo.
- `mensaje`, `ritmo` si cambia algo del proyecto, `propuestas` si las hay (cada una en su fase).
- La puerta del arranque **la cruza el titular**: díselo en el mensaje.
