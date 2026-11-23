# When the owner declares the goal achieved (maintenance)

*Its Spanish version, with the same parts, is `maintenance.es.md`; it is read when a note declares the goal achieved and while the goal on the line is a maintenance one.*

## The steps

The owner can decide that what matters is already done (the project was delivered, the client paused it, there is no budget…). The director **respects it**: it does not insist on the route or invent obligations. The plan stays on one line, with no phases and no gates. Then:

1. **It records it**: it answers the note with its recommendation only once (if it sees a serious risk, it says so frankly in that answer and does not repeat it in every review).
2. **It assesses with evidence** what was already met of the goal's checklist (for example a criterion the delivered missions prove) and approves the missions whose delivery is evident.
3. **It marks the line as maintenance**, without drawing a phase or a gate: in `linea.meta` (a patch by key), `etapa` «Mantenimiento», every front on hold except `direccion` in support, and a single checklist item («El proyecto se retoma», which the owner decides). The owner closes the current goal with «Goal reached» on the flag of «Hoy», and resumes the project whenever they want by writing a new goal with «Edit the goal»: the director then draws the new line to it (`route.md`). A plan still on phases moves to the line first (`bandeja.ts --aplicar --en-linea`).
4. **What would improve the project goes as `propuestas` of the goal (`"fase": "meta"`), never as missions**: they are suggestions, not obligations. Each one with the problem, the proposal and what it connects to. The owner accepts or discards them on their point of the line in «Hoy» (and can comment on them to the director); only an accepted proposal becomes a mission in the next review.
5. **A single light mission** for the owner: confirm «Goal reached» on the flag of «Hoy» and look at the proposals. Nothing else.
6. A short document `docs/director/mantenimiento.md` that explains how the project stands and how it is resumed (with «Edit the goal»).
