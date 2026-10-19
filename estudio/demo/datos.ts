// Los datos del Studio de demostración: un proyecto de ejemplo, «Rueda Libre» (la tienda en línea de un taller de
// bicicletas), ya en marcha, con su ruta, su misión de ahora, notas respondidas y por responder, una conversación de
// preguntas, propuestas por decidir y dos documentos para leer. Tienen la misma forma que lo que devuelve el servidor
// del Studio (estudio/servidor/director.ts), así que la interfaz es la de verdad: se actualiza sola cuando el Studio cambia.
import planBase from '../../plantilla/plan.json';
import { agendaDe, estadoPersonaVacio, unirEstados, type EstadoPersona, type Plan, type Proyecto } from '../../src/director/director';

const ID = 'rueda-libre';
const notas = (n: string) => `proyectos/${ID}/director/notas/${n}`;
void notas;
/** Hace `dias` días (y `horas` horas), en ISO: la demostración siempre se ve reciente. */
const hace = (dias: number, horas = 0) => new Date(Date.now() - (dias * 24 + horas) * 3_600_000).toISOString();
const dia = (dias: number) => hace(dias).slice(0, 10);

const DIAGNOSTICO = `# Diagnóstico de Rueda Libre

## 1. Lo que entendí

Rueda Libre es el taller de bicicletas de Laura, en su barrio. Hoy vende en el mostrador y por WhatsApp. Quiere una tienda en línea para vender repuestos y accesorios, y que el cliente recoja en el taller. El repositorio tiene una tienda a medio hacer: el catálogo funciona, el pago no.

## 2. Dónde está, de verdad

El catálogo y la ficha de producto están hechos y probados. El carrito existe, pero no guarda nada al recargar. El pago en línea no está: hay una prueba con la pasarela, sin terminar. No hay inventario: los productos no saben cuántos quedan.

| Frente | Nota | En una frase |
| --- | :---: | --- |
| La tienda | 3/5 | El catálogo está; el carrito y la compra, a medias. |
| Pagos y pedidos | 1/5 | Lo que más falta: sin pago no hay venta. |
| Inventario | 0/5 | Todavía no existe. |

## 3. El riesgo más grande

Que la tienda se vea terminada y no pueda cobrar. Todo lo demás puede esperar a la primera venta real.
`;

const RUTA = `# La ruta de Rueda Libre

## 1. Lo que entendí

Fijaste la meta: vender en línea y que el cliente recoja en el taller, con diez clientes comprando en el primer mes. La ruta va hacia ahí, una puerta a la vez.

## 2. Por qué este orden

Primero, que se pueda **vender una vez**: el catálogo con productos reales y el pago en línea. Después, **un mes vendiendo** con clientes de verdad, para aprender qué falla. Al final, **abrirla a todos**. El inventario va después del primer mes: con pocas ventas, Laura lo controla a mano.

**Para decidir:**

1. **El pago contra entrega.** ¿Aceptamos también pagar al recoger en el taller? Recomiendo que sí, desde el MVP: muchos clientes del barrio todavía no compran en línea.
2. **Las fotos.** ¿Fotos propias o las del fabricante? Recomiendo las del fabricante para empezar y propias para las bicis usadas.

## 3. Lo que queda en espera

El inventario automático, los envíos a domicilio y la app del celular esperan su fase. Si llega una idea sobre eso, la anotas en el Buzón: el director dice cuándo le toca.
`;

/** Los documentos del proyecto de ejemplo y los del Studio (como los lista el servidor). */
export const documentosDemo = () => [
  { ruta: 'docs/director/ruta.md', titulo: 'La ruta de Rueda Libre' },
  { ruta: 'docs/director/diagnostico.md', titulo: 'Diagnóstico de Rueda Libre' },
];
export const documentoDemo = (ruta: string | null) => (ruta === 'docs/director/ruta.md' ? RUTA : ruta === 'docs/director/diagnostico.md' ? DIAGNOSTICO : null);

function plan(): Plan {
  const p = JSON.parse(JSON.stringify(planBase)) as Plan;
  p.actualizado = dia(0);
  p.revisado = hace(0, 3);
  p.frentes = [
    p.frentes[0],
    { id: 'tienda', nombre: 'La tienda', que: 'El catálogo, la ficha de producto y el carrito.', rutas: ['src/tienda/'] },
    { id: 'pagos', nombre: 'Pagos y pedidos', que: 'Cobrar en línea o al recoger, y avisar del pedido al taller.', rutas: ['src/pagos/'] },
    { id: 'inventario', nombre: 'Inventario', que: 'Cuántos quedan de cada producto.', rutas: ['src/inventario/'] },
  ];
  const arranque = p.fases[0];
  for (const f of ['tienda', 'pagos', 'inventario']) arranque.frentes[f] = { nivel: 'espera', que: 'En espera hasta fijar la meta y trazar la ruta.' };
  p.fases.push(
    {
      id: 'mvp', nombre: 'La tienda que vende', etapa: 'MVP',
      meta: 'Que un cliente de verdad compre un repuesto en línea y lo recoja en el taller.',
      porQue: 'Es el riesgo más grande: una tienda que se ve terminada y no puede cobrar. Todo lo demás espera a la primera venta.',
      duracion: 'Hasta la primera venta en línea',
      puerta: { nombre: 'La primera venta', prueba: 'Un cliente que no es del equipo compra en línea y recoge su pedido en el taller.' },
      frentes: {
        direccion: { nivel: 'apoyo', que: 'Revisar cada semana contra la meta.' },
        tienda: { nivel: 'foco', que: 'El catálogo con productos reales y un carrito que no se pierde.' },
        pagos: { nivel: 'foco', que: 'El pago en línea y el pago al recoger.' },
        inventario: { nivel: 'espera', que: 'Laura lo controla a mano hasta el primer mes.' },
      },
      criterios: [
        { id: 'm_catalogo', texto: 'El catálogo con los 30 productos más vendidos, con foto y precio', como: 'La misión del catálogo, aprobada por el director.' },
        { id: 'm_pago', texto: 'El pago en línea funcionando, primero en modo de prueba', como: 'Una compra de prueba completa, con su recibo.' },
        { id: 'm_venta', texto: 'Una venta real, de un cliente de afuera', como: 'Registrada en Validaciones, con quién compró y qué.' },
      ],
      misiones: ['Subir los 30 productos más vendidos', 'Probar el pago en modo de prueba', 'Invitar a tres clientes del barrio a comprar'],
    },
    {
      id: 'piloto', nombre: 'Un mes vendiendo', etapa: 'Piloto',
      meta: 'Diez clientes comprando en línea durante el primer mes, y saber qué falla.',
      porQue: 'Con ventas reales se aprende lo que ningún plan anticipa: qué buscan, dónde se traban, qué preguntan.',
      duracion: 'Un mes de ventas, contado desde la primera',
      puerta: { nombre: 'Diez clientes', prueba: 'Diez clientes distintos compraron en línea y la mayoría volvería a hacerlo.' },
      frentes: { tienda: { nivel: 'apoyo', que: 'Arreglar lo que los clientes encuentren.' }, pagos: { nivel: 'apoyo', que: 'Que ningún pago se pierda.' }, inventario: { nivel: 'foco', que: 'Saber cuántos quedan antes de vender lo que no hay.' } },
      criterios: [{ id: 'p_clientes', texto: 'Diez clientes distintos compraron en línea', indicador: 'validaciones_personas', tipos: ['usuarios'], meta: 10 }],
      misiones: ['Acompañar las primeras compras', 'Anotar lo que preguntan los clientes'],
    },
    {
      id: 'lanzamiento', nombre: 'La tienda abierta', etapa: 'Lanzamiento',
      meta: 'Vender en línea a todo el barrio, con el taller recibiendo los pedidos sin esfuerzo extra.',
      porQue: 'Es la meta fijada: se abre cuando la tienda ya demostró que vende y el taller la aguanta.',
      duracion: 'Hasta cumplir la meta',
      puerta: { nombre: 'La meta cumplida', prueba: 'Diez clientes al mes compran en línea y recogen en el taller.' },
      frentes: {},
      criterios: [{ id: 'l_meta', texto: 'Diez clientes al mes, dos meses seguidos' }],
      misiones: ['Contarle al barrio', 'Medir las ventas de cada mes'],
    },
  );
  p.misiones = [
    p.misiones[0],
    {
      id: 't_diagnostico', para: 'titular', fase: 'arranque', frente: 'direccion', xp: 40,
      titulo: 'Lee el diagnóstico de Rueda Libre y fija la meta',
      porQue: 'Sin una meta clara, cada idea nueva se vuelve trabajo. Con ella, el director dice qué va primero.',
      pasos: [{ texto: 'Lee el diagnóstico parte por parte y comenta lo que no te cuadre.', ir: { doc: 'docs/director/diagnostico.md', etiqueta: 'Leer el diagnóstico' } }, { texto: 'Fija la meta en Proyecto.', ir: { vista: 'proyecto', ancla: 'p-objetivo', etiqueta: 'Fijar la meta' } }],
      entrega: 'El diagnóstico comentado y la meta fijada.', documentos: ['docs/director/diagnostico.md'], criterios: ['a_leido', 'a_objetivo'],
    },
    {
      id: 't_catalogo', para: 'titular', fase: 'mvp', frente: 'tienda', xp: 30,
      titulo: 'Sube los 30 productos más vendidos, con su foto y su precio',
      porQue: 'Es lo primero que ve un cliente: sin productos reales, nadie compra. Y es la mitad de la primera puerta.',
      pasos: [
        { texto: 'Lee la ruta y responde sus dos decisiones: el pago al recoger y las fotos.', ir: { doc: 'docs/director/ruta.md', seccion: '2. Por qué este orden', etiqueta: 'Leer la ruta' } },
        'Elige los 30 productos más vendidos del último trimestre (la libreta del mostrador sirve).',
        'Súbelos al catálogo con su foto, su precio y su descripción corta.',
        { texto: 'Si algo no te cuadra, coméntalo en el Buzón: queda para la próxima revisión.', ir: { vista: 'buzon', ancla: 'escribir', etiqueta: 'Abrir el Buzón' } },
        'Pide la revisión: al marcar este paso, la misión queda entregada.',
      ],
      entrega: 'Los 30 productos en el catálogo, con foto y precio.', documentos: ['docs/director/ruta.md'], criterios: ['m_catalogo'],
    },
    {
      id: 't_pago', para: 'titular', fase: 'mvp', frente: 'pagos', xp: 40,
      titulo: 'Prueba el pago en línea en modo de prueba',
      porQue: 'Antes de cobrarle a un cliente, una compra de prueba completa: del carrito al recibo.',
      pasos: ['Activa el modo de prueba de la pasarela.', 'Haz una compra completa con una tarjeta de prueba.', 'Guarda el recibo.'],
      entrega: 'Una compra de prueba completa, con su recibo.', criterios: ['m_pago'],
    },
  ];
  p.revisiones = {
    t_conectar: { cuando: hace(6), veredicto: 'aprobada', comentario: 'Hecho: el repositorio está conectado.' },
    t_diagnostico: { cuando: hace(3), veredicto: 'aprobada', comentario: 'Comentaste las tres partes y fijaste la meta. Tracé la ruta.' },
  };
  p.evaluacion = {
    a_contexto: { fecha: dia(6), estado: 'cumplido', nota: 'El repositorio está conectado.' },
    a_leido: { fecha: dia(3), estado: 'cumplido', nota: 'Comentaste las tres partes del diagnóstico.' },
  };
  p.respuestas = {
    n_apartar: { cuando: hace(3), tratamiento: 'aplazada', texto: 'Buena idea, y la guardo para el piloto: apartar una bici exige saber cuántas quedan, y el inventario empieza ahí. Queda anotada en la fase «Un mes vendiendo».' },
    n_diag: { cuando: hace(3), tratamiento: 'integrada', texto: 'Tienes razón: el carrito sí guarda en el celular, solo falla en el computador. Lo corregí en la ruta: arreglarlo es parte de la misión del catálogo.' },
    q_orden: { cuando: hace(1), tratamiento: 'informada', texto: '**Porque sin pago no hay venta, y sin venta no hay nada que contar.**\n\nCon pocas ventas al principio, tú controlas el inventario a mano sin problema. Si lo hacemos al revés, tendríamos un inventario perfecto de una tienda que no cobra.\n\nEl inventario entra en el piloto, cuando las ventas lo pidan.' },
    q_banco: { cuando: hace(0, 3), tratamiento: 'informada', texto: '**Entonces vendemos con pago al recoger mientras tanto.** Por eso te recomiendo aceptarlo desde el MVP (la decisión está en la ruta, parte 2). La primera venta no tiene que esperar al banco.' },
  };
  p.documentos = [
    { ruta: 'docs/director/ruta.md', titulo: 'La ruta de Rueda Libre', porQue: 'Por qué estas fases y en este orden, y dos decisiones.' },
    { ruta: 'docs/director/diagnostico.md', titulo: 'Diagnóstico de Rueda Libre', porQue: 'Dónde está la tienda de verdad y qué falta para vender.' },
  ];
  p.diagnostico = {
    fecha: dia(5),
    resumen: [
      'Rueda Libre tiene una tienda a medio hacer: el catálogo funciona, el carrito a medias y el pago no está.',
      'El riesgo más grande es una tienda que se vea terminada y no pueda cobrar. Todo lo demás puede esperar a la primera venta.',
    ],
    frentes: {
      tienda: { nota: 3, hecho: ['Catálogo', 'Ficha de producto'], falta: ['Un carrito que no se pierda'], veredicto: 'El catálogo está; la compra, a medias.' },
      pagos: { nota: 1, hecho: ['Una prueba con la pasarela'], falta: ['El pago en línea', 'El pago al recoger'], veredicto: 'Sin pago no hay venta.' },
      inventario: { nota: 0, hecho: [], falta: ['Todo'], veredicto: 'Todavía no existe.' },
    },
    fuentes: ['El repositorio y su historia', 'Lo que contó Laura'],
  };
  p.objetivos = [
    { id: 'o_vender', texto: 'Vender en línea y que el cliente recoja en el taller', exito: 'Diez clientes al mes compran en línea, dos meses seguidos.', porQue: 'Es lo que Laura quiere y lo que el repositorio ya empezó.', horizonte: 'Dos meses de ventas' },
    { id: 'o_catalogo', texto: 'Un catálogo en línea para mostrar lo que hay', exito: 'Los 100 productos del taller en línea.', porQue: 'El más corto: sirve aunque todavía no cobre.' },
  ];
  p.propuestas = [
    { id: 'pr_whatsapp', area: 'Pagos y pedidos', titulo: 'Avisar cada pedido por WhatsApp', problema: 'Laura vive en el WhatsApp del taller y no va a revisar un panel de pedidos.', propuesta: 'Que cada pedido nuevo le llegue como mensaje al WhatsApp del taller, con lo que compraron y cómo pagaron.', conecta: 'Pagos y pedidos; no cambia la tienda.', fase: 'mvp' },
    { id: 'pr_resenas', area: 'La tienda', titulo: 'Reseñas de los clientes', problema: 'Los clientes del barrio confían en lo que dicen otros clientes.', propuesta: 'Después de recoger, pedirle al cliente una reseña corta del producto.', conecta: 'La ficha de producto.', fase: 'piloto' },
  ];
  p.mensaje = {
    fecha: dia(0),
    texto: 'Puse el pago antes que el inventario: sin pago no hay venta, y el inventario se puede llevar a mano un tiempo. Si el banco tarda en dar el botón de pago, la tienda abre igual, con pago al recoger.',
    personas: { titular: 'Hoy: sube los 30 productos más vendidos y responde las dos decisiones de la ruta.' },
  };
  p.resumen = {
    fecha: hace(0, 3),
    avanzamos: ['La ruta: tres fases hasta abrir la tienda', 'El diagnóstico del repositorio, y la meta fijada: diez clientes al mes', 'Tus dos preguntas, respondidas en Preguntas'],
    quedamos: 'Estamos en la primera fase, «La tienda que vende», con la meta de diez clientes al mes.',
  };
  p.boletin = [];
  return p;
}

function proyecto(): Proyecto {
  return {
    nombre: 'Rueda Libre', tipo: 'existente',
    contexto: 'El taller de bicicletas del barrio. Vende en el mostrador y por WhatsApp; quiere vender repuestos en línea.',
    metaInicial: 'Vender en línea y que el cliente recoja en el taller.', terminado: '',
    repositorio: { url: '', rama: 'main' },
    objetivo: { texto: 'Vender en línea y que el cliente recoja en el taller', exito: 'Diez clientes al mes compran en línea, dos meses seguidos.', horizonte: 'Dos meses de ventas', candidato: 'o_vender', firmado: { fecha: dia(3), quien: 'Laura' } },
    equipo: [{ id: 'titular', nombre: 'Laura', correo: 'laura@ejemplo.com', cargo: 'Dueña del taller', papel: 'Dirige el proyecto: fija la meta, responde las propuestas y cruza las puertas.' }],
    sincronizar: false,
  };
}

function estado(): EstadoPersona {
  const e = estadoPersonaVacio();
  e.cierres = { arranque: { fecha: dia(3), quien: 'Laura' } };
  e.entregas = { t_conectar: { cuando: hace(6, 2), quien: 'Laura' }, t_diagnostico: { cuando: hace(3, 2), quien: 'Laura', nota: 'Leído y comentado. La meta: diez clientes al mes.' } };
  e.empezadas = { t_catalogo: { cuando: hace(1), quien: 'Laura' } };
  e.notas = [
    { id: 'n_apartar', cuando: hace(4), quien: 'Laura', sobre: { tipo: 'general' }, texto: 'Me gustaría que los clientes pudieran apartar una bici y pagarla en el taller.' },
    { id: 'n_diag', cuando: hace(4, 1), quien: 'Laura', sobre: { tipo: 'documento', id: 'docs/director/diagnostico.md', seccion: '2. Dónde está, de verdad' }, texto: 'El carrito sí guarda en el celular; lo que falla es en el computador.' },
    { id: 'n_fotos', cuando: hace(0, 1), quien: 'Laura', sobre: { tipo: 'documento', id: 'docs/director/ruta.md', seccion: '2. Por qué este orden', decision: 'Las fotos' }, texto: 'De acuerdo con las del fabricante, pero las bicis usadas las fotografío yo.' },
    { id: 'n_idea', cuando: hace(0, 0.5), quien: 'Laura', sobre: { tipo: 'general' }, texto: 'Idea para después: una sección de bicis usadas con su historia.' },
    { id: 'q_orden', cuando: hace(2), quien: 'Laura', sobre: { tipo: 'pregunta' }, texto: '¿Por qué el pago va antes que el inventario?' },
    { id: 'q_banco', cuando: hace(1), quien: 'Laura', sobre: { tipo: 'pregunta', id: 'q_orden' }, texto: '¿Y si el banco tarda semanas en aprobar la pasarela?' },
    { id: 'q_whatsapp', cuando: hace(0, 2), quien: 'Laura', sobre: { tipo: 'pregunta' }, texto: '¿Conviene vender también por WhatsApp, o solo en la tienda?' },
  ];
  e.bitacora = [{ fecha: dia(3), quien: 'Laura', texto: 'Fija la meta: «Vender en línea y que el cliente recoja en el taller»' }];
  return e;
}

/** Lo mismo que devuelve GET /__estudio/director para el proyecto de ejemplo. */
export function datosDemo() {
  const p = plan();
  const pr = proyecto();
  const est = unirEstados({ titular: estado() });
  const agenda = agendaDe(p, est, 'titular');
  return {
    activo: ID,
    proyectos: [{ id: ID, nombre: pr.nombre, tipo: 'existente', objetivo: pr.objetivo!.texto, etapa: 'en_marcha', fase: 'La tienda que vende', porRevisar: 3, misionesAbiertas: 2, revisado: p.revisado, conectado: true, agenda, alerta: null, persona: 'titular' }],
    plan: p,
    estado: est,
    proyecto: pr,
    repositorio: { ruta: 'C:/proyectos/rueda-libre', info: { ruta: 'C:/proyectos/rueda-libre', rama: 'main', remoto: null, ultimo: { fecha: hace(1), autor: 'Laura', asunto: 'Catálogo: ficha de producto' }, commits: 214, archivos: 380, sinCommit: 0 }, error: null },
    arranque: 'en_marcha',
    senales: { proyecto: { objetivo: true } },
    identidad: { nombre: 'Laura', correo: 'laura@ejemplo.com', rol: 'titular' },
    transcripciones: {},
    transcribiendo: [],
    sinTranscribir: [],
    sincronizacion: { traido: null, error: null, local: true, subida: { fase: 'local', mensaje: 'Las decisiones se guardan en commits locales.', porSubir: 0, revisado: null, subido: null } },
    revision: null,
    vigilia: new Date().toISOString(),
    hoy: dia(0),
    errores: [],
  };
}
