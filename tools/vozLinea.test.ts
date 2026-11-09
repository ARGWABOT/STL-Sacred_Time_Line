// La voz del narrador de «La línea del proyecto» (nota de voz nmw1o1pf7tit): cada línea del guion con su clip, que dice
// exactamente lo mismo, con la voz de Google (pr_voz_google); la página sigue su pista de tiempos y la publicación la sube.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CARPETA_VOZ_LINEA, CARPETA_VOZ_LINEA_EN, conPista, ENTRE_PEDIDOS_MS, esperaPedida, ESTILO_VOZ_LINEA, ESTILO_VOZ_LINEA_EN, globitosDeLaMeta, lineasDelNarrador, MODELO_VOZ_LINEA, REINTENTOS, SIN_CUOTA, sinCuotaDelDia, VOZ_LINEA, VOZ_LINEA_EN, vozDelIdioma, type ClipDicho } from './vozLinea.ts';
import { textoParaLaVoz } from './vozRecorrido.ts';

const raiz = join(import.meta.dirname, '..');
const html = readFileSync(join(raiz, 'docs/difusion/linea-del-proyecto.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? '';
const dichos = JSON.parse(readFileSync(join(CARPETA_VOZ_LINEA, 'textos.json'), 'utf8')) as Record<string, ClipDicho>;
const PISTA = JSON.parse(script.match(/const PISTA_VOZ = (\{[^\n]*\});/)?.[1] ?? 'null') as Record<string, number>;

describe('la voz del narrador de «La línea del proyecto»', () => {
  it('es la voz de Google que eligió el titular: Gemini 3.8 Flash TTS, Kai en español, con la dirección del piloto (nmw2h2x5ftit)', () => {
    expect(MODELO_VOZ_LINEA).toBe('gemini-3.8-flash-tts');
    expect(VOZ_LINEA).toBe('es-419-commercial-11');
    expect(ESTILO_VOZ_LINEA).toMatch(/narrador profesional, cálido y pausado/);
    // Va por la herramienta de voz de la difusión, y sin --confirmo no llama a la API
    const fuente = readFileSync(join(raiz, 'tools/vozLinea.ts'), 'utf8');
    expect(fuente).toContain("join(raiz, '.stl', 'difusion', 'generar-voz.py')");
    expect(fuente).toContain("'--confirmo'");
    expect(fuente).toContain('if (faltan.length && !confirmo) {');
  });

  it('ninguna línea lleva paréntesis, «oh no» ni palabras en inglés, que la voz no dice bien (nota de voz nmw27xhb6tit)', () => {
    const lineas = lineasDelNarrador(html).map((l) => l.texto);
    for (const t of lineas) {
      expect(t, t).not.toMatch(/[()]/);
      expect(t.toLowerCase(), t).not.toContain('oh no');
      expect(t, t).not.toMatch(/\b(standby|stand by|feedback|inputs?)\b/i);
    }
    expect(lineas).toContain('¿Y si aparece un cambio urgente?');
    expect(lineas).toContain('El Studio le da prioridad, lo demás queda en espera');
    expect(lineas).toContain('Como en un juego: con nivel, logros y confeti cuando completas una.');
  });

  it('la voz manda: cada línea dura lo que su clip, según la pista de tiempos, y la escena va un 20 % más rápida (pr_voz_google, nmw27xhb6tit)', () => {
    // El reloj de la escena corre 1,2 veces el real, y el cronómetro lo descuenta
    expect(script).toContain('const RAPIDEZ_ESCENA = 1.2;');
    // Y mientras toda la voz carga, al empezar, la escena la espera con su «Cargando la voz…» (nmw5d6iqctit); entre una
    // frase y otra nunca: el velo no depende del clip que suena (nota de voz nmw5h32xptit)
    expect(script).toContain("if (!esperaLaVoz() && !cargandoVoz()) sobra += dt0 * RAPIDEZ_ESCENA * velocidad * (modo === 'con' ? PAUSADO : 1);");
    expect(script).toContain('const cargandoVoz = () => !saltando && !quieto && conVoz && vozPedida && !vozCargada;');
    expect(script).not.toContain('readyState < 3');
    expect(script).toContain('Promise.race([Promise.all(claves.map(llega))');
    expect(script).toContain('if (reproduce && cargandoVoz()) dibujarCargando(now);');
    expect(script).toContain("const real = (n, m) => (n * PASO_ESC) / (m === 'con' ? PAUSADO : 1) / RAPIDEZ_ESCENA;");
    const bloque = script.match(/const PAUSAS = [\s\S]*?const lectura = [^\n]+/)?.[0] ?? '';
    const GUION = new Function(`${html.match(/const GUION = \{[\s\S]*?\n {2}\};/)?.[0]} return GUION;`)() as Record<string, string[]>;
    const f = new Function('GUION', `${bloque}; return { lectura, voz, RESPIRA };`)(GUION) as { lectura: (t: string) => number; voz: (t: string) => number; RESPIRA: number };
    // Una línea con clip dura exactamente su clip, más el respiro
    const primera = 'Hoy usamos agentes de programación por chat, como Claude Code o Codex,';
    expect(f.voz(primera)).toBe(PISTA['sinIntro-1'] + f.RESPIRA);
    expect(f.lectura('Y te da misiones estratégicas: una a la vez.')).toBeCloseTo(f.voz('Y te da misiones estratégicas: una a la vez.') * 1.2, 6);
    // Una que aún no tiene clip se estima, y una coma más la alarga
    expect(f.voz('El modelo, tú no.')).toBeGreaterThan(f.voz('El modelo tú no.'));
    // La pausa larga tras el remate, antes de la sorpresa del cambio urgente y antes de cambiar de escena
    expect(f.lectura('El modelo puede hacer mil cosas a la vez. Tú no.')).toBeGreaterThan(f.voz('El modelo puede hacer mil cosas a la vez. Tú no.') * 1.2 + 1000);
    expect(f.lectura('¿Qué propone STL?')).toBeGreaterThan(f.voz('¿Qué propone STL?') * 1.2 + 500);
    // Ninguna línea tiene menos tiempo que su clip: si no, la escena se queda quieta esperando a la voz (nmw2n33o6tit)
    for (const t of Object.values(GUION).flat()) expect(f.lectura(t), t).toBeGreaterThanOrEqual(f.voz(t) * 1.2);
  });

  it('las tres líneas que sonaban lentas van a su propio ritmo, sin generarlas otra vez, y su tiempo en la escena es el de su clip a ese ritmo (nmw2n33o6tit, nmw2n5yv3tit, nmw2n82cttit)', () => {
    const bloque = script.match(/const PAUSAS = [\s\S]*?const lectura = [^\n]+/)?.[0] ?? '';
    const GUION = new Function(`${html.match(/const GUION = \{[\s\S]*?\n {2}\};/)?.[0]} return GUION;`)() as Record<string, string[]>;
    const f = new Function('GUION', `${bloque}; return { voz, RESPIRA, RITMO_VOZ, ritmoDe };`)(GUION) as { voz: (t: string) => number; RESPIRA: number; RITMO_VOZ: Record<string, number>; ritmoDe: (t: string) => number };
    // «A medida que cumples tus misiones,» a 1,25, no a 1,95 (nmw2ok5b3tit)
    expect(f.RITMO_VOZ).toEqual({ 'trabajo1-1': 1.25, 'entrega-2': 1.25, 'invoca2-1': 1.15 });
    expect(GUION.trabajo1[0]).toBe('A medida que cumples tus misiones,');
    expect(GUION.entrega[1]).toBe('las siguientes misiones más estratégicas, una a la vez.');
    expect(GUION.invoca2[0]).toBe('acumulas tus peticiones,');
    expect(f.voz(GUION.trabajo1[0])).toBeCloseTo(PISTA['trabajo1-1'] / 1.25 + f.RESPIRA, 6);
    expect(f.voz(GUION.entrega[1])).toBeCloseTo(PISTA['entrega-2'] / 1.25 + f.RESPIRA, 6);
    expect(f.ritmoDe(GUION.sinIntro[0])).toBe(1);
    // El clip suena a ese ritmo y, si se retoma a la mitad, desde su punto en el clip
    const decir = script.match(/function decirLinea\(t, desde = 0\) \{[\s\S]*?\n {2}\}/)?.[0] ?? '';
    expect(decir).toContain('a.currentTime = (desde / 1000) * ritmoDe(t);');
    expect(decir).toContain('a.playbackRate = ritmoDe(t) * velocidad;');
    // La pausa antes de «el director las organiza en un miniplan», corta: la entrega dura lo justo de su línea
    expect(script).toContain("cambiar('invoca', now, parada === 2 ? 0 : 3600, parada === 2 ? 'invoca2' : 'invoca');");
  });

  it('«y procesa esa petición de inmediato con el director y el modelo» suena como una sola frase: sin puntos suspensivos ni respiro entre sus dos líneas (nmw2on6sdtit)', () => {
    const bloque = script.match(/const PAUSAS = [\s\S]*?const lectura = [^\n]+/)?.[0] ?? '';
    const GUION = new Function(`${html.match(/const GUION = \{[\s\S]*?\n {2}\};/)?.[0]} return GUION;`)() as Record<string, string[]>;
    const f = new Function('GUION', `${bloque}; return { voz, lectura, PAUSAS, RESPIRA };`)(GUION) as { voz: (t: string) => number; lectura: (t: string) => number; PAUSAS: Record<string, number>; RESPIRA: number };
    expect(GUION.saleUrg).toEqual(['y procesa esa petición de inmediato con el director']);
    expect(GUION.procesaUrg).toEqual(['y el modelo.']);
    expect(dichos['saleUrg-1'].texto).not.toContain('…');
    expect(dichos['procesaUrg-1'].texto).not.toContain('…');
    // Su tiempo es exactamente su clip: ni respiro ni pausa antes de «y el modelo»
    expect(f.voz(GUION.saleUrg[0])).toBe(PISTA['saleUrg-1']);
    expect(f.lectura(GUION.saleUrg[0])).toBeCloseTo(PISTA['saleUrg-1'] * 1.2, 6);
    expect(f.PAUSAS[GUION.saleUrg[0]]).toBeUndefined();
    // Las demás respiran como siempre
    expect(f.voz(GUION.procesaUrg[0])).toBe(PISTA['procesaUrg-1'] + f.RESPIRA);
  });

  it('el último tramo, sin voz, va al doble y más: unos 4 o 5 segundos en vez de 11 (nmw2n9rgutit)', () => {
    expect(script).toContain('const PASO_FINAL = 5, ACELERA_CIERRE = 2.5;');
    expect(script).toContain("if (parada === 2) cambiar('entrega', now, (nuevas.length * 450 + 1500) / ACELERA_CIERRE, 'cierra');");
    expect(script).toContain('const te = parada === 2 ? t * ACELERA_CIERRE : t;');
  });

  it('un control de velocidad, 1x · 1.25x · 1.5x · 2x, acelera la voz y la escena la sigue; cada vez que se abre empieza a 1,25x (nmw2n33o6tit, nmw5gelsmtit)', () => {
    const grupo = html.match(/<div id="velocidad" role="group"[\s\S]*?<\/div>/)?.[0] ?? '';
    expect([...grupo.matchAll(/data-v="([\d.]+)"[^>]*>([^<]+)</g)].map((m) => [m[1], m[2]])).toEqual([['1', '1x'], ['1.25', '1.25x'], ['1.5', '1.5x'], ['2', '2x']]);
    // Al abrir, 1,25x es el oprimido, y no se guarda de una visita a otra
    expect([...grupo.matchAll(/data-v="([\d.]+)" aria-pressed="true"/g)].map((m) => m[1])).toEqual(['1.25']);
    expect(script).toContain('const VELOCIDADES = [1, 1.25, 1.5, 2], VELOCIDAD_INICIAL = 1.25;');
    expect(script).toContain('let velocidad = VELOCIDAD_INICIAL;');
    expect(script).not.toMatch(/localStorage\.\w+Item\([^)]*VELOCIDAD/);
    expect(script).not.toContain('stl-linea-velocidad');
    // Lo que habla cambia ya de velocidad, y lo que espera a la voz cuenta su tiempo a esa velocidad
    expect(script).toContain('if (narra.audio && narra.dicha) narra.audio.playbackRate = ritmoDe(narra.dicha) * velocidad;');
    expect(script).toContain('performance.now() - narra.desde < duraLinea(narra.dicha) / velocidad + 1500;');
  });

  it('cada línea del narrador tiene su MP3, que dice exactamente lo que dice la línea, y su tiempo en la pista de la página', () => {
    const lineas = lineasDelNarrador(html);
    expect(lineas.length).toBe(57);
    for (const { clave, texto } of lineas) {
      expect(existsSync(join(CARPETA_VOZ_LINEA, `${clave}.mp3`)), clave).toBe(true);
      expect(dichos[clave]?.texto, clave).toBe(texto);
      // Un clip de verdad: entre medio segundo y quince, y la página lo sabe
      expect(dichos[clave].ms, clave).toBeGreaterThan(500);
      expect(dichos[clave].ms, clave).toBeLessThan(15000);
      expect(PISTA[clave], clave).toBe(dichos[clave].ms);
    }
    // Ni una de más: textos.json tiene solo las del guion de hoy y los globitos; la pista, solo las del guion
    expect(Object.keys(dichos).sort()).toEqual([...lineas, ...globitosDeLaMeta(html)].map((l) => l.clave).sort());
    expect(Object.keys(PISTA).sort()).toEqual(lineas.map((l) => l.clave).sort());
  });

  it('los quince globitos de después de la meta hablan con la voz de Kai al aparecer, sin subtítulo abajo (pd_voz_globitos, nmw2rq1jitit)', () => {
    const globitos = globitosDeLaMeta(html);
    expect(globitos).toHaveLength(15);
    expect(globitos[0]).toEqual({ clave: 'globito-1', texto: 'Hey, ¿todavía estás aquí?' });
    const dura = Number(script.match(/const CADA_GLOBITO = \d+, DURA_GLOBITO = (\d+);/)?.[1]);
    for (const { clave, texto } of globitos) {
      expect(existsSync(join(CARPETA_VOZ_LINEA, `${clave}.mp3`)), clave).toBe(true);
      expect(dichos[clave]?.texto, clave).toBe(texto);
      // Cabe en lo que el globito está a la vista
      expect(dichos[clave].ms, clave).toBeGreaterThan(500);
      expect(dichos[clave].ms, clave).toBeLessThan(dura);
      expect(PISTA[clave], clave).toBeUndefined();
    }
    // Suena una vez por globito, con la animación corriendo y la voz encendida; el texto queda solo en el globito
    const decir = script.match(/function vozDelGlobito\(g\) \{[\s\S]*?\n {2}\}/)?.[0] ?? '';
    expect(decir).toContain('if (!conVoz || quieto || saltando || !reproduce || performance.now() - narra.movida < 350) return;');
    // También tras mover la perilla o la rueda (nmw2tg50utit): cada vez que se suelta, el globito de ese punto vuelve a
    // sonar, desde lo que ya corrió (k × lo que dura su clip), y no solo si apenas empezaba
    expect(decir).toContain('if (g.n === globitoDicho && globitoTras === narra.movida) return;');
    expect(decir).toContain('a.currentTime = Math.min(g.k, 0.99) * a.duration;');
    expect(decir).not.toContain('g.k > 0.15');
    expect(script).toContain('narra.movida = performance.now();');
    expect(decir).toContain('a.src = `${CARPETA_VOZ}/${clave}.mp3`;');
    expect(decir).toContain("const clave = `globito-${g.i + 1}`;");
    expect(decir).not.toContain('subtitulo(');
    expect(script).toContain('    vozDelGlobito(g);\n');
  });

  it('la herramienta escribe la pista dentro de la página, en una sola línea y en el orden del guion', () => {
    const otra = conPista(html, { 'sinFin-1': { texto: '¿Qué propone STL?', ms: 1234 }, 'sinIntro-2': { texto: 'le hablas directamente al modelo,', ms: 2000 } });
    expect(otra).toContain('const PISTA_VOZ = {"sinIntro-2":2000,"sinFin-1":1234};');
    expect(otra.match(/const PISTA_VOZ = /g)).toHaveLength(1);
  });

  it('la página busca cada clip con la misma clave que le da la herramienta', () => {
    const GUION = new Function(`${html.match(/const GUION = \{[\s\S]*?\n {2}\};/)?.[0]} return GUION;`)() as Record<string, string[]>;
    const claves = new Function('GUION', `${script.match(/const CLAVES_VOZ = [^\n]+/)?.[0]} return CLAVES_VOZ;`)(GUION) as Map<string, string>;
    for (const { clave, texto } of lineasDelNarrador(html)) expect(claves.get(texto)).toBe(clave);
    expect(script).toContain('a.src = `${CARPETA_VOZ}/${clave}.mp3`;');
    expect(script).not.toContain('a.src = `voz/linea/');
    expect(script).toContain("const CARPETA_VOZ = EN_VOZ ? 'voz/linea-en' : 'voz/linea';");
  });

  it('--en: el guion inglés con la voz inglesa, en su carpeta y su pista, que la página usa en inglés (pd_bilingue, nmw724ggptit)', () => {
    expect(VOZ_LINEA_EN).toBe('en-us-commercial-8');
    expect(vozDelIdioma(true)).toEqual({ voz: 'en-us-commercial-8', estilo: ESTILO_VOZ_LINEA_EN, carpeta: CARPETA_VOZ_LINEA_EN });
    expect(vozDelIdioma(false)).toEqual({ voz: VOZ_LINEA, estilo: ESTILO_VOZ_LINEA, carpeta: CARPETA_VOZ_LINEA });
    expect(CARPETA_VOZ_LINEA_EN.replace(/\\/g, '/')).toMatch(/docs\/difusion\/voz\/linea-en$/);
    // Las 57 líneas de GUION_EN y los 15 globitos ingleses: 72 clips, con las mismas claves que en español
    const lineasEn = lineasDelNarrador(html, true), globitosEn = globitosDeLaMeta(html, true);
    expect(lineasEn.map((l) => l.clave)).toEqual(lineasDelNarrador(html).map((l) => l.clave));
    expect(lineasEn.length + globitosEn.length).toBe(72);
    expect(globitosEn[0]).toEqual({ clave: 'globito-1', texto: 'Hey, are you still here?' });
    // Su pista va en PISTA_VOZ_EN, sin tocar la española
    const otra = conPista(html, { 'sinIntro-1': { texto: lineasEn[0].texto, ms: 4321 } }, true);
    expect(otra).toContain('const PISTA_VOZ_EN = {"sinIntro-1":4321};');
    expect(otra.match(/const PISTA_VOZ = (\{[^\n]*\});/)?.[1]).toBe(script.match(/const PISTA_VOZ = (\{[^\n]*\});/)?.[1]);
    // La herramienta lo lee de su orden, con la voz y la carpeta de ese idioma
    const fuente = readFileSync(join(raiz, 'tools/vozLinea.ts'), 'utf8');
    expect(fuente).toContain("const en = args.includes('--en');");
    expect(fuente).toContain('const hecho = clipDeGoogle(clave, texto, mp3, temporal, paso, ESTILO, VOZ);');
    expect(fuente).toContain('writeFileSync(PAGINA_LINEA, conPista(html, despues, en));');
    // En la página: en inglés, la pista y los clips ingleses, sin los ritmos de los clips en español
    const bloque = script.match(/const PAUSAS = [\s\S]*?const lectura = [^\n]+/)?.[0] ?? '';
    const GUION_EN = new Function(`${html.match(/const GUION_EN = \{[\s\S]*?\n {2}\};/)?.[0]} return GUION_EN;`)() as Record<string, string[]>;
    const f = new Function('GUION', 'EN_LINEA', `${bloque}; return { voz, RITMO_VOZ, PISTA_DEL_IDIOMA, CARPETA_VOZ };`)(GUION_EN, true) as { voz: (t: string) => number; RITMO_VOZ: Record<string, number>; PISTA_DEL_IDIOMA: Record<string, number>; CARPETA_VOZ: string };
    expect(f.CARPETA_VOZ).toBe('voz/linea-en');
    expect(f.RITMO_VOZ).toEqual({});
    const PISTA_EN = JSON.parse(script.match(/const PISTA_VOZ_EN = (\{[^\n]*\});/)?.[1] ?? 'null') as Record<string, number>;
    expect(f.PISTA_DEL_IDIOMA).toEqual(PISTA_EN);
    if (PISTA_EN['sinIntro-1']) expect(f.voz(GUION_EN.sinIntro[0])).toBe(PISTA_EN['sinIntro-1'] + 350);
  });

  it('va al paso que deja Google (10 clips por minuto) y, tras un «429», espera lo que pide antes de reintentar', () => {
    expect(ENTRE_PEDIDOS_MS).toBeGreaterThanOrEqual(6000);
    expect(REINTENTOS).toBeGreaterThan(0);
    expect(esperaPedida('La API respondió 429: … Please retry in 5.288307165s.')).toBe(5789);
    expect(esperaPedida('La API respondió 429: sin decir cuánto')).toBe(60_000);
  });

  it('sin la cuota del día de Google no reintenta ni sigue pidiendo: se detiene y lo dice; lo hecho del recorrido ya quedó guardado', () => {
    expect(sinCuotaDelDia('La API respondió 429: Quota exceeded for metric: generativelanguage.googleapis.com/generate_requests_per_model_per_day, limit: 100')).toBe(true);
    expect(sinCuotaDelDia('La API respondió 429: … Please retry in 5.288307165s.')).toBe(false);
    expect(SIN_CUOTA).toContain('cuota del día');
    const linea = readFileSync(join(raiz, 'tools/vozLinea.ts'), 'utf8'), recorrido = readFileSync(join(raiz, 'tools/vozRecorrido.ts'), 'utf8');
    expect(linea).toContain('if (voz.status !== 0 && sinCuotaDelDia(dijo)) return { error: `${SIN_CUOTA} ${dijo.trim()}` };');
    for (const fuente of [linea, recorrido]) expect(fuente).toContain('if (hecho.error.startsWith(SIN_CUOTA)) break;');
    // Cada clip del recorrido se guarda en cuanto sale (textos.json y la pista)
    // A la voz, la frase con indicación de tono le llega con punto final; el rótulo y las demás, como están (nmw46qjootit)
    expect(textoParaLaVoz('s4-6', 'sin explicarle al modelo a qué parte te refieres')).toBe('sin explicarle al modelo a qué parte te refieres.');
    expect(textoParaLaVoz('s4-5', 'y puedes comentar cada idea o párrafo')).toBe('y puedes comentar cada idea o párrafo');
    expect(recorrido).toMatch(/despues\[clave\] = ENTONACION\[clave\] \? \{ texto, ms: hecho\.ms, entonacion: ENTONACION\[clave\] \} : \{ texto, ms: hecho\.ms \};\n\s+guardar\(\);/);
  });

  it('suena cuando aparece su línea y sigue a la reproducción: en pausa se detiene, al girar la perilla se calla, y el subtítulo y la animación esperan a que termine', () => {
    // Dice cada línea a su ritmo y a la velocidad elegida
    const decir = script.match(/function decirLinea\(t, desde = 0\) \{[\s\S]*?\n {2}\}/)?.[0] ?? '';
    expect(decir.indexOf('a.playbackRate = ritmoDe(t) * velocidad;')).toBeGreaterThan(-1);
    expect(decir.indexOf('a.playbackRate = ritmoDe(t) * velocidad;')).toBeLessThan(decir.indexOf('a.play()'));
    // Si aún habla y ya le toca a la siguiente, la escena la espera; un clip trabado no la detiene más que su línea y un poco
    expect(script).toContain('const esperaLaVoz = () => !saltando && !quieto && cola.length > 0 && reloj >= cola[0].en && sigueHablando();');
    expect(script).toContain('const sigueHablando = () => narra.hablando && performance.now() - narra.desde < duraLinea(narra.dicha) / velocidad + 1500;');
    // Cada cuadro, al día: en pausa o mientras salta, quieta; corriendo, dice la línea que se ve
    const alDia = script.match(/function vozAlDia\(\) \{[\s\S]*?\n {2}\}/)?.[0] ?? '';
    expect(alDia).toContain('if (!reproduce || saltando) { if (narra.audio && !narra.audio.paused) narra.audio.pause(); return; }');
    expect(alDia).toContain('decirLinea(actual, desde)');
    expect(script).toContain('    vozAlDia();\n    dibujar(reloj); girarPerilla(); cronometro();');
    // La perilla, la rueda y el cambio de escena la callan
    expect(script).toContain('if (buscar != null) { vozAlMover(); saltando = true;');
    expect(script).toContain('buscar = null; vozAlMover(); ponerModo(b.dataset.modo, reloj, true);');
    // El subtítulo se queda hasta que la voz termine (pd_narrador)
    expect(script).toContain('|| sigueHablando())) return;');
    // Su botón, que el navegador recuerda
    expect(html).toContain('<button type="button" id="voz" aria-pressed="true"');
    expect(script).toContain("localStorage.setItem(VOZ_GUARDADA, conVoz ? 'si' : 'no');");
  });

  it('dentro del recorrido en 3D puede sonar sola, y la publicación sube los clips junto a la portada', () => {
    const mundo = readFileSync(join(raiz, 'docs/difusion/mundo-3d.html'), 'utf8');
    expect(mundo).toContain('<iframe data-src="linea-del-proyecto.html" allow="autoplay"');
    const publicar = readFileSync(join(raiz, 'tools/publicar-stl.ts'), 'utf8');
    expect(publicar).toContain("const VOZ_PORTADA = 'docs/difusion/voz/linea';");
    expect(publicar).toContain("copyFileSync(join(raiz, VOZ_PORTADA, archivo), join(salida, 'voz', 'linea', archivo));");
    expect(publicar).toContain("copyFileSync(join(raiz, VOZ_PORTADA_EN, archivo), join(salida, 'voz', 'linea-en', archivo));");
  });

  it('en inglés, las 57 líneas fieles al español, línea por línea y de largo parecido, con la voz en español hasta que exista la inglesa (pd_bilingue, nmw6z8wj2tit, nmw33ke9ytit)', () => {
    const GUION = new Function(`${html.match(/const GUION = \{[\s\S]*?\n {2}\};/)?.[0]} return GUION;`)() as Record<string, string[]>;
    const GUION_EN = new Function(`${html.match(/const GUION_EN = \{[\s\S]*?\n {2}\};/)?.[0]} return GUION_EN;`)() as Record<string, string[]>;
    // Las mismas claves y el mismo número de líneas en cada momento: 57 en total, y la pista de la voz las cubre todas
    expect(Object.keys(GUION_EN)).toEqual(Object.keys(GUION));
    for (const [momento, ls] of Object.entries(GUION)) expect(GUION_EN[momento]?.length, momento).toBe(ls.length);
    const en = Object.values(GUION_EN).flat(), es = Object.values(GUION).flat();
    expect(en).toHaveLength(57);
    expect(Object.keys(PISTA)).toHaveLength(57);
    // Ninguna se queda en español, y cada una dura lo que la suya: entre la mitad y el doble de letras
    en.forEach((t, i) => {
      expect(t, `${t} sigue en español`).not.toBe(es[i]);
      expect(t, t).not.toMatch(/[ñáéíóú¿¡]/i);
      expect(t.length / es[i].length, `${t} ↔ ${es[i]}`).toBeGreaterThan(0.6);
      expect(t.length / es[i].length, `${t} ↔ ${es[i]}`).toBeLessThan(1.5);
    });
    // Con ?lang=en (o el inglés del recorrido que la abre), se leen las inglesas; el español queda igual sin él
    expect(script).toContain("const pedido = new URLSearchParams(location.search).get('lang');");
    expect(script).toContain('for (const [momento, ls] of Object.entries(GUION_EN)) GUION[momento] = ls;');
    // Las pausas van por su lugar en el guion, no por su texto: valen en los dos idiomas
    const bloque = script.match(/const PAUSAS = [\s\S]*?const lectura = [^\n]+/)?.[0] ?? '';
    const enIngles = Object.fromEntries(Object.entries(GUION).map(([m]) => [m, GUION_EN[m]]));
    const f = new Function('GUION', `${bloque}; return { lectura, voz, PAUSAS };`)(enIngles) as { lectura: (t: string) => number; voz: (t: string) => number; PAUSAS: Record<string, number> };
    expect(f.PAUSAS[GUION_EN.sinRamas[4]]).toBe(1500);
    expect(f.PAUSAS[GUION_EN.sinFin[0]]).toBe(900);
    // La voz sigue siendo la española, con sus tiempos: cada línea inglesa dura lo que su clip en español
    expect(f.voz(GUION_EN.sinIntro[0])).toBe(PISTA['sinIntro-1'] + 350);
    for (const t of en) expect(f.lectura(t), t).toBeGreaterThanOrEqual(f.voz(t) * 1.2);
    // Los quince globitos de después de la meta, adaptados en inglés y en el mismo orden (nmw33ksa4tit)
    const globitos = new Function(`${script.match(/const GLOBITOS = \[[\s\S]*?\];/)?.[0]} ${script.match(/const GLOBITOS_EN = \[[\s\S]*?\];/)?.[0]} return { GLOBITOS, GLOBITOS_EN };`)() as { GLOBITOS: string[]; GLOBITOS_EN: string[] };
    expect(globitos.GLOBITOS).toHaveLength(15);
    expect(globitos.GLOBITOS_EN).toHaveLength(15);
    for (const g of globitos.GLOBITOS_EN) expect(g, g).not.toMatch(/[ñáéíóú¿¡]/i);
    expect(script).toContain("if (typeof EN_LINEA !== 'undefined' && EN_LINEA) GLOBITOS.splice(0, GLOBITOS.length, ...GLOBITOS_EN);");
    // El recorrido abre la animación en su idioma
    const mundo = readFileSync(join(raiz, 'docs/difusion/mundo-3d.js'), 'utf8');
    expect(mundo).toContain("visorIframe.setAttribute('src', `${visorIframe.dataset.src}?lang=${EN ? 'en' : 'es'}`);");
  });
});

// Con «EN», nada de «La línea del proyecto» queda en español (nota del titular nmw766nyutit): ni lo que se dibuja (las
// frases de las ramas, las charlas de cada sesión con el modelo, lo que piensa el director, cada rótulo) ni lo fijo de la
// página (los modos, la perilla, la voz, la velocidad, la bienvenida y sus etiquetas)
describe('«La línea del proyecto» in English, with ?lang=en (nmw766nyutit)', () => {
  const espanol = /[¿¡ñáéíóú]/;
  const objeto = (nombre: string) => new Function(`return ${script.match(new RegExp(`const ${nombre} = (\\{[\\s\\S]*?\\n {2}\\});`))?.[1] ?? '{}'};`)() as Record<string, string>;
  const dibujo = objeto('DIBUJO_EN'), fijo = objeto('FIJO_EN');

  it('every phrase drawn in the scene has its English: the branches, the chats, what the director thinks and each label', () => {
    const NO_SE_DIBUJA = /^(#|rgba?\(|\d|left$|right$|center$|italic$|Studio$|director$|\?$|rechazada$|urgencia$|sin$|con$|sinFin$|sinSale$|nuevo$|ajuste$|corrige$|parte$)/;
    const listas = ['GRUPOS = {', 'CHARLAS = [', 'PIENSA = [', 'PIENSA_URG = ['].map((inicio) => script.slice(script.indexOf(`const ${inicio}`), script.indexOf(inicio.endsWith('{') ? '\n  };' : '];', script.indexOf(`const ${inicio}`))));
    const llamadas = script.split('\n').filter((l) => /\b(texto|rotulo)\(|(arriba|abajo)\.push\(|const como = |: modo === 'con' \? 'fresco/.test(l) && !/^\s*(\/\/|function )/.test(l));
    const literales = [...listas, ...llamadas].flatMap((l) => [...l.matchAll(/'([^'\\]*)'/g)].map((m) => m[1]))
      .filter((t) => /\p{L}/u.test(t) && !NO_SE_DIBUJA.test(t) && !/^(c|f|g|n|t)$/.test(t));
    const sinIngles = [...new Set(literales)].filter((t) => !Object.hasOwn(dibujo, t));
    expect(sinIngles).toEqual([]);
    expect(Object.keys(dibujo).length).toBeGreaterThan(90);
    for (const [es, en] of Object.entries(dibujo)) expect(en, es).not.toMatch(espanol);
    // Se cambia al dibujar, con los que llevan número por su patrón, y los números se escriben a la inglesa
    expect(script).toContain('const mayus = (t) => String(dibujoEn(t)).replace(');
    expect(script).toContain("[/^misión (\\d+)$/, 'mission $1'], [/^parada (\\d+)$/, 'stop $1'], [/^\\+([\\d.,]+) por segundo$/, '+$1 per second']");
    expect(script).not.toContain("toLocaleString('es-CO')");
  });

  it('every fixed text, aria-label, title and aria-valuetext of the page has its English, also what the controls write while it runs', () => {
    const cuerpo = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '')
      .replace(/<meta [^>]*>/g, '');
    const textos = [...cuerpo.matchAll(/>([^<>]+)</g)].map((m) => m[1].trim());
    const atributos = [...cuerpo.matchAll(/\s(?:aria-label|title|aria-valuetext)="([^"]+)"/g)].map((m) => m[1].trim());
    const IGUAL = new Set(['1x', '1.25x', '1.5x', '2x']);
    expect([...textos, ...atributos].filter((t) => /\p{L}/u.test(t) && !IGUAL.has(t) && !Object.hasOwn(fijo, t))).toEqual([]);
    for (const [es, en] of Object.entries(fijo)) expect(en, es).not.toMatch(espanol);
    expect(script).toContain("textoLinea('🔊 Voz', '🔊 Voice') : textoLinea('🔇 Sin voz', '🔇 No voice')");
    expect(script).toContain("textoLinea('Pausar la animación', 'Pause the animation')");
    expect(script).toContain('`second ${s} of the scene ');
    expect(script).toContain("textoLinea('Va en este punto de la escena / lo que dura', 'Where it is in the scene / how long it lasts')");
  });
});
