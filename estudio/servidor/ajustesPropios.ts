// Tus ajustes de Claude Code en el director, clave por clave (notas de voz del titular nmvolgrmctit y nmvoljwl9tit, 25 de
// octubre de 2026: «al frente de cada uno, una explicación de para qué es», clara para quien no es experto, y elegir con
// una casilla cuáles carga el director, en vez de todo o nada; pd_arranque_limpio). Cada clave dice qué es, qué cambia si
// el director la carga, qué pasa si la deja fuera, qué recomienda el Studio y de dónde sale lo que dice (nota de voz del
// titular nmvon1s9itit, 25 de octubre de 2026: «no podemos decirle al usuario que no sabemos qué es una opción que le
// estamos ofreciendo desactivar»; lo dicho sale de la documentación oficial de Claude Code, revisada ese día). Lo que no
// está documentado se dice así, y lo que el Studio no sabe explicar viene marcado para conservar: no se quita a ciegas.
// Lo que le daría al director un permiso que el Studio no le dio no se puede elegir: cómo trabaja el director lo decide
// el Studio, igual para todo proyecto (CLAUDE.md, «Who governs when the project brought its own rules»).
// Lo lee el servidor del Studio, nunca el director (sus permisos le niegan tu archivo de ajustes).
// Los textos de cada explicación están en los archivos de idioma (estudio/src/textos/, claves «ajustes.…»); aquí van las
// claves, y se leen al armar las opciones (el idioma lo pone la página, no el momento en que carga este módulo).

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { t, type ClaveDeTexto } from '../src/textos.ts';
import { archivoAjustesClaude } from './ajustesClaude.ts';

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

/** Una explicación, con la clave de cada texto (se lee al armar las opciones: ver `hablada`). */
type Explicacion = { que: ClaveDeTexto; enElDirector: ClaveDeTexto; sinElla: ClaveDeTexto; consejo: Consejo; fuente?: string };

/** La explicación con sus textos en el idioma de ahora. */
const hablada = (e: Explicacion) => ({ ...e, que: t(e.que), enElDirector: t(e.enElDirector), sinElla: t(e.sinElla) });

// La documentación oficial de Claude Code, revisada el 25 de octubre de 2026
const REFERENCIA = 'https://code.claude.com/docs/en/settings-reference';
const DOC_HOOKS = 'https://code.claude.com/docs/en/hooks';
const DOC_ENV = 'https://code.claude.com/docs/en/env-vars';
const DOC_AUTO = 'https://code.claude.com/docs/en/auto-mode-config';
const DOC_REMOTO = 'https://code.claude.com/docs/en/remote-control';

/** Algo que solo se ve en tu terminal: el director trabaja sin pantalla (claude -p), así que no cambia nada en él. */
const pantalla = (que: ClaveDeTexto): Explicacion => ({
  que,
  enElDirector: 'ajustes.grupo.pantalla.enElDirector',
  sinElla: 'ajustes.grupo.pantalla.sinElla',
  consejo: 'igual',
});

/** Algo que el Studio ya fija en el director, en su arranque limpio: lo suyo manda. */
const loFijaElStudio = (que: ClaveDeTexto): Explicacion => ({
  que,
  enElDirector: 'ajustes.grupo.fija.enElDirector',
  sinElla: 'ajustes.grupo.fija.sinElla',
  consejo: 'igual',
});

const CONEXION: Explicacion = {
  que: 'ajustes.grupo.conexion.que',
  enElDirector: 'ajustes.grupo.conexion.enElDirector',
  sinElla: 'ajustes.grupo.conexion.sinElla',
  consejo: 'si',
};
const ESFUERZO: Explicacion = {
  que: 'ajustes.grupo.esfuerzo.que',
  enElDirector: 'ajustes.grupo.esfuerzo.enElDirector',
  sinElla: 'ajustes.grupo.esfuerzo.sinElla',
  consejo: 'no',
};
const MCP: Explicacion = {
  que: 'ajustes.grupo.mcp.que',
  enElDirector: 'ajustes.grupo.mcp.enElDirector',
  sinElla: 'ajustes.grupo.mcp.sinElla',
  consejo: 'no',
};
const PLUGINS: Explicacion = {
  que: 'ajustes.grupo.plugins.que',
  enElDirector: 'ajustes.grupo.plugins.enElDirector',
  sinElla: 'ajustes.grupo.plugins.sinElla',
  consejo: 'no',
  fuente: `${REFERENCIA}#enabledplugins`,
};
const FLUJOS: Explicacion = {
  que: 'ajustes.grupo.flujos.que',
  enElDirector: 'ajustes.grupo.flujos.enElDirector',
  sinElla: 'ajustes.grupo.flujos.sinElla',
  consejo: 'no',
};
const SKILLS: Explicacion = {
  que: 'ajustes.grupo.skills.que',
  enElDirector: 'ajustes.grupo.skills.enElDirector',
  sinElla: 'ajustes.grupo.skills.sinElla',
  consejo: 'no',
};
const COMPACTAR: Explicacion = {
  que: 'ajustes.grupo.compactar.que',
  enElDirector: 'ajustes.grupo.compactar.enElDirector',
  sinElla: 'ajustes.grupo.compactar.sinElla',
  consejo: 'no',
};
const CACHE: Explicacion = {
  que: 'ajustes.grupo.cache.que',
  enElDirector: 'ajustes.grupo.cache.enElDirector',
  sinElla: 'ajustes.grupo.cache.sinElla',
  consejo: 'igual',
};
const MODO_PERMISOS: Explicacion = {
  que: 'ajustes.grupo.modoPermisos.que',
  enElDirector: 'ajustes.grupo.modoPermisos.enElDirector',
  sinElla: 'ajustes.grupo.modoPermisos.sinElla',
  consejo: 'igual',
};
const VERSION: Explicacion = {
  que: 'ajustes.grupo.version.que',
  enElDirector: 'ajustes.grupo.version.enElDirector',
  sinElla: 'ajustes.grupo.version.sinElla',
  consejo: 'igual',
};
const SIN_PREGUNTAS: Explicacion = {
  que: 'ajustes.grupo.sinPreguntas.que',
  enElDirector: 'ajustes.grupo.sinPreguntas.enElDirector',
  sinElla: 'ajustes.nada',
  consejo: 'igual',
};

/** Lo que el Studio sabe explicar de las claves de primer nivel (las de la referencia de ajustes de Claude Code). */
const CLAVES: Record<string, Explicacion> = {
  // El modelo y cómo piensa
  model: {
    que: 'ajustes.model.que',
    enElDirector: 'ajustes.model.enElDirector',
    sinElla: 'ajustes.model.sinElla',
    consejo: 'no',
  },
  effortLevel: {
    ...ESFUERZO,
    que: 'ajustes.effortLevel.que',
  },
  modelSettings: {
    que: 'ajustes.modelSettings.que',
    enElDirector: 'ajustes.modelSettings.enElDirector',
    sinElla: 'ajustes.modelSettings.sinElla',
    consejo: 'no',
  },
  alwaysThinkingEnabled: {
    que: 'ajustes.alwaysThinkingEnabled.que',
    enElDirector: 'ajustes.alwaysThinkingEnabled.enElDirector',
    sinElla: 'ajustes.alwaysThinkingEnabled.sinElla',
    consejo: 'no',
  },
  maxEffortLevel: {
    que: 'ajustes.maxEffortLevel.que',
    enElDirector: 'ajustes.maxEffortLevel.enElDirector',
    sinElla: 'ajustes.maxEffortLevel.sinElla',
    consejo: 'no',
  },
  fastMode: {
    que: 'ajustes.fastMode.que',
    enElDirector: 'ajustes.fastMode.enElDirector',
    sinElla: 'ajustes.fastMode.sinElla',
    consejo: 'no',
  },
  fallbackModel: {
    que: 'ajustes.fallbackModel.que',
    enElDirector: 'ajustes.fallbackModel.enElDirector',
    sinElla: 'ajustes.fallbackModel.sinElla',
    consejo: 'no',
  },
  availableModels: {
    que: 'ajustes.availableModels.que',
    enElDirector: 'ajustes.availableModels.enElDirector',
    sinElla: 'ajustes.availableModels.sinElla',
    consejo: 'no',
  },
  advisorModel: {
    que: 'ajustes.advisorModel.que',
    enElDirector: 'ajustes.advisorModel.enElDirector',
    sinElla: 'ajustes.advisorModel.sinElla',
    consejo: 'no',
  },
  ultracode: {
    que: 'ajustes.ultracode.que',
    enElDirector: 'ajustes.ultracode.enElDirector',
    sinElla: 'ajustes.ultracode.sinElla',
    consejo: 'no',
  },
  enableWorkflows: FLUJOS,
  disableWorkflows: FLUJOS,
  workflowKeywordTriggerEnabled: FLUJOS,
  workflowSizeGuideline: FLUJOS,
  skipWorkflowUsageWarning: {
    que: 'ajustes.skipWorkflowUsageWarning.que',
    enElDirector: 'ajustes.skipWorkflowUsageWarning.enElDirector',
    sinElla: 'ajustes.skipWorkflowUsageWarning.sinElla',
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
    que: 'ajustes.outputStyle.que',
    enElDirector: 'ajustes.outputStyle.enElDirector',
    sinElla: 'ajustes.outputStyle.sinElla',
    consejo: 'no',
  },
  language: {
    que: 'ajustes.language.que',
    enElDirector: 'ajustes.language.enElDirector',
    sinElla: 'ajustes.language.sinElla',
    consejo: 'no',
  },
  agent: {
    que: 'ajustes.agent.que',
    enElDirector: 'ajustes.agent.enElDirector',
    sinElla: 'ajustes.agent.sinElla',
    consejo: 'no',
  },
  // Los hooks
  hooks: {
    que: 'ajustes.hooks.que',
    enElDirector: 'ajustes.hooks.enElDirector',
    sinElla: 'ajustes.hooks.sinElla',
    consejo: 'no',
    fuente: DOC_HOOKS,
  },
  statusLine: {
    que: 'ajustes.statusLine.que',
    enElDirector: 'ajustes.statusLine.enElDirector',
    sinElla: 'ajustes.statusLine.sinElla',
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
    que: 'ajustes.disabledMcpjsonServers.que',
    enElDirector: 'ajustes.disabledMcpjsonServers.enElDirector',
    sinElla: 'ajustes.disabledMcpjsonServers.sinElla',
    consejo: 'si',
  },
  // La conexión con tu cuenta
  apiKeyHelper: { ...CONEXION, que: 'ajustes.apiKeyHelper.que' },
  awsAuthRefresh: CONEXION,
  awsCredentialExport: CONEXION,
  gcpAuthRefresh: CONEXION,
  otelHeadersHelper: CONEXION,
  forceLoginMethod: { ...CONEXION, que: 'ajustes.forceLoginMethod.que', enElDirector: 'ajustes.forceLoginMethod.enElDirector' },
  forceLoginOrgUUID: { ...CONEXION, que: 'ajustes.forceLoginOrgUUID.que', enElDirector: 'ajustes.forceLoginOrgUUID.enElDirector' },
  forceLoginGatewayUrl: CONEXION,
  // Remote Control y lo que se publica en claude.ai
  disableRemoteControl: {
    que: 'ajustes.disableRemoteControl.que',
    enElDirector: 'ajustes.disableRemoteControl.enElDirector',
    sinElla: 'ajustes.disableRemoteControl.sinElla',
    consejo: 'igual',
    fuente: `${REFERENCIA}#disableremotecontrol`,
  },
  remoteControlAtStartup: {
    que: 'ajustes.remoteControlAtStartup.que',
    enElDirector: 'ajustes.remoteControlAtStartup.enElDirector',
    sinElla: 'ajustes.nada',
    consejo: 'igual',
    fuente: DOC_REMOTO,
  },
  agentPushNotifEnabled: {
    que: 'ajustes.agentPushNotifEnabled.que',
    enElDirector: 'ajustes.agentPushNotifEnabled.enElDirector',
    sinElla: 'ajustes.avisanSiguen',
    consejo: 'no',
    fuente: `${REFERENCIA}#agentpushnotifenabled`,
  },
  inputNeededNotifEnabled: {
    que: 'ajustes.inputNeededNotifEnabled.que',
    enElDirector: 'ajustes.inputNeededNotifEnabled.enElDirector',
    sinElla: 'ajustes.avisanSiguen',
    consejo: 'no',
  },
  enableArtifact: {
    que: 'ajustes.enableArtifact.que',
    enElDirector: 'ajustes.enableArtifact.enElDirector',
    sinElla: 'ajustes.noPublica',
    consejo: 'igual',
    fuente: 'https://code.claude.com/docs/en/artifacts',
  },
  disableArtifact: {
    que: 'ajustes.disableArtifact.que',
    enElDirector: 'ajustes.disableArtifact.enElDirector',
    sinElla: 'ajustes.noPublica',
    consejo: 'igual',
  },
  autoUploadSessions: {
    que: 'ajustes.autoUploadSessions.que',
    enElDirector: 'ajustes.autoUploadSessions.enElDirector',
    sinElla: 'ajustes.autoUploadSessions.sinElla',
    consejo: 'no',
    fuente: 'https://github.com/anthropics/claude-code/issues/86991',
  },
  // Los permisos y su modo
  autoMode: {
    que: 'ajustes.autoMode.que',
    enElDirector: 'ajustes.autoMode.enElDirector',
    sinElla: 'ajustes.autoMode.sinElla',
    consejo: 'no',
    fuente: DOC_AUTO,
  },
  disableAutoMode: MODO_PERMISOS,
  skipAutoPermissionPrompt: MODO_PERMISOS,
  skipDangerousModePermissionPrompt: MODO_PERMISOS,
  useAutoModeDuringPlan: MODO_PERMISOS,
  sandbox: {
    que: 'ajustes.sandbox.que',
    enElDirector: 'ajustes.sandbox.enElDirector',
    sinElla: 'ajustes.sandbox.sinElla',
    consejo: 'igual',
  },
  skipWebFetchPreflight: {
    que: 'ajustes.skipWebFetchPreflight.que',
    enElDirector: 'ajustes.skipWebFetchPreflight.enElDirector',
    sinElla: 'ajustes.skipWebFetchPreflight.sinElla',
    consejo: 'no',
  },
  // Lo que el Studio ya fija en su arranque limpio
  disableAllHooks: loFijaElStudio('ajustes.disableAllHooks.que'),
  autoMemoryEnabled: loFijaElStudio('ajustes.autoMemoryEnabled.que'),
  autoMemoryDirectory: loFijaElStudio('ajustes.autoMemoryDirectory.que'),
  includeGitInstructions: loFijaElStudio('ajustes.includeGitInstructions.que'),
  claudeMdExcludes: loFijaElStudio('ajustes.claudeMdExcludes.que'),
  disableClaudeAiConnectors: loFijaElStudio('ajustes.disableClaudeAiConnectors.que'),
  // Firmas, archivos y órdenes
  includeCoAuthoredBy: {
    que: 'ajustes.includeCoAuthoredBy.que',
    enElDirector: 'ajustes.includeCoAuthoredBy.enElDirector',
    sinElla: 'ajustes.includeCoAuthoredBy.sinElla',
    consejo: 'igual',
  },
  attribution: {
    que: 'ajustes.attribution.que',
    enElDirector: 'ajustes.attribution.enElDirector',
    sinElla: 'ajustes.attribution.sinElla',
    consejo: 'igual',
  },
  cleanupPeriodDays: {
    que: 'ajustes.cleanupPeriodDays.que',
    enElDirector: 'ajustes.cleanupPeriodDays.enElDirector',
    sinElla: 'ajustes.cleanupPeriodDays.sinElla',
    consejo: 'igual',
  },
  plansDirectory: { que: 'ajustes.plansDirectory.que', enElDirector: 'ajustes.plansDirectory.enElDirector', sinElla: 'ajustes.nada', consejo: 'igual' },
  bashOutputMaxChars: { que: 'ajustes.bashOutputMaxChars.que', enElDirector: 'ajustes.bashOutputMaxChars.enElDirector', sinElla: 'ajustes.bashOutputMaxChars.sinElla', consejo: 'igual' },
  defaultShell: { que: 'ajustes.defaultShell.que', enElDirector: 'ajustes.defaultShell.enElDirector', sinElla: 'ajustes.nada', consejo: 'igual' },
  respectGitignore: { que: 'ajustes.respectGitignore.que', enElDirector: 'ajustes.respectGitignore.enElDirector', sinElla: 'ajustes.respectGitignore.sinElla', consejo: 'igual' },
  fileCheckpointingEnabled: { que: 'ajustes.fileCheckpointingEnabled.que', enElDirector: 'ajustes.fileCheckpointingEnabled.enElDirector', sinElla: 'ajustes.nada', consejo: 'igual' },
  askUserQuestionTimeout: SIN_PREGUNTAS,
  dialogExpiry: SIN_PREGUNTAS,
  autoContinueAtUsageLimit: { que: 'ajustes.autoContinueAtUsageLimit.que', enElDirector: 'ajustes.autoContinueAtUsageLimit.enElDirector', sinElla: 'ajustes.nada', consejo: 'igual' },
  // Versiones
  autoUpdates: VERSION,
  autoUpdatesChannel: VERSION,
  minimumVersion: VERSION,
  // Lo que solo se ve en tu terminal
  theme: pantalla('ajustes.theme.que'),
  tui: pantalla('ajustes.tui.que'),
  verbose: pantalla('ajustes.verbose.que'),
  viewMode: pantalla('ajustes.viewMode.que'),
  editorMode: pantalla('ajustes.editorMode.que'),
  vimInsertModeRemaps: pantalla('ajustes.vimInsertModeRemaps.que'),
  keybindingFlavor: pantalla('ajustes.keybindingFlavor.que'),
  spinnerTipsEnabled: pantalla('ajustes.spinnerTipsEnabled.que'),
  spinnerTipsOverride: pantalla('ajustes.spinnerTipsOverride.que'),
  spinnerVerbs: pantalla('ajustes.spinnerVerbs.que'),
  prefersReducedMotion: pantalla('ajustes.prefersReducedMotion.que'),
  preferredNotifChannel: pantalla('ajustes.preferredNotifChannel.que'),
  companyAnnouncements: pantalla('ajustes.companyAnnouncements.que'),
  feedbackSurveyState: pantalla('ajustes.feedbackSurveyState.que'),
  feedbackSurveyRate: pantalla('ajustes.feedbackSurveyRate.que'),
  feedbackDrafts: pantalla('ajustes.feedbackDrafts.que'),
  voice: pantalla('ajustes.voice.que'),
  voiceEnabled: pantalla('ajustes.voiceEnabled.que'),
  showThinkingSummaries: pantalla('ajustes.showThinkingSummaries.que'),
  showTurnDuration: pantalla('ajustes.showTurnDuration.que'),
  showClearContextOnPlanAccept: pantalla('ajustes.showClearContextOnPlanAccept.que'),
  promptSuggestionEnabled: pantalla('ajustes.promptSuggestionEnabled.que'),
  autoScrollEnabled: pantalla('ajustes.autoScrollEnabled.que'),
  awaySummaryEnabled: pantalla('ajustes.awaySummaryEnabled.que'),
  emojiCompletionEnabled: pantalla('ajustes.emojiCompletionEnabled.que'),
  maxProseWidth: pantalla('ajustes.maxProseWidth.que'),
  syntaxHighlightingDisabled: pantalla('ajustes.syntaxHighlightingDisabled.que'),
  terminalProgressBarEnabled: pantalla('ajustes.terminalProgressBarEnabled.que'),
  terminalTitleFromRename: pantalla('ajustes.terminalTitleFromRename.que'),
  timeFormat: pantalla('ajustes.timeFormat.que'),
  timeZone: pantalla('ajustes.timeZone.que'),
  wheelScrollAccelerationEnabled: pantalla('ajustes.wheelScrollAccelerationEnabled.que'),
  axScreenReader: pantalla('ajustes.axScreenReader.que'),
  spellcheck: pantalla('ajustes.spellcheck.que'),
  footerLinksRegexes: pantalla('ajustes.footerLinksRegexes.que'),
  subagentStatusLine: pantalla('ajustes.subagentStatusLine.que'),
  fileSuggestion: pantalla('ajustes.fileSuggestion.que'),
  teammateMode: pantalla('ajustes.teammateMode.que'),
  disableDeepLinkRegistration: pantalla('ajustes.disableDeepLinkRegistration.que'),
};

/** Las partes de `permissions`, cada una por separado: unas suman cuidado, otras le darían un permiso al director. */
const PERMISOS: Record<string, Explicacion> = {
  allow: { que: 'ajustes.permisos.allow.que', enElDirector: 'ajustes.permisos.allow.enElDirector', sinElla: 'ajustes.permisos.allow.sinElla', consejo: 'nunca' },
  additionalDirectories: { que: 'ajustes.permisos.additionalDirectories.que', enElDirector: 'ajustes.permisos.additionalDirectories.enElDirector', sinElla: 'ajustes.permisos.additionalDirectories.sinElla', consejo: 'nunca' },
  deny: { que: 'ajustes.permisos.deny.que', enElDirector: 'ajustes.permisos.deny.enElDirector', sinElla: 'ajustes.permisos.deny.sinElla', consejo: 'si' },
  ask: { que: 'ajustes.permisos.ask.que', enElDirector: 'ajustes.permisos.ask.enElDirector', sinElla: 'ajustes.permisos.ask.sinElla', consejo: 'igual' },
  defaultMode: { que: 'ajustes.permisos.defaultMode.que', enElDirector: 'ajustes.permisos.defaultMode.enElDirector', sinElla: 'ajustes.nada', consejo: 'igual' },
  disableBypassPermissionsMode: { que: 'ajustes.permisos.disableBypassPermissionsMode.que', enElDirector: 'ajustes.permisos.disableBypassPermissionsMode.enElDirector', sinElla: 'ajustes.permisos.disableBypassPermissionsMode.sinElla', consejo: 'si' },
  blockReadsOutsideWorkingDirectories: { que: 'ajustes.permisos.blockReadsOutsideWorkingDirectories.que', enElDirector: 'ajustes.permisos.blockReadsOutsideWorkingDirectories.enElDirector', sinElla: 'ajustes.permisos.blockReadsOutsideWorkingDirectories.sinElla', consejo: 'igual' },
};

/** Las variables de entorno de Claude Code que el Studio sabe explicar, por su nombre (de su página de variables). */
const VARIABLES: Record<string, Explicacion> = {
  DISABLE_FEEDBACK_COMMAND: { que: 'ajustes.env.DISABLE_FEEDBACK_COMMAND.que', enElDirector: 'ajustes.env.DISABLE_FEEDBACK_COMMAND.enElDirector', sinElla: 'ajustes.env.DISABLE_FEEDBACK_COMMAND.sinElla', consejo: 'si' },
  DISABLE_BUG_COMMAND: { que: 'ajustes.env.DISABLE_BUG_COMMAND.que', enElDirector: 'ajustes.env.DISABLE_BUG_COMMAND.enElDirector', sinElla: 'ajustes.env.DISABLE_BUG_COMMAND.sinElla', consejo: 'si' },
  DISABLE_COST_WARNINGS: { que: 'ajustes.env.DISABLE_COST_WARNINGS.que', enElDirector: 'ajustes.env.DISABLE_COST_WARNINGS.enElDirector', sinElla: 'ajustes.nada', consejo: 'igual' },
  DISABLE_PROMPT_CACHING: { ...CACHE, que: 'ajustes.env.DISABLE_PROMPT_CACHING.que', enElDirector: 'ajustes.env.DISABLE_PROMPT_CACHING.enElDirector', consejo: 'no' },
  DISABLE_AUTO_COMPACT: { ...COMPACTAR, que: 'ajustes.env.DISABLE_AUTO_COMPACT.que' },
  DISABLE_COMPACT: { ...COMPACTAR, que: 'ajustes.env.DISABLE_COMPACT.que' },
  DISABLE_INTERLEAVED_THINKING: { ...ESFUERZO, que: 'ajustes.env.DISABLE_INTERLEAVED_THINKING.que', enElDirector: 'ajustes.env.DISABLE_INTERLEAVED_THINKING.enElDirector' },
  CLAUDE_CODE_DISABLE_THINKING: { ...ESFUERZO, que: 'ajustes.env.CLAUDE_CODE_DISABLE_THINKING.que', enElDirector: 'ajustes.env.CLAUDE_CODE_DISABLE_THINKING.enElDirector' },
  CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING: { ...ESFUERZO, que: 'ajustes.env.CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING.que' },
  CLAUDE_CODE_EFFORT_LEVEL: { ...ESFUERZO, que: 'ajustes.env.CLAUDE_CODE_EFFORT_LEVEL.que', enElDirector: 'ajustes.env.CLAUDE_CODE_EFFORT_LEVEL.enElDirector' },
  CLAUDE_CODE_DISABLE_CLAUDE_MDS: { que: 'ajustes.env.CLAUDE_CODE_DISABLE_CLAUDE_MDS.que', enElDirector: 'ajustes.env.CLAUDE_CODE_DISABLE_CLAUDE_MDS.enElDirector', sinElla: 'ajustes.env.CLAUDE_CODE_DISABLE_CLAUDE_MDS.sinElla', consejo: 'no' },
  CLAUDE_CODE_DISABLE_WEB_FETCH: { que: 'ajustes.env.CLAUDE_CODE_DISABLE_WEB_FETCH.que', enElDirector: 'ajustes.env.CLAUDE_CODE_DISABLE_WEB_FETCH.enElDirector', sinElla: 'ajustes.env.CLAUDE_CODE_DISABLE_WEB_FETCH.sinElla', consejo: 'no' },
  CLAUDE_CODE_DISABLE_WORKFLOWS: FLUJOS,
  CLAUDE_CODE_DISABLE_BUNDLED_SKILLS: SKILLS,
  CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS: { ...SKILLS, que: 'ajustes.env.CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS.que', enElDirector: 'ajustes.env.CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS.enElDirector' },
  CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: { ...SKILLS, que: 'ajustes.env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS.que', enElDirector: 'ajustes.env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS.enElDirector' },
  CLAUDE_CODE_DISABLE_AUTO_MEMORY: loFijaElStudio('ajustes.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY.que'),
  CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS: loFijaElStudio('ajustes.env.CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS.que'),
  CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: pantalla('ajustes.env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY.que'),
  CLAUDE_CODE_DISABLE_TERMINAL_TITLE: pantalla('ajustes.env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE.que'),
  CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN: pantalla('ajustes.env.CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN.que'),
  CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL: pantalla('ajustes.env.CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL.que'),
  CLAUDE_CODE_DISABLE_MOUSE: pantalla('ajustes.env.CLAUDE_CODE_DISABLE_MOUSE.que'),
  CLAUDE_CODE_DISABLE_MOUSE_CLICKS: pantalla('ajustes.env.CLAUDE_CODE_DISABLE_MOUSE_CLICKS.que'),
};
const PRIVACIDAD: Explicacion = { que: 'ajustes.grupo.privacidad.que', enElDirector: 'ajustes.grupo.privacidad.enElDirector', sinElla: 'ajustes.grupo.privacidad.sinElla', consejo: 'si' };
const ORDEN_OCULTA: Explicacion = { que: 'ajustes.grupo.ordenOculta.que', enElDirector: 'ajustes.grupo.ordenOculta.enElDirector', sinElla: 'ajustes.grupo.ordenOculta.sinElla', consejo: 'igual' };

/** Una variable de entorno, por su nombre (el valor nunca se lee para esto). */
function explicarVariable(nombre: string): Explicacion {
  const conocida = VARIABLES[nombre.toUpperCase()];
  if (conocida) return { ...conocida, fuente: conocida.fuente ?? DOC_ENV };
  if (/^(DISABLE_(TELEMETRY|ERROR_REPORTING|AUTOUPDATER|GROWTHBOOK|UPDATES)|CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC)$/i.test(nombre)) return { ...PRIVACIDAD, fuente: DOC_ENV };
  if (/^DISABLE_PROMPT_CACHING_/i.test(nombre)) return { ...VARIABLES.DISABLE_PROMPT_CACHING, fuente: DOC_ENV };
  if (/^DISABLE_\w+_COMMAND$|^DISABLE_INSTALLATION_CHECKS$/i.test(nombre)) return { ...ORDEN_OCULTA, fuente: DOC_ENV };
  if (/^ANTHROPIC_(MODEL|DEFAULT_\w+_MODEL|SMALL_FAST_MODEL)$/i.test(nombre)) return { ...CLAVES.model, que: 'ajustes.grupo.envModelo.que', fuente: DOC_ENV };
  if (/THINKING|MAX_OUTPUT_TOKENS|EFFORT/i.test(nombre)) return { ...ESFUERZO, fuente: DOC_ENV };
  if (/^(ANTHROPIC_|CLAUDE_CODE_USE_|AWS_|GOOGLE_|CLOUD_ML_|VERTEX_|HTTPS?_PROXY$|NO_PROXY$|NODE_EXTRA_CA_CERTS$)/i.test(nombre))
    return { ...CONEXION, que: 'ajustes.grupo.envConexion.que', fuente: DOC_ENV };
  if (/^CLAUDE_CODE_DISABLE_/i.test(nombre))
    return { que: 'ajustes.grupo.envDisable.que', enElDirector: 'ajustes.grupo.envDisable.enElDirector', sinElla: 'ajustes.grupo.envDisable.sinElla', consejo: 'si', fuente: DOC_ENV };
  return { que: 'ajustes.grupo.envPropia.que', enElDirector: 'ajustes.grupo.envPropia.enElDirector', sinElla: 'ajustes.grupo.envPropia.sinElla', consejo: 'no' };
}

/**
 * Una clave que el Studio no sabe explicar: no está en la referencia oficial de Claude Code ni en su lista. No se ofrece
 * quitarla a ciegas (nota de voz del titular nmvon1s9itit): viene marcada para conservar, que deja al director como hoy.
 */
const NO_DOCUMENTADA: Explicacion = {
  que: 'ajustes.grupo.noDocumentada.que',
  enElDirector: 'ajustes.grupo.noDocumentada.enElDirector',
  sinElla: 'ajustes.grupo.noDocumentada.sinElla',
  consejo: 'si',
  fuente: REFERENCIA,
};

const esObjeto = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const contenido = (v: unknown): string | undefined => (Array.isArray(v) ? t('ajustes.lista', { n: v.length }) : esObjeto(v) ? (Object.keys(v).length ? Object.keys(v).join(', ') : t('ajustes.vacio')) : undefined);
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
        opciones.push({ id: `${clave}.${sub}`, nombre: `${clave} › ${sub}`, ...(clave === 'permissions' && contenido(v) ? { dentro: contenido(v) } : {}), ...hablada(e) });
      }
      continue;
    }
    const e = explicarClave(clave);
    opciones.push({ id: clave, nombre: clave, ...(contenido(valor) ? { dentro: contenido(valor) } : {}), ...hablada(e) });
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
