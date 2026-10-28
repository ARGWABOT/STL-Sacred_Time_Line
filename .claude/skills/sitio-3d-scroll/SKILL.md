---
name: sitio-3d-scroll
description: Construir una página web que se recorre como un mundo en 3D con el scroll, con estaciones, un menú que lleva a cada una y subestaciones, en Three.js o con video generado con IA. Úsala cuando haya que diseñar, construir o cambiar una página de difusión con recorrido en 3D, como la de «¿Qué es STL?».
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

## 6. Dónde quedó el prototipo

El titular lo dejó así el 22 de octubre de 2026 («por el momento no generes nada más»). La portada y la animación actual se quedan como primera fase. Lo que sigue (cuántas estaciones, qué menú, qué subestaciones) lo decide él. Cuatro arreglos de encuadre quedaron vistos y sin aplicar:
- **El problema:** algunas ramas nacen detrás de la cámara.
- **Cómo funciona:** el portal del Studio queda cerca, y el rótulo del director, tapado por el del Studio.
- **Lo nuevo:** el rótulo «tu misión» queda detrás de la figura.
- **Los principios:** la primera columna está demasiado cerca.
