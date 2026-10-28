# Los documentos del director

*Un procedimiento del director de STL Studio. El modelo lee la versión en inglés, `documents.md`; esta es su versión en español, para leerla y aprobarla, con las mismas partes. Un cambio se escribe en las dos. La bandeja (`tools/director/bandeja.ts`) dice cuándo leerlo: en cada revisión, antes de escribir o cambiar un documento.*

## El formato

En la memoria del proyecto, `docs/director/`, en Markdown, partidos con `##` (cada `##` es una parte que se comenta aparte, y la parte no debe ser ni muy larga ni trivial). Se escriben en el idioma de quien los lee; el ejemplo es el de español, y su marca «**Para decidir:**» es literal, porque el Studio la busca para poner los botones de cada decisión:
```
# <Título>

## 1. Lo que entendí
…

## 2. <Una parte con sentido>
… explicación …

**Para decidir:**

1. **<Nombre corto>.** La pregunta y mi recomendación.
2. **<Otro>.** …
```
Cortos y para leer de corrido: tablas solo si ayudan. Cada documento nuevo entra en `plan.documentos` (`ruta`, `titulo`, `porQue`) y en la misión que lo pide.

## Se leen de a una idea

**Se leen de a una idea.** El Studio parte cada `##` en ideas (cada párrafo, cada punto de una lista de primer nivel, cada tabla o bloque): cada una se marca «Entendido» o, si es una decisión, se responde; la parte se da por leída sola cuando todas están atendidas, y la siguiente se abre solo entonces. Por eso:
- **Regla crítica: ningún corte malo.** Un título solo, una imagen lejos de su texto o un bloque partido le quitan credibilidad a todo el Studio. El corte (`trozosDeParte`) nunca pierde ni reordena nada, nunca parte un elemento completo (código, fórmulas, tabla, cita, bloque HTML, un punto con lo suyo) y junta lo que no es una idea con lo que le da sentido (el título con lo que presenta, la imagen con lo que ilustra, la leyenda con su tabla). La bandeja corre la auditoría (`ideasSueltas`) sobre cada documento por leer: **ningún aviso suyo se deja sin corregir** antes de pedir que se lea, y `--listo` no cierra con un aviso en un documento escrito o cambiado en esa revisión que nadie empezó a leer (`documentosPorCerrar`). Todo formato nuevo del corte llega con su caso en «la auditoría de los cortes» (`director.test.ts`).
- **Una idea por párrafo o por punto, de no más de unos 10 renglones.** Si una explicación es más larga, pártela en puntos.
- **Cada idea vale la pena revisarla.** Una línea de transición o un aviso («eso se decide en otro documento») no es una idea: va dentro del párrafo vecino. Un subtítulo («**A favor**», «### El costo») tampoco: el Studio lo lee junto con lo que presenta, igual que una lista de puntos cortos (de uno a tres renglones cada uno), que se lee de una vez, como un solo bloque con un «Entendido» y un ✉ en cada punto para comentarlo aparte (regla del titular, 22 de octubre de 2026); un punto más largo, o con código o una tabla adentro, se lee solo, y la lista de «Para decidir» nunca se junta. Un punto suelto de un renglón no tiene con qué juntarse: complétalo o súmalo a otro (la bandeja avisa de cada idea que quedaría en un renglón suelto). Un párrafo que anuncia lo que sigue («Recomiendo:») el Studio lo lee junto con su lista (entera si es corta; si no, con su primer punto) o su bloque; aun así, **no cortes una explicación a la mitad**: piensa dónde termina cada idea antes de escribirla, y que cada una se entienda sola.
- **Lo importante primero** (lo eligió el titular el 25 de octubre de 2026, al probar la niebla de lectura): en cada parte de un documento, la conclusión o la recomendación va en su primera idea y el detalle después; en una respuesta, en su primera frase. Es lo que más ayuda al leer en pantalla, y con la niebla lo primero que se destapa es lo que importa.
- **Conciso, sin redundancia**: di la idea con sus datos clave y sin frases de relleno; lo que ya se dijo en otra parte no se repite.
- **Sin símbolos de código que confundan** (nota de voz del titular, 22 de octubre de 2026: dos `&&` al final de una lista): en lo que se lee (documentos, respuestas, mensajes, misiones) di la idea en palabras («órdenes encadenadas», no `&&`). Un símbolo, una orden o un nombre de código solo van cuando son justo lo que se explica o lo que hay que copiar, y entonces con su formato de código.
- **Los commits, solo para el sistema** (nota de voz del titular, 26 de octubre de 2026: un hash no le dice nada a quien lee ni a quien escucha la voz): nada de lo que lee una persona nombra un commit por su hash (lo avanzado, el mensaje, las respuestas, las misiones, los pedidos, los documentos); se dice qué se hizo. El hash puede ir en lo interno (el `hecho` de un pedido, `ejecutadas`, `alDia`). El Studio los quita de todo lo que muestra del plan (`planSinCommits`) y `bandeja.ts --listo` no cierra con uno nuevo escrito para las personas (`commitsALaVista`).
- **Un dibujo, solo cuando ayuda a entender** (notas de voz del titular, 19 y 23 de octubre de 2026): un flujo, una comparación o un ejemplo que en palabras cuesta seguir puede ir como un dibujo SVG, justo después del párrafo que lo explica (el Studio los lee juntos, como una idea) y con el estilo de `docs/metodo/dibujos.md`: amarillo para la persona, gris para el código del Studio y azul para el modelo, con los colores del Studio, su `aria-label` y sin renglones vacíos adentro. No siempre: un dibujo que repite lo que el párrafo ya dice claro es relleno.
- **Cordial, pero firme**: el director dirige; dice con claridad qué conviene y por qué, en tono amable, sin sobreexplicar ni ceder por complacer.
- **Las decisiones son obligatorias**: cada punto de «Para decidir» se responde antes de seguir (sin respuesta, la parte no se da por leída). Pide decidir solo lo que de verdad necesitas para dirigir. Lo mismo vale para las respuestas del Buzón y las Preguntas.
