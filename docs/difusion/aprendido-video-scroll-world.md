# Lo aprendido de un video: landings «scroll world»

*Fuente: «Crea una Landing ESPECTACULAR con Claude Code», de midudev (YouTube, 9 de octubre de 2026, 25:47), con el código y las skills que enlaza. Analizado el 22 de octubre de 2026.*

## 1. Cómo aprende el director de un video

El modelo no ve videos de YouTube: la página solo le da el título. Para aprender de uno hace falta procesarlo antes, en cuatro pasos:

1. **Los subtítulos.** `yt-dlp` baja los subtítulos automáticos (aquí, unas 5.000 palabras en español), y un script los limpia de repeticiones y les deja marcas de tiempo. Es lo que más enseña: lo que dice el autor, sus prompts, sus dudas y sus cifras.
2. **Los fotogramas.** `yt-dlp` baja el video en 360p (48 MB) y `ffmpeg` saca fotogramas en los momentos que la transcripción señala como clave. Se juntan en hojas de seis para mirarlos de una vez: muestran la interfaz, los prompts en pantalla y el resultado.
3. **Lo que el video enlaza.** La descripción trae los capítulos y los repositorios. El código y las skills son la fuente más exacta, y un ayudante de lectura los estudia sin traer miles de líneas a la conversación.
4. **La síntesis.** Todo termina en un documento como este, que queda en el repositorio. Ese documento es lo aprendido: el modelo no guarda nada entre sesiones por sí mismo, y lo que dura es lo escrito.

Todo se baja a una carpeta temporal, fuera del repositorio, y se trata como datos de terceros: se resume, no se copia.

## 2. Qué hace el video

Un restaurante tenía seis fotos fijas de su local y quería una web «que se mueva con el scroll». El resultado: al bajar, el fondo es un paseo continuo por el restaurante, y el paseo se detiene en cada sección (la entrada, los menús, la barra, cómo reservar). Al subir, el paseo va al revés. **No hay 3D ni cámara real:** son videos generados con IA a partir de las fotos, y el scroll mueve el tiempo del video. Costó unos 5 dólares en generación y lo armó con unos siete prompts en Claude Code.

## 3. La técnica, paso a paso

1. **Las imágenes clave.** Una por parada, todas en 16:9. Las fotos verticales se amplían con IA («outpaint») inventando lo que no se veía. La skill scroll-world puede hacerlas desde cero, sin fotos, con un mismo «preámbulo de estilo» idéntico en todas, para que parezcan un solo mundo.
2. **Un clip por tramo.** Un video corto de 5 a 8 segundos entre cada par de imágenes, con un modelo que acepta primer y último fotograma (Kling 3.0, MiniMax H3, Seedance). **La regla que hace o rompe el resultado:** el último fotograma de un clip es exactamente el primero del siguiente, y así las costuras no se notan. Generar por tramos permite repetir solo el que salió mal.
3. **Los prompts de cámara.** Primera persona, a la altura de los ojos, «con gimbal», sin cortes, sin fundidos, sin zoom, sin gente y sin texto. Antes de generar nada, el agente pregunta los costos de cada modelo y prueba una sola transición con tres modelos para elegir el mejor.
4. **El video para la web.** H.264 sin audio, con un fotograma clave cada 4 a 8 cuadros para que el scroll hacia atrás no dé tirones, y el color marcado (BT.709) para que el video no se vea distinto de su póster. Cada clip pesa de 3 a 8 MB.
5. **El motor de scroll.** Un escenario fijo y, debajo, una pista alta. La posición del scroll se convierte en el tiempo del video y se suaviza en cada cuadro. Las secciones de texto se anclan a puntos del recorrido y aparecen cuando la cámara llega a ellas. Los clips se cargan del más cercano al más lejano; con movimiento reducido o ahorro de datos solo se ven imágenes fijas. midudev lo hizo con Astro, GSAP ScrollTrigger y Lenis; scroll-world, con JavaScript puro.
6. **El diseño.** La skill de Elaya fija reglas para que no parezca hecha por IA: copy concreto y con cifras reales, nada de «Lorem» ni de palabras de moda, una sola familia tipográfica, todos los estados de la interfaz y nada inventado.

## 4. Lo que cuesta y lo que pesa

- **Generación:** de 5 dólares (midudev, con fotos y un modelo barato) a 27-32 dólares (scroll-world, seis escenas en 1080p desde texto), más un 15 % para repetir tomas. La versión móvil nativa duplica el gasto en video.
- **Servicios:** Higgsfield (créditos), Monid (pago por clip) o la suscripción de ChatGPT para las imágenes. Ninguno de los dos enfoques ofrece un camino gratis para generar.
- **Peso:** de 26 MB (midudev) a 60-80 MB (scroll-world) en video, aunque solo se baja lo cercano. En 4G, el primer clip tarda segundos.
- **Móvil:** es lo más frágil (tirones, iOS en blanco hasta tocar, la barra de la URL, el recorte del 16:9 en vertical).
- **Lo que leen los buscadores y los modelos:** en midudev, el texto está en el HTML y se lee sin JavaScript. En scroll-world, el texto lo pone JavaScript: sin él, no hay texto.
- **Licencias:** scroll-world y Elaya son MIT; el repositorio de midudev no tiene licencia (solo se puede leer y aprender de él).

## 5. Lo que sirve para STL y lo que no

**Sirve:**
- **El patrón de paradas:** el recorrido avanza con el scroll y se detiene en cada sección.
- **La regla de las costuras:** el último cuadro de un tramo es el primero del siguiente.
- **Preguntar el costo antes de generar.**
- **El motor que sigue al scroll:** escenario fijo, pista alta y suavizado por cuadro.
- **El respeto por el movimiento reducido.**
- **Mantener el texto en HTML.**

**No sirve tal cual:**
- **STL no tiene un lugar que fotografiar:** su mundo hay que inventarlo.
- **Generarlo con IA cuesta dinero en cada iteración** y deja un video que el director no puede editar.
- **La página de STL la leen ingenieros y modelos para verificarla:** su texto debe seguir en el HTML, nunca solo dentro de un video ni puesto por JavaScript.

## 6. Dos caminos para el mundo 3D de STL

En los dos, la portada sigue siendo la animación actual (la línea del proyecto, en canvas). Al terminarla, el scroll empieza a llevar la cámara por un mundo hasta la primera sección, y así de sección en sección: el problema, los dos actores, cómo funciona, frente a Scrum y SDD, el humano en el ciclo y las ventajas.

**A. Video generado con IA** (lo del video). Se generan imágenes de un «mundo STL» (la línea como un camino, las ramas, el buzón, el director, las puertas, la meta) y clips entre ellas.
- **A favor:** el aspecto más cinematográfico.
- **En contra:** de 15 a 60 dólares por versión, y cada cambio es otra generación pagada. Pesa de 25 a 80 MB, falla más en el móvil y el director no puede corregir un detalle sin volver a generar. Necesita una cuenta en Higgsfield o Monid y la doble confirmación del gasto.

**B. 3D en tiempo real con Three.js.** El mundo se dibuja en código, en el navegador: la misma línea del proyecto, ahora en 3D, con las ramas, el buzón, el director, las puertas y la meta como lugares del recorrido. La cámara vuela por la línea según el scroll y se detiene en cada parada.
- **A favor:** gratis y liviano (unos 200 KB más). El director lo cambia en el código cuando haga falta, igual que hoy la animación, y sigue el estilo que ya tiene la portada.
- **En contra:** menos fotorrealista, y en teléfonos viejos el 3D exige más a la GPU: hace falta una versión simple para ellos y para quien pide movimiento reducido.

**Recomiendo el camino B.** El mundo de STL es una idea (una línea, sus ramas y sus puertas), no un lugar, y se cuenta mejor dibujado que fotografiado. Además, la página se corrige casi a diario, y en el camino A cada corrección se paga. Lo que aprendimos del video sirve igual: el patrón de paradas, las costuras, el motor que sigue al scroll, el movimiento reducido y el texto en HTML.

## 7. Fuentes

- El video: https://www.youtube.com/watch?v=A4QYEDQCnaQ
- scroll-world (MIT): https://github.com/oso95/scroll-world
- landing-page-design de Elaya (MIT): https://github.com/elayadesign/ai-design-skills
- El proyecto de midudev (sin licencia, solo lectura): https://github.com/midudev/mcp-higgsfield-landing
