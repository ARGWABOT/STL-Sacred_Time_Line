// Arma la versión pública del STL Studio: un sitio estático, sin el resto del Studio ni datos de ningún proyecto. Abre
// con la animación de la línea del proyecto (index.html, docs/difusion/linea-del-proyecto.html: un solo archivo, sin
// librerías). Escribe en publico/ (fuera del git del Studio: es el clon de la rama de la página del repositorio
// ARGWABOT/STL-Sacred_Time_Line, que GitHub Pages publica).
// Uso: node tools/publicar-stl.ts            (solo la arma, para revisarla)
//      node tools/publicar-stl.ts --subir    (la arma y, si cambió, la sube: commit y push al repositorio del sitio)
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const raiz = join(import.meta.dirname, '..');
const salida = join(raiz, 'publico');
// La imagen que se ve al compartir el enlace (docs/difusion/<nombre>.png); los gráficos de la página van dentro de ella
const IMAGEN_COMPARTIR = 'grafico-comparativo';
// Dónde vive la versión pública: el repositorio ARGWABOT/STL-Sacred_Time_Line (antes stl-metodologia), con GitHub
// Pages. La dirección distingue mayúsculas: tal cual el nombre del repositorio
const REPOSITORIO = 'STL-Sacred_Time_Line';
const URL_PUBLICA = `https://argwabot.github.io/${REPOSITORIO}/`;
const CUENTA = 'ARGWABOT'; // la cuenta de GitHub con permiso para subir al repositorio del sitio
// Cómo la conoce gh en este computador: ARGWABOT, o incocrea, su nombre anterior, hasta que se vuelva a iniciar sesión
const EN_GH = [CUENTA, 'incocrea'];
const subir = process.argv.includes('--subir');

// La fecha de este computador, no la de Londres (toISOString): la que ve quien la publica al pie de la página
const hoy = new Date().toLocaleDateString('sv-SE');
const descripcion = 'STL es una metodología para usar mejor los modelos de IA, en cualquier tipo de proyecto. Entre tú y tu agente suma dos actores nuevos: el Studio, que detiene y ordena lo que dices, y el director, que pone cada idea en su lugar de la línea y te deja ver solo lo que sigue.';
const metas = (titulo: string, url: string) => `<meta name="description" content="${descripcion}" />
  <meta property="og:title" content="${titulo}" />
  <meta property="og:description" content="${descripcion}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${URL_PUBLICA}${IMAGEN_COMPARTIR}.png" />
  <link rel="canonical" href="${url}" />`;

// La portada: la animación, sin su comentario de versiones (es la historia del boceto, no de la página), con su título
// y, abajo a la izquierda, un icono de información discreto: al pasar el ratón, al enfocarlo o con un clic (en un
// teléfono, con el dedo), muestra la versión, sin ocupar la escena
const ANIMACION = 'docs/difusion/linea-del-proyecto.html';
const TITULO = '¿Qué es STL? · El guardrail donde más hacía falta, en el Dev';
if (!existsSync(join(raiz, ANIMACION))) throw new Error(`Falta la animación de la portada: ${ANIMACION}.`);
const portada = readFileSync(join(raiz, ANIMACION), 'utf8')
  .replace(/<!--[\s\S]*?-->\s*/, '')
  .replace(/<title>[^<]*<\/title>/, `<title>${TITULO}</title>\n${metas(TITULO, URL_PUBLICA)}`)
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
// Lo que ya no se publica sale del sitio: la página de la metodología (metodologia.html), los estilos que solo ella
// usaba y el Studio de demostración (demo/, quitado con el «Confirmo» del titular del 26 de octubre de 2026: su
// recorrido guiado sigue en la historia de git, como punto de partida de la ayuda guiada). Si la carpeta ya los tiene
// de una subida anterior, se borran, y con --subir el commit los quita del sitio
for (const archivo of ['metodologia.html', 'estilos.css', 'director.css', 'demo']) rmSync(join(salida, archivo), { recursive: true, force: true });
copyFileSync(join(raiz, `docs/difusion/${IMAGEN_COMPARTIR}.png`), join(salida, `${IMAGEN_COMPARTIR}.png`));
writeFileSync(join(salida, '.nojekyll'), '');
writeFileSync(join(salida, 'README.md'), `# Qué es STL · la metodología STL (Sacred Time Line)

**Míralo aquí:** ${URL_PUBLICA}

Versión pública del STL Studio. La publicamos para que ingenieros y modelos de IA revisen si lo que dice es cierto y si la
metodología cumple lo que promete.

- \`index.html\`: la portada, una animación que muestra el mismo proyecto sin STL y con STL. Un solo archivo, sin
  librerías.

Se genera desde el STL Studio (\`node tools/publicar-stl.ts\`). No incluye el código del Studio ni datos de ningún proyecto.
Versión del ${hoy}.
`);
console.log(`Listo: ${salida}\\index.html (la animación, versión del ${hoy}).`);

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
    const token = EN_GH.map((u) => spawnSync('gh', ['auth', 'token', '--user', u], { encoding: 'utf8' })).find((r) => r.status === 0)?.stdout.trim();
    if (!token) throw new Error(`gh no tiene la sesión de ${CUENTA}: corre gh auth login con esa cuenta y vuelve a correr esto.`);
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
