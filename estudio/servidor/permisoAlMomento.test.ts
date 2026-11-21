import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { negadosEnVivo } from '../../src/director/director';
import { avisosDelSonido, EsperaDePermisos, lineasDeNegadosSinDecidir, MAX_AVISOS, ordenesQueFaltan, porQueNoSiempre, queAnotarDeLaLlamada, queAnotarDeLaRespuesta, REPETIR_SONIDO_MS, RESPUESTAS, respuestaDelGancho, respuestaValida, solicitudDelGancho, soloEnEsteProyecto, TOPE_GANCHO_MS, type SolicitudDePermiso } from './permisoAlMomento';
import { textoDeBitacora, type TextoBitacora } from '../../src/director/textoBitacora';

/** Lo que arman estas funciones son tipos fijos; aquí se miran ya dichos, en el idioma de ahora. */
const dichas = (x: { que: TextoBitacora; desde: TextoBitacora }) => ({ que: textoDeBitacora(x.que), desde: textoDeBitacora(x.desde) });
import { es } from '../src/textos/es';
import { NEGACION, negadosDe, NUNCA_SIEMPRE, ordenPermitida, permisosNegados, rutaPermitida } from './permisosNegados';
import { conAutorizadas, negado, permitido, SIN_ESPERAS } from './revisor';

// El único modo de permisos (documento «One permission mode»): la lista segura ya dada, lo que nunca, las cuatro respuestas,
// la espera sin límite de tiempo con su pausa, y el sonido del diálogo
const CASA = String.raw`C:\Users\ana`;
const STUDIO = String.raw`C:\xampp\STL`;
const GOLF = String.raw`C:\repos\golf`;
const prohibidas = [...new Set([...SIN_ESPERAS, ...negado(GOLF, STUDIO), ...NUNCA_SIEMPRE])];

const SEG = 1000;
const T0 = 1_000_000;
const curl: SolicitudDePermiso = { herramienta: 'Bash', entrada: { command: 'curl -s http://localhost:5180/__estudio/voz/lista' } };
const gitLog: SolicitudDePermiso = { herramienta: 'Bash', entrada: { command: 'git log --oneline -5' } };
const lee: SolicitudDePermiso = { herramienta: 'Read', entrada: { file_path: String.raw`D:\notas\idea.md` } };
const push: SolicitudDePermiso = { herramienta: 'Bash', entrada: { command: 'git push --force origin main' } };
const ssh: SolicitudDePermiso = { herramienta: 'Read', entrada: { file_path: String.raw`C:\Users\ana\.ssh\id_rsa` } };
const cadena: SolicitudDePermiso = { herramienta: 'Bash', entrada: { command: 'cd x && curl -s http://y' } };
const nueva = () => new EsperaDePermisos('golf', prohibidas, CASA);

const HORA = 60 * 60_000;

describe('las constantes del modo único', () => {
  it('el sonido cada 30 segundos, hasta 4 veces; el tope del gancho es técnico (un día) y no hay límite de dos minutos', () => {
    expect(REPETIR_SONIDO_MS).toBe(30_000);
    expect(MAX_AVISOS).toBe(4);
    expect(TOPE_GANCHO_MS).toBe(24 * HORA);
    // Lo de la espera de dos minutos, la persona ausente y «Permitir todo» ya no existe
    const modulo = readFileSync(new URL('./permisoAlMomento.ts', import.meta.url), 'utf8');
    for (const viejo of ['ESPERA_PERMISO_MS', 'venceEn', 'vencer(', 'ausente', "'todo'"]) expect(modulo, viejo).not.toContain(viejo);
    const espera = nueva() as unknown as Record<string, unknown>;
    for (const viejo of ['vencer', 'ausente', 'todoPermitido']) expect(espera[viejo], viejo).toBeUndefined();
  });
});

// (1) La lista corta y segura ya está dada al director: lo que el lanzador le pasa en --allowedTools (revisor.ts › permitido
// y conAutorizadas). Lo que no está ahí llega al gancho y se pregunta
describe('lo seguro ya está dado al director, sin preguntar', () => {
  const dadas = conAutorizadas(permitido(GOLF, false, STUDIO, CASA), []);
  const orden = (command: string): SolicitudDePermiso => ({ herramienta: 'Bash', entrada: { command } });

  it('leer y buscar: dentro del repositorio del proyecto y del Studio, con las herramientas de buscar en internet', () => {
    expect(rutaPermitida(false, String.raw`C:\repos\golf\src\a.ts`, dadas, CASA)).toBe(true);
    expect(rutaPermitida(false, String.raw`C:\xampp\STL\CLAUDE.md`, dadas, CASA)).toBe(true);
    for (const r of ['WebSearch', 'WebFetch']) expect(dadas).toContain(r);
    for (const c of ['ls -la', 'git show HEAD', 'git ls-files', 'wc -l x']) expect(ordenPermitida(c, dadas), c).toBe(true);
    // Fuera de esas carpetas, no
    expect(rutaPermitida(false, String.raw`D:\notas\idea.md`, dadas, CASA)).toBe(false);
  });

  it('editar: dentro del repositorio del proyecto y su memoria (.stl), no fuera', () => {
    expect(rutaPermitida(true, String.raw`C:\repos\golf\src\a.ts`, dadas, CASA)).toBe(true);
    expect(rutaPermitida(true, String.raw`C:\repos\golf\.stl\memoria.md`, dadas, CASA)).toBe(true);
    expect(rutaPermitida(true, String.raw`D:\notas\idea.md`, dadas, CASA)).toBe(false);
    // El código del Studio no se edita desde otro proyecto
    expect(rutaPermitida(true, String.raw`C:\xampp\STL\estudio\servidor\api.ts`, dadas, CASA)).toBe(false);
  });

  it('correr las pruebas y los tipos', () => {
    for (const c of ['npm test', 'npm test -- permisos', 'npx vitest run estudio/servidor/api.test.ts', 'npm run typecheck']) expect(ordenPermitida(c, dadas), c).toBe(true);
  });

  it('commits locales (y mirar el estado), nunca subir', () => {
    for (const c of ['git add -A', 'git commit -m "x"', 'git status', 'git diff', 'git log --oneline -5']) expect(ordenPermitida(c, dadas), c).toBe(true);
  });

  it('subir, traer, instalar un paquete y una orden desconocida no están dados: llegan al gancho y se preguntan', () => {
    for (const c of ['git push origin main', 'git pull', 'git fetch origin', 'npm install lodash', 'npm i lodash', 'pip install requests', 'curl -s http://y', 'orden-desconocida --x']) {
      expect(ordenPermitida(c, dadas), c).toBe(false);
      const e = new EsperaDePermisos('golf', prohibidas, CASA, dadas);
      const p = e.pedir(orden(c), T0);
      expect(p.decision, c).toBeNull();
      expect(e.pendientes(), c).toHaveLength(1);
    }
    // «npm install» a secas (lo que dice package.json) sí está dado; con un paquete, no
    expect(ordenPermitida('npm install', dadas)).toBe(true);
    // Lo que el titular autorizó en «Permisos» se suma a lo dado, sin repetir
    expect(conAutorizadas(['Bash(git status:*)'], ['Bash(git push:*)', 'Bash(git status:*)'])).toEqual(['Bash(git status:*)', 'Bash(git push:*)']);
  });

  it('una cadena cuyas órdenes ya están dadas pasa sola; si le falta una, se pregunta solo por ella', () => {
    const e = new EsperaDePermisos('golf', prohibidas, CASA, dadas);
    expect(e.pedir(orden('cd C:/repos/golf && git status'), T0).decision).toEqual({ permitir: true, guardar: null, cadena: true });
    const falta = e.pedir(orden('cd C:/repos/golf && git push origin main'), T0);
    expect(falta.decision).toBeNull();
    expect(falta.faltan).toEqual(['git push origin main']);
  });
});

// (2) Lo que nunca se niega al instante, sin preguntar y sin pausar la revisión
describe('lo que nunca se niega al instante, sin preguntar', () => {
  const casos: [string, SolicitudDePermiso][] = [
    ['subir a la fuerza', { herramienta: 'Bash', entrada: { command: 'git push --force origin main' } }],
    ['subir a la fuerza con -f', { herramienta: 'Bash', entrada: { command: 'git push -f origin main' } }],
    ['subir a la fuerza dentro de una cadena', { herramienta: 'Bash', entrada: { command: 'cd x && git push --force-with-lease' } }],
    ['reescribir la historia con rebase', { herramienta: 'Bash', entrada: { command: 'git rebase -i HEAD~3' } }],
    ['reescribir la historia con reset --hard', { herramienta: 'Bash', entrada: { command: 'git reset --hard HEAD~3' } }],
    ['reescribir la historia con commit --amend', { herramienta: 'Bash', entrada: { command: 'git commit --amend -m x' } }],
    ['leer un .env', { herramienta: 'Read', entrada: { file_path: String.raw`C:\repos\golf\.env` } }],
    ['leer un .env.local', { herramienta: 'Read', entrada: { file_path: String.raw`C:\repos\golf\config\.env.local` } }],
  ];

  for (const [nombre, solicitud] of casos)
    it(`${nombre}: decision { permitir: false, motivo: 'nunca' } y la revisión no se pausa`, () => {
      const e = nueva();
      const p = e.pedir(solicitud, T0);
      expect(p.decision).toMatchObject({ permitir: false, motivo: 'nunca' });
      expect(p.puedeSiempre).toBe(false);
      expect(e.pendientes()).toEqual([]);
      expect(e.enPausa).toBe(false);
      expect(e.pausadoMs(T0 + HORA)).toBe(0);
      // Responderla no la abre
      expect(e.responder(p.id, 'una_vez', T0 + SEG)).toMatchObject({ aplicada: false, decision: { permitir: false, motivo: 'nunca' } });
    });

  it('dice por qué y qué hacer en su lugar, para cada grupo', () => {
    const porque = (s: SolicitudDePermiso) => (nueva().pedir(s, T0).decision as { nunca?: { porque: string } }).nunca?.porque;
    expect(porque(casos[0][1])).toMatch(/historia ya subida/);
    expect(porque(casos[3][1])).toBeTruthy();
    expect(porque(casos[6][1])).toBeTruthy();
  });
});

// (3) Las cuatro respuestas
describe('las cuatro respuestas del aviso', () => {
  it('«Solo esta vez» da el permiso de esa llamada y no guarda nada', () => {
    const e = nueva();
    const p = e.pedir(curl, T0);
    expect(p.decision).toBeNull();
    expect(p.propuesta.regla).toBe('Bash(curl:*)');
    expect(e.responder(p.id, 'una_vez', T0 + 5 * SEG)).toEqual({ aplicada: true, decision: { permitir: true, guardar: null } });
    expect(e.decisionDe(p.id)).toEqual({ permitir: true, guardar: null });
    expect(e.pendientes()).toEqual([]);
  });

  it('«Siempre, en este proyecto» guarda la regla general del tipo de acción, solo para el proyecto que se revisa', () => {
    const e = nueva();
    const a = e.responder(e.pedir(curl, T0).id, 'siempre', T0 + SEG);
    expect(a?.decision).toEqual({ permitir: true, guardar: { regla: 'Bash(curl:*)', alcance: 'proyecto', proyecto: 'golf' } });
    // La misma regla que ofrece el panel de permisos: la carpeta que leyó, no el archivo
    const b = e.responder(e.pedir(lee, T0 + 2 * SEG).id, 'siempre', T0 + 3 * SEG);
    expect(b?.decision).toEqual({ permitir: true, guardar: { regla: 'Read(//d/notas/**)', alcance: 'proyecto', proyecto: 'golf' } });
    // Cada revisión guarda para su proyecto
    const otro = new EsperaDePermisos('tesis', prohibidas, CASA);
    expect(otro.responder(otro.pedir(curl, T0).id, 'siempre', T0 + SEG)?.decision).toMatchObject({ guardar: { proyecto: 'tesis', alcance: 'proyecto' } });
  });

  it('«Siempre, en todos los proyectos» guarda la misma regla con alcance «todos»', () => {
    const e = nueva();
    const r = e.responder(e.pedir(curl, T0).id, 'siempre_todos', T0 + SEG);
    expect(r?.decision).toMatchObject({ permitir: true, guardar: { regla: 'Bash(curl:*)', alcance: 'todos' } });
  });

  it('subir, traer y publicar se dan «Siempre» solo en este proyecto (nmwpbxbmetit)', () => {
    for (const command of ['git push origin main', 'git pull', 'npm publish', 'gh release create v1']) {
      const e = nueva();
      const p = e.pedir({ herramienta: 'Bash', entrada: { command } }, T0);
      expect(p.puedeSiempre).toBe(true);
      expect(p.soloEsteProyecto).toBe(true);
      expect(p.porQueNoSiempre).toBe(es['permiso.soloEsteProyecto']);
      // Aunque llegue el de todos, se guarda solo para el proyecto que se revisa
      expect(e.responder(p.id, 'siempre_todos', T0 + SEG)?.decision).toMatchObject({ permitir: true, guardar: { alcance: 'proyecto', proyecto: 'golf' } });
    }
    // Lo demás sigue ofreciendo los dos
    const e = nueva();
    const p = e.pedir(curl, T0);
    expect(p.soloEsteProyecto).toBeUndefined();
    expect(p.porQueNoSiempre).toBeNull();
    expect(soloEnEsteProyecto('Bash(curl:*)')).toBe(false);
    expect(soloEnEsteProyecto('Bash(git push:*)')).toBe(true);
    expect(soloEnEsteProyecto(null)).toBe(false);
  });

  it('los dos «Siempre» sin regla que ofrecer valen como «Solo esta vez»', () => {
    for (const respuesta of ['siempre', 'siempre_todos'] as const) {
      const e = nueva();
      const p = e.pedir(cadena, T0);
      expect(p.propuesta.regla).toBeNull();
      expect(p.puedeSiempre).toBe(false);
      expect(e.responder(p.id, respuesta, T0 + SEG)?.decision).toEqual({ permitir: true, guardar: null });
    }
  });

  it('«No lo autorizo» niega con «no_autorizado», y no queda pendiente en el panel: la persona ya lo decidió', () => {
    const e = nueva();
    const p = e.pedir(curl, T0);
    expect(e.responder(p.id, 'no', T0 + SEG)).toEqual({ aplicada: true, decision: { permitir: false, motivo: 'no_autorizado' } });
    expect(e.quedanParaElPanel()).toEqual([]);
    // Lo que sigue se sigue preguntando: no hay «persona ausente»
    expect(e.pedir(gitLog, T0 + 10 * SEG).decision).toBeNull();
  });

  it('una respuesta a lo ya decidido no cambia nada; un id desconocido, null', () => {
    const e = nueva();
    const p = e.pedir(curl, T0);
    e.responder(p.id, 'no', T0 + SEG);
    expect(e.responder(p.id, 'siempre_todos', T0 + 2 * SEG)).toEqual({ aplicada: false, decision: { permitir: false, motivo: 'no_autorizado' } });
    expect(e.responder('no-existe', 'no', T0)).toBeNull();
  });

  it('el servidor acepta las cuatro respuestas y ninguna más; «todo» ya no vale', () => {
    expect([...RESPUESTAS]).toEqual(['una_vez', 'siempre', 'siempre_todos', 'no']);
    for (const r of RESPUESTAS) expect(respuestaValida(r)).toBe(r);
    for (const mala of ['todo', '', 'TODO', 'todos', 'siempre ', 'vence', null, undefined, 1, {}]) expect(respuestaValida(mala), String(mala)).toBeNull();
    // La ruta del servidor usa esta misma validación: lo que no es una de las cuatro, 400
    const servidor = readFileSync(new URL('./api.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    const responde = servidor.slice(servidor.indexOf("ruta === '/permiso-al-momento' && req.method === 'POST'"));
    expect(responde.slice(0, 1200)).toContain('const respuesta = respuestaValida(cuerpo.respuesta);');
    expect(responde.slice(0, 3200)).toContain("g.alcance === 'todos'");
    expect(responde.slice(0, 3600)).toContain('queAnotarDeLaRespuesta(d, pregunta.propuesta.que)');
    expect(servidor).not.toContain("'/modo-permisos'");
    const pide = servidor.slice(servidor.indexOf("ruta === '/permiso-al-momento/pedir'"));
    expect(pide.slice(0, 1400)).toContain('decidirParaElGancho(permisosEnEspera, clave, entrada)');
    expect(pide.slice(0, 1400)).toContain('queAnotarDeLaLlamada(herramienta, dado, contestado.decision)');
  });

  it('en la bitácora queda dicho qué se autorizó y con qué alcance', () => {
    expect(textoDeBitacora(queAnotarDeLaRespuesta({ permitir: true, guardar: null }, 'x'))).toBe('le autoriza al director, solo esta vez, «x»');
    expect(textoDeBitacora(queAnotarDeLaRespuesta({ permitir: true, guardar: { regla: 'Bash(curl:*)', proyecto: 'golf', alcance: 'proyecto' } }, 'x'))).toBe('le autoriza siempre al director «Bash(curl:*)» en este proyecto');
    expect(textoDeBitacora(queAnotarDeLaRespuesta({ permitir: true, guardar: { regla: 'Bash(curl:*)', proyecto: 'golf', alcance: 'todos' } }, 'x'))).toBe('le autoriza siempre al director «Bash(curl:*)» en todos los proyectos');
    expect(textoDeBitacora(queAnotarDeLaRespuesta({ permitir: false, motivo: 'no_autorizado' }, 'x'))).toBe('no le autoriza al director «x»');
    expect(dichas(queAnotarDeLaLlamada('Bash', true, { permitir: true, guardar: null }))).toEqual({ que: 'pide un permiso en plena revisión (Bash) y se le da', desde: 'el gancho de permisos de Claude Code' });
    expect(dichas(queAnotarDeLaLlamada('Bash', false, { permitir: false, motivo: 'nunca' }))).toEqual({ que: 'pide un permiso en plena revisión (Bash) y se le niega', desde: 'el gancho de permisos de Claude Code' });
    expect(textoDeBitacora(queAnotarDeLaLlamada('Bash', false, null).que)).toMatch(/se le niega$/);
  });
});

// (4) La espera no tiene límite de tiempo, y la pausa se cuenta
describe('la espera sin límite de tiempo y su pausa', () => {
  it('una pregunta sigue esperando por mucho tiempo que pase, hasta que la persona responde', () => {
    const e = nueva();
    const p = e.pedir(curl, T0);
    for (const horas of [1, 5, 24, 100]) {
      expect(e.pendientes().map((x) => x.id), `${horas} h`).toContain(p.id);
      expect(e.decisionDe(p.id)).toBeNull();
      expect(e.enPausa).toBe(true);
    }
    // Nada «vence» ni «se da por ausente»: lo que se pide mucho después también se pregunta
    expect(e.pedir(gitLog, T0 + 100 * HORA).decision).toBeNull();
    expect(e.responder(p.id, 'una_vez', T0 + 100 * HORA)).toEqual({ aplicada: true, decision: { permitir: true, guardar: null } });
  });

  it('cerrarTodo (termina la revisión) niega lo que esperaba con «sin_respuesta» y lo devuelve para el panel', () => {
    const e = nueva();
    const a = e.pedir(curl, T0);
    const b = e.pedir(lee, T0 + SEG);
    const hecha = e.pedir(gitLog, T0 + 2 * SEG);
    e.responder(hecha.id, 'no', T0 + 3 * SEG);
    const negados = e.cerrarTodo(T0 + 2 * HORA);
    expect(negados.map((x) => x.id)).toEqual([a.id, b.id]);
    for (const x of negados) expect(x.decision).toEqual({ permitir: false, motivo: 'sin_respuesta' });
    expect(e.pendientes()).toEqual([]);
    expect(e.enPausa).toBe(false);
    expect(e.quedanParaElPanel().map((x) => x.propuesta.regla)).toEqual(['Bash(curl:*)', 'Read(//d/notas/**)']);
    // Responder después no cambia nada
    expect(e.responder(a.id, 'siempre', T0 + 3 * HORA)).toEqual({ aplicada: false, decision: { permitir: false, motivo: 'sin_respuesta' } });
    // Cerrar de nuevo no devuelve nada
    expect(e.cerrarTodo(T0 + 4 * HORA)).toEqual([]);
  });

  it('pausadoMs cuenta el tiempo mientras algo espera, y dos preguntas que se solapan cuentan una vez', () => {
    const e = nueva();
    expect(e.pausadoMs(T0)).toBe(0);
    expect(e.enPausa).toBe(false);
    const a = e.pedir(curl, T0);
    expect(e.enPausa).toBe(true);
    // Mientras espera, cuenta en vivo
    expect(e.pausadoMs(T0 + 10 * SEG)).toBe(10 * SEG);
    const b = e.pedir(lee, T0 + 10 * SEG);
    e.responder(a.id, 'una_vez', T0 + 20 * SEG);
    // La segunda sigue esperando: la pausa no se cortó
    expect(e.enPausa).toBe(true);
    expect(e.pausadoMs(T0 + 40 * SEG)).toBe(40 * SEG);
    e.responder(b.id, 'una_vez', T0 + 50 * SEG);
    expect(e.enPausa).toBe(false);
    // Contó 50 segundos, no 40 + 50 ni 60 de las dos juntas
    expect(e.pausadoMs(T0 + 50 * SEG)).toBe(50 * SEG);
  });

  it('después de la última respuesta ya no cuenta, y una pausa nueva se suma a la anterior', () => {
    const e = nueva();
    const a = e.pedir(curl, T0);
    e.responder(a.id, 'no', T0 + 30 * SEG);
    expect(e.pausadoMs(T0 + 30 * SEG)).toBe(30 * SEG);
    expect(e.pausadoMs(T0 + 5 * HORA)).toBe(30 * SEG);
    // Lo que nunca no pausa
    e.pedir(push, T0 + 6 * HORA);
    expect(e.enPausa).toBe(false);
    expect(e.pausadoMs(T0 + 7 * HORA)).toBe(30 * SEG);
    const b = e.pedir(lee, T0 + 8 * HORA);
    expect(e.pausadoMs(T0 + 8 * HORA + 20 * SEG)).toBe(50 * SEG);
    e.cerrarTodo(T0 + 8 * HORA + 25 * SEG);
    expect(e.decisionDe(b.id)).toEqual({ permitir: false, motivo: 'sin_respuesta' });
    expect(e.enPausa).toBe(false);
    expect(e.pausadoMs(T0 + 20 * HORA)).toBe(55 * SEG);
  });
});

describe('el sonido del diálogo', () => {
  it('suena al abrirse y cada 30 segundos, como mucho 4 veces: a los 0, 30, 60 y 90 segundos', () => {
    expect(avisosDelSonido(T0)).toEqual([T0, T0 + 30 * SEG, T0 + 60 * SEG, T0 + 90 * SEG]);
  });

  it('nunca suena más de MAX_AVISOS veces, y el aviso sigue abierto sin sonar (sin tope de dos minutos)', () => {
    expect(avisosDelSonido(T0)).toHaveLength(MAX_AVISOS);
    expect(avisosDelSonido(T0, T0 + 10 * HORA)).toHaveLength(MAX_AVISOS);
  });

  it('en cuanto la persona toca el diálogo, no suena más', () => {
    expect(avisosDelSonido(T0, T0 + 45 * SEG)).toEqual([T0, T0 + 30 * SEG]);
    expect(avisosDelSonido(T0, T0 + 30 * SEG)).toEqual([T0]);
    expect(avisosDelSonido(T0, T0)).toEqual([]);
    expect(avisosDelSonido(T0, T0 + 119 * SEG)).toHaveLength(4);
    expect(avisosDelSonido(T0, null)).toHaveLength(4);
  });
});

describe('por qué los dos «Siempre» no se ofrecen', () => {
  it('con la orden que junta varias, lo dice así: es la orden la que viene junta', () => {
    const p = nueva().pedir(cadena, T0);
    expect(p.puedeSiempre).toBe(false);
    expect(p.porQueNoSiempre).toMatch(/la orden junta 2 órdenes en una sola/);
    expect(p.porQueNoSiempre).toMatch(/no hay un solo tipo de acción/);
    // Sin símbolos de código en lo que lee una persona
    expect(p.porQueNoSiempre).not.toMatch(/&&|\|\|/);
  });

  it('cuando se ofrece, no hay nada que explicar', () => {
    const p = nueva().pedir(curl, T0);
    expect(p.puedeSiempre).toBe(true);
    expect(p.porQueNoSiempre).toBeNull();
  });

  it('sin regla por otra razón, dice la de la regla del panel; si la regla choca con lo que nunca, lo dice', () => {
    const sinRuta = nueva().pedir({ herramienta: 'Read', entrada: { file_path: 'relativa.md' } }, T0);
    expect(sinRuta.puedeSiempre).toBe(false);
    expect(sinRuta.porQueNoSiempre).toMatch(/^no dijo en qué carpeta/);
    const regla = { regla: 'Bash(git:*)', que: 'x', riesgo: '' };
    // Los textos salen del archivo de textos (permiso.noSiempre*)
    expect(porQueNoSiempre(curl, regla, false, null)).toBe(es['permiso.noSiempreAbarca']);
    expect(porQueNoSiempre(curl, regla, false, { porque: 'x', enSuLugar: 'y' })).toBe(es['permiso.noSiempreNunca']);
    expect(porQueNoSiempre(curl, { regla: null, que: 'x', riesgo: '' }, false, null)).toBe(es['permiso.noSiempreTipo']);
    expect(porQueNoSiempre(curl, regla, true, null)).toBeNull();
  });
});

describe('lo que imprime el gancho PermissionRequest', () => {
  it('al dar el permiso, la forma que Claude Code lee (la de tools/probarPermisos.ts)', () => {
    expect(respuestaDelGancho({ permitir: true, guardar: null })).toEqual({ hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } } });
    const siempre = respuestaDelGancho({ permitir: true, guardar: { regla: 'Bash(curl:*)', proyecto: 'golf', alcance: 'proyecto' } });
    expect(siempre.hookSpecificOutput.decision).toEqual({ behavior: 'allow' });
  });

  it('al negar, un mensaje en inglés para el modelo: seguir sin ello y decir en su respuesta qué permiso faltó', () => {
    const dice = (d: Parameters<typeof respuestaDelGancho>[0]) => {
      const { decision } = respuestaDelGancho(d).hookSpecificOutput;
      expect(decision.behavior).toBe('deny');
      return 'message' in decision ? decision.message : '';
    };
    const e = nueva();
    const pendiente = e.pedir(curl, T0);
    e.cerrarTodo(T0 + SEG);
    for (const d of [e.decisionDe(pendiente.id)!, { permitir: false, motivo: 'no_autorizado' } as const]) {
      const m = dice(d);
      expect(m).toMatch(/Go on with the rest without it, and say in your answer what you could not do and which permission was missing/);
      expect(m).not.toMatch(/[áéíóúñ¿«]/);
    }
    expect(dice({ permitir: false, motivo: 'no_autorizado' })).toMatch(/^The person did not authorize it\./);
    expect(dice({ permitir: false, motivo: 'sin_respuesta' })).toMatch(/^The review ended before the person answered\./);
    // Lo que nunca: dice por qué y qué hacer en su lugar
    const subir = e.pedir(push, T0 + 200 * SEG).decision!;
    const m = dice(subir);
    expect(m).toMatch(/^The Studio never allows this/);
    expect(m).toMatch(/Go on with the rest without it/);
    expect(dice({ permitir: false, motivo: 'nunca' })).toMatch(/^The Studio never allows this\. Go on/);
    // Ya no habla de dos minutos ni de una persona ausente
    expect(m).not.toMatch(/minut|ausente|absent|first question/i);
  });

  it('la llamada que pide permiso sale de lo que Claude Code le da al gancho, y solo si es un PermissionRequest', () => {
    expect(solicitudDelGancho({ hook_event_name: 'PermissionRequest', permission_mode: 'default', tool_name: 'Bash', tool_input: { command: 'node -p process.version' }, permission_suggestions: [] })).toEqual({ herramienta: 'Bash', entrada: { command: 'node -p process.version' } });
    expect(solicitudDelGancho({ hook_event_name: 'PermissionRequest', tool_name: 'Monitor' })).toEqual({ herramienta: 'Monitor', entrada: {} });
    expect(solicitudDelGancho({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: {} })).toBeNull();
    expect(solicitudDelGancho({ hook_event_name: 'PermissionRequest' })).toBeNull();
    expect(solicitudDelGancho(null)).toBeNull();
  });
});

describe('lo que se niega sin que la persona lo decida queda pendiente en el panel de permisos', () => {
  const cuando = '2026-10-26T10:00:00.000Z';
  const vencidos = () => {
    const e = nueva();
    e.pedir(curl, T0);
    e.pedir(gitLog, T0 + SEG);
    // Nadie responde y la revisión termina: se niegan
    e.cerrarTodo(T0 + 2 * HORA);
    return e.quedanParaElPanel();
  };

  it('cada pregunta sin respuesta deja una línea en el registro con la forma del aviso de Claude Code y la entrada de lo que intentó', () => {
    const lineas = lineasDeNegadosSinDecidir(vencidos());
    expect(lineas).toHaveLength(2);
    const ev = JSON.parse(lineas[0]);
    expect(ev).toMatchObject({ type: 'system', subtype: 'permission_denied', origen: 'studio', tool_name: 'Bash', tool_input: curl.entrada });
    // Una línea completa, con un salto antes por si el registro quedó a medias
    expect(lineas[0].startsWith('\n{')).toBe(true);
    expect(lineas[0].endsWith('}\n')).toBe(true);
    // Lo que la persona decidió (o lo que nunca) no queda pendiente: no se escribe
    const e = nueva();
    e.responder(e.pedir(curl, T0).id, 'no', T0 + SEG);
    e.pedir(push, T0 + 2 * SEG);
    expect(lineasDeNegadosSinDecidir(e.quedanParaElPanel())).toEqual([]);
  });

  it('el panel de permisos lo ve, con su regla general, aunque Claude Code no cuente en su resultado lo que negó el gancho', () => {
    const texto = lineasDeNegadosSinDecidir(vencidos()).join('');
    expect(negadosDe(texto)).toEqual([
      { herramienta: 'Bash', entrada: curl.entrada },
      { herramienta: 'Bash', entrada: gitLog.entrada },
    ]);
    const panel = permisosNegados([{ proyecto: 'golf', cuando, registro: 'golf-1.log', texto }], () => prohibidas, CASA);
    expect(panel.map((p) => p.regla).sort()).toEqual(['Bash(curl:*)', 'Bash(git log:*)']);
    expect(panel.every((p) => p.proyecto === 'golf' && !p.nunca)).toBe(true);
    // Si Claude Code también lo cuenta en su resultado, no se repite
    const resultado = JSON.stringify({ type: 'result', permission_denials: [{ tool_name: 'Bash', tool_input: curl.entrada }] });
    expect(negadosDe(`${texto}${resultado}\n`)).toHaveLength(2);
    // …y el registro filtrado que lee el panel (registrosDeNegados) conserva la línea: tiene lo que busca NEGACION
    expect(texto.split('\n').filter((l) => l.includes(NEGACION))).toHaveLength(2);
  });

  it('se ve también en vivo, con lo que intentó', () => {
    expect(negadosEnVivo(lineasDeNegadosSinDecidir(vencidos()).join(''))).toEqual(['Bash: curl -s http://localhost:5180/__estudio/voz/lista', 'Bash: git log --oneline -5']);
  });
});

// La guardia que lee la orden entera (decisión del titular del 26 de octubre de 2026, pieza de «Los permisos, al
// momento»): una cadena pasa sola si cada orden está permitida, y si no, pregunta solo por la que falta
describe('las órdenes encadenadas', () => {
  const permitidas = ['Bash(cd:*)', 'Bash(git log:*)', 'Bash(npm test)', 'Read(//c/repos/golf/**)'];
  const conPermitidas = () => new EsperaDePermisos('golf', prohibidas, CASA, permitidas);
  const orden = (command: string): SolicitudDePermiso => ({ herramienta: 'Bash', entrada: { command } });

  it('saca de una cadena las órdenes que no tiene; una orden sola u otra herramienta no es cadena', () => {
    expect(ordenesQueFaltan(orden('cd C:/repos/golf && git log --oneline -5'), permitidas)).toEqual([]);
    expect(ordenesQueFaltan(orden('cd x ; npm test && curl -s http://y'), permitidas)).toEqual(['curl -s http://y']);
    expect(ordenesQueFaltan(orden('curl -s http://y'), permitidas)).toBeNull();
    expect(ordenesQueFaltan(orden('cd x && git log > a.txt'), permitidas)).toBeNull();
    expect(ordenesQueFaltan(lee, permitidas)).toBeNull();
    // «npm test» está permitida tal cual: «npm test -- x» no
    expect(ordenesQueFaltan(orden('cd x && npm test -- x'), permitidas)).toEqual(['npm test -- x']);
  });

  it('si cada orden está permitida, pasa sola, sin preguntar ni pausar la revisión', () => {
    const e = conPermitidas();
    const p = e.pedir(orden('cd C:/repos/golf && git log --oneline -5'), T0);
    expect(p.decision).toEqual({ permitir: true, guardar: null, cadena: true });
    expect(e.pendientes()).toEqual([]);
    expect(textoDeBitacora(queAnotarDeLaLlamada('Bash', true, p.decision).que)).toMatch(/cada orden de la cadena ya la tenía permitida/);
    expect(e.enPausa).toBe(false);
    // Una pregunta de verdad sí queda esperando
    const q = e.pedir(curl, T0 + SEG);
    expect(q.decision).toBeNull();
    expect(e.enPausa).toBe(true);
    e.cerrarTodo(T0 + SEG + HORA);
    expect(e.decisionDe(q.id)).toMatchObject({ permitir: false, motivo: 'sin_respuesta' });
  });

  it('si le falta una, pregunta solo por esa, y «Siempre» ofrece la regla de esa orden', () => {
    const e = conPermitidas();
    const p = e.pedir(orden('cd x && curl -s http://y'), T0);
    expect(p.decision).toBeNull();
    expect(p.faltan).toEqual(['curl -s http://y']);
    expect(p.propuesta.regla).toBe('Bash(curl:*)');
    expect(p.puedeSiempre).toBe(true);
    expect(e.responder(p.id, 'siempre', T0 + SEG)?.decision).toEqual({ permitir: true, guardar: { regla: 'Bash(curl:*)', proyecto: 'golf', alcance: 'proyecto' } });
  });

  it('si le faltan varias, pregunta por todas juntas, sin «Siempre»; y lo que nunca se sigue negando en la cadena', () => {
    const e = conPermitidas();
    const p = e.pedir(orden('cd x && curl -s http://y && wget http://z'), T0);
    expect(p.faltan).toEqual(['curl -s http://y', 'wget http://z']);
    expect(p.puedeSiempre).toBe(false);
    const forzado = e.pedir(orden('cd x && git log -1 && git push --force'), T0 + SEG);
    expect(forzado.decision).toMatchObject({ permitir: false, motivo: 'nunca' });
    expect(forzado.faltan).toBeUndefined();
  });

  it('sin ninguna orden permitida (o sin la lista), como antes: la cadena se pregunta entera', () => {
    expect(ordenesQueFaltan(orden('curl -s http://y && wget http://z'), permitidas)).toBeNull();
    const p = nueva().pedir(orden('cd x && git log -1'), T0);
    expect(p.decision).toBeNull();
    expect(p.faltan).toBeUndefined();
    expect(p.porQueNoSiempre).toMatch(/junta 2 órdenes/);
  });
});
