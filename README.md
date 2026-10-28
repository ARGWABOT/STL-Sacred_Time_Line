# STL Studio

**La interfaz de la Metodología STL (Sacred Time Line) para dirigir proyectos largos con IA.**

Un director asistente de IA diagnostica tu proyecto, acuerda contigo a dónde quieres llegar, traza la ruta por fases y te da siempre **una sola misión siguiente**. Tú comentas donde estás leyendo, corriges antes de enviar y decides; él lo revisa todo junto cuando se lo pides. Todo pasa en tu computador, y **la memoria de cada proyecto vive en su propio repositorio**, no en el Studio.

> *In English:* STL Studio is a local web app that sits between you and an AI coding agent (Claude Code). The agent acts as a project director: it diagnoses your repository, agrees on a measurable goal with you, plans the route in gated phases and always gives you one next mission. Your comments wait in an editable inbox until you ask for a review, so the model only receives what you meant. The interface is in Spanish.

## Por qué

Dirigir un proyecto de semanas por chat tiene seis problemas: lo que envías se ejecuta al instante, corregir contamina el contexto, cada mensaje cuesta la conversación entera, no se puede comentar un párrafo, lo revisado vuelve a reescribirse y nadie decide qué sigue. STL los resuelve con un método y una interfaz:

| En el chat | En STL Studio |
| --- | --- |
| Envías y ya se está ejecutando | Tus comentarios esperan en el **Buzón**: los corriges o los borras antes de la revisión |
| Explicas a qué parte te refieres | **Comentas el párrafo, el paso o la decisión exacta** |
| Diez ideas, diez turnos | **Una revisión agrupada**: el director responde cada observación y dice qué hizo con ella |
| El modelo reescribe lo aprobado | **Siempre hacia adelante**: lo revisado queda sellado; lo que cambia llega en un documento nuevo |
| Trabajas en todo a la vez | **Una ruta con puertas** y una misión a la vez, hacia la meta que fijaste |

**«Qué es STL Studio»** (al pie de la barra lateral) abre la animación pública que lo explica en dos minutos: el problema que resuelve y su novedad (tú te quedas en el paso que sigue, y todo lo que se te ocurre entra al proyecto sin sacarte del cauce). El método completo está en [docs/metodo/metodologia.md](docs/metodo/metodologia.md).

## Qué trae

- **Entregar es elegir la carpeta**: el director lo diagnostica y te propone metas (también varios a la vez, los que encuentre al escanear tu equipo, o uno nuevo).
- **Hoy**: lo último que se completó, lo que sigue y tu misión de ahora, completa, paso a paso, cada paso con su botón al lugar exacto.
- **La ruta**: fases con sus puertas, criterios al 100 % y frentes en foco, de apoyo o en espera.
- **Documentos comentables** por partes, con decisiones que se responden una a una, escritas o grabadas.
- **Buzón y preguntas**: los comentarios y los pedidos en el Buzón; las preguntas aparte, como conversaciones que puedes seguir.
- **Pedir revisión**: un botón, y el Studio llama al director al instante. Mientras no pidas nada, ningún modelo corre.
- **Lo que gasta, en tu plan**: en «Modelo y consumo», cada revisión dice qué parte de tu semana de Claude gastó y su equivalente aproximado con el precio de tu plan, en vez del precio de API; si tu límite de cada cinco horas va casi lleno, te lo dice antes de pedirla.
- **Varios proyectos**, uno activo a la vez: al cambiar, el director te dice dónde quedaron.
- **Voz**: graba tus notas; se transcriben en tu computador, sin servicios externos.

## Cómo funciona

```
 Tú ──▶ STL Studio (http://localhost:5180) ──▶ memoria del proyecto ◀── sesión del director (Claude Code)
        comentas, entregas, decides             en SU repositorio:          «Pedir revisión» o «revisa estudio»
                                                rama stl, carpeta .stl/
```

El Studio no guarda datos de tus proyectos: la memoria de cada uno (su plan, su buzón, sus decisiones, los documentos del director) vive en **su propio repositorio**, en una rama aparte (`stl`) que el Studio abre en la carpeta `.stl/`. No se mezcla con tu código ni hace correr tu integración continua, y sube a la nube del proyecto solo si tú lo pides. El director es una sesión de Claude Code abierta en la carpeta del Studio: cuando pides la revisión (o le escribes **«revisa estudio»**), lee todo lo pendiente, responde, ajusta la ruta y deja tu misión siguiente. Sus reglas están en [CLAUDE.md](CLAUDE.md) (y en [AGENTS.md](AGENTS.md) para otros agentes). El diseño de la interfaz y sus razones: [docs/metodo/diseno-studio.md](docs/metodo/diseno-studio.md).

## Requisitos

- **Node.js 24** o más nuevo y **git**, con tu identidad configurada (`git config user.name` y `git config user.email`).
- Tu correo de git es tu lugar en el equipo de cada proyecto: para cambiarlo después no basta `git config`, corre `node tools/cambiar-correo.ts <correo nuevo>` en la carpeta del Studio, que lo cambia en git y en el equipo de cada proyecto a la vez.
- **Claude Code**, para la sesión del director.
- Opcional, para las notas de voz: Python con faster-whisper (hoy, en Windows, dentro de WSL2). Ver «Notas de voz».

## Empezar

La forma más corta: baja el Studio, abre su carpeta con tu agente (Claude Code, Codex o Cursor) y pídele **«inicializa STL Studio»**. Tu agente sigue [INSTALAR.md](INSTALAR.md) de principio a fin: revisa tu computador, te dice qué falta, te pide permiso antes de instalar cada cosa, enciende el Studio y lo abre en tu navegador. Tú solo dices «sí» y le das tu identidad de git.

A mano:

```bash
git clone <la dirección de este repositorio> stl-studio
cd stl-studio
npm run iniciar
npm run encender
```

`npm run iniciar` comprueba Node, git y tu identidad, e instala las dependencias; `npm run encender` enciende el Studio aparte y lo abre en **http://localhost:5180/**. Queda corriendo aunque cierres la terminal o el agente, y si su servidor se cae, se levanta solo. Después de reiniciar el computador, vuelve a correr `npm run encender` (si ya está encendido, solo lo abre). En Windows, sin terminal: doble clic en **`Abrir STL Studio.cmd`**, en la carpeta del Studio, hace lo mismo (para tenerlo a mano: clic derecho › Enviar a › Escritorio).

Después:

1. Inicia sesión una vez en la CLI de Claude Code (`claude auth login`): así «Pedir revisión» llama al director al instante, sin pantalla. La sesión del director, para lo demás, es Claude Code abierto **en la carpeta del Studio** (sin la CLI, o con Codex, deja corriendo ahí `/loop 5m /vigila`). Trabaja un director a la vez en cada proyecto: si la sesión del director (u otra copia del Studio) está revisando uno, la revisión que pidas espera su turno, lo dice en la cabecera y empieza sola cuando esa cierre.
2. En el selector de proyecto (arriba de la barra lateral), oprime **«Entregar proyectos»** y elige su carpeta. El director lo diagnostica y te propone metas.
3. Lee el diagnóstico, coméntalo parte por parte y **fija tu meta** en Proyecto.
4. **Pedir revisión**: el director traza la ruta y te da tu primera misión. Desde ahí, el ciclo: misión → marcar sus pasos (el último la entrega) → pedir revisión.

## Comentarios y preguntas, sin salir de lo que haces

Junto a la cara del director (abajo a la derecha) hay dos atajos para decirle algo (y, en un documento o en tu misión de ahora, el del modo enfoque; la revisión se pide arriba, en la cabecera):

- **Comentario**: una idea o algo que quieres que tenga en cuenta. No entra de golpe al proyecto: el director decide cómo y dónde administrarlo (una misión, una propuesta, un documento o la ruta) y te responde en el Buzón.
- **Preguntas**: las anotas cuando se te ocurren, escritas o grabadas (grabada, la oyes y le añades otro fragmento si se te olvidó algo, o la agregas de una vez con «Enviar ya»). Se acumulan como los comentarios y el director las responde en su próxima revisión. En **Preguntas** cada una es una conversación plegada: la abres, lees la respuesta y, si quieres, la sigues.

Mientras grabas, el diálogo se hace a un lado: puedes leer y moverte por el Studio mientras hablas.

## Notas de voz

Se graban en el Studio y se transcriben **en cuanto terminas de grabar**, en tu computador, con faster-whisper: nada sale de tu equipo. Mientras tanto ves «Transcribiendo…»; cuando está lista, lo que se entendió aparece donde grabaste y en el Buzón, para leerlo sin escuchar el audio, y lo puedes corregir si entendió mal. Con el texto escrito, el audio se borra: nunca entra a git ni sale de tu computador (si la transcripción falla, se queda hasta que salga bien). En Windows, dentro de WSL2 con Ubuntu:

```bash
wsl -d Ubuntu -- bash tools/entorno/instalar_transcripcion.sh
```

## Equipos en varios computadores

Cada persona clona el Studio, configura su identidad de git y entrega su propio clon de cada proyecto: si el proyecto ya tiene su rama `stl` (en su repositorio o en GitHub), el Studio la abre y sigue donde quedó. El titular de cada proyecto suma a cada persona en Proyecto › El equipo, con su correo de git. Con un remoto `origin` y «Subir solo a GitHub lo que decide cada persona» activo en Proyecto, cada decisión sube sola a la rama `stl` del proyecto, sin forzar nada, y lo de los demás se trae cada 30 segundos.

## Comandos

| Comando | Para qué |
| --- | --- |
| `npm run encender` | Enciende el Studio aparte (se levanta solo si se cae) y lo abre; `-- --estado` dice si está encendido y `-- --apagar` lo apaga |
| `npm run estudio` | Abre el Studio en esta terminal (muere con ella; útil para desarrollar el Studio) |
| `npm run bandeja` | La revisión del director (la corre la sesión del director) |
| `npm run diagnosticar` | La radiografía del repositorio del proyecto activo |
| `npm run estado -- <frente o rutas>` | Antes de una tarea en un proyecto: ¿está en foco o en espera? |
| `node tools/iniciar.ts --diagnostico` | Qué falta en este computador, sin instalar nada |
| `… --proyecto <id>` | Cualquiera de las herramientas, sobre otro proyecto que el activo |
| `npm test` y `npm run typecheck` | Pruebas y tipos del Studio |

## Estructura

| Carpeta | Qué hay |
| --- | --- |
| `estudio/src/` | La interfaz: una sola página |
| `estudio/servidor/` | El servidor local (un plugin de Vite): lee y escribe el estado y firma cada decisión con tu identidad de git |
| `src/director/` | La lógica pura del método: fases, puertas, criterios, misiones, sellos, esfuerzo y validaciones |
| `tools/director/` | Las herramientas del director: la bandeja, la radiografía, el estado y la transcripción |
| `plantilla/` | De donde nace la memoria de cada proyecto |
| `docs/metodo/` | La metodología, el diseño del Studio y su evaluación |

## Contribuir

Ver [CONTRIBUTING.md](CONTRIBUTING.md).

## Créditos

La Metodología STL fue creada por ARGWABOT (A Regular Guy With A Bunch Of Tokens). STL Studio es su aplicación base, con licencia [MIT](LICENSE).
