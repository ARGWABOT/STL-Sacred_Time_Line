# El diseño del STL Studio

*La reestructuración gráfica del Studio: qué se encontró, con qué principios se rediseñó y cómo quedan «Qué es STL» y las preguntas al director. 16 de octubre de 2026.*

## 1. Lo que entendí

El STL Studio es la aplicación base y simplificada con la que se aplica la metodología STL (Sacred Time Line). En su versión básica es la interfaz del director asistente con sus subpestañas: nada más.

Pediste cuatro cosas:

1. **Arreglar el modal** de «Escanear el equipo», que se veía desordenado.
2. **Rediseñar todo el Studio** para que se lea mejor:
   - cada cosa fácil de ver;
   - anchos de lectura adecuados;
   - controles que se entiendan sin explicación.
3. **Una sección que explique la metodología**: qué es, cómo funciona y por qué conviene frente a otras formas de trabajar con IA.
4. **Pestañas personalizadas por proyecto.** Se construyeron y después decidiste quitarlas, para mantener el Studio enfocado en el director (parte 7).

El Studio será un producto gratuito para desarrolladores, así que tiene que entenderse solo. El director debe tenerte siempre al día: qué fue lo último que se completó y qué sigue. Cambiar de proyecto debe ser fácil.

## 2. Lo que encontré

Lo revisé en tres anchos: el panel de la app (unos 850 px), un portátil (1440 px) y un teléfono (390 px).

- **Lo que te toca hoy queda abajo.** En 850 px, tu misión de ahora aparece a tres pantallas de distancia. Antes van seis tarjetas de cifras, el arranque, la línea de la ruta, dos filas con 13 pestañas y una caja de ayuda.
- **Demasiadas opciones al mismo nivel.** Las 13 pestañas tienen el mismo peso visual, y las tarjetas de cifras compiten con el mensaje del director.
- **Letra pequeña y controles chicos.** Buena parte del texto va entre 11 y 13 px y muchos botones miden menos de 30 px de alto.
- **Formularios que se rompen.** Una regla le daba el 100 % del ancho a todo `input` de los diálogos, también a las casillas. Por eso, en el modal del escaneo, cada casilla quedaba sola en medio de la fila y su texto se iba a la derecha.
- **Elementos flotantes que tapan.** La cara del director y el botón «Escribirle al director» tapan el contenido de abajo a la derecha.
- **Sin un lugar para crecer.** Una sección nueva no tenía dónde ir sin una tercera fila de botones.

## 3. Los principios del rediseño

Cada principio sale de una guía conocida de experiencia de usuario o de accesibilidad:

1. **Una sola línea: tu misión.** El primer vistazo responde «¿qué hago ahora?» con tu misión, completa, y nada más compite con ella. Lo que pasó (lo que dijo el director, lo avanzado, los resultados) no queda fijo en la pantalla: se lee en «¿Dónde quedamos?», cuyo botón dice cuántas líneas faltan por leer y late cuando el director dejó algo nuevo. Lo que espera de ti va solo en tu misión (y el director flotante lleva a ella): ni el resumen, ni el mensaje, ni las respuestas listan pendientes. Los pasos que marcas viajan con lo demás, así el director nunca vuelve a pedir algo que ya marcaste. Nunca dos pasos por delante: la cola de misiones no se muestra, y la barra lateral deja a la vista solo lo de todos los días (la configuración del proyecto va en el engranaje del selector, y la del director, al pie). El director flotante habla de lo que sigue y responde a lo que haces (al marcar un paso, dice cuál sigue). Lo demás se abre cuando hace falta (divulgación progresiva, [NN/g](https://www.nngroup.com/articles/progressive-disclosure/)).
2. **Navegación lateral agrupada.** Con más de siete secciones, una barra lateral es más fácil de recorrer y de ampliar que una fila de pestañas ([NN/g, navegación vertical](https://www.nngroup.com/articles/vertical-nav/)). Las secciones van en grupos (lo de todos los días arriba y, con su nombre, «El proyecto»), porque menos opciones a la vista hacen más rápida la decisión ([ley de Hick](https://lawsofux.com/hicks-law/)).
3. **Líneas de lectura de 60 a 75 caracteres.** Los documentos, el diagnóstico y los textos largos llevan un ancho máximo de unos 72 caracteres ([Baymard Institute](https://baymard.com/blog/line-length-readability)). Las tarjetas que los contienen, en cambio, usan todo el ancho que tienen: una tarjeta con tope deja un hueco a la derecha, y dos tarjetas que no caben bien lado a lado van una encima de la otra (nota de voz del titular nmvow70jqtit, 26 de octubre de 2026).
4. **Letra legible.** El texto base sube a 15 px, el de los documentos a 16 px y el más pequeño queda en 12 px, solo para datos secundarios.
5. **Controles fáciles de tocar.** Los botones normales miden 36 px de alto y los principales, 40 px. Superan el mínimo de 24 px de [WCAG 2.2 (2.5.8)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
6. **Contraste AA.** Todo texto contra su fondo cumple al menos 4,5 : 1 ([WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)).
7. **Casillas como manda la norma.** La casilla va a la izquierda, su texto a continuación y toda la fila se puede oprimir; cuando hay elección con explicación, se usan tarjetas que se marcan ([NN/g, casillas](https://www.nngroup.com/articles/checkboxes-vs-radio-buttons/)).
8. **Un solo botón principal por pantalla o diálogo.** Va abajo a la derecha. Cancelar y Volver van a su izquierda, sin color.
9. **Avisos que no estorban.** Los mensajes («Guardado», un error) salen abajo, en una notificación que se va sola, en vez de mover la página. Ningún aviso ocupa la pantalla de forma fija: lo nuevo se señala en el botón que lleva a leerlo.
10. **Un solo camino a cada cosa.** No se repite en varios lugares el mismo resumen ni el mismo enlace: cada información vive en un sitio, y la interfaz lleva a ese sitio cuando toca.

## 4. La estructura nueva

```
┌───────────────────┬──────────────────────────────────────────────┐
│ STL Studio        │ Mi proyecto · Hoy           ¿Dónde quedamos? │
│ [ Mi proyecto ⚙▾ ]│ ███████░░░░ 2 de 4 criterios para la puerta      │
│                   ├──────────────────────────────────────────────┤
│  ● Hoy          1 │                                              │
│    Buzón        2 │   Tu misión de ahora, completa               │
│    Preguntas    1 │                                              │
│ EL PROYECTO       │                                              │
│    La ruta        │                                              │
│    Documentos   1 │                                              │
│    Propuestas   6 │                                              │
│ ───────────────── │                                              │
│ Modelo y consumo  │                                              │
│ Ana · Titular     │                                              │
│ Qué es STL ↗      │                                              │
└───────────────────┴──────────────────────────────────────────────┘
```

- **El selector de proyecto** va arriba de la barra lateral. Muestra cada proyecto con su etapa, lo que tiene por revisar y su alerta, si la hay. Al cambiar, el director te dice dónde quedaron («Dónde quedamos») y te lleva a tu misión.
- **Proyecto, en el engranaje del selector** (en la barra solo mientras el proyecto arranca): la meta arriba, qué es el proyecto, **el diagnóstico del director**, plegado (su resumen, lo más listo y lo más flojo de los frentes en un párrafo, la estrategia para ese tipo de proyecto y el documento a un clic), y dónde está. Las metas que propone el director se ven solo mientras no hay una; «Replantear la meta» la cambia y pide la revisión.
- **«Modelo y consumo», al pie de la barra**, aparte de las secciones del proyecto porque no es de ninguno: el modelo y el esfuerzo del director (la configuración de Claude Code en ese computador, la de `/model` y `/effort`), los límites del plan y lo que gastó cada lanzamiento.
- **Las cifras pasan a la navegación.** Cada sección lleva su número (misiones tuyas, notas sin respuesta, documentos por leer, propuestas por decidir). El tablero completo de la fase, con la línea de la ruta, queda en «La ruta».
- **La cabecera del proyecto** ocupa dos líneas: el nombre, la fase, el avance hacia la puerta, «Pedir revisión», «¿Dónde quedamos?» y, en un documento abierto o en tu misión de ahora, «Modo enfoque».
- **El modo enfoque** es uno solo para un documento y para la misión: un velo desenfoca toda la pantalla, también la cabecera y sin ninguna franja, y deja nítido lo que toca leer (el documento o la tarjeta de tu misión) en una ventana al centro, ancha (hasta 1200 px o el 92 % del ancho), con su propio desplazamiento. Entra y sale suave, y después nada se mueve. Se pone y se quita con el mismo botón, arriba a la derecha, cuya salida flota encima del velo en el mismo lugar (salir está donde se entró), o con su atajo junto a la cara del director; Esc también sale.
- **«Hoy» abre siempre con el director**: lo último que se completó, lo que sigue en la ruta y tu misión de ahora completa. Mientras el proyecto arranca, el arranque se ve ahí mismo, en una franja de cuatro pasos.
- **Dos atajos flotan junto a la cara del director**, abajo a la derecha, en todas las pantallas: un **comentario** (va al Buzón) y las **preguntas** (van aparte, respondidas como un informe). Son la forma más directa de decirle algo sin salir de lo que haces. Donde el modo enfoque aplica, se suma su atajo. «Pedir revisión» no va aquí sino arriba, en la cabecera: es delicado, y al lado de «Comentario» un clic de más lanzaba al director. El contenido deja espacio abajo para que nunca tapen lo último de la página.
- **En pantallas angostas** (menos de 760 px), la barra lateral se esconde detrás del botón «Menú».
- **Ninguna lista se pliega sola** (regla del titular, 22 de octubre de 2026): abrir un elemento de una lista (un documento, una propuesta, una nota) no pliega la lista donde está. Queda como la persona la dejó, con lo abierto marcado, para que siempre se vea qué se está leyendo: plegar lo decide quien lee, nunca es efecto de abrir.
- **Ningún botón lleva a donde ya estás** (regla del titular, 22 de octubre de 2026): un botón que devuelve a la misma parte, la misma misión o la misma vista confunde, porque parece que lleva a otro lado. Si el destino es el lugar donde la persona ya está, el Studio lo dice en texto («Quedó aquí, en esta misma parte») en vez de dibujar el botón.

## 5. El sistema visual

- **Tipografía:** la del sistema. Base de 15 px y escala de 12 / 13 / 15 / 17 / 20 / 26 px.
- **Anchos:**
  - lectura de 72 caracteres;
  - contenido de hasta 1180 px;
  - barra lateral de 252 px;
  - diálogos de 560 a 760 px según lo que piden.
- **Espacios:** una escala de 4, 8, 12, 16, 24 y 32 px.
- **Color:** se conserva el papel cálido del Studio y el azul de acción. El dorado queda solo para lo que va al Buzón del director, y verde, ámbar y rojo solo para los estados.
- **Controles:** los campos de texto, las listas y las casillas tienen su propio estilo y ninguno hereda el de otro.

## 6. «Qué es STL»

Es una página aparte, al pie de la barra lateral y en la bienvenida, para quien llega nuevo y para presentar el método. Tiene siete partes:

1. **La idea**: una sola línea de tiempo para el proyecto. Las ideas y los desvíos no se pierden en chats sueltos: se integran, se aplazan o se descartan con su razón.
2. **El problema** de dirigir un proyecto largo por chat.
3. **Cómo funciona**:
   - el arranque: entregar, diagnosticar, fijar la meta y trazar la ruta;
   - el ciclo: misión, comentar, buzón, la misión completada (su último paso la entrega), «revisa» y la respuesta a cada observación.
4. **Los ocho principios.**
5. **En qué se diferencia** de Spec Kit, BMad y el modo plan de Cursor, Claude Code y Codex. Es una comparación honesta: dice lo que cada uno hace bien y lo que STL agrega.
6. **Cuándo no usarlo.**
7. **Cómo se usa el Studio**: la guía que antes empujaba la misión hacia abajo.

## 7. Las preguntas al director

A veces se te ocurren preguntas en medio del trabajo y hacerlas en ese momento rompería tu flujo. Por eso van aparte de los comentarios:

- **Se acumulan sin salir de lo que haces.** El atajo de preguntas, junto a la cara del director, abre la lista: las vas anotando, escritas o grabadas (grabada, se oye y se le añade otro fragmento como en todo el Studio, o se agrega de una vez con «Enviar ya»), y cada una queda guardada al instante. Se corrigen o se quitan hasta que el director las lea.
- Se probó un lote con envío aprobado y se quitó por decisión del titular: las preguntas se acumulan igual que los comentarios y se responden en la revisión siguiente.
- **Se responden como un informe.** El director las responde todas juntas en su próxima revisión: primero la respuesta directa y después el porqué. Se leen en **Preguntas**, aparte de los comentarios y los pedidos del Buzón, en un informe por revisión que se puede copiar.

Las **pestañas personalizadas** (un visor del resultado del proyecto y pestañas a medida que construía el director) se construyeron y se quitaron después, por tu decisión: el Studio se mantiene enfocado en las funciones del director, lo más simple posible. Las secciones oficiales se irán evaluando durante el desarrollo.

**Decidido (17 de octubre de 2026):** el nombre público es «Sacred Time Line», en tres palabras: la expresión literal de la metáfora, en un proyecto abierto y no comercial, sin registro de marca. La única cautela: no usar logos ni imágenes de obras de terceros.
