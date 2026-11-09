# Dibujos en los documentos del director

*Su versión en inglés es `dibujos.md`. Los botones y las secciones del Studio van con su nombre, entre «».*

El director puede añadir un dibujo SVG a un documento cuando ayuda a una persona a entender algo difícil de seguir con palabras: un flujo, una comparación, un ejemplo con varias partes móviles. Esta guía es el estilo que sigue todo dibujo, para que todos se lean como un solo sistema, en el tema claro y en el oscuro del Studio. Es el estilo de los tres dibujos del informe «El paquete de cada revisión», que el titular del proyecto piloto eligió el 24 de octubre de 2026.

## 1. Cuándo dibujar y cuándo no

Se dibuja solo cuando el dibujo lleva algo que el párrafo no puede llevar igual de bien: quién hace qué y en qué orden, qué crece y qué se queda, dos maneras de hacer lo mismo lado a lado. Un dibujo que repite lo que su párrafo ya dice con claridad es relleno, y también lo es el que solo decora. La mayoría de las partes de un documento no necesitan ninguno.

Un dibujo nunca reemplaza su explicación. Va justo después del párrafo que lo explica, y el Studio lee los dos juntos como una sola idea, con un solo «Entendido». Después del dibujo, el párrafo siguiente dice qué llevarse de él, en una o dos frases.

## 2. Los colores: quién es quién

Cada caja se colorea según quién actúa en ella, siempre con las variables CSS del Studio y un valor de respaldo, para que el dibujo siga el tema:

| Quién | Relleno | Borde |
| --- | --- | --- |
| La persona (el titular o un compañero): amarillo | `var(--sobre,#fffdf5)` | `var(--sobre-borde,#ecdcae)` |
| El código del Studio, sin modelo: gris | `var(--panel-suave,#fbfaf7)` | `var(--borde-fuerte,#cdc8bc)` |
| El modelo (el director y sus ayudantes): azul | `var(--acento-fondo,#eaf1fb)` | `var(--acento,#2f5fb3)` |

Los títulos dentro de una caja usan `var(--texto,#23221f)`, o `var(--acento-texto,#0c447c)` sobre el azul; el texto secundario y las flechas usan `var(--suave,#5c5b55)`. Cuando un dibujo usa más de uno de los tres papeles, termina con una leyenda pequeña, un cuadrado por papel, en ese mismo orden.

## 3. Cómo escribir uno

- Un solo elemento `svg`, como bloque propio, con `viewBox="0 0 760 H"`, `width="100%"`, `role="img"`, un `aria-label` que diga en una frase qué muestra el dibujo, y `style="max-width:760px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif"`.
- Ninguna línea en blanco dentro del bloque: Markdown cierra el bloque HTML en la primera, y el resto se vería como código. La auditoría de los cortes del Studio falla por ello.
- Los colores siempre con `style="fill:…;stroke:…"` y las variables de arriba, nunca un color suelto: un color suelto rompe el tema oscuro.
- Cajas con esquinas redondeadas (`rx` de 8 a 12); un título de 14 px y peso 600, líneas secundarias de 12 px. Toda etiqueta empieza con mayúscula, y ninguna es más larga que la caja que la contiene.
- Flechas con un `marker` cuyo `id` sea único en todo el documento (por ejemplo `flecha-<parte>`), porque todos los dibujos de un documento viven en la misma página.
- Nada que se ejecute o salga de la página: ni scripts, ni manejadores de eventos, ni enlaces, ni `foreignObject`, ni animaciones. El Studio los quita antes de mostrar el dibujo.
- Las etiquetas, en el idioma de la persona que lee el documento, como el resto de él.

## 4. Un ejemplo pequeño

La persona pide una revisión, el Studio la lanza y el director responde:

<svg viewBox="0 0 760 120" width="100%" role="img" aria-label="Ejemplo: la persona pide la revisión, el Studio lanza al director y el director responde en el Studio" xmlns="http://www.w3.org/2000/svg" style="max-width:760px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif">
<defs><marker id="flecha-ejemplo" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--suave,#5c5b55)"/></marker></defs>
<rect x="8" y="8" width="180" height="60" rx="10" style="fill:var(--sobre,#fffdf5);stroke:var(--sobre-borde,#ecdcae)"/>
<text x="98" y="33" text-anchor="middle" font-size="14" font-weight="600" style="fill:var(--texto,#23221f)">Tú</text>
<text x="98" y="53" text-anchor="middle" font-size="12" style="fill:var(--suave,#5c5b55)">«Pedir revisión»</text>
<line x1="188" y1="38" x2="278" y2="38" stroke-width="1.5" marker-end="url(#flecha-ejemplo)" style="stroke:var(--suave,#5c5b55)"/>
<rect x="280" y="8" width="180" height="60" rx="10" style="fill:var(--panel-suave,#fbfaf7);stroke:var(--borde-fuerte,#cdc8bc)"/>
<text x="370" y="33" text-anchor="middle" font-size="14" font-weight="600" style="fill:var(--texto,#23221f)">El Studio</text>
<text x="370" y="53" text-anchor="middle" font-size="12" style="fill:var(--suave,#5c5b55)">Lanza al director</text>
<line x1="460" y1="38" x2="550" y2="38" stroke-width="1.5" marker-end="url(#flecha-ejemplo)" style="stroke:var(--suave,#5c5b55)"/>
<rect x="552" y="8" width="200" height="60" rx="10" style="fill:var(--acento-fondo,#eaf1fb);stroke:var(--acento,#2f5fb3)"/>
<text x="652" y="33" text-anchor="middle" font-size="14" font-weight="600" style="fill:var(--acento-texto,#0c447c)">El director</text>
<text x="652" y="53" text-anchor="middle" font-size="12" style="fill:var(--suave,#5c5b55)">Responde en el Studio</text>
<rect x="8" y="94" width="12" height="12" rx="3" style="fill:var(--sobre,#fffdf5);stroke:var(--sobre-borde,#ecdcae)"/>
<text x="26" y="104" font-size="12" style="fill:var(--suave,#5c5b55)">Tú</text>
<rect x="70" y="94" width="12" height="12" rx="3" style="fill:var(--panel-suave,#fbfaf7);stroke:var(--borde-fuerte,#cdc8bc)"/>
<text x="88" y="104" font-size="12" style="fill:var(--suave,#5c5b55)">El código del Studio, sin modelo</text>
<rect x="320" y="94" width="12" height="12" rx="3" style="fill:var(--acento-fondo,#eaf1fb);stroke:var(--acento,#2f5fb3)"/>
<text x="338" y="104" font-size="12" style="fill:var(--suave,#5c5b55)">El modelo</text>
</svg>

Qué llevarse de él: solo la caja amarilla es una persona, y solo la caja azul gasta tokens. Esa frase es la razón de que el dibujo exista.
