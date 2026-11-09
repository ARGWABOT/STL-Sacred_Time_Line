// Los casos fijos del núcleo del director (propuesta aceptada «El núcleo del director, medido con casos fijos»,
// pr_nucleo_medido, punto 2): los 17 errores del director que no deben repetirse, sacados de las notas del titular y
// aprobados el 26 de octubre de 2026 en docs/director/casos-fijos.md, cada uno con lo que el director debe hacer. Cada caso
// se mide antes de cambiar las reglas, el encargo o la bandeja: por código, donde ya hay una barrera (y el caso comprueba
// que siga en pie), y con una pauta que califica otro modelo, donde no. Lo que lee la persona va en español; la pauta, que
// lee el modelo que califica, nace en inglés (decisión del titular del 23 de octubre de 2026). Cada error nuevo que señale
// el titular se suma aquí, en su grupo.

/** Los tres grupos de «Los errores del director que no deben repetirse», en su orden. */
export const GRUPOS_DE_CASOS = {
  orden: 'Lo que se perdía o llegaba fuera de orden',
  pasos: 'Los pasos que no se entendían o te atrapaban',
  proceso: 'Las fallas del proceso',
} as const;

/** Lo que en el código ya impide un error: lo que exporta un archivo del Studio, que el caso comprueba que siga ahí. */
export interface Barrera {
  archivo: string;
  nombre: string;
}

export interface CasoFijo {
  id: string;
  grupo: keyof typeof GRUPOS_DE_CASOS;
  titulo: string;
  /** Cuándo pasó, según las notas del titular. */
  cuando: string;
  /** Lo que debe hacer el director. */
  debe: string;
  /** Lo que ya lo impide en el código, entero (`toda`) o a medias. */
  barreras: Barrera[];
  toda: boolean;
  /** La pauta con que otro modelo califica lo que el código no comprueba; sin ella, lo mide solo la barrera. */
  pauta?: string;
}

const b = (archivo: string, ...nombres: string[]): Barrera[] => nombres.map((nombre) => ({ archivo, nombre }));
const DIRECTOR = 'src/director/director.ts';

export const CASOS_FIJOS: CasoFijo[] = [
  // ── Lo que se perdía o llegaba fuera de orden
  { id: 'c_peticion_sin_pedido', grupo: 'orden', titulo: 'Peticiones que no llegaban al plan', cuando: '22 y 23 de octubre', debe: 'Cada nota que pide trabajo deja su pedido con su fase en la misma revisión, y su respuesta lleva a él.', barreras: b(DIRECTOR, 'respuestasSinDestino', 'respuestasALaFaseEntera'), toda: true },
  { id: 'c_cierre_antes_de_tiempo', grupo: 'orden', titulo: 'Ofrecer subir el Studio «terminado» con lo aprobado sin hacer', cuando: '22 de octubre', debe: 'Nada que cierre la fase mientras quede algo aprobado o pedido sin hacer de ella o de antes.', barreras: b(DIRECTOR, 'esperaAlCierre'), toda: true },
  { id: 'c_sin_mision', grupo: 'orden', titulo: 'Quedarse sin misión, o con una o dos', cuando: '21 al 23 y 29 de octubre', debe: 'La reserva cuenta solo lo que la persona alcanza sin una revisión de por medio, la cola del director va aparte y, mientras tenga algo, la persona tiene sus diez.', barreras: b(DIRECTOR, 'reservaDeMisiones', 'colaDelDirector'), toda: true },
  { id: 'c_pedir_lo_hecho', grupo: 'orden', titulo: 'Pedir lo ya hecho', cuando: '19 y 21 de octubre', debe: 'Cada pendiente se cruza con lo hecho antes de cerrar, y lo ya hecho no se vuelve a pedir.', barreras: [...b(DIRECTOR, 'pendientePorComprobar'), ...b('src/director/buscar.ts', 'puedeQueYaEsteHecho')], toda: true },
  { id: 'c_prueba_antes_de_tiempo', grupo: 'orden', titulo: 'La prueba de instalación antes de tiempo', cuando: '22 de octubre', debe: 'Cada prueba va después de todo lo aprobado que cambia lo que ella mide; si conviene antes, una versión barata que no se repite.', barreras: b(DIRECTOR, 'productoPorTerminar', 'sinDecirSiCambiaProducto'), toda: false, pauta: 'A test with people, on another computer or with a client must come after every approved change that alters what it measures. Fail if any new mission asks for such a test while approved work that changes it is still pending, unless it is explicitly a cheap version that will not be repeated.' },
  { id: 'c_orden_aleatorio', grupo: 'orden', titulo: 'Misiones en orden aleatorio', cuando: '23 de octubre', debe: 'Cada misión va donde se necesita: lo que solo sirve al cierre, al cierre; una decisión que cambia la ruta, lo antes posible; ver lo hecho, justo después.', barreras: b(DIRECTOR, 'esperaA', 'colaSinOrden'), toda: false, pauta: "Each mission must sit where it is needed: what only serves the closing goes at the closing; a decision that can change the route or the scope goes as early as possible; seeing what the director just did goes right after it. Fail if a mission comes before what it needs, or if its 'porQue' does not say why it goes at that point." },
  // ── Los pasos que no se entendían o te atrapaban
  { id: 'c_revision_en_mision', grupo: 'pasos', titulo: 'Una misión que pedía una revisión, o preguntaba por lo que solo pasa durante ella', cuando: '1 de noviembre', debe: 'Ninguna misión pide una revisión ni manda a mirar algo durante una: lo que se ve en ella se pregunta después, y solo la última misión abierta del lote la recomienda.', barreras: b(DIRECTOR, 'misionesDeFuturo'), toda: true },
  { id: 'c_paso_atrapa', grupo: 'pasos', titulo: 'Un paso que atrapaba', cuando: '23 de octubre', debe: 'Todo paso tiene una salida: si no sale, la persona sigue con otra misión y el director lo atiende.', barreras: b(DIRECTOR, 'pasosSinMarcar'), toda: true },
  { id: 'c_paso_sin_que_mirar', grupo: 'pasos', titulo: 'Un paso que mandaba a un documento sin decir qué mirar ni cómo volver', cuando: '18 al 26 de octubre', debe: 'Un paso que manda a un lugar trae su botón, dice qué mirar ahí, qué responder y cómo volver.', barreras: b(DIRECTOR, 'pasosSinBoton'), toda: false, pauta: 'A step that sends the person somewhere must say what to look at there, what to answer, and how to come back. Fail if a step only says "open" or "read" without saying what to look for or what to do next.' },
  { id: 'c_repositorio_sin_explicar', grupo: 'pasos', titulo: 'Crear un repositorio sin explicarlo, y un permiso dado a otra cuenta', cuando: '21 de octubre', debe: 'Un paso que crea o configura algo afuera dice por qué y comprueba lo que se puede leer (la cuenta, la rama).', barreras: b(DIRECTOR, 'cumpleComprobacion'), toda: false, pauta: 'A step that creates or configures something outside the Studio (an account, a repository, a permission) must explain why, and must check what can be read (the account, the branch) with its check. Fail if it does not explain why, or if what can be read is left unchecked.' },
  { id: 'c_paso_sin_salida', grupo: 'pasos', titulo: 'Un paso sin salida clara', cuando: '19 al 21 de octubre', debe: 'Las opciones aceptan lo ya contado, y lo que se puede leer se comprueba solo.', barreras: b(DIRECTOR, 'YA_LO_DIJE'), toda: true },
  // ── Las fallas del proceso
  { id: 'c_revision_sola', grupo: 'proceso', titulo: 'Revisiones que se pedían solas', cuando: '21 y 23 de octubre', debe: 'Solo una persona pide una revisión, con un botón que dice que la pide.', barreras: b('src/director/proyectos.ts', 'ORIGENES_REVISION'), toda: true },
  { id: 'c_fallida_que_cerro', grupo: 'proceso', titulo: 'Una revisión dada por fallida que sí cerró', cuando: '21 de octubre', debe: 'El cierre lo dice el plan, y lo que de verdad no se cerró se retoma solo en lo que faltó.', barreras: b('estudio/servidor/revisor.ts', 'diagnosticarFalla'), toda: true },
  { id: 'c_dos_directores', grupo: 'proceso', titulo: 'Dos directores o dos servidores a la vez', cuando: '21 y 22 de octubre', debe: 'Un solo servidor y un solo director a la vez, y el director se detiene poco después de cerrar.', barreras: [...b('estudio/servidor/unico.ts', 'tomarCandado'), ...b('estudio/servidor/revisor.ts', 'detenerTrasCierre')], toda: true },
  // Su escenario y su pauta, como dicen las reglas (propuesta aceptada pr_caso_autorizo_escenario, 30 de octubre de 2026)
  { id: 'c_autorizar_sin_casilla', grupo: 'proceso', titulo: '«Autorizar» que no autorizaba', cuando: '19 al 26 de octubre', debe: 'Un permiso que da el panel se autoriza ahí, con su casilla y un botón que lleva a ella; «Autorizo» solo para lo que el panel no ofrece, con lo que cambia y cuesta a la vista.', barreras: [...b('estudio/servidor/permisosNegados.ts', 'revisarPedido', 'permisosNegados'), ...b(DIRECTOR, 'autorizoSinPermiso')], toda: false, pauta: 'In this situation the permission the person asks about (installing the testing browser, "npx playwright install chromium") was denied in the previous launch, so it is already in the «Permisos» panel as the general permission of its kind of action, with its checkbox, and the inbox listed it. When the panel offers a permission, the director must lead the person to it with a button ({ "vista": "modelo", "ancla": "m-permisos" }, in the answer\'s destination or in a step) and say which checkbox to mark, with no «Autorizo» option: the click of an option only leaves a note. «Autorizo» is right only for what the panel does not offer (several commands together, a path without a folder, installing something it does not list), in a step with what it changes and what it costs in view. Fail if the director offers «Autorizo» for a permission the panel gives, if it only says in words where to authorize without a button to the panel, or if it offers «Autorizo» for something else without saying what it changes and costs.' },
  { id: 'c_recargas_a_pedazos', grupo: 'proceso', titulo: 'Recargas a pedazos durante la revisión', cuando: '21 de octubre', debe: 'Una sola recarga al final, anunciada.', barreras: b('estudio/servidor/recarga.ts', 'contenerRecargas'), toda: true },
  { id: 'c_aviso_sin_salida', grupo: 'proceso', titulo: 'Avisar un problema sin su salida, y comentarios repetidos', cuando: '18 y 21 de octubre', debe: 'Todo aviso de un problema trae su misión, y el comentario no repite lo avanzado.', barreras: b(DIRECTOR, 'mensajeRepite', 'mensajeRepiteAnterior'), toda: false, pauta: 'Every problem the director reports to the person must come with its way out (a mission step, or what the director did about it). Fail if the message or a reply warns about a problem and leaves the person without a next step.' },
  { id: 'c_cortes_sin_sentido', grupo: 'proceso', titulo: 'Cortes de lectura sin sentido', cuando: '19 de octubre', debe: 'El corte nunca deja un título solo ni parte un bloque: el subtítulo va con lo que presenta.', barreras: b(DIRECTOR, 'ideasSueltas'), toda: true },
];
