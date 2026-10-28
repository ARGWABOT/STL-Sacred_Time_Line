// Tus ajustes de Claude Code en el director, clave por clave (notas de voz del titular nmvolgrmctit y nmvoljwl9tit, 25 de
// octubre de 2026: «al frente de cada uno, una explicación de para qué es», clara para quien no es experto, y elegir con
// una casilla cuáles carga el director, en vez de todo o nada; pd_arranque_limpio). Cada clave dice qué es, qué cambia si
// el director la carga, qué pasa si la deja fuera, qué recomienda el Studio y de dónde sale lo que dice (nota de voz del
// titular nmvon1s9itit, 25 de octubre de 2026: «no podemos decirle al usuario que no sabemos qué es una opción que le
// estamos ofreciendo desactivar»; lo dicho sale de la documentación oficial de Claude Code, revisada ese día). Lo que no
// está documentado se dice así, y lo que el Studio no sabe explicar viene marcado para conservar: no se quita a ciegas.
// Lo que le daría al director un permiso que el Studio no le dio no se puede elegir: cómo trabaja el director lo decide
// el Studio, igual para todo proyecto (CLAUDE.md, «Quién manda»).
// Lo lee el servidor del Studio, nunca el director (sus permisos le niegan tu archivo de ajustes).

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { archivoAjustesClaude } from './ajustesClaude';

/** si: conviene conservarla · no: el director no la necesita · igual: no cambia nada en él · nunca: no se puede elegir. */
export type Consejo = 'si' | 'no' | 'igual' | 'nunca';

/** Una clave que se elige: `id` es la clave de primer nivel o, en env y permissions, «env.X» y «permissions.X». */
export interface OpcionAjuste {
  id: string;
  /** Como la ve la persona: «model», «env › HTTPS_PROXY». */
  nombre: string;
  /** Lo que tiene adentro, sin valores (sus claves o cuántos elementos). */
  dentro?: string;
  /** Qué hace en tus sesiones. */
  que: string;
  /** Qué cambia si el director la carga. */
  enElDirector: string;
  /** Qué pasa si el director arranca sin ella (tus sesiones la siguen usando igual). */
  sinElla?: string;
  consejo: Consejo;
  /** De dónde sale lo que se dice: la documentación de Claude Code, o lo que dijo Anthropic de una clave sin documentar. */
  fuente?: string;
}

type Explicacion = { que: string; enElDirector: string; sinElla: string; consejo: Consejo; fuente?: string };

// La documentación oficial de Claude Code, revisada el 25 de octubre de 2026
const REFERENCIA = 'https://code.claude.com/docs/en/settings-reference';
const DOC_HOOKS = 'https://code.claude.com/docs/en/hooks';
const DOC_ENV = 'https://code.claude.com/docs/en/env-vars';
const DOC_AUTO = 'https://code.claude.com/docs/en/auto-mode-config';
const DOC_REMOTO = 'https://code.claude.com/docs/en/remote-control';

/** Algo que solo se ve en tu terminal: el director trabaja sin pantalla (claude -p), así que no cambia nada en él. */
const pantalla = (que: string): Explicacion => ({
  que,
  enElDirector: 'El director trabaja sin pantalla (el Studio lo lanza con claude -p y nadie ve su terminal): cargarla no cambia nada.',
  sinElla: 'Nada: tus sesiones la siguen usando como siempre.',
  consejo: 'igual',
});

/** Algo que el Studio ya fija en el director, en su arranque limpio: lo suyo manda. */
const loFijaElStudio = (que: string): Explicacion => ({
  que,
  enElDirector: 'El Studio ya la fija en el director, en su arranque limpio, y lo suyo manda: aunque la cargue, no cambia nada.',
  sinElla: 'Nada: la fija el Studio.',
  consejo: 'igual',
});

const CONEXION: Explicacion = {
  que: 'Cómo se conecta Claude Code a tu cuenta o a tu servidor (una orden que le da su clave o renueva tus credenciales de la nube).',
  enElDirector: 'El director es el mismo Claude Code y se conecta igual: si tus sesiones la necesitan para conectarse, él también.',
  sinElla: 'Si tus sesiones dependen de ella para conectarse, el director podría no arrancar, y el Studio diría que la revisión falló.',
  consejo: 'si',
};
const ESFUERZO: Explicacion = {
  que: 'Cuánto piensa el modelo antes de responder (bajo, medio, alto, muy alto).',
  enElDirector: 'El Studio le pasa al director el esfuerzo que eliges arriba, en esta misma página, y ese manda: no hace falta.',
  sinElla: 'Nada: el director piensa con el esfuerzo de arriba.',
  consejo: 'no',
};
const MCP: Explicacion = {
  que: 'Qué servidores MCP de un proyecto (herramientas de afuera, declaradas en su archivo .mcp.json) se encienden sin preguntarte.',
  enElDirector: 'Le sumarían al director herramientas de afuera que el Studio no le dio; cómo trabaja lo decide el Studio, igual en todo proyecto.',
  sinElla: 'El director no las enciende; tus sesiones sí, como siempre.',
  consejo: 'no',
};
const PLUGINS: Explicacion = {
  que: 'Tus plugins encendidos y las tiendas de donde se instalan: un plugin trae skills, comandos, agentes, hooks o herramientas.',
  enElDirector: 'Le sumarían al director skills y herramientas que el Studio no le dio, y lo harían trabajar distinto en cada computador.',
  sinElla: 'El director trabaja solo con lo del Studio; tus sesiones siguen con tus plugins.',
  consejo: 'no',
  fuente: `${REFERENCIA}#enabledplugins`,
};
const FLUJOS: Explicacion = {
  que: 'Si se pueden usar flujos de varios agentes (lo que enciende ultracode) y de qué tamaño.',
  enElDirector: 'Si el director usa flujos lo decide el Studio con su permiso, arriba en esta página («Ultracode»): esta clave podría encenderlos o apagarlos por su cuenta.',
  sinElla: 'Nada: el director usa flujos solo si se lo permites arriba.',
  consejo: 'no',
};
const SKILLS: Explicacion = {
  que: 'Qué skills se ven, si vienen las que trae Claude Code o si una skill puede correr órdenes.',
  enElDirector: 'Cambiaría las skills con que trabaja el director, que decide el Studio, igual en todo proyecto.',
  sinElla: 'El director trabaja con las del Studio; tus sesiones, con las tuyas.',
  consejo: 'no',
};
const COMPACTAR: Explicacion = {
  que: 'Cuándo Claude Code resume (compacta) una conversación larga para que siga cabiendo en la memoria del modelo.',
  enElDirector: 'Cambiaría cuándo el director resume lo que lleva de una revisión larga; apagarla podría hacer que una revisión grande se corte por falta de espacio.',
  sinElla: 'El director compacta cuando Claude Code lo decide por defecto.',
  consejo: 'no',
};
const CACHE: Explicacion = {
  que: 'Cuánto dura la caché del modelo: lo ya leído que no se vuelve a cobrar entero.',
  enElDirector: 'Cambia lo que cuesta una revisión, no lo que hace el director.',
  sinElla: 'El director usa la caché de siempre.',
  consejo: 'igual',
};
const MODO_PERMISOS: Explicacion = {
  que: 'Cómo arrancan o se confirman los modos de permisos de tus sesiones (el automático, el que se salta los permisos).',
  enElDirector: 'El Studio lanza al director con un modo fijo y una lista fija de lo que puede hacer: no cambia nada.',
  sinElla: 'Nada: el modo del director lo fija el Studio.',
  consejo: 'igual',
};
const VERSION: Explicacion = {
  que: 'Qué versión de Claude Code se instala o se actualiza, y cuándo.',
  enElDirector: 'El director usa el mismo Claude Code instalado en este computador: no cambia nada.',
  sinElla: 'Nada: tus actualizaciones siguen como las tienes.',
  consejo: 'igual',
};
const SIN_PREGUNTAS: Explicacion = {
  que: 'Cuánto espera una pregunta o un diálogo de Claude antes de seguir solo.',
  enElDirector: 'El director no tiene a quién preguntarle: lo que necesita de ti te lo pide en el Studio. No cambia nada.',
  sinElla: 'Nada.',
  consejo: 'igual',
};

/** Lo que el Studio sabe explicar de las claves de primer nivel (las de la referencia de ajustes de Claude Code). */
const CLAVES: Record<string, Explicacion> = {
  // El modelo y cómo piensa
  model: {
    que: 'El modelo con que arrancan tus sesiones nuevas (por ejemplo Opus o Sonnet). Es la clave que cambia /model, y también «Modelo», arriba en esta página.',
    enElDirector: 'El Studio ya la lee y se la pasa al director con --model, que manda sobre esta clave: cargarla o no da igual.',
    sinElla: 'Nada: el director usa el modelo que eliges arriba.',
    consejo: 'no',
  },
  effortLevel: {
    ...ESFUERZO,
    que: 'El esfuerzo por defecto (cuánto piensa el modelo antes de responder) para los modelos que no tienen uno guardado. Desde Opus 5.5, Claude Code ya no la usa: el esfuerzo se guarda por modelo, en modelSettings.',
  },
  modelSettings: {
    que: 'Lo que guardas por cada modelo: su esfuerzo (lo escribe /effort, y «Esfuerzo» arriba en esta página), un tope de esfuerzo y cuándo se compacta la conversación.',
    enElDirector: 'El Studio ya lee el esfuerzo de aquí y se lo pasa al director con --effort. Lo demás sí cambiaría algo: un tope de esfuerzo (maxEffortLevel) podría bajar en silencio el que eliges arriba, y el punto de compactación cambiaría cuándo resume una revisión larga.',
    sinElla: 'El director piensa con el esfuerzo de arriba, sin tope, y compacta cuando Claude Code lo decide por defecto.',
    consejo: 'no',
  },
  alwaysThinkingEnabled: {
    que: 'Si el modelo piensa antes de responder (en false, lo apaga).',
    enElDirector: 'Si la tienes en false, el director respondería sin pensar, aunque arriba elijas un esfuerzo alto.',
    sinElla: 'El director piensa como el Studio se lo pide.',
    consejo: 'no',
  },
  maxEffortLevel: {
    que: 'Un tope al esfuerzo: más arriba de él, el modelo no piensa.',
    enElDirector: 'Bajaría en silencio el esfuerzo que eliges arriba para el director.',
    sinElla: 'El director piensa con el esfuerzo de arriba, sin tope.',
    consejo: 'no',
  },
  fastMode: {
    que: 'El modo rápido (solo con Opus): responde más rápido y cuesta más.',
    enElDirector: 'Cambiaría lo que cuesta el director sin que lo elijas en «Modelo y consumo».',
    sinElla: 'El director trabaja a la velocidad normal.',
    consejo: 'no',
  },
  fallbackModel: {
    que: 'Los modelos de respaldo, para cuando el principal está saturado.',
    enElDirector: 'El director podría terminar trabajando con otro modelo del que eliges arriba, sin que lo veas.',
    sinElla: 'Si el modelo está saturado, el director espera o falla, y el Studio lo dice.',
    consejo: 'no',
  },
  availableModels: {
    que: 'Limita los modelos que se pueden elegir.',
    enElDirector: 'Limitaría también el que el Studio le pide: con un modelo fuera de la lista, el director no arrancaría.',
    sinElla: 'El director usa el modelo de arriba.',
    consejo: 'no',
  },
  advisorModel: {
    que: 'El modelo que responde cuando Claude le pide consejo a otro (la herramienta del consejero).',
    enElDirector: 'Cambiaría a quién consulta el director, que decide el Studio.',
    sinElla: 'El director consulta al de siempre.',
    consejo: 'no',
  },
  ultracode: {
    que: 'Que tus sesiones arranquen con ultracode: para cada tarea de peso, Claude arma un flujo de varios agentes.',
    enElDirector: 'El Studio lo decide aparte, con su permiso, arriba en esta página («Ultracode»), y lo suyo manda.',
    sinElla: 'Nada: el director usa ultracode solo si se lo permites arriba.',
    consejo: 'no',
  },
  enableWorkflows: FLUJOS,
  disableWorkflows: FLUJOS,
  workflowKeywordTriggerEnabled: FLUJOS,
  workflowSizeGuideline: FLUJOS,
  skipWorkflowUsageWarning: {
    que: 'Una marca que Claude Code escribe solo cuando aceptas su aviso de costo de los flujos de varios agentes (ultracode), para no volver a mostrártelo. No está en su referencia oficial: un colaborador de Anthropic dijo que es interna y que se puede dejar como está.',
    enElDirector: 'El director no ve avisos (trabaja sin pantalla), y si usa flujos lo decide el Studio con su permiso, arriba: cargarla no cambia nada que se sepa.',
    sinElla: 'Nada que se sepa: tus sesiones no vuelven a mostrarte el aviso, porque la marca sigue en tu archivo.',
    consejo: 'igual',
    fuente: 'https://github.com/anthropics/claude-code/issues/75913',
  },
  autoCompactEnabled: COMPACTAR,
  autoCompactWindow: COMPACTAR,
  idleCompaction: COMPACTAR,
  promptCacheTtl: CACHE,
  subagentPromptCacheTtl: CACHE,
  // Cómo escribe
  outputStyle: {
    que: 'Un estilo que cambia cómo escribe y responde el modelo (más explicativo, más breve…).',
    enElDirector: 'Cambiaría cómo escribe el director, que sigue las reglas del Studio, iguales para todos.',
    sinElla: 'El director escribe como lo piden las reglas del Studio.',
    consejo: 'no',
  },
  language: {
    que: 'El idioma en que te responde Claude, y el de los títulos de tus sesiones.',
    enElDirector: 'El director escribe en el idioma que elige cada persona en el Studio; este podría mezclarse con ese.',
    sinElla: 'Nada: el idioma de lo que escribe el director lo pone el Studio.',
    consejo: 'no',
  },
  agent: {
    que: 'Que cada sesión arranque como un agente con nombre, con sus propias instrucciones.',
    enElDirector: 'El director dejaría de ser el director: arrancaría como ese agente, con otras instrucciones.',
    sinElla: 'El director arranca con las instrucciones del Studio.',
    consejo: 'no',
  },
  // Los hooks
  hooks: {
    que: 'Órdenes tuyas (programas o scripts que tú o una herramienta agregaron) que Claude Code corre solo en ciertos momentos: al empezar una sesión (SessionStart), cuando Claude termina de responder (Stop), antes o después de usar una herramienta, y otros. Entre paréntesis, al lado del nombre, están los momentos en que corren las tuyas.',
    enElDirector: 'No son lo que hace arrancar o detenerse a Claude Code: una sesión empieza, trabaja y termina sola, sin ningún hook. SessionStart solo agrega texto al principio de la conversación, y Stop solo puede obligar a Claude a seguir cuando iba a terminar; ninguno decide cuándo termina una revisión: eso lo marcan el cierre del director (--listo) y el fin de su proceso, que el Studio vigila. Además, el Studio apaga todos los hooks del director (disableAllHooks), así que aunque los cargue, no corren.',
    sinElla: 'El director arranca, revisa y cierra igual. Tus sesiones los siguen corriendo como siempre.',
    consejo: 'no',
    fuente: DOC_HOOKS,
  },
  statusLine: {
    que: 'La línea de estado que ves abajo en tu terminal: una orden tuya que la dibuja.',
    enElDirector: 'El director trabaja sin pantalla, y el Studio apaga esa orden junto con los hooks: no la usa.',
    sinElla: 'Nada: tu terminal la sigue mostrando.',
    consejo: 'no',
  },
  // Plugins, skills y herramientas de afuera
  enabledPlugins: PLUGINS,
  extraKnownMarketplaces: PLUGINS,
  skillOverrides: SKILLS,
  disableBundledSkills: SKILLS,
  disableSkillShellExecution: SKILLS,
  enableAllProjectMcpServers: MCP,
  enabledMcpjsonServers: MCP,
  disabledMcpjsonServers: {
    que: 'Qué servidores MCP de un proyecto (herramientas de afuera) no se encienden nunca.',
    enElDirector: 'Solo apaga herramientas de afuera: suma cuidado y no le quita nada de lo que el Studio le da.',
    sinElla: 'El director tampoco las enciende, porque el Studio no se las da; conservarla solo lo asegura.',
    consejo: 'si',
  },
  // La conexión con tu cuenta
  apiKeyHelper: { ...CONEXION, que: 'Una orden que le da a Claude Code su clave para conectarse.' },
  awsAuthRefresh: CONEXION,
  awsCredentialExport: CONEXION,
  gcpAuthRefresh: CONEXION,
  otelHeadersHelper: CONEXION,
  forceLoginMethod: { ...CONEXION, que: 'Con qué tipo de cuenta inicia sesión Claude Code.', enElDirector: 'Si lo fijaste, el director debe entrar con la misma cuenta que tus sesiones.' },
  forceLoginOrgUUID: { ...CONEXION, que: 'Con qué organización inicia sesión Claude Code.', enElDirector: 'Si lo fijaste, el director debe entrar con la misma organización que tus sesiones.' },
  forceLoginGatewayUrl: CONEXION,
  // Remote Control y lo que se publica en claude.ai
  disableRemoteControl: {
    que: 'Apaga Remote Control, la función para manejar una sesión de tu computador desde claude.ai o desde la app del teléfono.',
    enElDirector: 'El director no usa Remote Control (lo lanza el Studio, sin pantalla): solo quita algo que él no usa.',
    sinElla: 'Nada: el director no lo usa, y tus sesiones siguen con Remote Control apagado.',
    consejo: 'igual',
    fuente: `${REFERENCIA}#disableremotecontrol`,
  },
  remoteControlAtStartup: {
    que: 'Que cada sesión interactiva arranque con Remote Control encendido, para manejarla desde claude.ai o el teléfono.',
    enElDirector: 'Solo vale en sesiones interactivas, y el director no lo es: no cambia nada.',
    sinElla: 'Nada.',
    consejo: 'igual',
    fuente: DOC_REMOTO,
  },
  agentPushNotifEnabled: {
    que: 'Que Claude te mande una notificación al teléfono cuando crea que vale la pena, mientras Remote Control está conectado.',
    enElDirector: 'El director no usa Remote Control, así que no mandaría nada: lo que tiene que decirte llega por el Studio.',
    sinElla: 'Nada: tus sesiones te siguen avisando.',
    consejo: 'no',
    fuente: `${REFERENCIA}#agentpushnotifenabled`,
  },
  inputNeededNotifEnabled: {
    que: 'Que Claude te mande una notificación al teléfono cuando una sesión espera tu respuesta, mientras Remote Control está conectado.',
    enElDirector: 'El director nunca espera tu respuesta en su terminal (lo que necesita, te lo pide en el Studio): no mandaría nada.',
    sinElla: 'Nada: tus sesiones te siguen avisando.',
    consejo: 'no',
  },
  enableArtifact: {
    que: 'Si Claude puede publicar lo que hace como una página privada en claude.ai (en false, la apaga).',
    enElDirector: 'Con claude -p esa herramienta ya viene apagada, y el director no guarda nada en la web de Claude: no cambia nada. En false, solo suma cuidado.',
    sinElla: 'Nada: el director no publica en claude.ai.',
    consejo: 'igual',
    fuente: 'https://code.claude.com/docs/en/artifacts',
  },
  disableArtifact: {
    que: 'El nombre viejo de enableArtifact: apaga la herramienta que publica lo que hace Claude como página en claude.ai.',
    enElDirector: 'Con claude -p esa herramienta ya viene apagada: no cambia nada.',
    sinElla: 'Nada: el director no publica en claude.ai.',
    consejo: 'igual',
  },
  autoUploadSessions: {
    que: 'Una clave interna de Claude Code, que no está en su referencia oficial: su nombre habla de subir tus sesiones a la nube. Un colaborador de Anthropic dijo que no hace nada en las versiones públicas.',
    enElDirector: 'No hace nada, según Anthropic; y aunque algún día subiera las conversaciones, el director no guarda nada en la web de Claude sin que lo pidas.',
    sinElla: 'Nada: ninguna versión pública la usa.',
    consejo: 'no',
    fuente: 'https://github.com/anthropics/claude-code/issues/86991',
  },
  // Los permisos y su modo
  autoMode: {
    que: 'Tus reglas para el modo automático de permisos, en el que un clasificador decide por ti si Claude puede hacer algo, en vez de preguntarte: environment describe lo que es de confianza (tus repositorios, tus dominios, tus servicios), allow y soft_deny lo que se permite o se bloquea, y hard_deny lo que nunca.',
    enElDirector: 'El director no trabaja en modo automático: el Studio lo lanza con una lista fija de lo que puede hacer, así que estas reglas no se usan. Si se usaran, podrían bloquear en silencio trabajo aprobado o dejar pasar algo que el Studio no le dio.',
    sinElla: 'Nada: tus sesiones siguen con tus reglas; el director, con las del Studio.',
    consejo: 'no',
    fuente: DOC_AUTO,
  },
  disableAutoMode: MODO_PERMISOS,
  skipAutoPermissionPrompt: MODO_PERMISOS,
  skipDangerousModePermissionPrompt: MODO_PERMISOS,
  useAutoModeDuringPlan: MODO_PERMISOS,
  sandbox: {
    que: 'Encierra las órdenes de la terminal en un espacio aislado, con lo que pueden leer, escribir y alcanzar en la red.',
    enElDirector: 'Suma cuidado, pero puede impedirle correr las pruebas o git.',
    sinElla: 'El director trabaja con la lista de permisos del Studio, como siempre. Consérvala solo si tus sesiones ya trabajan con ella sin problemas.',
    consejo: 'igual',
  },
  skipWebFetchPreflight: {
    que: 'Saltarse la comprobación de una dirección antes de leer una página de internet.',
    enElDirector: 'Le quitaría al director un cuidado al investigar en internet.',
    sinElla: 'El director comprueba cada dirección antes de leerla.',
    consejo: 'no',
  },
  // Lo que el Studio ya fija en su arranque limpio
  disableAllHooks: loFijaElStudio('Apaga todos tus hooks y tu línea de estado.'),
  autoMemoryEnabled: loFijaElStudio('Si Claude guarda solo, entre una sesión y otra, notas de lo que aprendió (la memoria automática).'),
  autoMemoryDirectory: loFijaElStudio('Dónde guarda Claude su memoria automática.'),
  includeGitInstructions: loFijaElStudio('Si Claude recibe al empezar sus instrucciones de commits y una foto del estado de git.'),
  claudeMdExcludes: loFijaElStudio('Qué archivos CLAUDE.md no se cargan.'),
  disableClaudeAiConnectors: loFijaElStudio('Apaga los conectores de claude.ai (tu correo, tus documentos en la nube y otros).'),
  // Firmas, archivos y órdenes
  includeCoAuthoredBy: {
    que: 'Si los commits llevan la línea «Co-Authored-By» de Claude (en desuso: la reemplaza attribution).',
    enElDirector: 'Las reglas del Studio ya le piden al director esa línea en cada commit.',
    sinElla: 'Nada: el director la pone por las reglas del Studio.',
    consejo: 'igual',
  },
  attribution: {
    que: 'Cómo firma Claude los commits y los pull requests (la línea que lo nombra como coautor).',
    enElDirector: 'Las reglas del Studio ya dicen cómo firma el director sus commits.',
    sinElla: 'Nada: el director firma como lo piden las reglas del Studio.',
    consejo: 'igual',
  },
  cleanupPeriodDays: {
    que: 'Cuántos días guarda Claude Code tus conversaciones (30, si no lo cambias); las más viejas se borran solas.',
    enElDirector: 'Vale también para las conversaciones del director: con un número bajo, se borrarían antes. El Studio guarda aparte el registro de cada revisión, así que no pierde nada que necesite.',
    sinElla: 'Las conversaciones del director se guardan 30 días, lo de siempre.',
    consejo: 'igual',
  },
  plansDirectory: { que: 'Dónde guarda Claude los planes que escribe en el modo de planear.', enElDirector: 'El director no trabaja en ese modo: sus planes van en la memoria del proyecto.', sinElla: 'Nada.', consejo: 'igual' },
  bashOutputMaxChars: { que: 'Cuánto de lo que dice una orden de la terminal se le muestra al modelo.', enElDirector: 'Cambiaría cuánto ve el director de sus pruebas y de sus herramientas.', sinElla: 'El director ve lo de siempre.', consejo: 'igual' },
  defaultShell: { que: 'Qué terminal usan las órdenes que escribes con «!» (bash o PowerShell).', enElDirector: 'El director no escribe órdenes con «!»: no cambia nada.', sinElla: 'Nada.', consejo: 'igual' },
  respectGitignore: { que: 'Si la búsqueda de archivos salta lo que el proyecto ignora (.gitignore).', enElDirector: 'Cambia poco: el director busca con sus herramientas, con la lista del Studio.', sinElla: 'El director busca como siempre.', consejo: 'igual' },
  fileCheckpointingEnabled: { que: 'Las fotos de los archivos que permiten deshacer cambios con /rewind.', enElDirector: 'Claude Code no las usa con claude -p: no cambia nada. El director guarda cada cambio en su commit.', sinElla: 'Nada.', consejo: 'igual' },
  askUserQuestionTimeout: SIN_PREGUNTAS,
  dialogExpiry: SIN_PREGUNTAS,
  autoContinueAtUsageLimit: { que: 'Que una sesión siga sola cuando se renueva tu límite de uso.', enElDirector: 'Si el director llega a tu límite, el Studio lo dice y tú pides la revisión de nuevo: no cambia nada que se sepa.', sinElla: 'Nada.', consejo: 'igual' },
  // Versiones
  autoUpdates: VERSION,
  autoUpdatesChannel: VERSION,
  minimumVersion: VERSION,
  // Lo que solo se ve en tu terminal
  theme: pantalla('Los colores de Claude Code en tu terminal (oscuro, claro y otros).'),
  tui: pantalla('Cómo dibuja Claude Code tu terminal: la vista clásica o la de pantalla completa, sin parpadeo (la cambia /tui).'),
  verbose: pantalla('Si tu terminal muestra todo el detalle de lo que hace Claude.'),
  viewMode: pantalla('Cuánto detalle de la conversación ves en tu terminal.'),
  editorMode: pantalla('Cómo se escribe en tu terminal: normal o con las teclas de vim.'),
  vimInsertModeRemaps: pantalla('Atajos de teclado del modo vim de tu terminal.'),
  keybindingFlavor: pantalla('Un estilo viejo de atajos de teclado, que ya no hace nada.'),
  spinnerTipsEnabled: pantalla('Los consejos que aparecen mientras Claude trabaja.'),
  spinnerTipsOverride: pantalla('Tus propios consejos para mientras Claude trabaja.'),
  spinnerVerbs: pantalla('Las palabras que se ven mientras Claude trabaja.'),
  prefersReducedMotion: pantalla('Menos animación en tu terminal.'),
  preferredNotifChannel: pantalla('Por dónde te avisa Claude Code en tu computador (la terminal, el sistema).'),
  companyAnnouncements: pantalla('Avisos de tu empresa al abrir Claude Code.'),
  feedbackSurveyState: pantalla('Una marca de Claude Code para no repetirte su encuesta «¿Cómo va Claude?».'),
  feedbackSurveyRate: pantalla('Cada cuánto te muestra Claude Code su encuesta.'),
  feedbackDrafts: pantalla('Si Claude te propone borradores para enviar comentarios a Anthropic.'),
  voice: pantalla('El dictado por voz en tu terminal.'),
  voiceEnabled: pantalla('Si el dictado por voz de tu terminal está encendido.'),
  showThinkingSummaries: pantalla('Si ves un resumen de lo que piensa el modelo.'),
  showTurnDuration: pantalla('Si ves cuánto tardó cada respuesta.'),
  showClearContextOnPlanAccept: pantalla('Una opción del modo de planear en tu terminal.'),
  promptSuggestionEnabled: pantalla('Las sugerencias en gris de lo que podrías escribir.'),
  autoScrollEnabled: pantalla('Si tu terminal baja sola con lo nuevo.'),
  awaySummaryEnabled: pantalla('El resumen de lo que pasó mientras no estabas (Claude Code no lo muestra con claude -p).'),
  emojiCompletionEnabled: pantalla('Completar emojis al escribir.'),
  maxProseWidth: pantalla('El ancho máximo del texto en tu terminal.'),
  syntaxHighlightingDisabled: pantalla('Los colores del código en tu terminal.'),
  terminalProgressBarEnabled: pantalla('La barra de progreso en la pestaña de tu terminal.'),
  terminalTitleFromRename: pantalla('El título de la ventana de tu terminal.'),
  timeFormat: pantalla('Cómo se muestra la hora en tu terminal.'),
  timeZone: pantalla('La zona horaria con que se muestra la hora en tu terminal.'),
  wheelScrollAccelerationEnabled: pantalla('La rueda del ratón en tu terminal.'),
  axScreenReader: pantalla('Ajustes para un lector de pantalla.'),
  spellcheck: pantalla('La corrección ortográfica de lo que escribes.'),
  footerLinksRegexes: pantalla('Los enlaces del pie de tu terminal.'),
  subagentStatusLine: pantalla('Cómo se ven los ayudantes en tu terminal.'),
  fileSuggestion: pantalla('Una orden tuya que sugiere archivos al escribir «@».'),
  teammateMode: pantalla('Cómo se muestran los compañeros de un equipo de agentes en tu terminal.'),
  disableDeepLinkRegistration: pantalla('Si Claude Code se registra para abrir enlaces claude-cli:// de tu navegador.'),
};

/** Las partes de `permissions`, cada una por separado: unas suman cuidado, otras le darían un permiso al director. */
const PERMISOS: Record<string, Explicacion> = {
  allow: { que: 'Lo que tus sesiones hacen sin preguntarte.', enElDirector: 'Le daría al director permisos que el Studio no le dio. Lo que puede hacer el director lo decide el Studio, igual en todo proyecto.', sinElla: 'El director hace solo lo que el Studio le permite.', consejo: 'nunca' },
  additionalDirectories: { que: 'Otras carpetas que tus sesiones pueden leer y cambiar.', enElDirector: 'Le abriría carpetas que el Studio no le abrió.', sinElla: 'El director lee y escribe solo donde el Studio le abre.', consejo: 'nunca' },
  deny: { que: 'Lo que tus sesiones nunca pueden hacer (por ejemplo, leer un archivo privado).', enElDirector: 'Suma cuidado y no le quita nada de lo que el Studio le permite: conviene conservarla.', sinElla: 'El director sigue con lo que el Studio le niega, pero sin tus prohibiciones de más.', consejo: 'si' },
  ask: { que: 'Lo que tus sesiones te preguntan antes de hacer.', enElDirector: 'El director no tiene a quién preguntarle: se le negaría, aunque el Studio se lo permita. Suma cuidado, pero puede frenarle trabajo aprobado.', sinElla: 'El director hace lo que el Studio le permite, sin preguntar.', consejo: 'igual' },
  defaultMode: { que: 'El modo de permisos con que arrancan tus sesiones.', enElDirector: 'El Studio fija el modo del director: no cambia nada.', sinElla: 'Nada.', consejo: 'igual' },
  disableBypassPermissionsMode: { que: 'Prohíbe el modo que se salta todos los permisos.', enElDirector: 'Suma cuidado: el director nunca se los salta, igual.', sinElla: 'Nada: el director nunca usa ese modo.', consejo: 'si' },
  blockReadsOutsideWorkingDirectories: { que: 'Impide leer fuera de las carpetas de trabajo de la sesión.', enElDirector: 'Suma cuidado, pero el director lee el Studio y el proyecto, que pueden estar en carpetas distintas: podría negarle lo que el Studio le permite.', sinElla: 'El director lee solo lo que el Studio le permite.', consejo: 'igual' },
};

/** Las variables de entorno de Claude Code que el Studio sabe explicar, por su nombre (de su página de variables). */
const VARIABLES: Record<string, Explicacion> = {
  DISABLE_FEEDBACK_COMMAND: { que: 'Apaga /feedback, /bug y /share, con los que se envían comentarios o una sesión a Anthropic.', enElDirector: 'El director no los usa: solo quita algo que manda datos afuera, y suma cuidado.', sinElla: 'Nada que se note: el director no los usa.', consejo: 'si' },
  DISABLE_BUG_COMMAND: { que: 'El nombre viejo de DISABLE_FEEDBACK_COMMAND: apaga /bug y /feedback, con los que se envían comentarios a Anthropic.', enElDirector: 'El director no los usa: solo quita algo que manda datos afuera.', sinElla: 'Nada que se note.', consejo: 'si' },
  DISABLE_COST_WARNINGS: { que: 'Oculta los avisos de costo en tu terminal.', enElDirector: 'El director no ve avisos: lo que gasta lo muestra el Studio en «Lo que gastó el director».', sinElla: 'Nada.', consejo: 'igual' },
  DISABLE_PROMPT_CACHING: { ...CACHE, que: 'Apaga la caché del modelo: todo lo que lee se cobra entero cada vez.', enElDirector: 'Cada revisión costaría más y tardaría más.', consejo: 'no' },
  DISABLE_AUTO_COMPACT: { ...COMPACTAR, que: 'Apaga el resumen automático de una conversación larga.' },
  DISABLE_COMPACT: { ...COMPACTAR, que: 'Apaga todo resumen de una conversación larga, también /compact.' },
  DISABLE_INTERLEAVED_THINKING: { ...ESFUERZO, que: 'Que el modelo no piense entre una herramienta y otra.', enElDirector: 'El director pensaría menos entre un paso y otro de su revisión.' },
  CLAUDE_CODE_DISABLE_THINKING: { ...ESFUERZO, que: 'Que el modelo no piense antes de responder.', enElDirector: 'El director respondería sin pensar, aunque arriba elijas un esfuerzo alto.' },
  CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING: { ...ESFUERZO, que: 'Que el modelo no ajuste solo cuánto piensa.' },
  CLAUDE_CODE_EFFORT_LEVEL: { ...ESFUERZO, que: 'El esfuerzo de tus sesiones, como variable: manda incluso sobre el que se pide al lanzar Claude Code.', enElDirector: 'Mandaría sobre el esfuerzo que eliges arriba para el director, sin que lo veas.' },
  CLAUDE_CODE_DISABLE_CLAUDE_MDS: { que: 'Que Claude Code no cargue ningún archivo CLAUDE.md.', enElDirector: 'El director se quedaría sin las reglas del Studio, que viven en su CLAUDE.md.', sinElla: 'El director trabaja con las reglas del Studio.', consejo: 'no' },
  CLAUDE_CODE_DISABLE_WEB_FETCH: { que: 'Le quita a Claude la herramienta de leer páginas de internet.', enElDirector: 'El director no podría leer las fuentes que busca al investigar, algo que el Studio le permite.', sinElla: 'El director puede leer páginas de internet para investigar.', consejo: 'no' },
  CLAUDE_CODE_DISABLE_WORKFLOWS: FLUJOS,
  CLAUDE_CODE_DISABLE_BUNDLED_SKILLS: SKILLS,
  CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS: { ...SKILLS, que: 'Apaga los ayudantes que trae Claude Code para explorar y planear.', enElDirector: 'El director no podría repartir una lectura grande entre ayudantes, algo que el Studio le permite.' },
  CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: { ...SKILLS, que: 'Apaga el trabajo en segundo plano.', enElDirector: 'El director no podría dejar ayudantes trabajando mientras sigue con lo demás.' },
  CLAUDE_CODE_DISABLE_AUTO_MEMORY: loFijaElStudio('Apaga la memoria automática de Claude.'),
  CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS: loFijaElStudio('Quita las instrucciones de commits y la foto de git del arranque.'),
  CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: pantalla('Apaga la encuesta «¿Cómo va Claude?».'),
  CLAUDE_CODE_DISABLE_TERMINAL_TITLE: pantalla('Que Claude Code no cambie el título de tu terminal.'),
  CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN: pantalla('La vista clásica de tu terminal, sin pantalla completa.'),
  CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL: pantalla('Cómo se dibujan los mensajes en tu terminal.'),
  CLAUDE_CODE_DISABLE_MOUSE: pantalla('El ratón en la pantalla completa de tu terminal.'),
  CLAUDE_CODE_DISABLE_MOUSE_CLICKS: pantalla('Los clics en la pantalla completa de tu terminal.'),
};
const PRIVACIDAD: Explicacion = { que: 'Apaga algo que Claude Code envía o hace por su cuenta: datos de uso, informes de errores, actualizaciones o funciones que se encienden desde Anthropic.', enElDirector: 'Cuida tu privacidad también en el director, y no le quita nada que necesite: conviene conservarla.', sinElla: 'El director enviaría esos datos, aunque tus sesiones no lo hagan.', consejo: 'si' };
const ORDEN_OCULTA: Explicacion = { que: 'Oculta una orden o un aviso de tu terminal (su nombre dice cuál).', enElDirector: 'El director no escribe órdenes en una terminal ni ve sus avisos: no cambia nada.', sinElla: 'Nada: tus sesiones la siguen ocultando.', consejo: 'igual' };

/** Una variable de entorno, por su nombre (el valor nunca se lee para esto). */
function explicarVariable(nombre: string): Explicacion {
  const conocida = VARIABLES[nombre.toUpperCase()];
  if (conocida) return { ...conocida, fuente: conocida.fuente ?? DOC_ENV };
  if (/^(DISABLE_(TELEMETRY|ERROR_REPORTING|AUTOUPDATER|GROWTHBOOK|UPDATES)|CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC)$/i.test(nombre)) return { ...PRIVACIDAD, fuente: DOC_ENV };
  if (/^DISABLE_PROMPT_CACHING_/i.test(nombre)) return { ...VARIABLES.DISABLE_PROMPT_CACHING, fuente: DOC_ENV };
  if (/^DISABLE_\w+_COMMAND$|^DISABLE_INSTALLATION_CHECKS$/i.test(nombre)) return { ...ORDEN_OCULTA, fuente: DOC_ENV };
  if (/^ANTHROPIC_(MODEL|DEFAULT_\w+_MODEL|SMALL_FAST_MODEL)$/i.test(nombre)) return { ...CLAVES.model, que: 'El modelo de tus sesiones, como variable.', fuente: DOC_ENV };
  if (/THINKING|MAX_OUTPUT_TOKENS|EFFORT/i.test(nombre)) return { ...ESFUERZO, fuente: DOC_ENV };
  if (/^(ANTHROPIC_|CLAUDE_CODE_USE_|AWS_|GOOGLE_|CLOUD_ML_|VERTEX_|HTTPS?_PROXY$|NO_PROXY$|NODE_EXTRA_CA_CERTS$)/i.test(nombre))
    return { ...CONEXION, que: 'Una variable de la conexión de Claude Code: su cuenta, su servidor, su proxy o su certificado.', fuente: DOC_ENV };
  if (/^CLAUDE_CODE_DISABLE_/i.test(nombre))
    return { que: 'Apaga una función de Claude Code (su nombre dice cuál), según su página de variables.', enElDirector: 'El Studio no la tiene en su lista: no sabe si al director le quita algo que necesita, así que no te recomiendo quitarla a ciegas. Conservarla lo deja como tus sesiones.', sinElla: 'El director tendría esa función encendida.', consejo: 'si', fuente: DOC_ENV };
  return { que: 'Una variable de entorno tuya, que no es de Claude Code: la usa algún programa tuyo, y Claude Code se la pasa a las órdenes que corre.', enElDirector: 'El director no la necesita, salvo que sepas que algo suyo depende de ella. Si guarda una clave o un dato privado, mejor déjala fuera.', sinElla: 'Las órdenes que corre el director no la reciben; tus sesiones, sí.', consejo: 'no' };
}

/**
 * Una clave que el Studio no sabe explicar: no está en la referencia oficial de Claude Code ni en su lista. No se ofrece
 * quitarla a ciegas (nota de voz del titular nmvon1s9itit): viene marcada para conservar, que deja al director como hoy.
 */
const NO_DOCUMENTADA: Explicacion = {
  que: 'Una clave que no está en la referencia oficial de ajustes de Claude Code (revisada el 25 de octubre de 2026): suele ser una marca interna que Claude Code escribe solo, o una de una versión más nueva.',
  enElDirector: 'Lo que no se sabe explicar no se quita a ciegas: viene marcada para conservarla, que deja al director como tus sesiones. Lo del Studio (el modelo, el esfuerzo, sus reglas y sus permisos) manda igual.',
  sinElla: 'No se sabe con certeza: por eso te recomiendo conservarla.',
  consejo: 'si',
  fuente: REFERENCIA,
};

const esObjeto = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const contenido = (v: unknown): string | undefined => (Array.isArray(v) ? `una lista de ${v.length}` : esObjeto(v) ? (Object.keys(v).length ? Object.keys(v).join(', ') : 'vacío') : undefined);
/** La explicación de una clave de primer nivel, con su fuente: la parte de la referencia de Claude Code que la explica. */
const explicarClave = (clave: string): Explicacion => {
  const e = CLAVES[clave];
  return e ? { ...e, fuente: e.fuente ?? `${REFERENCIA}#${clave.toLowerCase()}` } : NO_DOCUMENTADA;
};

/**
 * Cada clave de tus ajustes, con su explicación y su consejo, sin ningún valor: las de primer nivel y, de env y de
 * permissions, cada una de las suyas por separado. Pura.
 */
export function opcionesDeAjustes(ajustes: unknown): OpcionAjuste[] {
  if (!esObjeto(ajustes)) return [];
  const opciones: OpcionAjuste[] = [];
  for (const [clave, valor] of Object.entries(ajustes)) {
    if ((clave === 'env' || clave === 'permissions') && esObjeto(valor) && Object.keys(valor).length) {
      for (const [sub, v] of Object.entries(valor)) {
        const e = clave === 'env' ? explicarVariable(sub) : PERMISOS[sub] ? { ...PERMISOS[sub], fuente: `${REFERENCIA}#permissions` } : NO_DOCUMENTADA;
        opciones.push({ id: `${clave}.${sub}`, nombre: `${clave} › ${sub}`, ...(clave === 'permissions' && contenido(v) ? { dentro: contenido(v) } : {}), ...e });
      }
      continue;
    }
    const e = explicarClave(clave);
    opciones.push({ id: clave, nombre: clave, ...(contenido(valor) ? { dentro: contenido(valor) } : {}), ...e });
  }
  return opciones;
}

/** Lo que se marca de entrada, antes de que la persona elija: lo que conviene conservar. Pura. */
export const recomendadas = (opciones: OpcionAjuste[]): string[] => opciones.filter((o) => o.consejo === 'si').map((o) => o.id);

/** Todas las claves de tus ajustes que se pueden conservar (las de consejo «nunca», que le darían un permiso, no), con sus valores. Pura. */
export const conservarTodo = (ajustes: unknown): Record<string, unknown> => conservarDe(ajustes, opcionesDeAjustes(ajustes).map((o) => o.id));

/**
 * Los ajustes que el director conserva de los tuyos, con sus valores, para sumarlos a los del Studio (--settings): solo
 * lo elegido que existe y nunca lo que le daría un permiso (consejo «nunca»), aunque se pida. Pura.
 */
export function conservarDe(ajustes: unknown, ids: readonly string[]): Record<string, unknown> {
  if (!esObjeto(ajustes)) return {};
  const permitidas = new Set(opcionesDeAjustes(ajustes).filter((o) => o.consejo !== 'nunca').map((o) => o.id));
  const fuera: Record<string, any> = {};
  for (const id of ids) {
    if (!permitidas.has(id)) continue;
    const [clave, sub] = id.split(/\.(.*)/s);
    if (sub === undefined || sub === '') fuera[clave] = ajustes[clave];
    else (fuera[clave] ??= {})[sub] = (ajustes[clave] as Record<string, unknown>)[sub];
  }
  return fuera;
}

/** Tus ajustes de usuario, leídos por el servidor; null si no hay archivo o no es JSON válido. */
async function leerTusAjustes(archivo: string): Promise<unknown> {
  if (!existsSync(archivo)) return null;
  try {
    return JSON.parse(await readFile(archivo, 'utf8'));
  } catch {
    return null;
  }
}

/** Las opciones de tus ajustes, para «Modelo y consumo»; null si el archivo no es JSON válido, [] si no hay archivo. */
export async function opcionesDeTusAjustes(archivo = archivoAjustesClaude()): Promise<OpcionAjuste[] | null> {
  if (!existsSync(archivo)) return [];
  const j = await leerTusAjustes(archivo);
  return j === null ? null : opcionesDeAjustes(j);
}

/**
 * Las claves que aparecieron en tus ajustes después de guardar tu selección, y lo que el director conserva mientras no
 * la guardes de nuevo (nota de voz del titular nmvoottaitit, 25 de octubre de 2026: lo que el Studio detecta queda
 * escrito, y si cambia, se vuelve a confirmar): lo que elegiste y, de las nuevas, las que te recomiendo conservar, igual
 * que si la eligieras hoy. Ninguna se deja fuera en silencio. Sin `vistas` (una selección guardada antes de que el Studio
 * las anotara), ninguna es nueva. Pura.
 */
export function conNuevas(opciones: readonly OpcionAjuste[], elegidas: readonly string[], vistas: readonly string[] | undefined): { ids: string[]; nuevas: string[] } {
  if (!vistas) return { ids: [...elegidas], nuevas: [] };
  const antes = new Set(vistas);
  const nuevas = opciones.filter((o) => !antes.has(o.id));
  return { ids: [...new Set([...elegidas, ...recomendadas(nuevas)])], nuevas: nuevas.map((o) => o.id) };
}

/**
 * Lo que el director conserva de tus ajustes, con sus valores, para el lanzador: lo elegido y, si tus ajustes cambiaron
 * desde que lo guardaste (`vistas`), lo recomendado de lo nuevo (conNuevas); {} si no hay nada que conservar.
 */
export async function conservadosDeTusAjustes(ids: readonly string[], archivo = archivoAjustesClaude(), vistas?: readonly string[]): Promise<Record<string, unknown>> {
  const ajustes = await leerTusAjustes(archivo);
  const todas = conNuevas(opcionesDeAjustes(ajustes), ids, vistas).ids;
  if (!todas.length) return {};
  return conservarDe(ajustes, todas);
}

/**
 * Todo lo conservable de tus ajustes, con sus valores, para el director que pregunta en el Studio y por eso no carga el
 * archivo (modoPermisos.ts: sus hooks no pueden correr a su lado): lo que cargaba con tus ajustes completos (tu conexión,
 * tu proxy, lo que cuida tu privacidad), menos lo que le daría un permiso. {} si no hay archivo o no es JSON válido.
 */
export async function todosDeTusAjustes(archivo = archivoAjustesClaude()): Promise<Record<string, unknown>> {
  return conservarTodo(await leerTusAjustes(archivo));
}
