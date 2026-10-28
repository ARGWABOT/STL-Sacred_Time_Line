# The director's documents

*A procedure of the STL Studio director. The model reads this English version; its Spanish version, `documents.es.md`, has the same parts and is the one people read and approve. A change is written in both. The inbox (`tools/director/bandeja.ts`) says when to read it: in every review, before writing or changing a document.*

## The format

In the project's memory, `docs/director/`, in Markdown, split with `##` (each `##` is a part that is commented on separately, and a part should be neither too long nor trivial). The documents are written in the language of the person who reads them; the example is the Spanish one, and its «**Para decidir:**» mark is literal, because the Studio looks for it to put the decision buttons:
```
# <Título>

## 1. Lo que entendí
…

## 2. <Una parte con sentido>
… explicación …

**Para decidir:**

1. **<Nombre corto>.** La pregunta y mi recomendación.
2. **<Otro>.** …
```
Short and meant to be read straight through: tables only if they help. Each new document goes into `plan.documentos` (`ruta`, `titulo`, `porQue`) and into the mission that asks for it.

## They are read one idea at a time

**They are read one idea at a time.** The Studio splits each `##` into ideas (each paragraph, each point of a first-level list, each table or block): each one is marked «Entendido» or, if it is a decision, answered; the part counts as read on its own when all of them are attended to, and only then does the next one open. Therefore:
- **Critical rule: no bad cut.** A heading alone, an image far from its text or a split block take credibility away from the whole Studio. The cut (`trozosDeParte`) never loses or reorders anything, never splits a whole element (code, formulas, table, quote, HTML block, a point with what belongs to it) and joins what is not an idea with what gives it meaning (the heading with what it introduces, the image with what it illustrates, the caption with its table). The inbox runs the audit (`ideasSueltas`) on each document to be read: **no warning of it is left uncorrected** before asking for it to be read, and `--listo` does not close with a warning in a document written or changed in that review that nobody started reading (`documentosPorCerrar`). Every new format of the cut comes with its case in «la auditoría de los cortes» (`director.test.ts`).
- **One idea per paragraph or per point, of no more than about 10 lines.** If an explanation is longer, split it into points.
- **Each idea is worth reviewing.** A transition line or a notice («that is decided in another document») is not an idea: it goes inside the neighboring paragraph. A subheading («**A favor**», «### El costo») is not one either: the Studio reads it together with what it introduces, just like a list of short points (one to three lines each), which is read at once, as a single block with one «Entendido» and a ✉ on each point to comment on it separately (the owner's rule, 22 October 2026); a longer point, or one with code or a table inside, is read on its own, and the «Para decidir» list is never joined. A loose one-line point has nothing to join: complete it or add it to another one (the inbox warns about each idea that would be left as a loose line). A paragraph that announces what follows («Recomiendo:») is read by the Studio together with its list (whole if it is short; if not, with its first point) or its block; even so, **do not cut an explanation in half**: think about where each idea ends before writing it, and make each one understandable on its own.
- **The important thing first** (chosen by the owner on 25 October 2026, when trying the reading fog): in each part of a document, the conclusion or the recommendation goes in its first idea and the detail after; in an answer, in its first sentence. It is what helps most when reading on screen, and with the fog the first thing uncovered is what matters.
- **Concise, without redundancy**: say the idea with its key data and without filler sentences; what was already said elsewhere is not repeated.
- **No code symbols that confuse** (the owner's voice note of 22 October 2026: two `&&` at the end of a list): in what is read (documents, answers, messages, missions) say the idea in words («órdenes encadenadas», not `&&`). A symbol, a command or a code name only goes in when it is exactly what is being explained or what has to be copied, and then with its code format.
- **Commits, only for the system** (the owner's voice note of 26 October 2026: a hash tells nothing to whoever reads or listens to the voice): nothing a person reads names a commit by its hash (what was achieved, the message, the answers, the missions, the requests, the documents); say what was done. The hash can go in the internal parts (the `hecho` of a request, `ejecutadas`, `alDia`). The Studio removes them from everything it shows of the plan (`planSinCommits`) and `bandeja.ts --listo` does not close with a new one written for people (`commitsALaVista`).
- **A drawing, only when it helps to understand** (the owner's voice notes of 19 and 23 October 2026): a flow, a comparison or an example that is hard to follow in words can go as an SVG drawing, right after the paragraph that explains it (the Studio reads them together, as one idea) and with the style of `docs/metodo/dibujos.md`: yellow for the person, gray for the Studio's code and blue for the model, with the Studio's colors, its `aria-label` and no empty lines inside. Not always: a drawing that repeats what the paragraph already says clearly is filler.
- **Cordial, but firm**: the director directs; it says clearly what is advisable and why, in a friendly tone, without overexplaining or giving in to please.
- **Decisions are mandatory**: each point of «Para decidir» is answered before moving on (without an answer, the part does not count as read). Ask to decide only what you really need to direct. The same goes for the answers in the Inbox and the Questions.
