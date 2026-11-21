---
name: sitio-3d-scroll
description: Construir una página web que se recorre como un mundo en 3D con el scroll, con estaciones, un menú que lleva a cada una y subestaciones, en Three.js o con video generado con IA. Úsala cuando haya que diseñar, construir o cambiar una página de difusión con recorrido en 3D, o mejorar sus efectos gráficos, como la de «¿Qué es STL?».
---

# Un sitio que se recorre en 3D con el scroll

La idea: la página tiene un mundo detrás, y el scroll mueve la cámara por él. Cada bloque de información es una **estación** del recorrido. La cámara viaja de una a otra y se detiene en cada una; el texto de la estación aparece encima, en HTML.

Lo aprendido viene de dos fuentes:
- **El video de midudev y sus repositorios**, analizados el 22 de octubre de 2026: `docs/difusion/aprendido-video-scroll-world.md`.
- **El prototipo que se construyó y probó con lo aprendido:** `docs/difusion/mundo-3d.html` y `mundo-3d.js`.

## 1. Elegir el camino

- **B. 3D en tiempo real con Three.js (el camino por defecto).** El mundo se dibuja en código, en el navegador.
  - **A favor:** gratis, liviano (unos 200 KB más) y editable como cualquier código.
  - **En contra:** menos fotorrealista, y exige más a la GPU de un teléfono viejo.
  - **Cuándo:** el mundo es una idea (una línea, sus ramas, sus puertas) o la página se corrige seguido.
- **A. Video generado con IA** (scroll-world, midudev). Se generan imágenes clave y clips entre ellas, y el scroll mueve el tiempo del video.
  - **A favor:** lo más cinematográfico.
  - **En contra:** de 5 a 60 dólares por versión, cada cambio es otra generación pagada, pesa de 25 a 80 MB y falla más en el móvil.
  - **Cuándo:** hay un lugar real o una marca que mostrar, y la página casi no cambia. Necesita una cuenta en Higgsfield o Monid y **los dos pasos del titular** (aprobación y «Confirmo» con el costo a la vista).
  - **Cómo:** el procedimiento completo está en el documento de lo aprendido. La regla que hace o rompe el resultado: el último cuadro de cada clip es exactamente el primero del siguiente.

## 2. La arquitectura del camino B (el prototipo)

1. **La portada, intacta.** Si ya hay una animación de portada, va arriba en su marco (`iframe`, `100svh` menos la franja de «Recorre…»). Así su código no choca con el del mundo. Lleva `loading="lazy"`, para que no cargue cuando está oculta.
2. **El escenario fijo y las estaciones encima.** El `canvas` va en un contenedor `sticky`, `top: 0`, `100lvh`. Las estaciones van después:
   - Cada una es un `<article>` de unos 190vh, con su tarjeta `sticky` abajo.
   - El bloque de estaciones sube con `margin-top: -100lvh`, para quedar encima del escenario.
   - Las tarjetas se alternan de lado en escritorio; en el teléfono solo se ve la actual.
3. **El texto siempre en HTML.** Todo el 3D se activa con una clase (`js-3d`) que el script pone solo si hay WebGL. Sin JavaScript o sin WebGL, las estaciones se leen de corrido. El `canvas` lleva `aria-hidden`, y la página un enlace «Saltar el recorrido». Así la leen los buscadores, los lectores de pantalla y los modelos que la verifican.
4. **El camino.** Una `CatmullRomCurve3` con un tubo y un halo. El halo va en `AdditiveBlending`; con transparencia normal se ve como una franja gris.
   - `PARADA` dice dónde se detiene la cámara (de 0 a 1 en la curva).
   - `SITIO` dice dónde está lo que se ve: unos 0,022 más adelante, para que quede a unos 15 metros de la cámara.
   - `marco(u)` da el punto, la dirección y el costado del camino.
5. **Del scroll a la cámara:**
   - Las anclas son el inicio del recorrido y el centro de cada estación. Con ellas, la posición del scroll da `w`: 0 es la vista de entrada, 1 la primera estación, N la última.
   - Entre dos estaciones, la cámara avanza por la curva con `smootherstep`: más lenta al llegar y al salir de cada una.
   - En cada cuadro se suaviza con `cur += (w − cur) · 0.085`.
6. **La cámara:**
   - Va 7,5 detrás, 2,8 arriba y 1,4 al costado del punto del camino, y mira hacia adelante.
   - Cerca de una estación, la mirada gira hacia lo que hay que ver (`focos`).
   - La entrada es una vista de costado que imita la portada en 2D, y de ahí baja al camino.
7. **Los rótulos.** Son sprites con `CanvasTexture`: una píldora con el texto, siempre de frente, con `fog: false`. Se reparten para que dos no caigan en el mismo lugar de la pantalla.
8. **El rendimiento:**
   - El `pixelRatio` tiene tope (1,75; 1,25 en el teléfono, donde además va sin antialias y con menos estrellas).
   - El bucle solo dibuja mientras el recorrido está a la vista (`IntersectionObserver`).
   - El tamaño se mide con `ResizeObserver` sobre el `canvas` y el `body`. El evento `resize` no basta: si la página carga sin ancho, el lienzo queda en 0.
9. **El movimiento reducido** (`prefers-reduced-motion`): la cámara salta de estación en estación y nada se anima.

## 3. Estaciones, menú y subestaciones (para crecer)

- **El menú.** Los hitos (`.hitos`) son enlaces a cada estación (`#p-…`). Un clic lleva el scroll a la estación y la cámara viaja sola. El mismo enlace sirve para compartir una estación.
- **Subestaciones:**
  - Una estación puede abrir un ramal: una curva propia que sale del camino principal, con sus paradas y sus tarjetas en una sección aparte.
  - El menú de la estación lleva a cada subestación. Al terminar el ramal, un botón vuelve al camino principal en el punto de donde salió.
  - Cada ramal suma sus anclas a la cuenta de `w`, o tiene su propio escenario si va en otra página.
- **Muchos bloques de información:** pocas estaciones, de 5 a 8, con poco texto cada una, y «Leer la parada completa →» hacia la página de lectura. Un recorrido con 20 paradas cansa.

## 4. Comprobarlo

- **Nada se sale ni se encima** (regla del titular): en toda animación, ningún elemento se sale de su contenedor ni pisa a otro; solo lo que viaja puede pasar por encima mientras viaja. Lo vigila `tools/recorridoSinSuperponer.test.ts`, que dibuja cada situación cuadro a cuadro y revisa las cajas de cada letrero, recuadro y ventana: una animación nueva dibuja con `letrero`, `caja`, `ventana` y `globo` para que la prueba la vea.
- **La voz se carga toda al empezar, detrás de un solo «Cargando la voz…»**: la animación espera quieta hasta que llegan todos sus clips, y entre una frase y otra nunca se dibuja nada encima ni se oscurece (nota del titular nmw5h32xptit: el velo entre frases parpadeaba).
- **El panel del navegador oculto baja la animación a 2 cuadros por segundo.** Ahí no se juzga el movimiento: la cámara tarda medio minuto en llegar.
- **Para capturar una estación sin pantalla, se usa `?ver=N`.** Fija la estación N con su tarjeta, sin portada ni scroll, y deja de dibujar tras 150 cuadros. Hay dos razones:
  - Desplazar la página en un navegador sin pantalla deja la captura en blanco.
  - Si la página no para de dibujar, Edge no toma nunca la foto.
- **`scripts/capturar.sh`** toma varias vistas, con WebGL por software (`--enable-unsafe-swiftshader --use-angle=swiftshader`):
  ```
  bash .claude/skills/sitio-3d-scroll/scripts/capturar.sh http://localhost:5180/docs/difusion/mundo-3d.html <carpeta> 1440 900 "?ver=0" "?ver=1" …
  ```
  El ejecutable de Edge regresa al instante y el trabajo sigue aparte: el script espera a que aparezca la imagen y luego cierra ese Edge por su perfil. Sin eso, quedan procesos colgados.
- **`tools/director/mirar.ts` del Studio da «sin captura» con estas páginas:** corre con `--disable-gpu`, sin WebGL, y no espera a que aparezca la imagen. Para el 3D se usa `capturar.sh`.
- **El encuadre**, según lo que se vio al probarlo:
  - Lo que se muestra va a por lo menos 12 a 15 metros de la cámara.
  - Nada nace detrás de la cámara.
  - Los rótulos no se tapan entre sí ni quedan detrás de una figura.

## 5. Publicarla

El prototipo corre en el Studio encendido (`http://localhost:5180/docs/difusion/mundo-3d.html`), porque Vite resuelve `import 'three'`. Para publicarlo en GitHub Pages hay que empaquetarlo:
- o con `vite build`, con la página como entrada;
- o con una copia de `three.module.min.js` junto a la página;

y sumarlo a `tools/publicar-stl.ts`. Todavía no se publica: lo decide el titular.

## 6. Dónde va el recorrido

El 3 de noviembre de 2026 el prototipo pasó a ser el primer tramo del recorrido de «Qué es STL», como eligió el titular (un tramo corto primero):
- **Las estaciones**, en su orden: Qué es STL, ¿Te ha pasado…? y La documentación. Están las dos primeras. «Cómo funciona» y «Lo que ya trae» salieron el 5 de noviembre de 2026: repetían lo que ya cuentan la estación 1 y las soluciones de la 2. «¿Reemplaza a otros métodos?» también salió ese día; en su lugar irá «Cómo empezar», una guía animada de la instalación (pd_como_empezar).
- **En la estación 2**, los íconos giran como un anillo alrededor de la línea, con un globo HTML que nunca pisa nada (`lugarDelGlobo`), y el reproductor de cada problema es HTML, a la izquierda del anillo: la imagen del mundo se corre con `camera.setViewOffset` para dejarle sitio, sin mover la cámara (`disponerReproductor`).
- **El menú** (`.menu`) lleva los seis nombres siempre a la vista, arriba, con el de la estación actual resaltado; los que aún no existen van sin enlace.
- **El camino** es la línea del tiempo: ramas que salen y vuelven a juntarse, de la dispersión del comienzo (ramas largas de colores, fragmentos sueltos) al orden (ramas cortas doradas, faroles en fila).
- **«¿Te ha pasado…?»**: los cinco grandes problemas (los quince de antes, unificados; cada uno junta sus situaciones y tiene una animación larga que las pasa una tras otra, primero sin STL y luego con STL), y la cuenta con un ✓ por cada uno que se abre; en el 3D, cada ícono es de un solo color con el blanco (la paleta de las notas), gris hasta que el ratón pasa o se abre, y un interruptor: otro clic en el abierto lo cierra.
- **«Un Studio que se mejora solo»** (pd_estacion_automejora, 20 de noviembre de 2026): la estación entre «¿Te ha pasado…?» y «Cómo empezar» (`PARADA[2]`, 0,56; «Se mejora solo» en el menú). Una pantalla de pie, grande, a la izquierda de la línea, que cuenta sus cuatro frases con los actores 2D de siempre (`pintarMejoraEn`, en bucle), en silencio hasta que el titular vea la animación con su guion. Desde ella, «Cómo empezar» es la estación 4 y «La documentación» la 5 (`?ver=4`, `?ver=5`).
- **Las pruebas**: `tools/recorrido3d.test.ts`. Todavía no se publica.

## 7. Reglas de uniformidad (nota del titular nmw5o26vdtit, 6 de noviembre de 2026)

Valen para todas las estaciones, las que existen y las que lleguen:
- **Una sola tarjeta.** Todas las estaciones usan la misma clase (`tarjeta corta`), la de la estación 1: el título una vez y, si hay animación, su botón `boton-ver` dentro de `.acciones`. Ninguna tarjeta repite su título (nada de «1 · Qué es STL» y debajo «Qué es STL»). Los textos salen también en inglés, del diccionario `TEXTOS` de `mundo-3d.js`.
- **La cámara nunca mira hacia abajo.** Siempre mira hacia adelante o hacia atrás por la línea: `sinMirarAbajo` nivela el punto que mira con la cámara, en toda vista (la entrada y la portada incluidas). **Y el encuadre tampoco** (nmw6lcanstit): correr la imagen hacia arriba con `setViewOffset` se ve igual que mirar al piso, así que el corrimiento vertical solo sube (`corrimientoSinBajar`); lo que se quiere centrar va a la altura de la cámara (`ALTURA_CAMARA`). Se mide el rayo del centro de la imagen, con el corrimiento puesto, cada 4 cuadros.
- **Entre estaciones vecinas, la mitad de la velocidad** (`SUAVIZADO` 0,0075, el doble de tiempo); un salto de dos o más sigue más rápido (`SUAVIZADO_SALTO`).
- **Toda estación se ve desde lejos y tiene elementos permanentes** alrededor de la línea, antes de llegar y después de irse, aunque su reproductor esté cerrado (un anillo de piezas con un resplandor sin niebla, como en la 2 y la 3).
- **El mismo fondo en cualquier dirección:** estrellas (muchas, de semilla fija, una de cada diez titila) sobre una esfera de nebulosa procedural que acompaña a la cámara. No se anima, así que el movimiento reducido no la cambia.

## 8. Ideas de efectos: el catálogo de 21st.dev (17 de noviembre de 2026)

Antes de diseñar un efecto nuevo del recorrido, o de mejorar cómo se ve uno, se buscan ideas en 21st.dev, gratis y sin cuenta. Lo pidió el titular: el recorrido funciona, pero sus efectos todavía son básicos.

- **Por dónde empezar.** La galería con los 14 candidatos elegidos para el recorrido, cada uno con su lugar, su peso y su licencia: `.stl/docs/investigacion/21st-galeria/index.html`. Con el Studio encendido se abre en `http://localhost:5180/.stl/docs/investigacion/21st-galeria/index.html`. El reporte que la explica: `.stl/docs/investigacion/21st-dev.md`.
- **Cómo buscar más.**
  - Las páginas por etiqueta: `https://21st.dev/community/components/s/<etiqueta>`, con `shader`, `webgl`, `3d-shader`, `three-js`, `particles`, `aurora`, `nebula`, `glow`, `beam`, `text-effect` o `background`.
  - Cada ficha (`https://21st.dev/@<autor>/components/<nombre>`) trae en su HTML el video de la vista previa (`cdn.21st.dev/…/video.*.mp4`), la descripción y la licencia (`"license":"mit"`, vacía o `no-license`).
  - Nada de eso pide cuenta: se lee con `fetch` desde el navegador o con WebFetch.
- **Se emula, no se copia.** Se mira el video y se escribe una versión propia dentro de la escena, con la paleta de STL: un `ShaderMaterial`, unos `Points` o el tubo de la línea.
  - El código de cada componente pide una cuenta y gasta el límite gratis de 2 copias al día: no hace falta.
  - Si algún día se toma código, va solo uno con licencia MIT, con su crédito en el comentario.
- **Las reglas del recorrido mandan sobre el efecto:**
  - el tope de `pixelRatio`, la pausa fuera de la vista y el movimiento reducido, que no anima nada;
  - los cuadros por segundo, medidos con `FPS_MINIMO`;
  - nada se sale ni se encima, y la cámara nunca mira abajo;
  - STL es un juego tranquilo: nada de prisa ni de destellos.

  Va un solo efecto de pantalla completa, el cielo, y el resto livianos. El resplandor real (`UnrealBloomPass`, que trae Three.js) es la base de casi todos esos efectos y no suma dependencias.
- **Nunca sin el titular:**
  - la cuenta o la clave de la API de 21st.dev, su MCP, su skill, su plugin o su suscripción;
  - React o Tailwind en el recorrido o en el Studio;
  - la skill «21st-design-sync», que publica el diseño del proyecto en 21st.dev.
- **La interfaz del Studio no busca efectos ahí** salvo que el titular lo pida: está hecha para leer con calma.
- **El titular ve el efecto antes de que quede.** Se muestra en su estación con `?ver=N` y una captura (`scripts/capturar.sh`), junto con sus cuadros por segundo, para que lo apruebe o lo descarte.
- **La primera ronda** (17 de noviembre de 2026, commit 6c839461), los efectos 6, 10 y 11 de la galería:
  - **El resplandor.** La escena se dibuja como siempre y, aparte, a media resolución, solo lo que brilla (la capa `CAPA_BRILLO`: la línea fina y los anillos finos, con su `calor`; las luciérnagas se fueron en la segunda ronda). Eso se difumina y se suma encima, y así los rótulos quedan nítidos.
  - **Los halos anchos no van en esa capa:** velaban media pantalla.
  - **Cuándo no hay resplandor:** en el teléfono, con `?sinbrillo` (para comparar) y en el computador que no alcanza `FPS_BRILLO`.
  - **Lo que sigue va por la ruta del Studio:** el pedido `pd_efectos_recorrido`, en la fase pública, ronda por ronda.
- **La segunda ronda** (18 de noviembre de 2026, pedido `pd_efectos_recorrido`), con lo que el titular decidió al ver la primera: las ideas 1, 3, 5, 7 y 8 de la galería, escritas aquí. Nada de 21st.dev se instaló.
  - **Se fueron las luciérnagas** (hacían más difícil leer los objetos). El resplandor de la línea se queda.
  - **Estrellas.** El doble (`ESTRELLAS_X`), cada una se apaga y vuelve despacio, de 2 a 5 s, en su propio momento dentro de un ciclo largo (`TITILEO_*`), así que a la vez solo unas pocas están apagadas. Titilan en su sitio: el cielo no se corre.
  - **Efecto 1, el velo** (`veloCielo`): detrás de las estrellas, muy tenue, azul noche con vetas de aguamarina y un poco de violeta. Quieto, con profundidad (nunca sobre un objeto).
  - **Efecto 3, las cintas de aurora** (`cintas`): solo arriba y al fondo, a la entrada y tras la estación 1; tenues y lentas. Se desvanecen entre la 1 y la 2 (`AURORA_HASTA`): de la estación 2 en adelante no hay ninguna.
  - **Efecto 5, las constelaciones** (`FORMAS`): líneas finas y muy tenues que unen estrellas. Entre la estación 1 y la 2, una carita como la del director; entre la 2 y la 3, una línea de proyecto con sus puntos. Se dibujan despacio con `w` (`desde`, `hasta`) y se apagan antes de la estación siguiente: nunca hay una mientras la cámara está parada.
  - **Efecto 7, el flujo neón** (`conFlujo`): reemplaza al pulso de la primera ronda. Olas de luz por la línea dorada, con su dorado de base, más vivas mientras la cámara viaja (`uViaje`).
  - **Efecto 8, la velocidad luz:** al salir de una estación las estrellas se estiran en estelas (rayitas con el punto de fuga hacia donde va la cámara) en el pico de la velocidad y vuelven a puntos al frenar; si se retrocede, al revés. La velocidad es la real de la cámara en m/s (`estelaDeLaVelocidad`, con su pico medido en el viaje). El texto de la estación llega solo cuando la cámara ya se detuvo (`ESTELA_QUIETA` en `marcar`).
  - **Teléfono:** conserva las estrellas, las constelaciones y la velocidad luz; deja fuera el velo y las cintas (`conVelos`).
  - **Computador lento:** la medida de `FPS_BRILLO` (40) apaga además el velo y las cintas (`apagarVelos`), aunque el navegador no pueda con el resplandor.
  - **`?sinbrillo`** muestra el recorrido como era antes de cualquier efecto (`conEfectos2`): las estrellas de antes, sin velo, aurora, constelaciones, estelas ni flujo, y sin resplandor. Con movimiento reducido nada de esto se anima.
  - **Sin ver todavía en pantalla:** `mirar.ts` no lleva WebGL y el brillo y los tonos se afinan mirando una captura con `capturar.sh`.
