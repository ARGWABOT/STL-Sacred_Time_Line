// Entregarle proyectos al director. Lo primero que se decide es cómo llegan, porque el director los maneja distinto:
// - existentes: ya tienen repositorio e historia. Basta con entregar su carpeta (una o varias, en líneas): el director
//   los diagnostica, detecta lo que está en curso y las metas de su propia documentación, y propone él los objetivos.
// - nuevo: aún no existe (o apenas empieza). El director necesita que se le cuente qué es, qué se quiere lograr y cuándo
//   se considera completo; con eso devuelve un planteamiento.
// - escanear el equipo: el Studio busca, con el permiso del usuario, los proyectos que desarrolla con IA en este
//   computador (en los historiales de Claude Code, Codex y Cursor, y en las unidades que elija) y deja elegir cuáles
//   entregar, todos a la vez.
// Devuelve lo que hay que enviar al servidor, o null si se cancela. Los textos, del archivo de cada idioma (pd_idiomas).
import { elegirCarpeta } from './explorador';
import { icono } from './iconos';
import { lenguaje, t } from './textos';
import { esc } from './util';

export type DatosProyectoNuevo = { tipo: 'existente' | 'nuevo'; nombre: string; ruta: string; contexto: string; metaInicial: string; terminado: string };
export type ProyectoEnLista = { nombre: string; ruta: string; historialIA?: { agente: string; sesiones?: number; ultima?: string; donde?: string }[] };
export type Entrega = { modo: 'uno'; datos: DatosProyectoNuevo } | { modo: 'varios'; proyectos: ProyectoEnLista[] };

interface Candidato { ruta: string; nombre: string; senales: { agente: string; sesiones?: number; ultima?: string; donde?: string }[]; ultima: string | null; yaEsta: boolean }
interface Fuentes { agentes: { id: string; nombre: string; donde: string; existe: boolean }[]; unidades: string[] }

const nombreDeRuta = (ruta: string) => ruta.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? '';
const fecha = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(lenguaje(), { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const botones = (principal: string, volver = `<button type="button" data-volver>${t('nuevo.volver')}</button>`) =>
  `<div class="botones">${volver}<button type="button" data-cancelar>${t('cabeza.cancelar')}</button>${principal}</div>`;
/** El nombre que el servidor le da a los archivos de trabajo con IA, en una señal del escaneo (estudio/servidor › escanear). */
const SENAL_DE_ARCHIVOS = 'Archivos de IA';

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
    const error = (texto: string) => {
      const e = dlg.querySelector<HTMLElement>('.error-explorador');
      if (e) e.textContent = texto;
    };

    // ── Lo de siempre: la carpeta y, si ya la tienes, la meta. El nombre sale de la carpeta; el director hace el resto
    function formularioRapido() {
      dlg.innerHTML = `<form method="dialog" data-form="rapido">
        <header class="cabeza-dialogo"><h2>${t('nuevo.titulo')}</h2>
        <p>${t('nuevo.intro')}</p></header>
        <label class="campo"><span class="etiqueta-campo">${t('nuevo.carpeta')}</span><span class="con-explorar"><input name="ruta" type="text" required placeholder="${esc(t('nuevo.exploraRuta'))}" /><button type="button" data-explorar>${t('nuevo.explorar')}</button></span></label>
        <label class="campo"><span class="etiqueta-campo">${t('nuevo.aDonde')} <small>${t('nuevo.opcional')}</small></span><textarea name="meta" rows="2" placeholder="${esc(t('nuevo.aDondeEj'))}"></textarea></label>
        <p class="error-explorador" role="alert"></p>
        <p class="otras-entregas">${t('nuevo.otras', {
          escanear: `<button type="button" class="enlace" data-tipo="escanear">${t('nuevo.escanear')}</button>`,
          escribir: `<button type="button" class="enlace" data-tipo="existente">${t('nuevo.escribirCarpetas')}</button>`,
          nuevo: `<button type="button" class="enlace" data-tipo="nuevo">${t('nuevo.unoNuevo')}</button>`,
        })}</p>
        <div class="botones"><button type="button" data-cancelar>${t('cabeza.cancelar')}</button><button type="submit" class="primario">${t('nuevo.entregarlo')}</button></div>
      </form>`;
    }

    // ── Uno nuevo
    function formularioNuevo() {
      dlg.innerHTML = `<form method="dialog" data-form="nuevo">
        <header class="cabeza-dialogo"><h2>${t('nuevo.unoNuevo')}</h2>
        <p>${t('nuevo.nuevoIntro')}</p></header>
        <label class="campo"><span class="etiqueta-campo">${t('nuevo.nombre')}</span><input name="nombre" type="text" required /></label>
        <label class="campo"><span class="etiqueta-campo">${t('nuevo.queEs')}</span><textarea name="contexto" rows="3" required placeholder="${esc(t('nuevo.queEsEj'))}"></textarea></label>
        <label class="campo"><span class="etiqueta-campo">${t('nuevo.aDondeCorto')}</span><textarea name="metaInicial" rows="2" required placeholder="${esc(t('nuevo.aDondeCortoEj'))}"></textarea></label>
        <label class="campo"><span class="etiqueta-campo">${t('nuevo.completo')} <small>${t('nuevo.opcional')}</small></span><textarea name="terminado" rows="2" placeholder="${esc(t('nuevo.completoEj'))}"></textarea></label>
        <label class="campo"><span class="etiqueta-campo">${t('nuevo.dondeVivira')} <small>${t('nuevo.dondeViviraNota')}</small></span><span class="con-explorar"><input name="ruta" type="text" required placeholder="${esc(t('nuevo.exploraRuta'))}" /><button type="button" data-explorar>${t('nuevo.explorar')}</button></span></label>
        <p class="error-explorador" role="alert"></p>
        ${botones(`<button type="submit" class="primario">${t('nuevo.entregarlo')}</button>`)}
      </form>`;
      dlg.querySelector<HTMLInputElement>('input[name="nombre"]')?.focus();
    }

    // ── Existentes, en líneas
    const linea = (nombre = '', ruta = '') => `<div class="linea-p">
        <input name="nombre" type="text" value="${esc(nombre)}" placeholder="${esc(t('nuevo.lineaNombre'))}" aria-label="${esc(t('nuevo.nombre'))}" />
        <span class="con-explorar"><input name="ruta" type="text" value="${esc(ruta)}" placeholder="${esc(t('nuevo.lineaCarpeta'))}" aria-label="${esc(t('nuevo.lineaCarpeta'))}" /><button type="button" data-explorar title="${esc(t('nuevo.buscarCarpeta'))}">📁</button></span>
        <button type="button" class="quitar-l" data-quitar title="${esc(t('nuevo.quitarLinea'))}" aria-label="${esc(t('nuevo.quitarLinea'))}">✕</button>
      </div>`;
    function formularioExistentes() {
      dlg.innerHTML = `<form method="dialog" data-form="existentes">
        <header class="cabeza-dialogo"><h2>${t('nuevo.existentes')}</h2>
        <p>${t('nuevo.existentesIntro')}</p></header>
        <div class="lineas-p">${linea()}</div>
        <p><button type="button" data-otra>${t('nuevo.otraLinea')}</button></p>
        <p class="error-explorador" role="alert"></p>
        ${botones(`<button type="submit" class="primario">${t('nuevo.entregarlos')}</button>`)}
      </form>`;
      dlg.querySelector<HTMLInputElement>('input[name="nombre"]')?.focus();
    }

    // ── Escanear el equipo: primero el permiso, después la lista
    async function permisoEscaneo() {
      dlg.innerHTML = `<form method="dialog"><header class="cabeza-dialogo"><h2>${t('nuevo.escanear')}</h2><p class="escaneando">${t('nuevo.revisandoEscaneo')}</p></header></form>`;
      const f: Fuentes = await fetch('/__estudio/director/escanear/fuentes').then((r) => r.json());
      dlg.innerHTML = `<form method="dialog" data-form="permiso">
        <header class="cabeza-dialogo"><h2>${t('nuevo.escanear')}</h2>
        <p>${t('nuevo.dondeBuscar')}</p></header>
        <fieldset class="grupo-opciones">
          <legend>${t('nuevo.historiales')} <small>${t('nuevo.casiInmediato')}</small></legend>
          ${f.agentes.map((a) => `<label class="opcion${a.existe ? '' : ' apagado'}">
              <input type="checkbox" name="agente" value="${esc(a.id)}"${a.existe ? ' checked' : ' disabled'} />
              <span class="opcion-texto"><b>${esc(a.nombre)}</b><span class="ruta-mono">${a.existe ? esc(a.donde) : t('nuevo.noEsta')}</span></span>
              <span class="estado-opcion">${t(a.existe ? 'nuevo.encontrado' : 'nuevo.noInstalado')}</span>
            </label>`).join('')}
        </fieldset>
        <fieldset class="grupo-opciones">
          <legend>${t('nuevo.unidades')} <small>${t('nuevo.medioMinuto')}</small></legend>
          <div class="fichas-unidad">${f.unidades.map((u) => `<label class="ficha-unidad"><input type="checkbox" name="unidad" value="${esc(u)}" />${icono('disco')}<span>${esc(u)}</span></label>`).join('') || `<p class="como">${t('nuevo.sinUnidades')}</p>`}</div>
        </fieldset>
        <div class="nota-privacidad">${icono('candado')}<p>${t('nuevo.privacidad')}</p></div>
        <p class="error-explorador" role="alert"></p>
        ${botones(`<button type="submit" class="primario">${t('nuevo.escanearBoton')}</button>`)}
      </form>`;
    }

    async function hacerEscaneo(form: HTMLFormElement) {
      const fd = new FormData(form);
      const agentes = fd.getAll('agente').map(String);
      const unidades = fd.getAll('unidad').map(String);
      if (!agentes.length && !unidades.length) return error(t('nuevo.eligeUno'));
      dlg.innerHTML = `<form method="dialog"><header class="cabeza-dialogo"><h2>${t('nuevo.escanear')}</h2><p class="escaneando">${unidades.length ? t('nuevo.buscandoEn', { unidades: unidades.join(', ') }) : t('nuevo.buscando')}</p></header></form>`;
      const r = await fetch('/__estudio/director/escanear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentes, unidades }) });
      const j = await r.json();
      if (!r.ok) { await permisoEscaneo(); return error(j.error ?? t('nuevo.noEscaneo')); }
      candidatos = j.candidatos;
      const nuevos = candidatos.filter((c) => !c.yaEsta);
      dlg.innerHTML = `<form method="dialog" data-form="escaneo">
        <header class="cabeza-dialogo"><h2>${t('nuevo.conIA')}</h2>
        <p>${t('nuevo.encontre', { n: candidatos.length, omitidas: j.omitidas ? ` ${t('nuevo.omitidas', { n: j.omitidas })}` : '' })}</p></header>
        ${j.aviso ? `<p class="aviso remoto">${esc(j.aviso)}</p>` : ''}
        ${nuevos.length ? `<div class="todos-e"><label class="casilla-todos"><input type="checkbox" data-todos checked /> ${t('nuevo.todosLosNuevos')}</label><span class="como" data-cuenta>${t('nuevo.elegidos', { n: nuevos.length })}</span></div>` : ''}
        <ul class="candidatos-e">${candidatos.map((c, i) => `<li class="${c.yaEsta ? 'ya' : ''}">
            <input type="checkbox" name="elegido" value="${i}"${c.yaEsta ? ' disabled' : ' checked'} aria-label="${esc(t('nuevo.entregarNombre', { nombre: c.nombre }))}" />
            <div><input type="text" name="nombre-${i}" value="${esc(c.nombre)}"${c.yaEsta ? ' disabled' : ''} aria-label="${esc(t('nuevo.nombre'))}" />
              <small class="ruta-mono">${esc(c.ruta)}</small>
              <small class="senales-e">${c.yaEsta ? `<b>${t('nuevo.yaEsta')}</b> ` : ''}${c.senales.map((s) => `${esc(s.agente)}${s.sesiones ? ` (${t('nuevo.sesiones', { n: s.sesiones })})` : ''}${s.donde && s.agente === SENAL_DE_ARCHIVOS ? `: ${esc(s.donde)}` : ''}`).join(' · ')}${c.ultima ? ` · ${t('nuevo.ultimoTrabajo', { fecha: fecha(c.ultima) })}` : ''}</small></div>
          </li>`).join('') || `<li class="como">${t('nuevo.sinProyectos')}</li>`}</ul>
        <p class="error-explorador" role="alert"></p>
        ${botones(nuevos.length ? `<button type="submit" class="primario">${t('nuevo.entregarElegidos')}</button>` : '', `<button type="button" data-volver-permiso>${t('nuevo.otraParte')}</button>`)}
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
      const x = e.target as HTMLInputElement;
      if (x.dataset.todos !== undefined) dlg.querySelectorAll<HTMLInputElement>('input[name="elegido"]:not(:disabled)').forEach((y) => (y.checked = x.checked));
      const cuenta = dlg.querySelector<HTMLElement>('[data-cuenta]');
      if (cuenta) cuenta.textContent = t('nuevo.elegidos', { n: dlg.querySelectorAll('input[name="elegido"]:checked').length });
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
        if (!proyectos.length) return error(t('nuevo.unaLinea'));
        if (proyectos.some((p) => !p.ruta)) return error(t('nuevo.lineaSinCarpeta'));
        return terminar({ modo: 'varios', proyectos });
      }
      if (cual === 'escaneo') {
        const elegidos = new FormData(form).getAll('elegido').map(Number);
        if (!elegidos.length) return error(t('nuevo.eligeProyecto'));
        const proyectos = elegidos.map((i) => ({
          nombre: form.querySelector<HTMLInputElement>(`input[name="nombre-${i}"]`)?.value.trim() || candidatos[i].nombre,
          ruta: candidatos[i].ruta,
          historialIA: candidatos[i].senales.filter((s) => s.agente !== SENAL_DE_ARCHIVOS),
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
