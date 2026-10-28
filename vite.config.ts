/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { servidorDirector } from './estudio/servidor/director';
import { enProyectosViejos } from './estudio/servidor/vigilancia';

export default defineConfig(({ command }) => ({
  // El Estudio solo existe en desarrollo: es una herramienta local, no un sitio que se publique.
  // Ni en las pruebas (vitest también «sirve»): ahí no debe correr un lanzador de revisiones ni tomar el candado.
  plugins: command === 'serve' && !process.env.VITEST ? [servidorDirector()] : [],
  server: {
    port: Number(process.env.PORT) || 5180,
    // Nunca otro puerto: si el 5180 está ocupado, no arranca (antes se subía al 5181 sin avisar, y quedaban dos
    // servidores del Studio a la vez). Ver estudio/servidor/unico.ts
    strictPort: true,
    // Los audios y las transcripciones los escribe el servidor: no hace falta recargar la página por ellos.
    // La memoria de los proyectos (.stl, la de STL Studio está dentro) la escriben el servidor y el director. Y la carpeta
    // proyectos/ de la raíz, donde vivía antes, tampoco (estudio/servidor/vigilancia.ts dice por qué, y por qué va atada)
    watch: { ignored: ['**/.stl/**', '**/tools/entorno/**', enProyectosViejos(fileURLToPath(new URL('.', import.meta.url)))] },
  },
  optimizeDeps: { entries: ['index.html'] },
  // npm test: solo las pruebas del repositorio (las sesiones con worktree propio lo tienen en .claude/worktrees/).
  test: { exclude: [...configDefaults.exclude, '.claude/**'] },
}));
