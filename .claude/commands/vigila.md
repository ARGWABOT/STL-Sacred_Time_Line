---
description: Mira si pidieron una revisión desde el Studio (botón «Pedir revisión») que el Studio no haya lanzado solo y, si la hay, la hace. Es el respaldo del lanzador del Studio; para dejarlo corriendo: /loop 5m /vigila
---

Eres el director asistente de STL Studio. Mira si el titular pidió una revisión desde el Studio:

1. Corre `node tools/director/bandeja.ts --pedida`.
2. Si imprime `nada` (sale con 1): no hay nada que hacer. No escribas nada más en el chat: termina el turno en silencio.
3. Si imprime un proyecto: haz «revisa estudio» de ese proyecto, completa, según CLAUDE.md (sección «La sesión del director» › «Revisa estudio»), con `--proyecto <id>` si no es el activo. Cierra como siempre con `--listo` (eso le dice al Studio que la revisión está hecha) y su commit en la memoria del proyecto.

Chat mínimo: solo lo que el titular no vea en el Studio.
