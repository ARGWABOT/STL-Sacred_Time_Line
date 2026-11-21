// La pantalla de espera del inicio guiado (pd_inicio_guiado; nmwajh5katit): al terminar, lleva a lo siguiente. La del
// diagnóstico bloquea y pasa 20 consejos ilustrados (pd_consejos_espera, nota nmwb8rwsntit, que reemplaza la ventana que
// se podía cerrar de nmwaji43utit); la de la ruta nombra sus etapas y se cierra cuando se quiere.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONSEJOS_ESPERA, destinoDeEspera, esperaBloquea, ETAPAS_ESPERA, htmlEspera, momentoDeEspera, moverConsejo } from './esperaRevision';
import { ponerIdioma, t } from './textos';

describe('la pantalla de espera del inicio guiado', () => {
  it('mientras diagnostica: 20 consejos, cada uno con su dibujo, sus ‹ › y el cargador; sin «Cerrar» ni el botón de seguir', () => {
    ponerIdioma('es');
    const html = htmlEspera('diagnostico', 'trabajando', 'Talleres <x>');
    expect(html).toContain('El director diagnostica «Talleres &lt;x&gt;»');
    expect(CONSEJOS_ESPERA).toHaveLength(20);
    expect(new Set(CONSEJOS_ESPERA.map((c) => c.clave)).size).toBe(20);
    expect(html.match(/<figure class="consejo"/g)).toHaveLength(20);
    expect(html.match(/<figure class="consejo"[^>]*>\s*<svg /g)).toHaveLength(20);
    // Uno solo a la vista: el primero
    expect(html.match(/<figure class="consejo" data-consejo="\d+">/g)).toEqual(['<figure class="consejo" data-consejo="0">']);
    expect(html).toContain('data-consejo-mover="-1"');
    expect(html).toContain('data-consejo-mover="1"');
    expect(html).toContain('1 de 20');
    expect(html).toContain('class="cargando-espera" role="status">El director está diagnosticando «Talleres &lt;x&gt;». Mientras tanto');
    expect(html).toContain('class="cuerpo-espera');
    expect(html).not.toContain('data-espera-cerrar');
    expect(html).not.toContain('data-espera-seguir');
    expect(html).not.toContain('etapas-espera');
    // Cada consejo con su título y su texto, en los dos idiomas, y su dibujo con los colores del Studio
    for (const idioma of ['es', 'en'] as const) {
      ponerIdioma(idioma);
      for (const c of CONSEJOS_ESPERA) {
        expect(t(`espera.consejo.${c.clave}.titulo` as Parameters<typeof t>[0]).length, c.clave).toBeGreaterThan(3);
        expect(t(`espera.consejo.${c.clave}.texto` as Parameters<typeof t>[0]).length, c.clave).toBeGreaterThan(40);
        expect(c.dibujo, c.clave).not.toMatch(/(fill|stroke)="#/);
        expect(c.dibujo, c.clave).toMatch(/var\(--/);
      }
    }
    ponerIdioma('en');
    expect(htmlEspera('diagnostico', 'trabajando', 'Shops', 22)).toContain('<figure class="consejo" data-consejo="2">');
    ponerIdioma('es');
  });

  it('los consejos dan la vuelta en los dos sentidos, y solo bloquea el diagnóstico mientras trabaja', () => {
    expect(moverConsejo(0, -1)).toBe(19);
    expect(moverConsejo(19, 1)).toBe(0);
    expect(moverConsejo(4, 1)).toBe(5);
    expect(esperaBloquea('diagnostico', null)).toBe(true);
    expect(esperaBloquea('diagnostico', 'trabajando')).toBe(true);
    expect(esperaBloquea('diagnostico', 'lista')).toBe(false);
    expect(esperaBloquea('diagnostico', 'fallo')).toBe(false);
    expect(esperaBloquea('ruta', 'trabajando')).toBe(false);
    // Detenido, el diagnóstico se puede cerrar: nadie queda atrapado
    expect(htmlEspera('diagnostico', 'fallo', 'Shops')).toContain('data-espera-cerrar');
  });

  it('cerrada la revisión, la espera no se retiene mientras el director sale: se puede cerrar y aún no ofrece la meta (auditoría de la entrega, punto 4)', () => {
    const r = { pedida: '2026-11-11T03:08:52.696Z', hecha: '2026-11-11T03:16:00.000Z' };
    expect(momentoDeEspera(r, '2026-11-11T03:08:00.000Z', true)).toBe('cerrando');
    expect(esperaBloquea('diagnostico', 'cerrando')).toBe(false);
    for (const idioma of ['es', 'en'] as const) {
      ponerIdioma(idioma);
      const html = htmlEspera('diagnostico', 'cerrando', 'Shops');
      expect(html).toContain('data-espera-cerrar');
      expect(html).not.toContain('data-espera-seguir');
      expect(html).not.toContain('consejos-espera');
      expect(html).toContain(`<p class="como">${t('espera.cerrandoComo')}`);
      expect(html.match(/<li class="hecha">/g)).toHaveLength(ETAPAS_ESPERA.diagnostico.length);
    }
    ponerIdioma('es');
  });

  it('sin nadie que tome el diagnóstico, la espera no atrapa: se puede cerrar (auditoría de la entrega, nmwcebe0otit)', () => {
    expect(esperaBloquea('diagnostico', 'trabajando', true)).toBe(false);
    expect(esperaBloquea('diagnostico', null, true)).toBe(false);
    expect(htmlEspera('diagnostico', 'trabajando', 'Shops', 0, true)).toContain('data-espera-cerrar');
    // Y la página lo pregunta cada vez: sin revisión en marcha, sin quien la lance o con el candado de otro
    const app = readFileSync(join(__dirname, 'app.ts'), 'utf-8').replace(/\r\n/g, '\n');
    expect(app).toContain('esperaBloquea(espera.de, espera.momento, sinDirectorEnEspera())');
    expect(app).toContain('return !r || !(automatica() || vigilando()) || esperaCandado();');
    expect(app).toContain('htmlEspera(espera.de, momento, d.proyecto.nombre, espera.consejo, sinDirector, esNuevo())');
  });

  it('un proyecto que aún no existe: su espera habla del planteamiento, nunca de diagnosticar (pd_entrega_fluida, nmwdxuaavtit)', () => {
    ponerIdioma('en');
    try {
      const bloquea = htmlEspera('diagnostico', 'trabajando', 'Shops', 0, false, true);
      expect(bloquea).toContain('The director is writing the approach of «Shops»');
      expect(bloquea.replace(/<[^>]+>/g, ' ')).not.toMatch(/diagnosing|diagnosis of|the diagnosis/i);
      const sinDirector = htmlEspera('diagnostico', 'trabajando', 'Shops', 0, true, true);
      expect(sinDirector).toContain('writing the approach');
      expect(sinDirector.replace(/<[^>]+>/g, ' ')).not.toMatch(/diagnosing|diagnosis of|the diagnosis/i);
      const lista = htmlEspera('diagnostico', 'lista', 'Shops', 0, false, true);
      expect(lista).toContain('The approach of «Shops» is ready');
      expect(lista).toContain('Writes the approach');
      expect(lista.replace(/<[^>]+>/g, ' ')).not.toMatch(/diagnosing|diagnosis of|the diagnosis/i);
      // Un existente sigue con su diagnóstico
      expect(htmlEspera('diagnostico', 'trabajando', 'Shops')).toContain('diagnosing');
    } finally {
      ponerIdioma('es');
    }
    expect(htmlEspera('diagnostico', 'trabajando', 'Talleres', 0, false, true)).toContain('escribiendo el planteamiento de «Talleres»');
  });

  it('la ruta, mientras trabaja: sus etapas, con su margen, y se puede cerrar sin detener nada', () => {
    ponerIdioma('es');
    const html = htmlEspera('ruta', 'trabajando', 'Talleres');
    expect(html).toContain('class="cuerpo-espera"');
    expect(html.match(/<li class="por-hacer">/g)).toHaveLength(ETAPAS_ESPERA.ruta.length);
    expect(html).toContain('data-espera-cerrar');
    expect(html).toContain('Puedes cerrar esta ventana');
    expect(html).not.toContain('data-espera-seguir');
    expect(html).not.toContain('consejos-espera');
  });

  it('el cuerpo del diálogo lleva su margen, que antes solo tenía un formulario', () => {
    const css = readFileSync(join(__dirname, 'director.css'), 'utf-8');
    expect(css).toMatch(/\.espera-revision \.cuerpo-espera \{[^}]*padding: 24px/);
  });

  it('en la página: Escape no la cierra mientras bloquea, y los consejos pasan solos', () => {
    const app = readFileSync(join(__dirname, 'app.ts'), 'utf-8');
    expect(app).toContain('if (bloquea()) return e.preventDefault();');
    expect(app).toContain('MS_POR_CONSEJO');
    expect(app).toContain('b.dataset.consejoMover');
  });

  it('al terminar: las etapas marcadas y el botón a lo siguiente; tras la ruta, la lectura corta del diagnóstico va primero', () => {
    ponerIdioma('en');
    const diag = htmlEspera('diagnostico', 'lista', 'Shops');
    expect(diag.match(/<li class="hecha">✓/g)).toHaveLength(4);
    expect(diag).toContain('data-espera-seguir>Choose the goal</button>');
    const ruta = htmlEspera('ruta', 'lista', 'Shops');
    expect(ruta).toContain('The route of «Shops» is drawn');
    expect(ruta).toContain('Your first mission is a short reading of the diagnosis');
    expect(ruta).toContain('data-espera-seguir>Go to my first mission</button>');
    expect(destinoDeEspera('diagnostico')).toEqual({ vista: 'proyecto', ancla: 'p-objetivo' });
    expect(destinoDeEspera('ruta')).toEqual({ vista: 'misiones' });
    // Detenida sin cerrar: lo dice, sin botón de seguir
    expect(htmlEspera('ruta', 'fallo', 'Shops')).not.toContain('data-espera-seguir');
    ponerIdioma('es');
  });

  it('cuenta solo la revisión pedida desde que se abrió la espera', () => {
    const desde = '2026-11-10T12:00:00.000Z';
    expect(momentoDeEspera(null, desde)).toBe('trabajando');
    expect(momentoDeEspera({ pedida: '2026-11-10T11:00:00.000Z', hecha: '2026-11-10T11:30:00.000Z' }, desde)).toBe('trabajando');
    expect(momentoDeEspera({ pedida: '2026-11-10T12:00:01.000Z' }, desde)).toBe('trabajando');
    expect(momentoDeEspera({ pedida: '2026-11-10T12:00:01.000Z', hecha: '2026-11-10T12:20:00.000Z' }, desde)).toBe('lista');
    expect(momentoDeEspera({ pedida: '2026-11-10T12:00:01.000Z', error: 'se cortó' }, desde)).toBe('fallo');
  });

  it('la página la abre al entregar un proyecto y al confirmar la meta, y sobrevive a la recarga del cierre', () => {
    const app = readFileSync(join(__dirname, 'app.ts'), 'utf-8');
    expect(app).toContain("if (pedida) mostrarEsperaRevision('diagnostico');");
    expect(app).toContain("mostrarEsperaRevision('ruta')");
    expect(app).toContain("const CLAVE_ESPERA = 'estudio.espera';");
    const segundo = app.slice(app.indexOf('function pintarSegundoPlano()'), app.indexOf("const caja = document.getElementById('segundo-plano');", app.indexOf('function pintarSegundoPlano()')));
    expect(segundo).toContain('actualizarEspera();');
  });

  it('al terminar, con la espera a la vista, «¿Dónde quedamos?» y la celebración no la tapan (auditoría de la entrega, punto 3)', () => {
    const app = readFileSync(join(__dirname, 'app.ts'), 'utf-8').replace(/\r\n/g, '\n');
    const enSuSitio = app.slice(app.indexOf('function terminarEnSuSitio()'), app.indexOf('\n}\n', app.indexOf('function terminarEnSuSitio()')));
    expect(enSuSitio).toContain('const abrir = espera?.dlg.isConnected ? [] : abrirAlCargar({ termino: true, tocaResumen: false, mirar });');
    // Lo que abre sale solo de esa lista: nada más abre «¿Dónde quedamos?» ni celebra
    expect(enSuSitio.match(/mostrarDondeQuedamos\(|celebrarSiToca\(/g)).toHaveLength(2);
    expect(enSuSitio).toContain('for (const x of abrir)');
  });

  it('al entregar, el aviso que promete el diagnóstico no tapa el que dice que nadie lo toma (auditoría de la entrega, nmwcebe0otit)', () => {
    const app = readFileSync(join(__dirname, 'app.ts'), 'utf-8').replace(/\r\n/g, '\n');
    const entrega = app.slice(app.indexOf("if (pedida) mostrarEsperaRevision('diagnostico');"), app.indexOf("return avisar(tx(nuevo ? 'nuevo.quedoUnoNuevo'"));
    const nadie = entrega.indexOf('if (!(automatica() || vigilando())) return;');
    expect(nadie).toBeGreaterThan(0);
    // El aviso dice el planteamiento de uno nuevo y el diagnóstico de uno existente (pd_entrega_fluida, nmwdxuaavtit)
    expect(nadie).toBeLessThan(entrega.indexOf("avisar(tx(nuevo ? 'nuevo.quedoUnoYPlanteamiento' : 'nuevo.quedoUnoYDiagnostico'"));
  });
});
