// Arma la versión pública del STL Studio: un sitio estático, sin el resto del Studio ni datos de ningún proyecto. Abre
// con el recorrido en 3D (index.html, de docs/difusion/mundo-3d.html, con su módulo y three.js al lado), que lleva a la
// animación de la línea del proyecto (linea-del-proyecto.html). Escribe en publico/ (fuera del git del Studio: es el clon de la rama de la página del repositorio
// ARGWABOT/STL-Sacred_Time_Line, que GitHub Pages publica).
// Uso: node tools/publicar-stl.ts            (solo la arma, para revisarla)
//      node tools/publicar-stl.ts --subir    (la arma y, si cambió, la sube: commit y push al repositorio del sitio)
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mensajeDeCuenta, sesionAprobada } from '../src/director/cuentaGit.ts';
import { cuentaGitDeCarpeta, leerLocal, leerLocalYa } from '../src/director/proyectos.ts';
import { subePagina } from './firma.ts';
import { ARCHIVOS_THREE, CARPETA_THREE, paginaDelRecorrido } from './portada3d.ts';

const raiz = join(import.meta.dirname, '..');
const salida = join(raiz, 'publico');
// La imagen que se ve al compartir el enlace (docs/difusion/<nombre>.png): la portada del recorrido en 3D, quieta en el
// momento en que el director habla con el modelo y sin ningún texto encima, sacada con
// node tools/director/mirar.ts "http://localhost:5180/docs/difusion/mundo-3d.html?compartir" --anchos escritorio --alto 756 --webgl
// cada vez que la portada cambia (pd_imagen_compartir; nmw17zvo1tit, nmw2nl736tit, nmw2p52extit). Reemplaza al gráfico que
// comparaba STL con otros métodos, la última comparación que quedaba
const IMAGEN_COMPARTIR = 'recorrido-compartir';
// Lo que explica qué es STL va en el texto que acompaña al enlace, en inglés, porque el público principal será en inglés
// (nmw2p52extit): el título y la descripción, como los aprobó el titular (nmw2xzruatit)
const TITULO_ENLACE = 'What is STL? · The guardrail developers were missing';
const DESCRIPCION_ENLACE = 'STL Studio is the interface between you and the model, for any kind of project: it holds and sorts what you say, and its director puts each idea in its place on the project&#39;s line, showing you only what comes next.';
// Dónde vive la versión pública: el repositorio ARGWABOT/STL-Sacred_Time_Line (antes stl-metodologia), con GitHub
// Pages. La dirección distingue mayúsculas: tal cual el nombre del repositorio
const REPOSITORIO = 'STL-Sacred_Time_Line';
const URL_PUBLICA = `https://argwabot.github.io/${REPOSITORIO}/`;
const CUENTA = 'ARGWABOT'; // la dueña del repositorio del sitio; la que sube es la aprobada para el proyecto (cuentaGit.ts)
const subir = process.argv.includes('--subir');
// Subirla solo vale para la copia de quien desarrolla el Studio (pd_stl_semilla): sin la marca, se arma para mirarla, nada más
if (subir && !subePagina((await leerLocal(raiz)).copiaDeDesarrollo)) {
  console.error('Subir la página «Qué es STL» solo vale en la copia marcada como de desarrollo: esta no lo es. Sin --subir, la armo para mirarla.');
  process.exit(1);
}

// La fecha de este computador, no la de Londres (toISOString): la que ve quien la publica al pie de la página
const hoy = new Date().toLocaleDateString('sv-SE');
// Cómo se nombra STL (pd_nombre_stl, nota de voz nmvfauzqqtit): «STL Studio, la interfaz entre tú y el modelo», y «el
// método STL» para las reglas que aplica
const descripcion = 'STL Studio es la interfaz entre tú y el modelo, para cualquier tipo de proyecto: aplica el método STL y, entre tú y tu agente, suma dos actores nuevos: el Studio, que detiene y ordena lo que dices, y el director, que pone cada idea en su lugar de la línea y te deja ver solo lo que sigue.';
const metas = (titulo: string, url: string) => `<meta name="description" content="${descripcion}" />
  <meta property="og:title" content="${titulo}" />
  <meta property="og:description" content="${DESCRIPCION_ENLACE}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${URL_PUBLICA}${IMAGEN_COMPARTIR}.png" />
  <meta property="og:image:width" content="1440" />
  <meta property="og:image:height" content="756" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${titulo}" />
  <meta name="twitter:description" content="${DESCRIPCION_ENLACE}" />
  <meta name="twitter:image" content="${URL_PUBLICA}${IMAGEN_COMPARTIR}.png" />
  <link rel="canonical" href="${url}" />`;

// La portada: el recorrido en 3D (docs/difusion/mundo-3d.html y su módulo; decisión del titular t_decide_portada,
// nmw2c1m7ktit), con three.js resuelto por un importmap hacia su copia local (tools/portada3d.ts). La animación de la
// línea del proyecto, que el recorrido abre en grande, sigue a su lado (linea-del-proyecto.html), sin su comentario de
// versiones (es la historia del boceto, no de la página) y con su título. Abajo a la izquierda de la portada, un icono
// de información discreto: al pasar el ratón, al enfocarlo o con un clic (en un teléfono, con el dedo), muestra la
// versión, sin ocupar la escena
const RECORRIDO = 'docs/difusion/mundo-3d.html';
const MODULO_RECORRIDO = 'docs/difusion/mundo-3d.js';
const ANIMACION = 'docs/difusion/linea-del-proyecto.html';
// El video corto (pd_voz_video): el recorrido lo carga con ?video, junto a él
const MODULO_VIDEO = 'docs/difusion/video-corto.js';
const TITULO = '¿Qué es STL? · El guardrail donde más hacía falta, en el Dev';
const TITULO_LINEA = '¿Qué es STL? · La línea del proyecto';
for (const archivo of [RECORRIDO, MODULO_RECORRIDO, MODULO_VIDEO, ANIMACION]) if (!existsSync(join(raiz, archivo))) throw new Error(`Falta ${archivo}, de la portada.`);
const linea = readFileSync(join(raiz, ANIMACION), 'utf8')
  .replace(/<!--[\s\S]*?-->\s*/, '')
  .replace(/<title>[^<]*<\/title>/, `<title>${TITULO_LINEA}</title>\n${metas(TITULO_LINEA, `${URL_PUBLICA}linea-del-proyecto.html`)}`);
const portada = paginaDelRecorrido(readFileSync(join(raiz, RECORRIDO), 'utf8'), `<title>${TITULO}</title>\n${metas(TITULO_ENLACE, URL_PUBLICA)}`)
  .replace('</body>', `<style>
  #info { position: fixed; left: 12px; bottom: 12px; z-index: 9; font-size: 13px; }
  #info-boton {
    width: 28px; height: 28px; padding: 0; border-radius: 50%; cursor: pointer; display: grid; place-items: center;
    font: italic 600 15px/1 Georgia, 'Times New Roman', serif; color: #f5d27a; background: rgba(12, 15, 26, .85);
    border: 1px solid rgba(245, 210, 122, .45); opacity: .7; transition: opacity .2s, box-shadow .2s;
  }
  #info:hover #info-boton, #info.abierta #info-boton, #info-boton:focus-visible { opacity: 1; box-shadow: 0 0 12px rgba(245, 210, 122, .35); }
  #info-boton:focus-visible { outline: 2px solid #fff6d8; outline-offset: 2px; }
  /* La caja sale encima del icono; el relleno de abajo es el puente para que el ratón llegue sin que se cierre */
  #info-caja {
    position: absolute; left: 0; bottom: 100%; padding-bottom: 8px; visibility: hidden; opacity: 0;
    transform: translateY(4px); transition: opacity .18s, transform .18s, visibility 0s .18s;
  }
  #info:hover #info-caja, #info:focus-within #info-caja, #info.abierta #info-caja { visibility: visible; opacity: 1; transform: none; transition: opacity .18s, transform .18s; }
  #info-caja div {
    display: grid; gap: 6px; padding: 10px 14px; border-radius: 10px; white-space: nowrap; color: #b9b4a6;
    background: rgba(12, 15, 26, .96); box-shadow: inset 0 0 0 1px rgba(245, 210, 122, .3), 0 8px 24px rgba(0, 0, 0, .5);
  }
  #info-caja a { color: #f5d27a; text-decoration: none; font-weight: 600; }
  #info-caja a:hover, #info-caja a:focus-visible { text-decoration: underline; }
  @media (prefers-reduced-motion: reduce) { #info-caja { transition: none; } }
</style>
<div id="info">
  <div id="info-caja" role="tooltip"><div><span>Versión del ${hoy}</span></div></div>
  <button type="button" id="info-boton" aria-label="Más información: la versión" aria-expanded="false" aria-describedby="info-caja">i</button>
</div>
<script>
  (() => {
    const info = document.getElementById('info'), boton = document.getElementById('info-boton');
    const poner = (abierta) => { info.classList.toggle('abierta', abierta); boton.setAttribute('aria-expanded', String(abierta)); };
    boton.addEventListener('click', (e) => { e.stopPropagation(); poner(!info.classList.contains('abierta')); });
    addEventListener('click', (e) => { if (!info.contains(e.target)) poner(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && info.classList.contains('abierta')) { poner(false); boton.focus(); } });
  })();
</script>
</body>`);

// Sin borrar la carpeta: si ya tiene el git del sitio publicado, se conserva y solo se reemplazan los archivos
mkdirSync(salida, { recursive: true });
writeFileSync(join(salida, 'index.html'), portada);
copyFileSync(join(raiz, MODULO_RECORRIDO), join(salida, 'mundo-3d.js'));
copyFileSync(join(raiz, MODULO_VIDEO), join(salida, 'video-corto.js'));
writeFileSync(join(salida, 'linea-del-proyecto.html'), linea);
// three.js, la copia que usa el recorrido, con su licencia: se vuelve a copiar entera, para que no quede una versión vieja
rmSync(join(salida, CARPETA_THREE), { recursive: true, force: true });
for (const archivo of ARCHIVOS_THREE) {
  const de = join(raiz, 'node_modules', 'three', archivo);
  if (!existsSync(de)) throw new Error(`Falta ${de}: corre npm install en el Studio y vuelve a correr esto.`);
  mkdirSync(join(salida, CARPETA_THREE, archivo, '..'), { recursive: true });
  copyFileSync(de, join(salida, CARPETA_THREE, archivo));
}
// Lo que ya no se publica sale del sitio: la página de la metodología (metodologia.html), los estilos que solo ella
// usaba y el Studio de demostración (demo/, quitado con el «Confirmo» del titular del 26 de octubre de 2026: su
// recorrido guiado sigue en la historia de git, como punto de partida de la ayuda guiada). Si la carpeta ya los tiene
// de una subida anterior, se borran, y con --subir el commit los quita del sitio
for (const archivo of ['metodologia.html', 'estilos.css', 'director.css', 'demo']) rmSync(join(salida, archivo), { recursive: true, force: true });
copyFileSync(join(raiz, `docs/difusion/${IMAGEN_COMPARTIR}.png`), join(salida, `${IMAGEN_COMPARTIR}.png`));
// La voz del narrador de la portada (tools/vozLinea.ts; nota de voz nmw1o1pf7tit): cada clip junto a la página, donde
// ella lo busca (voz/linea/<momento>-<n>.mp3). Se vuelve a copiar entera, para que no quede un clip que ya no se usa
const VOZ_PORTADA = 'docs/difusion/voz/linea';
rmSync(join(salida, 'voz'), { recursive: true, force: true });
mkdirSync(join(salida, 'voz', 'linea'), { recursive: true });
for (const archivo of readdirSync(join(raiz, VOZ_PORTADA))) {
  if (archivo.endsWith('.mp3')) copyFileSync(join(raiz, VOZ_PORTADA, archivo), join(salida, 'voz', 'linea', archivo));
}
// Y la de las animaciones de los problemas del recorrido (tools/vozRecorrido.ts), donde mundo-3d.js la busca (voz/es/<clave>.mp3)
const VOZ_RECORRIDO = 'docs/difusion/voz/es';
mkdirSync(join(salida, 'voz', 'es'), { recursive: true });
for (const archivo of readdirSync(join(raiz, VOZ_RECORRIDO))) {
  if (archivo.endsWith('.mp3')) copyFileSync(join(raiz, VOZ_RECORRIDO, archivo), join(salida, 'voz', 'es', archivo));
}
// Y la voz en inglés de «Getting started» (tools/vozRecorrido.ts --en; nmw6xp1d1tit), donde la busca (voz/en/<clave>.mp3)
const VOZ_RECORRIDO_EN = 'docs/difusion/voz/en';
mkdirSync(join(salida, 'voz', 'en'), { recursive: true });
for (const archivo of existsSync(join(raiz, VOZ_RECORRIDO_EN)) ? readdirSync(join(raiz, VOZ_RECORRIDO_EN)) : []) {
  if (archivo.endsWith('.mp3')) copyFileSync(join(raiz, VOZ_RECORRIDO_EN, archivo), join(salida, 'voz', 'en', archivo));
}
// Y la voz en inglés de «La línea del proyecto» (tools/vozLinea.ts --en; nmw724ggptit), donde la busca (voz/linea-en/<clave>.mp3)
const VOZ_PORTADA_EN = 'docs/difusion/voz/linea-en';
mkdirSync(join(salida, 'voz', 'linea-en'), { recursive: true });
for (const archivo of existsSync(join(raiz, VOZ_PORTADA_EN)) ? readdirSync(join(raiz, VOZ_PORTADA_EN)) : []) {
  if (archivo.endsWith('.mp3')) copyFileSync(join(raiz, VOZ_PORTADA_EN, archivo), join(salida, 'voz', 'linea-en', archivo));
}
writeFileSync(join(salida, '.nojekyll'), '');
writeFileSync(join(salida, 'README.md'), `# Qué es STL · STL Studio, la interfaz entre tú y el modelo (Sacred Time Line)

**Míralo aquí:** ${URL_PUBLICA}

Versión pública del STL Studio. La publicamos para que ingenieros y modelos de IA revisen si lo que dice es cierto y si el
método STL cumple lo que promete.

- \`index.html\` y \`mundo-3d.js\`: la portada, un recorrido en 3D por la línea del tiempo de un proyecto.
- \`linea-del-proyecto.html\`: la animación que el recorrido abre en grande, el mismo proyecto sin STL y con STL.
- \`${CARPETA_THREE}/\`: la copia de three.js que usa el recorrido, con su licencia.
- \`voz/linea/\`, \`voz/linea-en/\`, \`voz/es/\` y \`voz/en/\`: la voz del narrador, un clip por línea del guion o por rótulo.

Se genera desde el STL Studio (\`node tools/publicar-stl.ts\`). No incluye el código del Studio ni datos de ningún proyecto.
Versión del ${hoy}.
`);
console.log(`Listo: ${salida}\\index.html (el recorrido en 3D, con la animación de la línea a su lado, versión del ${hoy}).`);

if (subir) {
  const git = (...a: string[]) => execFileSync('git', a, { cwd: salida, encoding: 'utf8' }).trim();
  if (!existsSync(join(salida, '.git'))) throw new Error(`publico/ no tiene el git del sitio: clona https://github.com/${CUENTA}/${REPOSITORIO} en publico/ y vuelve a correr esto.`);
  // Solo se sube si la página cambió de verdad: la fecha de la versión, sola, no cuenta
  const nuevos = git('ls-files', '--others', '--exclude-standard');
  const cambio = spawnSync('git', ['diff', '--quiet', '-I', 'Versi.n del [0-9-]+', '--', '.'], { cwd: salida }).status !== 0;
  if (!nuevos && !cambio) {
    git('checkout', '--', '.');
    console.log('La página pública ya estaba al día: no se sube nada.');
  } else {
    // Con la sesión de la cuenta aprobada para este proyecto, según GitHub (cuentaGit.ts): sin ella, no se sube
    const sesion = sesionAprobada(cuentaGitDeCarpeta(leerLocalYa(raiz), raiz));
    if (!sesion.ok) {
      git('checkout', '--', '.');
      console.error(`No subí la página. ${mensajeDeCuenta(sesion.resultado)}`);
      process.exit(1);
    }
    const token = sesion.token;
    const conToken = ['-c', 'credential.helper=', '-c', 'credential.helper=!f() { echo username=x-access-token; echo "password=$GH_TOKEN"; }; f'];
    const env = { ...process.env, GH_TOKEN: token };
    // El Studio y la página comparten repositorio: el código en main y la página en gh-pages, que es lo que publica
    // GitHub Pages. La página nunca va a main, donde pisaría el Studio (propuesta aceptada «Lo que se sube, limpio y
    // firmado desde el commit»): sin gh-pages se detiene antes del commit, para que la próxima vez sí se suba
    const conPaginas = execFileSync('git', [...conToken, 'ls-remote', '--heads', 'origin', 'gh-pages'], { cwd: salida, env, encoding: 'utf8' }).trim() !== '';
    if (!conPaginas) throw new Error(`El repositorio ${CUENTA}/${REPOSITORIO} no tiene la rama gh-pages, y la página nunca se sube a main, que es la del Studio. Créala en GitHub (en «Branches», «New branch», con el nombre gh-pages), elige en «Settings › Pages» que se publique desde gh-pages y vuelve a correr esto. No subí nada.`);
    git('add', '-A');
    git('commit', '-q', '-m', `Qué es STL: versión del ${hoy}`);
    execFileSync('git', [...conToken, 'push', 'origin', 'HEAD:gh-pages'], { cwd: salida, env, stdio: 'inherit' });
    console.log(`Subida: ${URL_PUBLICA} (GitHub Pages tarda uno o dos minutos en mostrarla).`);
  }
} else {
  console.log('Ábrela en el navegador para revisarla; con --subir se publica.');
}
