# El método STL

*Cómo STL Studio, la interfaz entre tú y el modelo, convierte a un modelo de IA en el director asistente de tu proyecto. Su versión en inglés, `metodologia.md`, tiene las mismas partes. Los botones y las secciones del Studio van con su nombre, entre «».*

## 1. Qué es y qué problema resuelve

**STL es una forma de dirigir un proyecto con un modelo de IA por un solo canal: el Studio.** Ahí dejas todo (un comentario, una nota de voz, una pregunta, una decisión); cuando lo pides, el director lo lee todo junto, mantiene la ruta hacia tu meta y le da a cada persona una misión a la vez, con su porqué y un botón al lugar exacto. Tú decides; el director propone, ordena el trabajo y ejecuta solo lo que aprobaste.

Dirigir un proyecto largo por chat falla de formas previsibles. Lo que envías se ejecuta al instante, y una corrección es otro mensaje, así que el modelo mezcla las dos versiones. Cada mensaje cuesta la conversación entera. No se puede comentar un párrafo sin explicar cuál, y el modelo reescribe lo que ya revisaste. Nadie decide qué sigue: el chat te acompaña a cada tema en vez de sostener la línea, y cada chat nuevo empieza de cero.

El Studio separa pensar de enviar. Lo que dices espera en el «Buzón» hasta que pides la revisión, así que puedes corregirlo o borrarlo antes, y lo que borras nunca llega al modelo. El director recibe solo lo que quedó en firme, todo junto, y ve cómo se relacionan las piezas. El estado vive en archivos, no en una conversación: el modelo puede olvidar, el proyecto no.

## 2. El ciclo de una revisión

**Cada vuelta del método es una revisión, y solo la pide una persona.** Tiene cinco momentos:

1. **Dejas tus notas,** escritas o grabadas, en el párrafo, el paso o la propuesta exacta donde estás, sin pulirlas. La voz se transcribe en tu computador: al modelo le llega texto. Cada nota tiene su tipo (comentario, ajuste, idea, falla o pregunta), y las preguntas se responden juntas, como un informe.
2. **Pides la revisión** con «Pedir revisión». Nada más la lanza: ni entregar una misión ni el reloj. El director puede recomendarla, con su razón; con «Pedir revisiones seguidas», el Studio lanza la siguiente al cerrar cada una, mientras el director diga que su cola sigue.
3. **El director responde todo:** aprueba o devuelve cada misión entregada, después de buscar la evidencia de lo que pasó fuera del Studio, y responde cada nota con su tratamiento (integrada, rechazada, aplazada, llevada a decisión o informada) y el lugar donde quedó.
4. **Ejecuta lo que aprobaste.** Su propio trabajo es una cola aparte, en su propio orden, que trabaja en cada revisión, cada cambio con sus pruebas y su commit local.
5. **Te deja tu misión:** una entera, con al menos nueve más detrás, para que pidas la revisión cuando quieras, nunca porque se te acabaron.

Una misión es un paso concreto, de horas o de pocos días: qué hacer, por qué importa y qué entregar. Cada paso es una sola acción, con su botón al lugar exacto y «← Volver a tu misión» para regresar. Un paso que pide elegir trae sus opciones como botones; uno que puede hacer el director trae «Hazlo tú»; y «No lo entiendo» hace que ese paso se reescriba al instante, sin esperar la revisión.

Los documentos se leen una idea a la vez: cada idea se marca «Entendido» o se comenta, y cada decisión al final de una parte se responde antes de seguir. Un documento que alguien ya revisó queda sellado: lo que cambia llega en un documento nuevo y corto, así que nadie relee lo que ya decidió.

## 3. La ruta

**La ruta va de un diagnóstico honesto a una meta que fijas tú, por fases, una misión a la vez.**

- **El diagnóstico.** El director lee el repositorio (su historia, su estructura, su documentación, su código y sus pruebas) y dice con franqueza qué está listo, qué falta y qué riesgos hay, frente por frente: lo que no existe, no existe. Un proyecto nuevo recibe, en su lugar, un enfoque.
- **La meta.** El director propone dos o tres, cada una con su criterio de éxito; tú eliges, mezclas o escribes la tuya, y la fijas.
- **Las fases.** Cada una tiene sus criterios, que deben estar al 100 % para cruzar su puerta, y cada frente está en foco, de apoyo o en espera. La puerta la cruzas tú, nunca el calendario: se avanza por hitos, no por fechas.
- **Las misiones.** Una a la vez para cada persona, con diez a su alcance. Cada una va después de lo que necesita y nunca antes de tiempo; lo que cierra una fase espera a que esté hecho el trabajo aprobado de esa fase.

El director ordena con el criterio del titular primero. El que fijó el titular de STL Studio vale para cualquier proyecto mientras su titular no diga otro: lo que desbloquea lo demás; después, lo que más riesgo tiene si sale mal; después, lo que antes pone algo usable en manos de alguien; y lo que termina rápido solo desempata.

## 4. Lo que el director puede y no puede hacer

**El director propone; tú decides.** Diagnostica, recomienda con sus razones, sus riesgos y una alternativa de verdad, ordena el trabajo y ejecuta lo que aprobaste. Nunca marca un criterio, cruza una puerta, fija la meta ni responde una propuesta por ti.

- **Trabaja solo en lo aprobado en el Studio:** una propuesta aceptada, una decisión respondida que lo pide, una misión entregada o un «Hazlo tú». Dentro de tu repositorio mandan sus reglas: ramas, estilo, pruebas.
- **Sube, trae o publica solo con tu permiso,** en «Modelo y consumo» › «Permisos», nunca forzado y nunca reescribiendo la historia.
- **Lo que cuesta dinero o borra datos pide dos pasos:** la propuesta aceptada y un «Confirmo» respondido, con el costo o la lista de lo que se borra a la vista. Salvo lo que git guarda: un archivo de tu repositorio que git guarda y que quedó sin uso por un cambio aprobado se borra sin pedirte, porque su historia lo conserva, cada borrado en su propio commit y contado en la respuesta. Lo que git no guarda (un archivo sin seguimiento o ignorado, datos fuera del repositorio, una rama, una versión publicada) sigue pidiendo los dos pasos.
- **Si le falta un permiso,** hace lo demás y dice lo que no pudo; el permiso negado aparece en el panel, con su casilla. Instalar lo necesario se pide con «Autorizo», diciendo qué es, cuánto pesa y para qué sirve.
- **Dice «todavía no»** a lo que no sirve a la meta y a la fase, con sus razones, y nunca te vuelve a pedir lo que ya está hecho o lo que puede comprobar él.

## 5. La memoria en tu repositorio

**La memoria de cada proyecto vive en su propio repositorio, en una rama aparte, `stl`, que el Studio abre en la carpeta `.stl/` del proyecto.** Ahí están el plan (la ruta y todo lo que dice el director, que solo escribe el director), lo que hace cada persona (que solo escribe el Studio), el contexto con la meta y el equipo, las transcripciones de las notas de voz (el audio nunca entra a git), el mapa del proyecto y los documentos del director. Lo que se cierra sale del plan a un archivo por mes.

- **Nada depende de un chat:** una sesión se puede resumir o reiniciar sin perder nada, porque el estado está en esos archivos.
- **Un Studio dirige varios proyectos, sin mezclarlos:** el proyecto activo es el único que dirige el director; los demás guardan su buzón hasta que los actives.
- **Cada decisión es un commit:** la del equipo, «Estudio: …»; la del director, «Director (<id>): …». Suben solo si lo pides.
- **Nada va a la web de Claude por defecto:** cada informe, plan o imagen es un archivo local en la memoria del proyecto.

## 6. Cuándo no usarlo

**STL aplica cuando hay un proyecto, alguien que decide y un repositorio.** No aplica a una tarea suelta, a un flujo sin persona (un agente o una automatización que corre sola) ni a un proyecto que no puede estar en git o cuyas reglas no permiten que su contenido llegue a un modelo de IA. Sirve para cualquier tipo de proyecto: software, una tesis, un sitio web, un producto.

Lo que cuesta, con franqueza:

- Una revisión tarda minutos, no segundos, y lee el contexto del proyecto cada vez.
- Un malentendido se nota tarde; «Lo que entendí», al comienzo de cada documento, lo atrapa antes.
- Mucho depende de cómo parte el director los documentos y las misiones.
- Pide disciplina: un solo canal, o vuelve a ser un chat desordenado.
- El ritmo es tuyo: si nadie pide la revisión, nada avanza.
- Ahorra menos de lo que sugiere la cuenta simple, porque los chats reutilizan su contexto en caché: el ahorro de verdad es lo que nunca se procesa y las vueltas que no se dan.

## Glosario

- **Director asistente:** el modelo de IA trabajando a través del Studio. Propone y ordena.
- **Titular:** la persona que dirige el proyecto. Decide.
- **Meta:** a dónde se quiere llegar y cómo se sabe que se llegó; la fija el titular después del diagnóstico.
- **Misión:** un paso concreto con su porqué y su entrega, una a la vez.
- **Buzón:** donde espera lo que dices hasta la revisión.
- **Revisión:** el momento en que el director recibe lo que quedó en firme y lo responde todo junto.
- **Puerta:** el paso de una fase a la siguiente, con sus criterios al 100 %.
- **Frente:** un área de trabajo del proyecto, en foco, de apoyo o en espera en cada fase.
- **Sello:** la marca de lo ya revisado, que no vuelve.
- **Memoria:** la rama `stl` del proyecto, donde viven el plan y los documentos.
