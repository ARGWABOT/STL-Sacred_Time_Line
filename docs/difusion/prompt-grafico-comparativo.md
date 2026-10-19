# Gráfico comparativo STL vs. Scrum + CI/CD: análisis y prompt

*Versión 3: STL frente a Scrum + CI/CD, mitad y mitad, trabajando con IA. Las versiones 1 y 2 (las tres metodologías) están en el historial de git de este archivo. La versión contra SDD se hace después con la misma estructura (ver la sección 5).*

## 1. Qué dejó el tercer resultado

**Mejoró:** la bifurcación ya se ve, el recuadro «¿Cómo elige el director?» funciona, el lago «En espera» se entiende y la cinta de abajo quedó con una sola frase.

**Lo que aún no cuenta:**

1. **No se ve cómo arranca el proyecto.** Ni el diagnóstico ni la meta clara del inicio aparecen; el río empieza en el buzón. Y la historia que importa es justamente esa: **todos arrancan con la meta clara, y después el proyecto se bifurca.** Sin el inicio, no se ve qué se pierde.
2. **No aparece la IA.** Nada en el gráfico dice que se trabaja con un modelo. Así parece una comparación entre metodologías de gestión, cuando el punto es otro: **con IA, cada idea se vuelve código en minutos, y por eso el proyecto se bifurca más rápido que nunca.**
3. **STL repite la bifurcación tres veces.** Tres «D», tres misiones y dos lagos compiten entre sí. Una sola bifurcación, bien contada, explica más.
4. **Scrum y SDD siguen siendo diagramas de proceso.** No tienen inicio, ni bifurcación, ni IA; los avisos rojos son frases sueltas encima de un diagrama que no los muestra.
5. **Las comparaciones no están en la misma línea de tiempo.** STL ocupa el doble y sus momentos no se alinean con los de las otras, así que no se compara momento contra momento.
6. **Hay mucho texto pequeño.** La fila de cuatro checks verdes, los rótulos de cada brazo y el recuadro de criterios se leen con lupa.

## 2. La idea: la misma historia, contada dos veces

Una sola línea de tiempo con **tres momentos y un resultado**, la misma para las dos mitades, que quedan alineadas una encima de la otra (50 % y 50 %). Se lee de izquierda a derecha y, en cada momento, de arriba abajo: «así pasa con Scrum, así pasa con STL».

| Momento | Scrum + CI/CD con IA | STL con IA |
| --- | --- | --- |
| **1. Arranque** | La meta está clara: visión y backlog. La IA entra como un chat más. | La meta está clara: el director diagnostica el repositorio y se firma el objetivo. **Queda en archivos, no en el chat.** |
| **2. Se bifurca** | La IA dice sí a todo: cada prompt abre otro cauce. Cada sesión nueva empieza de cero. | Las mismas ideas llegan, pero **esperan en el buzón**: se corrigen o se borran. Nada llega aún a la IA. |
| **3. ¿Qué sigue?** | Se prioriza en cada sprint, pero la IA avanza cada minuto. **Mientras tanto, decide el último prompt.** | «Revisa»: la IA recibe todo junto y limpio, el director elige **un solo paso, el más estratégico**, y lo demás espera su fase. |
| **Resultado** | La meta se aleja: esfuerzo repartido, retrabajo y contexto contaminado. | Llega a la meta: contexto limpio, menos tokens, cero regresión. |

Reglas de la composición, para que sea más clara y no más cargada:

- **Una sola bifurcación por mitad**, en el mismo lugar, con los **mismos cuatro brazos** («feature», «bug», «refactor», «idea nueva»). Así el ojo ve que el problema es el mismo y lo único que cambia es cómo se maneja.
- **El mismo icono de IA** (un chip con destellos) en las dos mitades: en Scrum, suelto y disparando flechas; en STL, detrás del director y alimentado solo por la compuerta «Revisa».
- **La misma bandera de meta** en las dos mitades, visible desde el arranque: en Scrum los brazos se apartan de ella y se ve gris y lejana; en STL el río llega a ella.
- **Pocos textos, más grandes:** un pie de una línea por momento y nada más. Lo demás lo dicen los iconos y las flechas.

## 3. El prompt

```text
Infografía horizontal 16:9 (1920×1080 o mayor), estilo vectorial plano, limpio y profesional, fondo blanco roto, tipografía sans-serif moderna, iconos lineales redondeados y grandes. Composición SIMPLE: pocas figuras, pocas líneas, mucho aire. Todo el texto en español, escrito EXACTAMENTE como aparece entre comillas, con sus tildes. No agregues ningún otro texto, ni cifras, ni logos.

TÍTULO arriba, centrado, grande y oscuro: «Con IA, todo proyecto se bifurca más rápido. ¿Quién decide qué sigue?»
SUBTÍTULO debajo, más pequeño: «Scrum + CI/CD frente a STL, trabajando con modelos de IA»

LÍNEA DE TIEMPO: debajo del subtítulo, una barra horizontal gris claro con cuatro cabeceras igualmente espaciadas: «1. Arranque» · «2. Se bifurca» · «3. ¿Qué sigue?» · «Resultado». Cuatro líneas verticales punteadas muy suaves bajan desde esas cabeceras y atraviesan las dos mitades, para que cada momento se compare de arriba abajo.

DOS MITADES del mismo tamaño, una sobre otra, cada una con un río azul que corre de izquierda a derecha por las cuatro columnas. A la izquierda de cada mitad, una etiqueta vertical de color.

MITAD SUPERIOR — «Scrum + CI/CD» (azul verdoso; etiqueta izquierda «Scrum + CI/CD» y debajo, pequeño, «con IA»).
- Columna 1 (Arranque): el río nace ancho y limpio. Iconos: una bombilla y una pila ordenada de tarjetas; al lado, un chip de IA pequeño con destellos. Al fondo derecho de toda la mitad ya se ve la bandera de meta. Pie: «La meta está clara. La IA entra como un chat más.»
- Columna 2 (Se bifurca): el chip de IA, más grande, dispara flechas en todas direcciones y el río se abre en cuatro brazos rotulados «feature», «bug», «refactor», «idea nueva», que siguen corriendo TODOS A LA VEZ, cada vez más delgados. Encima, tres ventanas de chat apiladas con un icono de reinicio circular. Pie: «La IA dice sí a todo. Cada sesión empieza de cero.»
- Columna 3 (¿Qué sigue?): un calendario lejano con el rótulo «Sprint» y un signo de interrogación grande sobre los brazos dispersos. Pie: «Se prioriza en cada sprint. Mientras tanto, decide el último prompt.»
- Columna 4 (Resultado): los brazos se pierden en una zona pantanosa y la bandera de meta se ve gris y lejana, fuera del agua. Tres iconos pequeños en rojo coral: una pila de monedas, unas flechas circulares de retrabajo y una nube de niebla. Pie: «La meta se aleja: retrabajo, más tokens y contexto contaminado.»

MITAD INFERIOR — «STL» (dorado/ámbar con acentos verdes; etiqueta izquierda «STL» y debajo, pequeño, «Studio + director, con IA»). Marco algo más grueso.
- Columna 1 (Arranque): el río nace en un icono de lupa sobre una carpeta de código y pasa por un documento con firma y una bandera pequeña. Encima, un icono de carpeta con el rótulo «memoria». La bandera de meta, verde, ya se ve al fondo derecho de la mitad, unida al arranque por una línea dorada punteada fina. Pie: «Diagnóstico y objetivo firmado. Queda en archivos, no en el chat.»
- Columna 2 (Se bifurca): el río se abre en los MISMOS cuatro brazos con los mismos rótulos («feature», «bug», «refactor», «idea nueva»), pero los cuatro desembocan en un buzón grande con un icono de pausa. Uno de los brazos llega tachado con una goma de borrar. Pie: «Las ideas esperan en el buzón: se corrigen o se borran. Nada llega aún a la IA.»
- Columna 3 (¿Qué sigue?): del buzón sale una sola compuerta rotulada «Revisa» hacia un círculo oscuro grande con la letra «D» y una brújula, con el chip de IA detrás. De la «D» sale UN solo brazo, ancho y dorado, con un círculo azul con el número «1» y el rótulo «El paso más estratégico». Los otros brazos salen delgados y celestes hacia un pequeño lago rotulado «En espera: vuelve en su fase». Debajo de la «D», una línea pequeña: «Contra la meta · el riesgo mayor primero · lo que desbloquea lo siguiente». Pie: «La IA recibe todo junto y limpio, y devuelve un solo paso.»
- Columna 4 (Resultado): el río dorado llega entero a la bandera verde grande. Tres iconos pequeños en verde: una moneda con flecha hacia abajo, un escudo y un solo globo de chat. Pie: «Llega a la meta: menos tokens, cero regresión, una sola sesión.»

CINTA INFERIOR dorada, a todo el ancho, con una sola frase centrada en negrita: «STL no reemplaza tu Scrum ni tu CI/CD: decide qué sigue cuando trabajas con IA.»

PIE de página, pequeño y gris: «Comparación conceptual del trabajo con modelos de IA.»

ESTILO Y JERARQUÍA: las dos mitades tienen el mismo tamaño y los mismos cuatro brazos en la misma posición, para que la única diferencia visible sea lo que pasa con ellos: arriba se dispersan y se alejan de la meta; abajo esperan, se elige uno y el río llega. Colores: dorado y verde para STL y lo elegido; celeste suave para lo que espera; rojo coral solo para los iconos del resultado de Scrum; gris para la meta no alcanzada. Sin personas ni fotos, sin degradados llamativos. Pies de una sola línea, en letra grande y legible.
```

## 4. Para usarlo bien

- **Si el generador vuelve a cargar la imagen**, agrega al final: «Menos elementos: si algo no está en este prompt, no lo dibujes.»
- **Si el texto sale deformado**, pide la imagen sin texto y pon los pies en Figma, Canva o PowerPoint: son ocho frases cortas.
- **Para redes**, sirve en carrusel: una imagen por columna («1. Arranque», «2. Se bifurca», «3. ¿Qué sigue?», «Resultado»), cada una con sus dos mitades.

## 5. La versión contra SDD (para después)

Se conserva la mitad de STL tal cual y se cambia solo la mitad superior, con la misma línea de tiempo y los mismos cuatro brazos. Lo que le pasa a SDD con IA, para cuando la pidas:

- **Arranque:** la meta está clara y se escribe la spec. La IA la toma como contrato.
- **Se bifurca:** la IA genera rápido sobre la spec; cuando aparece algo nuevo, la spec ya no lo cubre y hay que reabrirla y reescribirla.
- **¿Qué sigue?:** lo que diga la spec, aunque el proyecto ya haya cambiado; cada cambio es una spec nueva que la IA vuelve a leer completa.
- **Resultado:** vueltas al principio y documentos largos que releer.
