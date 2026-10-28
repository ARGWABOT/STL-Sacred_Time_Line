// Entregarle proyectos al director. Lo primero que se decide es cómo llegan, porque el director los maneja distinto:
// - existentes: ya tienen repositorio e historia. Basta con entregar su carpeta (una o varias, en líneas): el director
//   los diagnostica, detecta lo que está en curso y las metas de su propia documentación, y propone él los objetivos.
// - nuevo: aún no existe (o apenas empieza). El director necesita que se le cuente qué es, qué se quiere lograr y cuándo
//   se considera completo; con eso devuelve un planteamiento.
// - escanear el equipo: el Studio busca, con el permiso del usuario, los proyectos que desarrolla con IA en este
//   computador (en los historiales de Claude Code, Codex y Cursor, y en las unidades que elija) y deja elegir cuáles
//   entregar, todos a la vez.
// Devuelve lo que hay que enviar al servidor, o null si se cancela.
import { elegirCarpeta } from './explorador';
import { icono } from './iconos';
import { esc } from './util';

export type DatosProyectoNuevo = { tipo: 'existente' | 'nuevo'; nombre: string; ruta: string; contexto: string; metaInicial: string; terminado: string };
export type ProyectoEnLista = { nombre: string; ruta: string; historialIA?: { agente: string; sesiones?: number; ultima?: string; donde?: string }[] };
export type Entrega = { modo: 'uno'; datos: DatosProyectoNuevo } | { modo: 'varios'; proyectos: ProyectoEnLista[] };

interface Candidato { ruta: string; nombre: string; senales: { agente: string; sesiones?: number; ultima?: string; donde?: string }[]; ultima: string | null; yaEsta: boolean }
interface Fuentes { agentes: { id: string; nombre: string; donde: string; existe: boolean }[]; unidades: string[] }

const nombreDeRuta = (ruta: string) => ruta.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? '';
const fecha = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const botones = (principal: string, volver = '<button type="button" data-volver>← Volver</button>') =>
  `<div class="botones">${volver}<button type="button" data-cancelar>Cancelar</button>${principal}</div>`;

export function pedirProyectoNuevo(): Promise<Entrega | null> {
  const dlg = document.createElement('dialog');
  dlg.className = 'dialogo-director nuevo-proyecto';
  document.body.append(dlg);
  let candidatos: Candidato[] = [];

  return new Promise((ok) => {
    // Se resuelve una sola vez y sin depender del evento «close» (no todos los navegadores lo disparan a tiempo)
    let listo = false;
    const terminar = (r: Entrega | null) => {
      if (listo) return;
      listo = true;
      if (dlg.open) dlg.close();
      dlg.remove();
      ok(r);
    };
    const error = (t: string) => {
      const e = dlg.querySelector<HTMLElement>('.error-explorador');
      if (e) e.textContent = t;
    };

    // ── Lo de siempre: la carpeta y, si ya la tienes, la meta. El nombre sale de la carpeta; el director hace el resto
    function formularioRapido() {
      dlg.innerHTML = `<form method="dialog" data-form="rapido">
        <header class="cabeza-dialogo"><h2>Entrégale un proyecto al director</h2>
        <p>Elige su carpeta y listo: lo diagnostico, te digo dónde está y te propongo a dónde llevarlo. Su memoria se guarda en su propio repositorio, en una rama aparte (<code>stl</code>), sin tocar tu código.</p></header>
        <label class="campo"><span class="etiqueta-campo">La carpeta del proyecto</span><span class="con-explorar"><input name="ruta" type="text" required placeholder="Explora o escribe la ruta" /><button type="button" data-explorar>📁 Explorar…</button></span></label>
        <label class="campo"><span class="etiqueta-campo">¿A dónde quieres llegar con él? <small>(opcional)</small></span><textarea name="meta" rows="2" placeholder="Ej.: publicarlo en dos meses. Si por ahora solo quieres el diagnóstico y llevarlo con STL, déjalo vacío: te sugiero metas."></textarea></label>
        <p class="error-explorador" role="alert"></p>
        <p class="otras-entregas">¿Varios a la vez? <button type="button" class="enlace" data-tipo="escanear">Escanear el equipo</button> o <button type="button" class="enlace" data-tipo="existente">escribir sus carpetas</button>. ¿Todavía no existe? <button type="button" class="enlace" data-tipo="nuevo">Un proyecto nuevo</button>.</p>
        <div class="botones"><button type="button" data-cancelar>Cancelar</button><button type="submit" class="primario">Entregárselo al director</button></div>
      </form>`;
    }

    // ── Uno nuevo
    function formularioNuevo() {
      dlg.innerHTML = `<form method="dialog" data-form="nuevo">
        <header class="cabeza-dialogo"><h2>Un proyecto nuevo</h2>
        <p>Cuéntamelo sin pulir. Lo más importante es a dónde quieres llegar: de ahí salen las metas que te propongo.</p></header>
        <label class="campo"><span class="etiqueta-campo">Nombre del proyecto</span><input name="nombre" type="text" required /></label>
        <label class="campo"><span class="etiqueta-campo">Qué es, para quién y por qué</span><textarea name="contexto" rows="3" required placeholder="Ej.: una app para que los talleres agenden citas. La idea nace de…"></textarea></label>
        <label class="campo"><span class="etiqueta-campo">¿A dónde quieres llegar?</span><textarea name="metaInicial" rows="2" required placeholder="Ej.: que 20 talleres la usen y la paguen"></textarea></label>
        <label class="campo"><span class="etiqueta-campo">¿Cuándo lo darás por completo? <small>(opcional)</small></span><textarea name="terminado" rows="2" placeholder="Ej.: cuando 20 talleres paguen la suscripción durante dos meses seguidos"></textarea></label>
        <label class="campo"><span class="etiqueta-campo">La carpeta donde vivirá <small>(su memoria se guarda ahí; si no tiene git, lo inicio)</small></span><span class="con-explorar"><input name="ruta" type="text" required placeholder="Explora o escribe la ruta" /><button type="button" data-explorar>📁 Explorar…</button></span></label>
        <p class="error-explorador" role="alert"></p>
        ${botones('<button type="submit" class="primario">Entregárselo al director</button>')}
      </form>`;
      dlg.querySelector<HTMLInputElement>('input[name="nombre"]')?.focus();
    }

    // ── Existentes, en líneas
    const linea = (nombre = '', ruta = '') => `<div class="linea-p">
        <input name="nombre" type="text" value="${esc(nombre)}" placeholder="Nombre" aria-label="Nombre del proyecto" />
        <span class="con-explorar"><input name="ruta" type="text" value="${esc(ruta)}" placeholder="Carpeta del repositorio" aria-label="Carpeta del repositorio" /><button type="button" data-explorar title="Buscar la carpeta">📁</button></span>
        <button type="button" class="quitar-l" data-quitar title="Quitar esta línea" aria-label="Quitar esta línea">✕</button>
      </div>`;
    function formularioExistentes() {
      dlg.innerHTML = `<form method="dialog" data-form="existentes">
        <header class="cabeza-dialogo"><h2>Proyectos existentes</h2>
        <p>Una línea por proyecto: su nombre y la carpeta de su repositorio. Los diagnostico en mis próximas revisiones, cada uno con su buzón aparte. Lo que deba saber de cada uno me lo cuentas después, en su Buzón.</p></header>
        <div class="lineas-p">${linea()}</div>
        <p><button type="button" data-otra>＋ Otra línea</button></p>
        <p class="error-explorador" role="alert"></p>
        ${botones('<button type="submit" class="primario">Entregárselos al director</button>')}
      </form>`;
      dlg.querySelector<HTMLInputElement>('input[name="nombre"]')?.focus();
    }

    // ── Escanear el equipo: primero el permiso, después la lista
    async function permisoEscaneo() {
      dlg.innerHTML = `<form method="dialog"><header class="cabeza-dialogo"><h2>Escanear el equipo</h2><p class="escaneando">Revisando qué se puede escanear…</p></header></form>`;
      const f: Fuentes = await fetch('/__estudio/director/escanear/fuentes').then((r) => r.json());
      dlg.innerHTML = `<form method="dialog" data-form="permiso">
        <header class="cabeza-dialogo"><h2>Escanear el equipo</h2>
        <p>Elige dónde puedo buscar los proyectos que desarrollas con IA. Después ves la lista y decides cuáles me entregas.</p></header>
        <fieldset class="grupo-opciones">
          <legend>Historiales de tus agentes de IA <small>· casi inmediato</small></legend>
          ${f.agentes.map((a) => `<label class="opcion${a.existe ? '' : ' apagado'}">
              <input type="checkbox" name="agente" value="${esc(a.id)}"${a.existe ? ' checked' : ' disabled'} />
              <span class="opcion-texto"><b>${esc(a.nombre)}</b><span class="ruta-mono">${a.existe ? esc(a.donde) : 'No está en este computador'}</span></span>
              <span class="estado-opcion">${a.existe ? 'Encontrado' : 'No instalado'}</span>
            </label>`).join('')}
        </fieldset>
        <fieldset class="grupo-opciones">
          <legend>Unidades que puedo recorrer <small>· hasta medio minuto cada una</small></legend>
          <div class="fichas-unidad">${f.unidades.map((u) => `<label class="ficha-unidad"><input type="checkbox" name="unidad" value="${esc(u)}" />${icono('disco')}<span>${esc(u)}</span></label>`).join('') || '<p class="como">No encontré unidades.</p>'}</div>
        </fieldset>
        <div class="nota-privacidad">${icono('candado')}<p>Solo leo lo necesario para encontrar las carpetas: de los historiales, la carpeta de cada conversación (no lo que se habló); de las unidades, los repositorios git con archivos de trabajo con IA (CLAUDE.md, AGENTS.md, .claude, .cursor). Nada sale de este computador.</p></div>
        <p class="error-explorador" role="alert"></p>
        ${botones('<button type="submit" class="primario">Escanear</button>')}
      </form>`;
    }

    async function hacerEscaneo(form: HTMLFormElement) {
      const fd = new FormData(form);
      const agentes = fd.getAll('agente').map(String);
      const unidades = fd.getAll('unidad').map(String);
      if (!agentes.length && !unidades.length) return error('Elige al menos un historial o una unidad.');
      dlg.innerHTML = `<form method="dialog"><header class="cabeza-dialogo"><h2>Escanear el equipo</h2><p class="escaneando">Buscando proyectos con IA en ${unidades.length ? `${unidades.join(', ')} y ` : ''}los historiales elegidos…</p></header></form>`;
      const r = await fetch('/__estudio/director/escanear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentes, unidades }) });
      const j = await r.json();
      if (!r.ok) { await permisoEscaneo(); return error(j.error ?? 'No se pudo escanear.'); }
      candidatos = j.candidatos;
      const nuevos = candidatos.filter((c) => !c.yaEsta);
      dlg.innerHTML = `<form method="dialog" data-form="escaneo">
        <header class="cabeza-dialogo"><h2>Proyectos con IA en este computador</h2>
        <p>Encontré ${candidatos.length} ${candidatos.length === 1 ? 'repositorio' : 'repositorios'}${j.omitidas ? ` (y ${j.omitidas} ${j.omitidas === 1 ? 'carpeta' : 'carpetas'} sin git o que ya no existen, que no se pueden entregar)` : ''}. Elige cuáles me entregas y corrige sus nombres si quieres. Los diagnostico en mis próximas revisiones.</p></header>
        ${j.aviso ? `<p class="aviso remoto">${esc(j.aviso)}</p>` : ''}
        ${nuevos.length ? `<div class="todos-e"><label class="casilla-todos"><input type="checkbox" data-todos checked /> Todos los nuevos</label><span class="como" data-cuenta>${nuevos.length} ${nuevos.length === 1 ? 'elegido' : 'elegidos'}</span></div>` : ''}
        <ul class="candidatos-e">${candidatos.map((c, i) => `<li class="${c.yaEsta ? 'ya' : ''}">
            <input type="checkbox" name="elegido" value="${i}"${c.yaEsta ? ' disabled' : ' checked'} aria-label="Entregar ${esc(c.nombre)}" />
            <div><input type="text" name="nombre-${i}" value="${esc(c.nombre)}"${c.yaEsta ? ' disabled' : ''} aria-label="Nombre del proyecto" />
              <small class="ruta-mono">${esc(c.ruta)}</small>
              <small class="senales-e">${c.yaEsta ? '<b>Ya está en el Studio.</b> ' : ''}${c.senales.map((s) => `${esc(s.agente)}${s.sesiones ? ` (${s.sesiones} ${s.sesiones === 1 ? 'sesión' : 'sesiones'})` : ''}${s.donde && s.agente === 'Archivos de IA' ? `: ${esc(s.donde)}` : ''}`).join(' · ')}${c.ultima ? ` · último trabajo: ${fecha(c.ultima)}` : ''}</small></div>
          </li>`).join('') || '<li class="como">No encontré proyectos con IA donde me dejaste buscar.</li>'}</ul>
        <p class="error-explorador" role="alert"></p>
        ${botones(nuevos.length ? '<button type="submit" class="primario">Entregar los elegidos</button>' : '', '<button type="button" data-volver-permiso>← Buscar en otra parte</button>')}
      </form>`;
    }

    dlg.addEventListener('click', async (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!b) return;
      if (b.dataset.cancelar !== undefined) terminar(null);
      else if (b.dataset.volver !== undefined) formularioRapido();
      else if (b.dataset.volverPermiso !== undefined) await permisoEscaneo();
      else if (b.dataset.tipo === 'nuevo') formularioNuevo();
      else if (b.dataset.tipo === 'existente') formularioExistentes();
      else if (b.dataset.tipo === 'escanear') await permisoEscaneo();
      else if (b.dataset.otra !== undefined) {
        dlg.querySelector('.lineas-p')!.insertAdjacentHTML('beforeend', linea());
        [...dlg.querySelectorAll<HTMLInputElement>('.linea-p input[name="nombre"]')].at(-1)?.focus();
      } else if (b.dataset.quitar !== undefined) {
        const lineas = dlg.querySelectorAll('.linea-p');
        if (lineas.length > 1) b.closest('.linea-p')!.remove();
        else b.closest('.linea-p')!.querySelectorAll('input').forEach((i) => (i.value = ''));
      } else if (b.dataset.explorar !== undefined) {
        const caja = b.closest('.linea-p') ?? b.closest('label') ?? dlg;
        const campo = caja.querySelector<HTMLInputElement>('input[name="ruta"]')!;
        const elegida = await elegirCarpeta(campo.value);
        if (!elegida) return;
        campo.value = elegida;
        const nombre = caja.querySelector<HTMLInputElement>('input[name="nombre"]');
        if (nombre && !nombre.value.trim()) nombre.value = nombreDeRuta(elegida);
      }
    });
    dlg.addEventListener('change', (e) => {
      const t = e.target as HTMLInputElement;
      if (t.dataset.todos !== undefined) dlg.querySelectorAll<HTMLInputElement>('input[name="elegido"]:not(:disabled)').forEach((x) => (x.checked = t.checked));
      const cuenta = dlg.querySelector<HTMLElement>('[data-cuenta]');
      if (cuenta) {
        const n = dlg.querySelectorAll('input[name="elegido"]:checked').length;
        cuenta.textContent = `${n} ${n === 1 ? 'elegido' : 'elegidos'}`;
      }
    });
    dlg.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const cual = form.dataset.form;
      if (cual === 'permiso') return void (await hacerEscaneo(form));
      if (!form.reportValidity()) return;
      if (cual === 'rapido') {
        const v = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
        const ruta = (v.ruta ?? '').trim();
        return terminar({ modo: 'uno', datos: { tipo: 'existente', nombre: nombreDeRuta(ruta), ruta, contexto: '', metaInicial: (v.meta ?? '').trim(), terminado: '' } });
      }
      if (cual === 'nuevo') {
        const v = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
        return terminar({ modo: 'uno', datos: { tipo: 'nuevo', nombre: v.nombre ?? '', ruta: v.ruta ?? '', contexto: v.contexto ?? '', metaInicial: v.metaInicial ?? '', terminado: v.terminado ?? '' } });
      }
      if (cual === 'existentes') {
        const proyectos = [...form.querySelectorAll('.linea-p')]
          .map((l) => ({ nombre: l.querySelector<HTMLInputElement>('input[name="nombre"]')!.value.trim(), ruta: l.querySelector<HTMLInputElement>('input[name="ruta"]')!.value.trim() }))
          .filter((p) => p.nombre || p.ruta)
          .map((p) => ({ ...p, nombre: p.nombre || nombreDeRuta(p.ruta) }));
        if (!proyectos.length) return error('Escribe al menos una línea.');
        if (proyectos.some((p) => !p.ruta)) return error('Cada línea necesita la carpeta de su repositorio.');
        return terminar({ modo: 'varios', proyectos });
      }
      if (cual === 'escaneo') {
        const elegidos = new FormData(form).getAll('elegido').map(Number);
        if (!elegidos.length) return error('Elige al menos un proyecto.');
        const proyectos = elegidos.map((i) => ({
          nombre: form.querySelector<HTMLInputElement>(`input[name="nombre-${i}"]`)?.value.trim() || candidatos[i].nombre,
          ruta: candidatos[i].ruta,
          historialIA: candidatos[i].senales.filter((s) => s.agente !== 'Archivos de IA'),
        }));
        return terminar({ modo: 'varios', proyectos });
      }
    });
    dlg.addEventListener('cancel', () => terminar(null));
    dlg.addEventListener('close', () => terminar(null));

    formularioRapido();
    dlg.showModal();
    dlg.querySelector<HTMLButtonElement>('[data-explorar]')?.focus();
  });
}
