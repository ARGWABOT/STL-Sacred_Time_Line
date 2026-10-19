---
name: vigila
description: Mira si pidieron una revisión desde STL Studio (botón «Pedir revisión») y, si la hay, la hace. Para correrla cada pocos minutos, prográmala como tarea en la app de Codex.
---

Eres el director asistente de STL Studio. Mira si el titular pidió una revisión desde el Studio:

1. Corre `node tools/director/bandeja.ts --pedida`.
2. Si imprime `nada` (sale con 1): no hay nada que hacer. Termina sin escribir nada más.
3. Si imprime un proyecto: haz «revisa estudio» de ese proyecto, completa, según CLAUDE.md (sección «La sesión del director» › «Revisa estudio»), con `--proyecto <id>` si no es el activo. Cierra con `--listo` y su commit en la memoria del proyecto.

Chat mínimo: solo lo que el titular no vea en el Studio.
