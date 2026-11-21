// Muestra los nombres de las claves de tus ajustes de Claude Code (~/.claude/settings.json, o el de CLAUDE_CONFIG_DIR),
// sin sus valores: lo que el director lanzado deja de cargar si quitas tus skills y tus comandos (pd_arranque_limpio).
// La corre la persona, en su terminal: el director no puede leer ese archivo.
//   node tools/claves-ajustes.ts            tus ajustes de usuario
//   node tools/claves-ajustes.ts <archivo>  otro archivo de ajustes
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { clavesDeAjustes } from '../estudio/servidor/clavesAjustes.ts';

const archivo = process.argv[2] || join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'settings.json');

if (!existsSync(archivo)) {
  console.log(`No hay ajustes de Claude Code en ${archivo}: no hay nada que perder al dejar de cargarlos.`);
  process.exit(0);
}
let ajustes: unknown;
try {
  ajustes = JSON.parse(readFileSync(archivo, 'utf-8'));
} catch {
  console.log(`${archivo} no es JSON válido: no lo muestro. Claude Code tampoco lo puede leer así.`);
  process.exit(1);
}
const lineas = clavesDeAjustes(ajustes);
console.log(`Las claves de ${archivo}, sin sus valores (${lineas.length}):\n`);
for (const l of lineas) console.log(`- ${l}`);
console.log('\nNinguna se ha quitado: esta orden solo las muestra.');
