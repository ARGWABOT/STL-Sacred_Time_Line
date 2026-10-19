// Arma la versión pública de la página «Qué es STL»: un sitio estático, sin el resto del Studio ni datos de ningún
// proyecto, para que ingenieros y modelos de IA la lean y la verifiquen. El HTML sale ya armado (se lee sin ejecutar
// JavaScript), con sus estilos; sus gráficos van dentro de la página. Escribe en publico/ (fuera del git del Studio: es
// el clon del repositorio del sitio, ARGWABOT/STL-Sacred_Time_Line, que GitHub Pages publica).
// Uso: node tools/publicar-stl.ts            (solo la arma, para revisarla)
//      node tools/publicar-stl.ts --subir    (la arma y, si cambió, la sube: commit y push al repositorio del sitio)
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { build, createServer } from 'vite';

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

// Vite resuelve los import de stl.ts (TypeScript) sin levantar el Studio ni su servidor
const vite = await createServer({ root: raiz, configFile: false, appType: 'custom', logLevel: 'error', server: { middlewareMode: true, hmr: false } });
let pagina: string;
let recorrido = ''; // el código que acompaña el cambio de parada, incrustado en la página (sin módulos)
try {
  const { paginaSTL, activarRecorrido } = (await vite.ssrLoadModule('/estudio/src/stl.ts')) as { paginaSTL: (o: { conProyectos: boolean }) => string; activarRecorrido: () => void };
  pagina = paginaSTL({ conProyectos: false });
  recorrido = `(${activarRecorrido.toString()})();`;
} finally {
  await vite.close();
}

const hoy = new Date().toISOString().slice(0, 10);
const descripcion = 'STL es una metodología para usar mejor los modelos de IA, en cualquier tipo de proyecto. Entre tú y tu agente suma dos actores nuevos: el Studio, que detiene y ordena lo que dices, y el director, que pone cada idea en su lugar de la línea y te deja ver solo lo que sigue.';
const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Qué es STL · La metodología STL (Sacred Time Line)</title>
  <meta name="description" content="${descripcion}" />
  <meta property="og:title" content="Qué es STL · La metodología STL (Sacred Time Line)" />
  <meta property="og:description" content="${descripcion}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${URL_PUBLICA}" />
  <meta property="og:image" content="${URL_PUBLICA}${IMAGEN_COMPARTIR}.png" />
  <link rel="canonical" href="${URL_PUBLICA}" />
  <link rel="stylesheet" href="estilos.css" />
  <link rel="stylesheet" href="director.css" />
  <style>
    .publica { max-width: var(--contenido); margin: 0 auto; padding: 24px clamp(16px, 4vw, 40px) 48px; }
    .pie-publico { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--borde); font-size: 13.5px; color: var(--tenue); max-width: var(--lectura); }
  </style>
</head>
<body>
  <main class="publica">
${pagina}
    <footer class="pie-publico">
      <p>Versión pública de la página «Qué es STL» del STL Studio, publicada para que ingenieros y modelos de IA revisen si lo que dice es cierto y si la metodología cumple lo que promete. Versión del ${hoy}.</p>
    </footer>
  </main>
  <script>${recorrido}</script>
</body>
</html>
`;

// Sin borrar la carpeta: si ya tiene el git del sitio publicado, se conserva y solo se reemplazan los archivos
mkdirSync(salida, { recursive: true });
writeFileSync(join(salida, 'index.html'), html);
copyFileSync(join(raiz, 'estudio/src/estilos.css'), join(salida, 'estilos.css'));
copyFileSync(join(raiz, 'estudio/src/director.css'), join(salida, 'director.css'));
copyFileSync(join(raiz, `docs/difusion/${IMAGEN_COMPARTIR}.png`), join(salida, `${IMAGEN_COMPARTIR}.png`));
writeFileSync(join(salida, '.nojekyll'), '');
// El Studio de demostración (estudio/demo/): la interfaz real con un proyecto de ejemplo y su recorrido guiado, en demo/
await build({
  root: raiz, base: './', mode: 'demo', configFile: false, logLevel: 'warn',
  build: { outDir: join(salida, 'demo'), emptyOutDir: true, rollupOptions: { input: join(raiz, 'index.html') } },
});
writeFileSync(join(salida, 'README.md'), `# Qué es STL · la metodología STL (Sacred Time Line)

**Léela aquí:** ${URL_PUBLICA}

Versión pública de la página «Qué es STL» del STL Studio. La publicamos para que ingenieros y modelos de IA revisen si lo
que dice es cierto y si la metodología cumple lo que promete.

- \`index.html\`: la página completa, un recorrido por paradas con sus gráficos dentro. Es estática: se lee entera sin
  ejecutar JavaScript.
- \`demo/\`: el Studio de demostración, con un proyecto de ejemplo y un recorrido guiado. Nada se guarda.

Se genera desde el STL Studio (\`node tools/publicar-stl.ts\`). No incluye el código del Studio ni datos de ningún proyecto.
Versión del ${hoy}.
`);
console.log(`Listo: ${salida}\\index.html (versión del ${hoy}).`);

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
    git('add', '-A');
    git('commit', '-q', '-m', `Qué es STL: versión del ${hoy}`);
    const token = EN_GH.map((u) => spawnSync('gh', ['auth', 'token', '--user', u], { encoding: 'utf8' })).find((r) => r.status === 0)?.stdout.trim();
    if (!token) throw new Error(`gh no tiene la sesión de ${CUENTA}: corre gh auth login con esa cuenta y vuelve a correr esto.`);
    execFileSync('git', ['-c', 'credential.helper=', '-c', 'credential.helper=!f() { echo username=x-access-token; echo "password=$GH_TOKEN"; }; f', 'push', 'origin', 'main'],
      { cwd: salida, env: { ...process.env, GH_TOKEN: token }, stdio: 'inherit' });
    console.log(`Subida: ${URL_PUBLICA} (GitHub Pages tarda uno o dos minutos en mostrarla).`);
  }
} else {
  console.log('Ábrela en el navegador para revisarla; con --subir se publica.');
}
