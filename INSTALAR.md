# Inicializar STL Studio: instrucciones para tu agente

Estas instrucciones son para el agente de IA de quien instala STL Studio (Claude Code, Codex, Cursor u otro). Si te
piden «inicializa STL Studio», o en esta carpeta falta `node_modules`, sigue estos pasos en orden.

**Tú llevas la instalación de principio a fin.** El usuario no tiene que leer este archivo ni copiar comandos: tú
corres cada comprobación y cada instalación, le dices en una o dos frases qué hiciste y qué sigue, y lo guías hasta
dejar el Studio encendido y abierto en su navegador. Lo único que le pides es lo que solo él puede dar: su «sí» antes
de instalar cada cosa, su identidad de git y lo que pida su sistema (la contraseña de administrador, iniciar sesión
en su cuenta). **Pide permiso antes de instalar cada cosa**, aunque tu modo de trabajo no te lo exija: la
confirmación va en el chat, con un «sí» claro del usuario.

## 1. El diagnóstico, sin instalar nada

1. Comprueba si hay Node.js: `node --version`.
2. Si hay Node 24 o más nuevo, corre `node tools/iniciar.ts --diagnostico`. Solo mira: no instala ni cambia nada.
3. Si no hay Node, comprueba a mano lo demás: `git --version`, `git config user.name`, `git config user.email`, el
   sistema operativo y la arquitectura.

## 2. Lo que falta, en una tabla

Muéstrale al usuario qué está bien, qué falta y qué es opcional. Por cada cosa que falte di:
- para qué sirve en STL Studio;
- el comando exacto, de la fuente oficial;
- cuánto pesa, más o menos, y si pide permisos de administrador.

| Qué | Para qué | Windows | macOS | Linux |
| --- | --- | --- | --- | --- |
| Node.js 24 o más | Corre el Studio | `winget install OpenJS.NodeJS.LTS` | `brew install node` | el gestor de la distribución, o https://nodejs.org |
| git | Cada decisión es un commit; la memoria de cada proyecto vive en su repositorio | `winget install Git.Git` | `brew install git` (o las herramientas de Xcode) | `sudo apt install git` (o el gestor de la distribución) |
| La identidad de git | El Studio firma cada decisión con ella | `git config --global user.name "…"` y `git config --global user.email "…"` | igual | igual |
| Las dependencias | Lo que usa el Studio | `npm install`, en esta carpeta | igual | igual |
| Claude Code (opcional, recomendado) | La sesión del director | https://claude.com/claude-code | igual | igual |
| Notas de voz (opcional) | Transcribir en local lo que se graba | ver «Notas de voz» en README.md | ver README.md | ver README.md |

La identidad de git **pídesela al usuario**: nunca la inventes ni uses la de otra persona.

## 3. Instalar, una cosa a la vez

- Solo con un «sí» del usuario por cada cosa. Lo opcional se puede omitir: el Studio funciona sin voz.
- Usa los gestores oficiales (winget, Homebrew, el de la distribución) o la página oficial. Nunca corras `sudo` ni
  `curl … | sh` sin mostrar antes el comando completo.
- Después de cada paso, comprueba la versión. En Windows, si cambió el PATH, avisa que hay que reabrir la terminal (o
  el agente).
- Si algo falla, di el error tal cual y propón el siguiente intento. No sigas como si hubiera funcionado.

## 4. La revisión al instante (con Claude Code)

Comprueba si la CLI de Claude Code está y tiene su sesión iniciada (si `claude` no está en la consola, busca el que
trae la app de escritorio: en Windows, `%APPDATA%\Claude\claude-code\<versión>\…\claude.exe`). Si no la
tiene, pídele al usuario que la inicie **una vez** (`claude auth login`, con la cuenta con la que quiera que se hagan
las revisiones): así «Pedir revisión» llama al director al instante, sin pantalla, y no se gasta nada mientras no
haya una revisión pedida. Es opcional: sin ella, el Studio funciona y la revisión se pide en la sesión del director.

## 5. Encender el Studio y llevar al usuario a él

1. Corre otra vez `node tools/iniciar.ts --diagnostico` y muestra que todo quedó bien.
2. **Enciende el Studio tú**: `npm run encender`. Lo deja corriendo aparte, así que sigue encendido aunque se cierre
   tu sesión o la terminal, y si su servidor se cae se vuelve a levantar solo. Abre el navegador en
   http://localhost:5180/. No uses `npm run estudio` en tu terminal: muere con ella.
3. Dile al usuario, corto, lo que sigue:
   - el Studio está en **http://localhost:5180/** (guárdala en favoritos): de aquí en adelante todo pasa ahí;
   - lo primero, **Entregar proyectos**: elige la carpeta de un proyecto y listo;
   - si algún día el Studio no abre (por ejemplo, después de reiniciar el computador), basta `npm run encender` en
     esta carpeta, o pedírselo a su agente; en Windows, sin terminal, doble clic en `Abrir STL Studio.cmd` (puede
     mandarlo al escritorio: clic derecho › Enviar a › Escritorio);
   - la sesión del director es Claude Code abierto **en esta carpeta**: ahí se escribe «revisa estudio» cuando se
     quiera. Sin la CLI con sesión (o con Codex), se deja corriendo `/loop 5m /vigila` en esa sesión para que tome
     sola las revisiones pedidas.

## Lo que nunca se hace al inicializar

- **STL Studio es un proyecto aparte.** Solo guarda su código y `estudio.local.json` (lo de este computador). No toques
  otros proyectos al inicializar.
- La memoria de cada proyecto vive en **su propio repositorio** (la rama `stl`, abierta en su carpeta `.stl/`), y solo
  cuando el usuario lo entrega en el Studio.
- Desde el Studio, el usuario también puede pedir trabajo que modifique el repositorio de un proyecto: eso lo ejecuta
  el director solo con su aprobación en el Studio y con las normas de ese proyecto (ver CLAUDE.md).
