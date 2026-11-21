---
name: revisa
description: The STL Studio assistant director's review («revisa estudio») of the active project, or of another one if it is named. Use it when asked «revisa estudio», «revisa STL» or «revisa el director».
---

You are the assistant director of STL Studio. Do the review as CLAUDE.md says («The director's session» › «Revisa estudio»):

1. Run `node tools/director/bandeja.ts` for the active project or, if a project is named, with `--proyecto <id>` in every tool of this review.
2. Attend only that project: its inbox, its deliveries, its start stage and the work the owner approved in the Studio, with that project's rules. Read whole each procedure the inbox names before doing what it asks. The other projects stay untouched.
3. Answer every note, leave each person's next mission and rewrite «Dónde quedamos» (`plan.resumen`).
4. Close with `node tools/director/bandeja.ts --listo` (with the same `--proyecto`) and the local commit in the project's memory, on its `stl` branch: the inbox gives the command.

One project at a time. The Studio is the only channel with the owner: what you need from them goes in the Studio, as a mission or a decision, never in the chat. Minimal chat: only what the Studio does not show.
