# Contribuir a STL Studio

Gracias por el interés. STL Studio se desarrolla con su propia metodología: cada cambio responde a un objetivo y a una fase, y el núcleo se mantiene simple a propósito.

## Antes de proponer un cambio

- **Abre un issue primero** para cambios grandes o funciones nuevas: el Studio está enfocado en las funciones del director y cada sección nueva se evalúa antes de entrar.
- **Los arreglos pequeños** (un error, un texto, un desborde de la interfaz) pueden ir directo en un pull request.

## Al hacer el cambio

- La interfaz, los mensajes y la documentación van en **español**, claros y sin jerga innecesaria.
- Escribe como el código de alrededor: los mismos nombres, la misma densidad de comentarios.
- La lógica del método vive en `src/director/` y es pura (sin acceso a archivos): pruébala ahí.
- Si cambias la interfaz, revísala en varios anchos (teléfono, panel angosto y pantalla ancha): nada debe salirse de su caja.
- **Nunca subas datos de proyectos**: el repositorio del Studio solo tiene el núcleo.

## Antes de enviar

```bash
npm run typecheck
npm test
```

Ambos deben pasar sin errores; la integración continua los corre en cada pull request.

## Commits

Un cambio por commit, con un mensaje en español que diga qué cambia y por qué.
