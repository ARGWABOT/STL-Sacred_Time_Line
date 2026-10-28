// El mundo de STL en 3D (prototipo, 22 de octubre de 2026). La línea del proyecto de la animación de la portada, ahora
// como un camino de luz en un mundo de noche, y la cámara lo recorre con el scroll, parada por parada. Lo aprendido del
// video de midudev (docs/difusion/aprendido-video-scroll-world.md): un escenario fijo detrás, el scroll convertido en
// el avance de la cámara y suavizado en cada cuadro, la cámara más lenta en cada parada, y el texto siempre en HTML.
// Sin WebGL no hace nada (las paradas se leen de corrido); con movimiento reducido, la cámara salta de parada en parada
// y nada se anima.
import * as THREE from 'three';

const ORO = '#f5d27a', LUZ = '#fff6d8', LINEA = '#ffcf5a', MORADO = '#b9a3ff', CIAN = '#5ad1ff', ROJO = '#ff6b8a';
const VERDE = '#6fe3a1', MODELO = '#c5d2e6', TU = '#5b8cff', NOCHE = '#07090f';

const lienzo = document.getElementById('mundo');
const paradas = [...document.querySelectorAll('.parada')];
const hitos = [...document.querySelectorAll('.hitos a')];
const navHitos = document.querySelector('.hitos');
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Para revisar una parada sin desplazarse (?ver=3): la muestra fija, con su tarjeta, sin la portada. Lo usa el director
// para capturarla sin pantalla (desplazar la página deja la captura en blanco) y sirve para mostrar una sola parada.
const verTexto = new URLSearchParams(location.search).get('ver');
const fijo = verTexto === null ? null : Math.max(0, Math.min(6, Math.round(Number(verTexto)) || 0));
const movil = matchMedia('(max-width: 700px), (pointer: coarse)').matches;

function hayWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

if (lienzo && paradas.length && hayWebGL()) {
  document.documentElement.classList.add('js-3d');
  if (fijo !== null) document.documentElement.classList.add('ver-parada');
  iniciar();
}

function iniciar() {
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: !movil, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, movil ? 1.25 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const escena = new THREE.Scene();
  // El cielo y la niebla del mismo color: así no se ve dónde termina el suelo
  escena.background = new THREE.Color('#0a0d18');
  escena.fog = new THREE.FogExp2('#0a0d18', 0.016);
  const camara = new THREE.PerspectiveCamera(55, 1, 0.1, 600);

  escena.add(new THREE.HemisphereLight(MORADO, NOCHE, 0.7));
  const sol = new THREE.DirectionalLight('#ffe7b8', 1.1);
  sol.position.set(30, 60, 20);
  escena.add(sol);
  const farol = new THREE.PointLight(ORO, 40, 26, 1.6);   // va con la cámara: ilumina lo que tiene cerca
  escena.add(farol);

  // ── El suelo y el cielo
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(500, 700), new THREE.MeshStandardMaterial({ color: '#0a0e1a', roughness: 1 }));
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.set(0, -3, -220);
  escena.add(suelo);
  const rejilla = new THREE.GridHelper(700, 140, '#1c2540', '#121a30');
  rejilla.position.set(0, -2.98, -220);
  escena.add(rejilla);
  const estrellas = new THREE.BufferGeometry();
  const nEstrellas = movil ? 600 : 1400;
  const pos = new Float32Array(nEstrellas * 3);
  for (let i = 0; i < nEstrellas; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 320;
    pos[i * 3 + 1] = 6 + Math.random() * 120;
    pos[i * 3 + 2] = 60 - Math.random() * 600;
  }
  estrellas.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  escena.add(new THREE.Points(estrellas, new THREE.PointsMaterial({ color: MODELO, size: 0.55, transparent: true, opacity: 0.7, depthWrite: false })));

  // ── La línea del proyecto: un camino de luz que serpentea hacia adelante y termina en la meta
  const puntos = [];
  for (let i = 0; i <= 13; i++) puntos.push(new THREE.Vector3(Math.sin(i * 0.7) * 7 + (i % 3 - 1) * 1.5, 0.6 + Math.sin(i * 0.45) * 1.1, -i * 28));
  const camino = new THREE.CatmullRomCurve3(puntos, false, 'centripetal');
  escena.add(new THREE.Mesh(new THREE.TubeGeometry(camino, 1400, 0.11, 10, false), new THREE.MeshBasicMaterial({ color: LINEA })));
  escena.add(new THREE.Mesh(new THREE.TubeGeometry(camino, 700, 0.34, 10, false),
    new THREE.MeshBasicMaterial({ color: LINEA, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })));

  const ARRIBA = new THREE.Vector3(0, 1, 0);
  const marco = (u) => {   // dónde está la línea en u, hacia dónde va y cuál es su costado
    const p = camino.getPointAt(u), t = camino.getTangentAt(u);
    const lado = new THREE.Vector3(-t.z, 0, t.x).normalize();
    return { p, t, lado };
  };
  const PARADA = [0.1, 0.27, 0.44, 0.6, 0.76, 0.955];   // dónde se detiene la cámara en cada parada (de 0 a 1)
  // Dónde está lo que se ve en cada parada: un poco más adelante, para que la cámara lo vea de frente y no encima
  const SITIO = PARADA.map((u) => u + 0.022);
  const focos = [];   // lo que mira la cámara en cada parada
  const animar = [];  // lo que se mueve: funciones (t) => void

  // Un rótulo flotante: texto sobre una píldora, siempre de frente a la cámara
  function rotulo(texto, color = LUZ, alto = 0.6) {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const f = 46;
    ctx.font = `600 ${f}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
    const w = Math.ceil(ctx.measureText(texto).width) + 56;
    c.width = w; c.height = 84;
    ctx.font = `600 ${f}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
    ctx.fillStyle = 'rgba(8, 11, 20, 0.82)';
    ctx.strokeStyle = color; ctx.globalAlpha = 1; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(2, 2, w - 4, 80, 40); ctx.fill(); ctx.globalAlpha = 0.55; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.fillText(texto, 28, 44);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
    s.scale.set(alto * w / 84, alto, 1);
    return s;
  }
  const brillo = (color, intensidad = 0.7) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensidad, roughness: 0.45, metalness: 0.15 });
  const plano = (color, opacidad = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacidad < 1, opacity: opacidad, depthWrite: opacidad >= 1 });

  // ── Parada 1, el problema: cada prompt, una rama que sale disparada hacia el modelo
  {
    const { p, lado } = marco(SITIO[0]);
    const grupo = new THREE.Group();
    const ramas = [];
    for (let j = 0; j < 15; j++) {
      const base = camino.getPointAt(SITIO[0] - 0.03 + j * 0.0042);
      const dir = new THREE.Vector3((Math.random() - 0.5) * 2, 0.6 + Math.random() * 0.9, (Math.random() - 0.5) * 1.4).normalize();
      const largo = 6 + Math.random() * 8;
      const fin = base.clone().addScaledVector(dir, largo).add(new THREE.Vector3(0, Math.random() * 2, 0));
      const curva = new THREE.CatmullRomCurve3([base, base.clone().addScaledVector(dir, largo * 0.35).add(new THREE.Vector3(0, 1.5, 0)), base.clone().addScaledVector(dir, largo * 0.7), fin]);
      const mat = plano(j % 4 === 0 ? ROJO : CIAN, 0.8);
      grupo.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 40, 0.045, 6, false), mat));
      const cubo = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), brillo(MODELO, 0.25));
      cubo.position.copy(fin);
      grupo.add(cubo);
      ramas.push({ mat, cubo, fase: Math.random() * 6 });
    }
    const r1 = rotulo('cada prompt, una rama', CIAN);
    r1.position.copy(p).addScaledVector(ARRIBA, 7.5);
    const r2 = rotulo('el modelo, de todas a la vez', MODELO, 0.5);
    r2.position.copy(p).addScaledVector(ARRIBA, 12.5).addScaledVector(lado, 3);
    grupo.add(r1, r2);
    escena.add(grupo);
    focos.push(p.clone().addScaledVector(ARRIBA, 4.5));
    animar.push((t) => ramas.forEach((r) => { r.mat.opacity = 0.45 + 0.4 * Math.sin(t * 2.2 + r.fase) ** 2; r.cubo.rotation.y = t * 0.6 + r.fase; r.cubo.rotation.x = t * 0.4; }));
  }

  // ── Parada 2, cómo funciona: el portal del Studio atrapa las ideas y el director las pone en la línea
  {
    const u = SITIO[1];
    const { p: pPortal, t: tPortal } = marco(u - 0.012);
    const portal = new THREE.Group();
    portal.add(new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.1, 14, 96), plano(MORADO)));
    portal.add(new THREE.Mesh(new THREE.CircleGeometry(3.1, 64), new THREE.MeshBasicMaterial({ color: MORADO, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false })));
    portal.position.copy(pPortal);
    portal.lookAt(pPortal.clone().add(tPortal));
    escena.add(portal);
    const rStudio = rotulo('el Studio: las detiene', MORADO);
    rStudio.position.copy(pPortal).addScaledVector(ARRIBA, 4.3);
    escena.add(rStudio);
    const ideas = [];
    const colores = [CIAN, VERDE, '#ffb36b', ROJO];
    for (let k = 0; k < 14; k++) {
      const idea = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), brillo(colores[k % 4], 0.9));
      escena.add(idea);
      ideas.push({ idea, ang: (k / 14) * Math.PI * 2, vel: 0.35 + Math.random() * 0.3, fase: Math.random() * 6 });
    }
    const { p: pDir } = marco(u + 0.012);
    const director = new THREE.Mesh(new THREE.OctahedronGeometry(0.95), brillo(ORO, 0.75));
    director.position.copy(pDir).addScaledVector(ARRIBA, 3.4);
    escena.add(director);
    const rDir = rotulo('el director: las pone en su lugar', ORO);
    rDir.position.copy(director.position).addScaledVector(ARRIBA, 1.7);
    escena.add(rDir);
    const destino = camino.getPointAt(u + 0.03);
    const rayo = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(director.position.clone(), destino), 8, 0.035, 6, false), plano(ORO, 0.7));
    escena.add(rayo);
    focos.push(pPortal.clone().lerp(pDir, 0.5).addScaledVector(ARRIBA, 2.2));
    // Las ideas giran alrededor del portal, entran y vuelven a salir: el Studio las guarda sin dejarlas pasar
    const eje = tPortal.clone().normalize(), a = new THREE.Vector3().crossVectors(eje, ARRIBA).normalize(), b = new THREE.Vector3().crossVectors(a, eje).normalize();
    animar.push((t) => {
      ideas.forEach((d) => {
        const ang = d.ang + t * d.vel;
        const radio = 2.6 + 2.4 * (0.5 + 0.5 * Math.sin(t * 0.7 + d.fase));
        d.idea.position.copy(pPortal).addScaledVector(a, Math.cos(ang) * radio).addScaledVector(b, Math.sin(ang) * radio);
      });
      director.rotation.y = t * 0.8;
      rayo.material.opacity = 0.35 + 0.35 * Math.sin(t * 1.6) ** 2;
    });
  }

  // ── Parada 3, lo nuevo: tú sobre la línea, con una sola baldosa encendida; lo demás, guardado al costado
  {
    const u = SITIO[2];
    const { p, t, lado } = marco(u - 0.006);
    const tu = new THREE.Group();
    const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.7, 6, 14), brillo(TU, 0.35));
    cuerpo.position.y = 0.95;
    const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 14), brillo('#cfe0ff', 0.25));
    cabeza.position.y = 1.75;
    tu.add(cuerpo, cabeza);
    tu.position.copy(p);
    tu.lookAt(p.clone().add(t));
    escena.add(tu);
    const rTu = rotulo('tú', '#cfe0ff', 0.5);
    rTu.position.copy(p).addScaledVector(ARRIBA, 2.7);
    escena.add(rTu);
    const baldosas = [];
    for (let k = 0; k < 6; k++) {
      const { p: pb, t: tb } = marco(u + k * 0.0075);
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.07, 1.1), k === 0 ? brillo(VERDE, 1.1) : new THREE.MeshStandardMaterial({ color: '#2a3354', transparent: true, opacity: 0.35 }));
      b.position.copy(pb).addScaledVector(ARRIBA, -0.12);
      b.lookAt(pb.clone().add(tb).addScaledVector(ARRIBA, -0.12));
      escena.add(b);
      baldosas.push(b);
    }
    const rMision = rotulo('tu misión: solo esta', VERDE);
    rMision.position.copy(baldosas[0].position).addScaledVector(ARRIBA, 1.4).addScaledVector(lado, -1.6);
    escena.add(rMision);
    const jaula = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3.2, 3.2, 3.2)), new THREE.LineBasicMaterial({ color: MORADO }));
    jaula.position.copy(p).addScaledVector(lado, 5).addScaledVector(ARRIBA, 1.4);
    escena.add(jaula);
    const guardadas = [];
    for (let k = 0; k < 9; k++) {
      const g = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), brillo([CIAN, VERDE, '#ffb36b'][k % 3], 0.6));
      escena.add(g);
      guardadas.push({ g, fase: k * 0.7 });
    }
    const rJaula = rotulo('lo demás, guardado en el Studio', MORADO, 0.5);
    rJaula.position.copy(jaula.position).addScaledVector(ARRIBA, 2.6);
    escena.add(rJaula);
    focos.push(p.clone().addScaledVector(lado, 2.2).addScaledVector(ARRIBA, 1.4));
    animar.push((tt) => {
      baldosas[0].material.emissiveIntensity = 0.8 + 0.5 * Math.sin(tt * 2.4) ** 2;
      guardadas.forEach((d) => {
        d.g.position.copy(jaula.position).add(new THREE.Vector3(Math.sin(tt * 0.5 + d.fase) * 1.1, Math.sin(tt * 0.7 + d.fase * 1.3) * 1.1, Math.cos(tt * 0.6 + d.fase) * 1.1));
      });
      tu.position.y = p.y + Math.abs(Math.sin(tt * 2)) * 0.05;
    });
  }

  // ── Parada 4, los principios: ocho columnas a los lados del camino, cada una con su número
  {
    const u = SITIO[3];
    for (let k = 0; k < 8; k++) {
      const { p, lado } = marco(u - 0.028 + k * 0.008);
      const costado = k % 2 ? 1 : -1;
      const base = p.clone().addScaledVector(lado, costado * 3.1);
      const columna = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.6, 0.7), new THREE.MeshStandardMaterial({ color: '#1d2540', roughness: 0.8 }));
      columna.position.copy(base).setY(-1.2);
      const cima = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.18, 0.78), brillo(ORO, 0.9));
      cima.position.copy(base).setY(0.7);
      const n = rotulo(String(k + 1), ORO, 0.75);
      n.position.copy(base).setY(1.6);
      escena.add(columna, cima, n);
    }
    const { p } = marco(u);
    focos.push(p.clone().addScaledVector(ARRIBA, 1.2));
  }

  // ── Parada 5, cuándo no aplica: la línea se apoya en sus tres bases
  {
    const u = SITIO[4];
    const nombres = ['un proyecto', 'alguien que decide', 'un repositorio'];
    nombres.forEach((nombre, k) => {
      const { p, lado } = marco(u - 0.012 + k * 0.012);
      const alto = p.y + 2.8;
      const pilar = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.0, alto, 24), new THREE.MeshStandardMaterial({ color: '#2a3354', roughness: 0.7 }));
      pilar.position.set(p.x, -3 + alto / 2, p.z);
      const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.05, 8, 40), plano(LINEA, 0.8));
      anillo.rotation.x = Math.PI / 2;
      anillo.position.set(p.x, p.y - 0.18, p.z);
      const r = rotulo(nombre, LUZ, 0.5);
      r.position.copy(p).addScaledVector(lado, (k % 2 ? -1 : 1) * 2.8).setY(p.y - 0.9);
      escena.add(pilar, anillo, r);
    });
    const { p } = marco(u);
    focos.push(p.clone().addScaledVector(ARRIBA, -0.6));
  }

  // ── Las puertas de fase, entre parada y parada, y la meta al final
  [0.2, 0.366, 0.53, 0.69, 0.87].forEach((u) => {
    const { p, t } = marco(u);
    const arco = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.07, 8, 48, Math.PI), plano(ORO, 0.75));
    arco.position.copy(p).addScaledVector(ARRIBA, -0.2);
    arco.lookAt(arco.position.clone().add(t));
    escena.add(arco);
  });
  {
    const { p, t } = marco(0.995);
    const meta = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.14, 16, 96), plano(VERDE));
    meta.position.copy(p).addScaledVector(ARRIBA, 0.6);
    meta.lookAt(meta.position.clone().add(t));
    const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.2, 10), new THREE.MeshStandardMaterial({ color: '#cfd6e6' }));
    asta.position.copy(p).add(new THREE.Vector3(0, 2.1, 0));
    const tela = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1, 12, 6), new THREE.MeshStandardMaterial({ color: VERDE, emissive: VERDE, emissiveIntensity: 0.5, side: THREE.DoubleSide }));
    tela.position.copy(asta.position).add(new THREE.Vector3(0.9, 1.5, 0));
    const rMeta = rotulo('la meta', VERDE, 0.7);
    rMeta.position.copy(p).addScaledVector(ARRIBA, 5.4);
    escena.add(meta, asta, tela, rMeta);
    const original = tela.geometry.attributes.position.array.slice();
    animar.push((tt) => {   // la bandera ondea
      const arr = tela.geometry.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) arr[i + 2] = original[i + 2] + Math.sin(tt * 3 + original[i] * 2.4) * 0.12 * (original[i] + 0.9);
      tela.geometry.attributes.position.needsUpdate = true;
    });
    focos.push(p.clone().addScaledVector(ARRIBA, 2));
  }

  // ── La cámara: arriba, la misma vista de costado que la animación; al bajar, se mete en la línea y la sigue
  const INTRO_POS = new THREE.Vector3(40, 6, -26), INTRO_MIRA = new THREE.Vector3(0, 4.5, -26);
  const pose = (u) => {
    const { p, t, lado } = marco(u);
    const posicion = p.clone().addScaledVector(t, -7.5).addScaledVector(ARRIBA, 2.8).addScaledVector(lado, 1.4);
    const adelante = camino.getPointAt(Math.min(u + 0.03, 1)).addScaledVector(ARRIBA, 0.9);
    // Cerca de una parada, la mirada se va hacia lo que hay que ver
    let peso = 0, foco = null;
    PARADA.forEach((s, i) => {
      const w = Math.max(0, 1 - Math.abs(u - s) / 0.06);
      if (w > peso) { peso = w; foco = focos[i]; }
    });
    const mira = foco ? adelante.lerp(foco, suave(peso) * 0.75) : adelante;
    return { posicion, mira };
  };
  const suave = (x) => x * x * (3 - 2 * x);
  const masSuave = (x) => x * x * x * (x * (6 * x - 15) + 10);   // lenta al llegar y al salir de cada parada

  // ── El scroll: 0 es la vista de costado; 1, la primera parada; 6, la última
  let anclas = [];
  function medir() {
    const y = scrollY, alto = innerHeight;
    const inicio = document.getElementById('viaje').getBoundingClientRect().top + y;
    // Cada parada se alcanza cuando su centro pasa por el centro de la pantalla
    anclas = [inicio, ...paradas.map((el) => { const r = el.getBoundingClientRect(); return r.top + y + r.height / 2 - alto / 2; })];
    const w = lienzo.clientWidth, h = lienzo.clientHeight;
    renderer.setSize(w, h, false);
    camara.aspect = w / Math.max(h, 1);
    camara.fov = w < h ? 68 : 55;
    camara.updateProjectionMatrix();
  }
  function objetivo() {
    if (fijo !== null) return fijo;
    const y = scrollY;
    if (y <= anclas[0]) return 0;
    for (let k = 0; k < anclas.length - 1; k++) {
      if (y < anclas[k + 1]) return k + (y - anclas[k]) / Math.max(anclas[k + 1] - anclas[k], 1);
    }
    return anclas.length - 1;
  }
  const ultima = PARADA.length;
  function colocar(w) {
    let posicion, mira;
    if (w < 1) {
      const e = masSuave(Math.max(0, w));
      const p1 = pose(PARADA[0]);
      posicion = INTRO_POS.clone().lerp(p1.posicion, e);
      mira = INTRO_MIRA.clone().lerp(p1.mira, e);
    } else {
      // w = 1 es la primera parada y w = 6 la última; entre una y otra, la cámara avanza por la línea
      const k = Math.floor(w), f = w - k;
      const u = k >= ultima ? PARADA[ultima - 1] : PARADA[k - 1] + (PARADA[k] - PARADA[k - 1]) * masSuave(f);
      ({ posicion, mira } = pose(u));
    }
    camara.position.copy(posicion);
    camara.lookAt(mira);
    farol.position.copy(posicion).addScaledVector(ARRIBA, 1.5);
  }

  // ── La parada actual: su tarjeta se enciende y su hito se marca
  let actual = -1;
  function marcar(w) {
    const k = Math.round(w) - 1;
    if (k === actual) return;
    actual = k;
    paradas.forEach((el, i) => el.classList.toggle('actual', i === k));
    hitos.forEach((a, i) => { a.classList.toggle('actual', i === k); if (i === k) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
    navHitos?.classList.toggle('visibles', w > 0.5);
  }

  // ── El bucle: solo dibuja mientras el recorrido está a la vista
  let enVista = false, cur = 0, primera = true;
  new IntersectionObserver(([e]) => { enVista = e.isIntersecting; if (enVista) requestAnimationFrame(cuadro); }, { rootMargin: '200px' })
    .observe(document.getElementById('viaje'));
  let dibujados = 0;
  function cuadro() {
    if (!enVista) return;
    // En ?ver=N, unos segundos de cuadros y se queda quieta: así se puede capturar sin pantalla (si la página no para
    // de dibujar, el navegador sin pantalla no toma nunca la foto)
    if (fijo !== null && ++dibujados > 150) return;
    const w = objetivo();
    cur = quieto ? Math.round(w) : primera ? w : cur + (w - cur) * 0.085;
    primera = false;
    colocar(cur);
    marcar(cur);
    if (!quieto) { const t = performance.now() / 1000; animar.forEach((f) => f(t)); }
    renderer.render(escena, camara);
    requestAnimationFrame(cuadro);
  }
  // Se vuelve a medir cada vez que cambia el tamaño del lienzo o de la página (también si al cargar aún no tenía ancho)
  new ResizeObserver(medir).observe(lienzo);
  new ResizeObserver(medir).observe(document.body);
  addEventListener('load', medir);
  medir();
  colocar(0);
  renderer.render(escena, camara);
}
