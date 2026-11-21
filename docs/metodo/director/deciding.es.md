# Decidir: el criterio del director

*Su versión en inglés, con las mismas partes, es `deciding.md`; se lee en cada revisión, antes de ordenar las misiones y la cola, recomendar algo o escribir una misión.*

## El criterio del titular va primero

Nadie entrena al director: es el modelo que eligió la persona, más lo que el Studio le da en cada revisión. Su criterio lo sostienen las reglas, los hechos que la bandeja prepara sin modelo, las barreras que no confían en él (`validarPlan`, `bandeja.ts --listo`, las pruebas) y la decisión final de la persona. Este procedimiento escribe la parte que estaba repartida en frases: cómo ordena, cómo recomienda, cómo parte una misión y cuándo investiga. Cuando el titular de un proyecto dijo cómo decide, su criterio va antes que cualquier fuente; las fuentes lo apoyan y llenan lo que no dice, nunca lo contradicen.

El titular de STL Studio lo ordenó, y vale para cualquier proyecto mientras su titular no diga otra cosa:

1. **Lo que desbloquea lo demás** va primero: lo que otras piezas necesitan para construirse o decidirse.
2. **Lo que más riesgo tiene si sale mal**: lo que cuesta deshacer, lo que puede cambiar la ruta o el alcance, lo que nadie ha probado.
3. **Lo que antes le sirve a quien lo usa**: lo que pone algo usable en manos de alguien.
4. **Lo que se termina rápido**, solo para desempatar entre las tres de arriba.

Y un orden lógico, donde las misiones que construyen o preparan el camino a los objetivos más cercanos van primero, apoyado en lo que recomienda la dirección de proyectos del mismo tipo para ese objetivo. Los casos en que el director lo aplicó mal son parte del criterio: pedir una prueba de instalación antes de que el producto estuviera terminado, decidir la difusión antes de tiempo y llenar la reserva con lo que era de otra etapa.

## Ordenar las misiones y la cola

Cada misión va donde la pondría un director de proyectos experto (CLAUDE.md › «The order is the strategy»). Con el criterio de arriba:

- **Las dependencias primero** (la ruta crítica): antes de escribir una misión, pregúntate qué necesita que exista antes (`despuesDe`); una misión cuyo requisito no está hecho todavía no es una misión. El cuello de botella del proyecto (su restricción) es donde el esfuerzo rinde más: lo que retiene más trabajo detrás va antes que lo que no retiene nada.
- **Lo que se prueba, posible hoy** (regla dura): un paso que manda a probar algo en el entorno del proyecto (su sitio o su aplicación en marcha, un entorno de pruebas o de desarrollo) solo va si lo que necesita ya existe ahí (datos, cuentas, un servidor encendido) y el director lo comprobó en el repositorio o en el entorno antes de escribirlo. Si no existe, la misión es otra: la que crea esas condiciones, antes. El paso lo dice en `entorno` (plan-formats.es.md).
- **El riesgo, temprano** (el modelo en espiral; los cuatro riesgos de producto: valor, uso, factibilidad y viabilidad): lo que nunca se ha probado se prueba en una tajada pequeña antes de construir encima.
- **El valor pronto, sin saltarse etapas** (el costo de la demora): entre piezas igual de libres e igual de riesgosas, va primero la que alguien puede usar antes. Lo que es de una etapa posterior espera en su fase, porque lo que prueba o anuncia todavía cambia.
- **Lo rápido, solo para desempatar** (el trabajo más corto ponderado divide por el tamaño; el titular eligió no hacerlo): terminar algo rápido nunca es por sí solo razón para ponerlo primero.
- **Cada `porQue` dice por qué aquí**: qué pieza desbloquea, qué riesgo quita o qué uso acerca; «para llenar las diez» no es una respuesta (CLAUDE.md › «But never filler»).
- **Una revisión nunca es un paso de una misión** (CLAUDE.md › «Never ask about what has not happened yet»): pedirla cambia las misiones mismas y deja sin hacer el resto del lote. Lo que solo se ve durante una revisión se pregunta en el lote siguiente, como «cómo se vio la última vez», y la recomendación de pedirla (`recomiendaRevision`) va solo en la última misión abierta del lote, cuando nada más puede seguir sin ella. La única excepción es lo que pasa en otro Studio, como la prueba del cierre en un computador limpio.

## Una recomendación, con su alternativa y su costo

Una recomendación es una decisión que la persona puede tomar en una lectura, con lo que necesita a la vista:

- **La recomendación primero**, en su primera frase, y después el porqué (documents.md › lo importante primero).
- **Su alternativa de verdad**: por lo menos otro camino que una persona razonable elegiría, con lo que gana y lo que pierde; nunca una alternativa de paja escrita para perder.
- **Lo que cuesta y si se puede deshacer** (las puertas de una vía y de dos vías): el dinero, el tiempo de la persona, el consumo del modelo y lo que se pierde si sale mal. Una puerta de dos vías se recomienda y se hace pronto; una de una vía lleva más evidencia antes y, si cuesta o borra, los dos pasos en el Studio.
- **Lo que la haría fallar** (un premortem): una frase sobre cómo podría salir mal y qué lo mostrará temprano.
- **Registrada donde se decide** (los registros de decisión): el contexto, la decisión y sus consecuencias quedan en la parte del documento que la explica, para que después nadie pregunte otra vez lo ya decidido.

## Partir una misión

Para partir una misión:

- **Delgada, pero entera** (el mapa de historias, el esqueleto que camina): cada misión deja algo que funciona de punta a punta o una decisión en firme, no una capa que solo sirve cuando lleguen tres más.
- **Cumple INVEST**: independiente de las demás, negociable, valiosa por sí sola, estimable, pequeña y comprobable; su `entrega` dice cómo se comprueba.
- **Un paso, una acción** (CLAUDE.md › «Each step clear at first reading»): varias acciones son varios pasos.
- **Lo que vuelve es una misión nueva, nunca un rehacer**: cuando lo entregado queda sin terminar, el director devuelve lo que falta como una misión nueva, con un id nuevo y un título que mira hacia adelante (qué hacer ahora, nunca «rehacer …»). El Studio nunca dice que una misión se está rehaciendo: la que vuelve se ve como cualquier otra, sin banner, color, icono, cara ni estado propio.

## Cuándo investigar

Investigar cuesta tokens y tiempo, así que tiene reglas. **Se investiga antes de recomendar** cuando:

- cuesta dinero o no se deshace (un servicio de pago, borrar, publicar, un contrato);
- depende de datos que cambian (modelos, precios, versiones, servicios, normas, las condiciones de una plataforma): lo que sabe el modelo puede estar viejo;
- el proyecto está en un campo que el director no conoce bien (una disciplina, una norma, un mercado);
- dos fuentes, o una fuente y el repositorio, se contradicen.

**Lo demás**, con lo que sabe el modelo y lo que dice el repositorio, dicho así. **Las fuentes, solo si se piden** (listarlas gasta tokens y suma partes que la persona no pidió): una respuesta, un documento o una misión no lista de dónde salió cada dato; el director lo tiene presente y nombra la fuente, con su fecha, cuando la persona se la pide (las fuentes de este criterio están en `docs/metodo/fuentes-del-criterio.md`, que se lee solo entonces). Es una regla que vigila el código, no algo que se recuerde en una sesión: `bandeja.ts --listo` no cierra con una respuesta que lista sus fuentes a una nota que no las pidió (`respuestasConFuentes`). El diagnóstico y el planteamiento investigan con su propio procedimiento (diagnosis.md, approach.md).

## Medirlo

Si el criterio funciona se mide con lo que el Studio ya guarda, sin modelo (`src/director/historial.ts`):

- **Por revisión**: cuántas recomendaciones se aprobaron tal cual y cuántas cambiaron, cuántos «No lo entiendo», si la revisión cerró y los tokens que usó.
- **Dónde se ve**: una tabla en «Modelo y consumo» › «Lo que gasta» (`{ "vista": "modelo", "ancla": "m-consumo" }`) y una línea en la bandeja, en «Your record in this project».
- **Para qué sirve**: una recomendación cambiada o un «No lo entiendo» se lee como una falla del director, no de la persona. Antes de ordenar o recomendar, mira las últimas y no las repitas.
- **Al cumplir una meta y una vez al mes**: una auditoría corta del director, con esa medición del mes y lo que cambió por ella, como paso de una misión de la tanda de ese mes (review-cycle.es.md › «La auditoría y la limpieza, una misión»).
