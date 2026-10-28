# STL Studio frente a la Metodología STL: evaluación y mejoras

*Evaluación del director asistente sobre el documento «STL Studio Methodology» (versiones 1, 2 y 3), 16 de octubre de 2026.*

## 1. Lo que entendí

STL es la metodología y STL Studio, el entorno que la hace aplicable. El objetivo no es solo administrar tus proyectos locales, sino **demostrar la eficiencia que promete la investigación** y llegar a algo **replicable**: clonar el repositorio en otro computador, entregarle proyectos al director y trabajar con el método, como lo haces tú.

También me pediste distinguir desde el inicio entre un **proyecto nuevo** (el director pide la explicación, el objetivo y cuándo se considera completo) y un **proyecto existente** (el director lo diagnostica primero, detecta lo que está en curso y las metas de su propia documentación, y propone él los objetivos).

## 2. Lo que el Studio ya cumple de la metodología

| Pieza de STL (versión 2) | En el Studio hoy |
| --- | --- |
| Un director, una memoria en archivos | Sí: `plan.json`, estado por persona y documentos, por proyecto |
| Pensar antes de enviar (buzón editable) | Sí: las notas se corrigen o se borran hasta la revisión |
| Comentarios anclados al fragmento | Sí: por parte de documento, por paso de misión, por frente del diagnóstico y por decisión |
| Revisión agrupada | Sí: «revisa estudio» con la bandeja |
| Ruta por fases y puertas, frentes y excepciones | Sí |
| Siguiente paso explícito | Sí: una misión a la vez, con el director flotante |
| Avance con trazabilidad (sellos) | Parcial: el sello existe y la bandeja detecta cambios, pero no hay un mecanismo para corregir un error real de forma explícita |
| Autoridad humana | Sí: el titular firma, cruza puertas y decide propuestas |
| Voz con transcripción local | Sí |
| Equipo y sincronización | Sí |

## 3. Lo que falta, por prioridad

**Prioridad 1: lo que pediste y lo que define el ciclo.** Lo implemento ahora:

1. **Proyecto nuevo o existente.** Dos arranques distintos:
   - **existente**: conectar el repositorio → diagnóstico → objetivos propuestos por el director → ruta;
   - **nuevo**: contar el proyecto (explicación, objetivo y cuándo está completo) → planteamiento del director → objetivo → ruta.
2. **El tratamiento de cada observación** (paso 7 de la versión 2): integrada, rechazada, aplazada o requiere tu decisión. Hoy las respuestas son texto libre; con esto, cada nota muestra su tratamiento, y el director queda obligado a darlo.
3. **Replicabilidad básica**:
   - un `npm run iniciar` que comprueba el equipo y dice qué falta;
   - una comprobación visible en la bienvenida;
   - el comando `/revisa` en Claude Code;
   - un `AGENTS.md` para que otros agentes (Codex, Cursor) sigan las mismas reglas.

**Prioridad 2: la memoria de tres capas** (sección 5 de la versión 2). Hoy las decisiones están repartidas: el objetivo en el proyecto, las respuestas a propuestas en el estado, las decisiones de los documentos en las notas. Propongo:

- **un registro de decisiones** con lo vigente, la razón, las alternativas, la procedencia (qué nota o qué documento) y la condición para reconsiderarla, con su pestaña en el Studio;
- **un estado operativo** generado en cada revisión (`ESTADO.md` por proyecto), para retomar el proyecto después de reiniciar la sesión o cambiar de modelo.

**Prioridad 3: las métricas de validación** (sección 10 de la versión 2 y sección 7 de la versión 3). La investigación dice que no se debe afirmar un ahorro sin medirlo. El Studio puede medir solo lo que ya registra:

- observaciones por revisión;
- turnos que se evitaron;
- tiempo de cada misión hasta su aprobación;
- porcentaje de observaciones por tratamiento;
- regresiones detectadas por los sellos;
- costo por revisión, si se registra.

Con eso, el experimento A/B con desarrolladores tendría datos desde el primer día.

**Prioridad 4: la disciplina fina.**

- **La corrección explícita de un documento sellado**: una fe de erratas trazable, en vez de prohibirlo.
- **Una vía de consulta rápida** que no rompa la disciplina, para las dudas que frenan.
- **Las bifurcaciones** con su resolución: integrar, experimentar acotado, aplazar o descartar.
- **Separar lo que el director puede ajustar solo** de lo que necesita tu aprobación en la ruta.

**Prioridad 5: el producto publicable.**

- **Separar el código de los datos**: hoy `proyectos/` vive en el mismo repositorio que el Studio. Un clon para otro desarrollador traería tus proyectos.
- Un instalador sin requisitos técnicos.
- La interfaz también en inglés.
- La licencia.
- La marca (sección 11 de la versión 2).

## 4. Lo que se decidió en esta revisión

- **Un solo canal**: todo proyecto que entra al Studio se dirige solo desde aquí; lo que el director necesita del titular se pide como misión o decisión, y el trabajo técnico se ejecuta con aprobación en el Studio.
- **Un proyecto a la vez**: se probó una agenda que llevaba al titular entre misiones de varios proyectos y se descartó, porque rompe «una misión a la vez» y multiplica el costo de cambiar de contexto. En su lugar, al cambiar de proyecto el director da el resumen **«Dónde quedamos»** y lleva a la misión de ahora. Entre proyectos solo cruza una alerta de una línea (una fecha límite o un riesgo activo).

## 5. El riesgo que señala tu propia investigación

La versión 3 advierte que el Studio puede volverse a la vez gestor documental, gestor de proyectos, orquestador de agentes y sistema de memoria. Mi recomendación es **cuidar el núcleo diferenciador**, que es justamente lo que nadie más reúne:

1. comentario anclado;
2. buzón editable;
3. revisión agrupada;
4. tratamiento por observación;
5. decisiones registradas;
6. una sola misión siguiente.

Todo lo demás debería servir a ese ciclo o esperar.

**Para decidir:**

1. **El orden de las prioridades.** Recomiendo 1 → 2 → 3: primero que el ciclo esté completo (tratamiento, memoria), y después medirlo.
2. **Separar código y datos.** Recomiendo decidirlo antes de publicar: o `proyectos/` en un repositorio aparte por usuario, o ignorado en el repositorio del producto. Cambia cómo se sincronizan los equipos.
3. **La primera validación.** Recomiendo empezar el experimento de la versión 3 con 3 a 5 desarrolladores y un solo ciclo (documento → comentarios → revisión agrupada), apenas estén las métricas.
