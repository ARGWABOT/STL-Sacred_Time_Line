// La medición del núcleo con casos fijos (pr_nucleo_medido, punto 2): cada situación, de punta a punta sobre un Estudio de
// prueba, con un director que lo hace bien (pasa la comprobación y la revisión cierra) y uno que repite el error (no pasa,
// aunque el cierre lo deje pasar: eso es lo que mide el caso)
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { CASOS_FIJOS } from '../../src/director/casosFijos.ts';
import { RESERVA_MINIMA, unirEstados, type Mision, type Plan } from '../../src/director/director.ts';
import {
  COMPROBACIONES,
  CRITERIO_CLIENTE,
  FASE_EN_CURSO,
  MISION_TRABADA,
  NOTA_CERRAR,
  NOTA_FALLA,
  NOTA_PIDE_ORDEN,
  NOTA_PERMISO,
  NOTA_PIDE_REPOSITORIO,
  NOTA_PIDE_DOCUMENTO,
  NOTA_PROBAR_CLIENTE,
  NOTA_PROBAR_EXCEL,
  NOTA_QUE_PIDE,
  PROPUESTA_HECHA,
  PROPUESTA_PENDIENTE,
  SITUACIONES,
  ULTIMA_MISION,
} from '../../src/director/medicion.ts';
import { armarEstudioDePrueba, type EstudioDePrueba } from './estudioDePrueba.ts';

const base = mkdtempSync(join(tmpdir(), 'estudio-medicion-'));
afterAll(() => rmSync(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

const ahora = () => new Date().toISOString();
/** Lo que escribe todo director al final: «Dónde quedamos» y su comentario. */
const resumenYMensaje = (p: Plan) => {
  p.resumen = { fecha: ahora(), avanzamos: ['Quedó anotado lo que pediste, con su lugar en la ruta.'], quedamos: 'El proyecto de prueba está en su arranque.' };
  p.mensaje = { fecha: ahora().slice(0, 10), texto: '- **Sobre la prueba:** se mide un caso fijo sin tocar el Estudio real.' };
};

/**
 * Un caso armado en su Estudio de prueba, con su comprobación lista: el plan de antes, los documentos de su memoria, lo
 * que guarda el Studio del equipo y cuándo empezó la revisión.
 */
async function armarCaso(caso: string, id: string) {
  const e = await armarEstudioDePrueba(base, { id, ...SITUACIONES[caso]! });
  const antes = e.plan();
  const leer = (ruta: string) => (existsSync(join(e.memoria, ruta)) ? readFileSync(join(e.memoria, ruta), 'utf8') : null);
  const estado = unirEstados({ titular: JSON.parse(readFileSync(join(e.memoria, 'director', 'equipo', 'titular.json'), 'utf8')) });
  return { e, comprobar: (plan: Plan = e.plan()) => COMPROBACIONES[caso]!(plan, { antes, leer, estado, desde: antes.revisado ?? '' }) };
}

/** Una misión de la persona en la fase en curso, con un paso que lleva a su lugar. */
const mision = (id: string, titulo: string, extra: Partial<Mision> = {}): Mision => ({
  id, para: 'titular', fase: FASE_EN_CURSO, frente: 'direccion', titulo, porQue: 'Es lo que necesita la fase en este punto.', xp: 10, entrega: 'Lo que encontraste.',
  pasos: [{ texto: `${titulo}, y cuéntalo en el Buzón.`, ir: { vista: 'buzon', ancla: 'escribir', etiqueta: 'Abrir el Buzón' } }], ...extra,
});
/** La respuesta a una nota que solo pedía saber algo. */
const informada = (texto: string) => ({ cuando: ahora(), texto, tratamiento: 'informada' as const });

/** El director escribe un documento en la memoria del proyecto. */
const escribirDoc = (e: EstudioDePrueba, ruta: string, texto: string) => {
  mkdirSync(dirname(join(e.memoria, ruta)), { recursive: true });
  writeFileSync(join(e.memoria, ruta), texto);
};

const DOC = 'docs/director/informe.md';
const BIEN_ESCRITO =
  '# Cómo se arma el informe del mes\n\n## 1. Lo que entendí\n\nQuieres revisar cómo se arma el informe del mes antes de cambiarlo, para no romper lo que ya funciona con el cliente.\n\n' +
  '## 2. Cómo se arma hoy\n\nEl informe junta las ventas del mes, las agrupa por cliente y las pone en una tabla con su total, que la página muestra tal cual el primer día de cada mes.\n';

describe('la medición del núcleo con casos fijos', () => {
  it('cada situación es de un caso fijo y trae su comprobación', () => {
    const casos = new Set(CASOS_FIJOS.map((c) => c.id));
    for (const id of Object.keys(SITUACIONES)) {
      expect(casos.has(id), id).toBe(true);
      expect(COMPROBACIONES[id], id).toBeTypeOf('function');
    }
    for (const id of Object.keys(COMPROBACIONES)) expect(SITUACIONES[id], id).toBeTruthy();
  });

  it('«Peticiones que no llegaban al plan»: integrada sin su pedido no pasa, aunque cierre; con su pedido y su «Quedó en», pasa y cierra', async () => {
    const { e, comprobar } = await armarCaso('c_peticion_sin_pedido', 'medir-pedido');
    expect(comprobar()).toEqual(['no respondió la nota que pide trabajo']);
    // El error de antes: «integrada», y la promesa solo en el texto, con un «Quedó en» que el cierre acepta
    e.cambiarPlan((p) => {
      resumenYMensaje(p);
      p.respuestas[NOTA_QUE_PIDE] = { cuando: ahora(), texto: 'Lo tendré en cuenta para el informe.', tratamiento: 'integrada', destino: { vista: 'proyecto', ancla: 'p-contexto', etiqueta: 'Ver el contexto' } };
    });
    expect(comprobar()).toEqual(['no dejó un pedido, una propuesta ni una misión con lo que se pidió']);
    // Lo correcto: su pedido, con su fase y su lugar en la cola del director, y la respuesta que lleva a él
    e.cambiarPlan((p) => {
      p.pedidos = [{ id: 'pd_pdf', fase: 'arranque', texto: 'El informe del mes, en PDF, para mandárselo al cliente.', notas: [NOTA_QUE_PIDE] }];
      p.colaDirector = ['pd_pdf'];
      p.respuestas[NOTA_QUE_PIDE].destino = { vista: 'ruta', fase: 'arranque', ancla: 'pedido-pd_pdf', etiqueta: 'Ver el pedido' };
    });
    expect(comprobar()).toEqual([]);
    const cierre = e.bandeja('--listo');
    expect(cierre.codigo, `debía cerrar; dijo: ${cierre.errores}`).toBe(0);
    // Un «Quedó en» que no lleva al pedido tampoco pasa
    e.cambiarPlan((p) => { p.respuestas[NOTA_QUE_PIDE].destino = { vista: 'ruta', fase: 'arranque', ancla: 'r-plan', etiqueta: 'Ver el plan' }; });
    expect(comprobar()[0]).toMatch(/^su «Quedó en» no lleva a lo que dejó/);
  }, 60_000);

  it('«Pedir lo ya hecho»: volver a pedir lo que un commit ya hizo no pasa; darlo por ejecutado, con su commit, pasa y cierra', async () => {
    const { e, comprobar } = await armarCaso('c_pedir_lo_hecho', 'medir-hecho');
    expect(comprobar()).toEqual(['no la dio por ejecutada, aunque un commit ya la hizo']);
    // La bandeja lo ve: el commit nombra la propuesta aceptada
    expect(e.bandeja('--sin-transcribir').salida).toContain(`[${PROPUESTA_HECHA}]`);
    // El error de antes: una misión para hacer (o confirmar) lo que ya está
    const conMision = structuredClone(e.plan());
    conMision.misiones.push({ id: 't_pdf', para: 'titular', fase: 'arranque', frente: 'direccion', titulo: 'Haz el botón del PDF', porQue: '', pasos: ['Haz el botón.'], entrega: 'El botón.', xp: 10, origen: [PROPUESTA_HECHA] });
    expect(comprobar(conMision)).toEqual(['no la dio por ejecutada, aunque un commit ya la hizo', 'pide otra vez lo ya hecho: t_pdf']);
    // Lo correcto: darla por ejecutada con la evidencia, y decir qué comprobó
    const commit = e.ultimoCommit();
    e.cambiarPlan((p) => {
      resumenYMensaje(p);
      p.ejecutadas = { [PROPUESTA_HECHA]: { cuando: ahora(), nota: `Ya estaba hecha antes de esta revisión: commit ${commit}, el botón del PDF.` } };
      p.alDia = { cuando: ahora(), nota: `Crucé lo pendiente con lo hecho: ${PROPUESTA_HECHA} ya estaba hecha (commit ${commit}).` };
    });
    expect(comprobar()).toEqual([]);
    const cierre = e.bandeja('--listo');
    expect(cierre.codigo, `debía cerrar; dijo: ${cierre.errores}`).toBe(0);
  }, 60_000);

  it('«Cortes de lectura sin sentido»: un subtítulo solo no pasa; el documento con cada idea entera, sí', async () => {
    const { e, comprobar } = await armarCaso('c_cortes_sin_sentido', 'medir-cortes');
    expect(comprobar()).toEqual(['no escribió el documento que se pidió']);
    e.cambiarPlan((p) => { p.documentos.push({ ruta: DOC, titulo: 'Cómo se arma el informe del mes', porQue: 'Lo pediste para revisarlo antes de cambiarlo.' }); });
    expect(comprobar()).toEqual([`${DOC}: está en el plan, pero no en la memoria`]);
    // El error de antes: un subtítulo que queda solo, como una idea que pide un clic
    escribirDoc(e, DOC, `${BIEN_ESCRITO}\n## 3. Lo que cambiaría\n\n**Para después**\n`);
    expect(comprobar().length).toBeGreaterThan(0);
    expect(comprobar()[0]).toMatch(/^docs\/director\/informe\.md › 3\. Lo que cambiaría: /);
    escribirDoc(e, DOC, BIEN_ESCRITO);
    expect(comprobar()).toEqual([]);
  }, 60_000);

  it('«Un paso que mandaba a un documento sin decir qué mirar»: sin su botón no pasa; con él, pasa y cierra', async () => {
    const { e, comprobar } = await armarCaso('c_paso_sin_que_mirar', 'medir-paso');
    escribirDoc(e, DOC, BIEN_ESCRITO);
    const leer = (ir?: { doc: string; etiqueta: string }) => ({ id: 't_leer_informe', para: 'titular', fase: 'arranque', frente: 'direccion', titulo: 'Lee cómo se arma el informe', porQue: 'Lo pediste para revisarlo antes de cambiarlo.', xp: 10, entrega: 'El documento leído y comentado.', pasos: [{ texto: 'Lee «Cómo se arma el informe del mes» y comenta con su ✉ lo que cambiarías en cada parte.', ...(ir ? { ir } : {}) }] });
    e.cambiarPlan((p) => {
      resumenYMensaje(p);
      p.documentos.push({ ruta: DOC, titulo: 'Cómo se arma el informe del mes', porQue: 'Lo pediste para revisarlo antes de cambiarlo.' });
      p.misiones.unshift(leer());
      p.respuestas[NOTA_PIDE_DOCUMENTO] = { cuando: ahora(), texto: 'Lo escribí, corto, y te dejé la misión de leerlo.', tratamiento: 'integrada', destino: { doc: DOC, seccion: '2. Cómo se arma hoy', etiqueta: 'Ver el documento' } };
    });
    // El error de antes: el paso manda a leer sin su botón al documento
    const fallas = comprobar();
    expect(fallas).toHaveLength(2);
    expect(fallas[0]).toMatch(/^«Lee cómo se arma el informe», paso 1: manda a «Lee «Cómo se arma el informe del mes».*» sin su botón$/);
    expect(fallas[1]).toBe('ninguna misión nueva lleva a leer el documento que se pidió, con su botón');
    // Lo correcto: el paso dice qué hacer y lleva al documento
    e.cambiarPlan((p) => { p.misiones[0] = leer({ doc: DOC, etiqueta: 'Abrir el documento' }); });
    expect(comprobar()).toEqual([]);
    const cierre = e.bandeja('--listo');
    expect(cierre.codigo, `debía cerrar; dijo: ${cierre.errores}`).toBe(0);
  }, 60_000);

  // ── Los pasos
  it('«Un paso que atrapaba»: aprobarla sin retomar lo que no salió, o devolverla igual, no pasa; devolverla con el paso corregido pasa y cierra', async () => {
    const { e, comprobar } = await armarCaso('c_paso_atrapa', 'medir-atrapa');
    expect(comprobar()).toEqual(['no revisó la misión que se entregó sin terminar']);
    e.cambiarPlan((p) => {
      resumenYMensaje(p);
      p.revisiones[MISION_TRABADA] = { cuando: ahora(), veredicto: 'aprobada', comentario: 'Bien.' };
    });
    expect(comprobar()).toEqual(['la aprobó aunque su paso 1 no salió, sin una misión que lo retome']);
    e.cambiarPlan((p) => { p.revisiones[MISION_TRABADA] = { cuando: ahora(), veredicto: 'rehacer', comentario: 'Inténtalo otra vez.' }; });
    expect(comprobar()).toEqual(['la devolvió con el mismo paso que no salió']);
    // Lo correcto: la orden que faltaba, corregida en su paso, con lo que se ve al terminar
    e.cambiarPlan((p) => {
      p.revisiones[MISION_TRABADA] = { cuando: ahora(), veredicto: 'rehacer', comentario: 'La orden no existía: la corregí. Córrela otra vez; si tampoco sale, sigue con otra misión.' };
      const m = p.misiones.find((x) => x.id === MISION_TRABADA)!;
      m.pasos[0] = { texto: 'Abre la terminal con la orden de este paso: genera el informe del mes en la carpeta informes. Al terminar dice «Informe listo».', terminal: 'npm run generar-informe' };
    });
    expect(comprobar()).toEqual([]);
    const cierre = e.bandeja('--listo');
    expect(cierre.codigo, `debía cerrar; dijo: ${cierre.errores}`).toBe(0);
  }, 60_000);

  it('«Un paso sin salida clara»: la orden sin comprobar lo que se puede leer no pasa; con su comprobación, pasa y cierra', async () => {
    const { e, comprobar } = await armarCaso('c_paso_sin_salida', 'medir-salida');
    expect(comprobar()).toEqual(['no dejó el paso con la orden que pidió la persona']);
    const generar = (comprobar?: { orden: string }) => mision('t_generar', 'Genera el informe del mes', { fase: 'arranque', origen: [NOTA_PIDE_ORDEN], pasos: [{ texto: 'Abre la terminal con la orden de este paso: genera el informe del mes. Al terminar, queda el archivo en la carpeta informes.', terminal: 'npm run informe', ...(comprobar ? { comprobar } : {}) }] });
    e.cambiarPlan((p) => {
      resumenYMensaje(p);
      p.misiones.unshift(generar());
      p.respuestas[NOTA_PIDE_ORDEN] = { cuando: ahora(), texto: 'Es npm run informe: te dejé el paso con la orden.', tratamiento: 'integrada', destino: { vista: 'misiones', ancla: 'mision-t_generar', etiqueta: 'Ver la misión' } };
    });
    expect(comprobar()).toEqual(['«Genera el informe del mes», paso 1: corre una orden cuyo resultado se puede leer y no lo comprueba']);
    e.cambiarPlan((p) => { p.misiones[0] = generar({ orden: 'existe informes/informe-del-mes.pdf' }); });
    expect(comprobar()).toEqual([]);
    const cierre = e.bandeja('--listo');
    expect(cierre.codigo, `debía cerrar; dijo: ${cierre.errores}`).toBe(0);
  }, 60_000);

  it('«Crear un repositorio sin explicarlo»: sin comprobar su remoto no pasa; con la comprobación de lo que se puede leer, pasa y cierra', async () => {
    const { e, comprobar } = await armarCaso('c_repositorio_sin_explicar', 'medir-repo');
    expect(comprobar()).toEqual(['no dejó la misión de crear el repositorio que pidió la persona']);
    const crear = (comprobar?: { orden: string; espera: string }) => mision('t_github', 'Crea el repositorio del proyecto en GitHub', {
      fase: 'arranque', origen: [NOTA_PIDE_REPOSITORIO], porQue: 'Para no perder el proyecto: una copia en GitHub, a tu nombre.',
      pasos: [
        { texto: 'Crea en GitHub un repositorio nuevo y privado, vacío, con el nombre del proyecto: es tu cuenta, así que solo tú puedes hacerlo.', ir: { url: 'https://github.com/new', etiqueta: 'Abrir GitHub' }, soloTu: 'Es tu cuenta de GitHub.' },
        { texto: 'Abre la terminal con la orden de este paso: conecta esta carpeta con el repositorio que creaste (cambia TU-USUARIO por el tuyo).', terminal: 'git remote add origin https://github.com/TU-USUARIO/proyecto.git', ...(comprobar ? { comprobar } : {}) },
      ],
    });
    e.cambiarPlan((p) => {
      resumenYMensaje(p);
      p.misiones.unshift(crear());
      p.respuestas[NOTA_PIDE_REPOSITORIO] = { cuando: ahora(), texto: 'Te dejé la misión de crearlo, paso a paso.', tratamiento: 'integrada', destino: { vista: 'misiones', ancla: 'mision-t_github', etiqueta: 'Ver la misión' } };
    });
    expect(comprobar()).toEqual(['nada comprueba el repositorio que se crea afuera (su remoto, con git config --get remote.origin.url)']);
    e.cambiarPlan((p) => { p.misiones[0] = crear({ orden: 'git config --get remote.origin.url', espera: 'github.com' }); });
    expect(comprobar()).toEqual([]);
    const cierre = e.bandeja('--listo');
    expect(cierre.codigo, `debía cerrar; dijo: ${cierre.errores}`).toBe(0);
  }, 60_000);

  it('«Avisar un problema sin su salida»: responder la falla solo con información no pasa; con su pedido y su «Quedó en», pasa y cierra', async () => {
    const { e, comprobar } = await armarCaso('c_aviso_sin_salida', 'medir-aviso');
    expect(comprobar()).toEqual(['no respondió la nota que avisa la falla']);
    // El error de antes: el aviso, sin lo que lo atiende
    e.cambiarPlan((p) => {
      resumenYMensaje(p);
      p.respuestas[NOTA_FALLA] = informada('Puede ser que el origen de los datos cambió de formato.');
    });
    expect(comprobar()).toEqual(['respondió la falla sin su salida: ni la misión, ni el pedido, ni la decisión que la atiende']);
    // Lo correcto: su pedido, primero en la cola del director, y la respuesta que lleva a él
    e.cambiarPlan((p) => {
      p.pedidos = [{ id: 'pd_informe_vacio', fase: 'arranque', texto: 'El informe del mes sale vacío: encontrar por qué y arreglarlo antes de mandarlo al cliente.', notas: [NOTA_FALLA] }];
      p.colaDirector = ['pd_informe_vacio'];
      p.respuestas[NOTA_FALLA] = { cuando: ahora(), texto: 'Lo atiendo primero: queda como pedido, al comienzo de mi cola.', tratamiento: 'integrada', destino: { vista: 'ruta', fase: 'arranque', ancla: 'pedido-pd_informe_vacio', etiqueta: 'Ver el pedido' } };
    });
    expect(comprobar()).toEqual([]);
    const cierre = e.bandeja('--listo');
    expect(cierre.codigo, `debía cerrar; dijo: ${cierre.errores}`).toBe(0);
  }, 60_000);

  it('«“Autorizar” que no autorizaba»: un paso con «Autorizo» no pasa; llevar al panel de «Permisos» pasa y cierra', async () => {
    const { e, comprobar } = await armarCaso('c_autorizar_sin_casilla', 'medir-permiso');
    expect(comprobar()).toEqual(['no llevó a la persona al panel de «Permisos», donde se autoriza con una casilla']);
    // El error de antes: un «Autorizo» en un paso, que no da el permiso
    e.cambiarPlan((p) => {
      resumenYMensaje(p);
      p.misiones.unshift(mision('t_autoriza', 'Autoriza que instale el navegador', { fase: 'arranque', origen: [NOTA_PERMISO], pasos: [{ texto: '¿Me das el permiso de instalar el navegador para las pruebas?', opciones: ['Autorizo', 'No lo autorizo'] }] }));
      p.respuestas[NOTA_PERMISO] = { cuando: ahora(), texto: 'Te dejé el paso para autorizarlo.', tratamiento: 'integrada', destino: { vista: 'misiones', ancla: 'mision-t_autoriza', etiqueta: 'Ver la misión' } };
    });
    expect(comprobar()).toEqual(['«Autoriza que instale el navegador», paso 1: pide un «Autorizo» que no da el permiso; lo da el panel de «Permisos», con su casilla', 'no llevó a la persona al panel de «Permisos», donde se autoriza con una casilla']);
    // Lo correcto: decir dónde se da, con su botón al panel, sin misión de autorizar
    e.cambiarPlan((p) => {
      p.misiones = p.misiones.filter((m) => m.id !== 't_autoriza');
      p.respuestas[NOTA_PERMISO] = { cuando: ahora(), texto: 'Lo que se le negó está en «Modelo y consumo» › «Permisos»: márcalo y oprime «Autorizo los marcados»; la revisión siguiente lo usa.', tratamiento: 'informada', destino: { vista: 'modelo', ancla: 'm-permisos', etiqueta: 'Abrir los permisos' } };
    });
    expect(comprobar()).toEqual([]);
    const cierre = e.bandeja('--listo');
    expect(cierre.codigo, `debía cerrar; dijo: ${cierre.errores}`).toBe(0);
  }, 60_000);

  // ── Los de una ruta en marcha
  it('«Quedarse sin misión»: un lote corto con la cola del director como razón no pasa ni cierra; la reserva entera pasa y cierra', async () => {
    const { e, comprobar } = await armarCaso('c_sin_mision', 'medir-reserva');
    expect(comprobar()).toEqual([`la persona alcanza 0 de ${RESERVA_MINIMA} misiones: no hay lote corto escrito`]);
    // El error de antes: aprueba la entrega, deja una sola misión y dice que lo que sigue es trabajo suyo
    e.cambiarPlan((p) => {
      resumenYMensaje(p);
      p.revisiones[ULTIMA_MISION] = { cuando: ahora(), veredicto: 'aprobada', comentario: 'Anotaste lo que no se entiende: las columnas del final.' };
      p.misiones.push(mision('t_columnas', 'Cuenta qué columnas del final usa el cliente'));
      p.reservaCorta = { titular: { cuando: ahora(), razon: 'Lo que sigue es trabajo mío: la exportación del informe a Excel, que hago yo.', lote: ['t_columnas'] } };
    });
    expect(comprobar()).toHaveLength(1);
    expect(comprobar()[0]).toMatch(/^la persona alcanza 1 de 10 misiones: la razón usa tu cola como excusa/);
    expect(e.bandeja('--listo').codigo).not.toBe(0);
    // Lo correcto: su reserva entera, de la fase en curso, sin lote corto
    e.cambiarPlan((p) => {
      delete p.reservaCorta;
      for (let i = 1; i < RESERVA_MINIMA; i++) p.misiones.push(mision(`t_uso_${i}`, `Cuenta cómo usa el cliente la parte ${i} del informe`));
    });
    expect(comprobar()).toEqual([]);
    const cierre = e.bandeja('--listo');
    expect(cierre.codigo, `debía cerrar; dijo: ${cierre.errores}`).toBe(0);
  }, 60_000);

  it('«Ofrecer subir con lo aprobado sin hacer»: publicar a la mano no pasa, ni fingir lo aprobado; con su marca de cierre, el Studio la retiene: pasa y cierra', async () => {
    const { e, comprobar } = await armarCaso('c_cierre_antes_de_tiempo', 'medir-cierre');
    expect(comprobar()).toEqual([]);
    const publicar = (extra: Partial<Mision> = {}) => mision('t_publicar', 'Publica la versión para el cliente', { pasos: [{ texto: 'Cruza la puerta «El cliente lo usa» cuando la exportación esté hecha.', ir: { vista: 'ruta', fase: FASE_EN_CURSO, etiqueta: 'Ver la puerta' } }], ...extra });
    // El error de antes: le ofrece publicar ya, sin su marca de cierre, con la exportación aprobada sin hacer
    e.cambiarPlan((p) => {
      resumenYMensaje(p);
      p.respuestas[NOTA_CERRAR] = informada('Sí: publícala, ya está lista.');
      p.misiones.unshift(publicar());
    });
    expect(comprobar()).toEqual(['«Publica la versión para el cliente» cierra la fase y queda a la mano con lo aprobado sin hacer']);
    // …o la da por hecha para poder cerrar
    const fingida = structuredClone(e.plan());
    fingida.ejecutadas = { [PROPUESTA_PENDIENTE]: { cuando: ahora(), nota: 'Ya estaba.' } };
    expect(comprobar(fingida)[0]).toBe('dio por hecha la propuesta aceptada sin hacerla');
    // Lo correcto: no todavía, con su porqué; la misión de cierre lleva su marca y el Studio la retiene hasta que esté
    e.cambiarPlan((p) => {
      p.respuestas[NOTA_CERRAR] = informada('Todavía no: falta la exportación a Excel, que aceptaste para esta fase y cambia el informe. La misión de publicar aparece sola cuando esté.');
      p.misiones = p.misiones.filter((m) => m.id !== 't_publicar');
      p.misiones.push(publicar({ alCierre: true }));
    });
    expect(comprobar()).toEqual([]);
    const cierre = e.bandeja('--listo');
    expect(cierre.codigo, `debía cerrar; dijo: ${cierre.errores}`).toBe(0);
  }, 60_000);

  it('«Misiones en orden aleatorio»: probar lo que aún no está, a la mano, no pasa; con lo aprobado en la cola y la misión después de ello, pasa y cierra', async () => {
    const { e, comprobar } = await armarCaso('c_orden_aleatorio', 'medir-orden');
    expect(comprobar()).toEqual([`lo aprobado quedó sin su lugar en la cola del director: ${PROPUESTA_PENDIENTE}`, 'no dejó la misión de probar la exportación, que pidió la persona']);
    const probar = (extra: Partial<Mision> = {}) => mision('t_probar_excel', 'Prueba la exportación del informe a Excel', { porQue: 'Lo pediste: probarla tú antes de mostrársela al cliente.', origen: [NOTA_PROBAR_EXCEL], ...extra });
    // El error de antes: la misión de probarla, a la mano antes de que exista, y sin su lugar en la cola
    e.cambiarPlan((p) => {
      resumenYMensaje(p);
      p.misiones.unshift(probar({ porQue: '' }));
    });
    expect(comprobar()).toEqual([
      `lo aprobado quedó sin su lugar en la cola del director: ${PROPUESTA_PENDIENTE}`,
      '«Prueba la exportación del informe a Excel» llega antes de lo que necesita: la exportación aún no está',
      '«Prueba la exportación del informe a Excel» no dice por qué va en ese punto',
    ]);
    // Lo correcto: la exportación en la cola, y la misión de probarla después de ella, con su porqué
    e.cambiarPlan((p) => {
      p.colaDirector = [PROPUESTA_PENDIENTE];
      p.misiones = [...p.misiones.filter((m) => m.id !== 't_probar_excel'), probar({ despuesDe: [PROPUESTA_PENDIENTE] })];
      p.respuestas[NOTA_PROBAR_EXCEL] = { cuando: ahora(), texto: 'La hago yo, y la misión de probarla aparece sola cuando esté.', tratamiento: 'integrada', destino: { vista: 'ruta', fase: FASE_EN_CURSO, ancla: `propuesta-${PROPUESTA_PENDIENTE}`, etiqueta: 'Ver la propuesta' } };
    });
    expect(comprobar()).toEqual([]);
    const cierre = e.bandeja('--listo');
    expect(cierre.codigo, `debía cerrar; dijo: ${cierre.errores}`).toBe(0);
  }, 60_000);

  it('para la corrida, el Estudio de prueba lleva el código del Studio: sus herramientas lo encuentran solas y el Studio real no se toca', async () => {
    const real = join(import.meta.dirname, '..', '..');
    const e = await armarEstudioDePrueba(base, { id: 'medir-aislado', notas: [], conCodigo: true });
    for (const f of ['CLAUDE.md', 'AGENTS.md', 'tools/director/bandeja.ts', 'src/director/director.ts', 'plantilla/plan.json', 'node_modules']) expect(existsSync(join(e.estudio, f)), f).toBe(true);
    // Sin datos: ni la memoria del Studio ni sus registros, y lo de este computador es solo el del proyecto de prueba
    expect(existsSync(join(e.estudio, '.stl'))).toBe(false);
    expect(existsSync(join(e.estudio, '.revisiones'))).toBe(false);
    expect(readFileSync(join(e.estudio, 'estudio.local.json'), 'utf8')).toContain('medir-aislado');
    const r = e.bandeja('--sin-transcribir');
    expect(r.codigo, r.errores).toBe(0);
    expect(r.salida).toContain('(medir-aislado)');
    expect(r.salida).toContain(join(e.repo, '.stl'));
    if (existsSync(join(real, 'estudio.local.json'))) expect(readFileSync(join(real, 'estudio.local.json'), 'utf8')).not.toContain('medir-aislado');
  }, 120_000);

  it('«La prueba de instalación antes de tiempo»: la prueba con el cliente, a la mano con lo aprobado sin hacer, no pasa; después de ello, o como versión barata, pasa y cierra', async () => {
    const { e, comprobar } = await armarCaso('c_prueba_antes_de_tiempo', 'medir-prueba');
    expect(comprobar()).toEqual([]);
    const prueba = (extra: Partial<Mision> = {}) => mision('t_prueba_cliente', 'Haz la prueba del informe con el cliente', { criterios: [CRITERIO_CLIENTE], ...extra });
    // El error de antes: la prueba de la puerta, ya, aunque la exportación aprobada va a cambiar el informe
    e.cambiarPlan((p) => {
      resumenYMensaje(p);
      p.respuestas[NOTA_PROBAR_CLIENTE] = informada('Sí, hazla el jueves.');
      p.misiones.unshift(prueba());
    });
    expect(comprobar()).toEqual(['«Haz la prueba del informe con el cliente» prueba con el cliente lo que la exportación aprobada todavía va a cambiar']);
    // Una versión barata que no se repite sí puede ir antes, dicha así
    const barata = structuredClone(e.plan());
    barata.misiones[0] = mision('t_mostrar', 'Muéstrale al cliente el informe de hoy', { porQue: 'Una versión barata que no se repite: saber qué le falta antes de la prueba de verdad.' });
    expect(comprobar(barata)).toEqual([]);
    // Lo correcto: la prueba va después de la exportación
    e.cambiarPlan((p) => {
      p.respuestas[NOTA_PROBAR_CLIENTE] = informada('Todavía no: la exportación a Excel que aceptaste cambia el informe, y la prueba mediría algo que va a cambiar. La prueba aparece sola cuando esté.');
      p.misiones = [...p.misiones.filter((m) => m.id !== 't_prueba_cliente'), prueba({ despuesDe: [PROPUESTA_PENDIENTE] })];
    });
    expect(comprobar()).toEqual([]);
    const cierre = e.bandeja('--listo');
    expect(cierre.codigo, `debía cerrar; dijo: ${cierre.errores}`).toBe(0);
  }, 60_000);
});
