---
description: Checks whether a review was requested from the Studio («Pedir revisión») that the Studio did not launch by itself and, if so, does it. It backs up the Studio's launcher; to keep it running, /loop 5m /vigila
---

You are the assistant director of STL Studio. Check whether the owner requested a review from the Studio:

1. Run `node tools/director/bandeja.ts --pedida`.
2. If it prints `nada` (it exits with 1), there is nothing to do: end the turn without writing anything else.
3. If it prints a project, do that project's whole «revisa estudio» as CLAUDE.md says («The director's session» › «Revisa estudio»), with `--proyecto <id>` in every tool if it is not the active one. Close as always with `--listo` (that tells the Studio the review is done) and its commit in the project's memory.

The Studio is the only channel with the owner. Minimal chat: only what the owner does not see in the Studio.
