# Drawings in the director's documents

The director may add an SVG drawing to a document when it helps a person understand something that is hard to follow in words: a flow, a comparison, an example with several moving parts. This guide is the style every drawing follows, so that all of them read as one system, in the light and the dark theme of the Studio. It is the style of the three drawings in the report «El paquete de cada revisión», which the owner of the pilot project chose on 24 October 2026.

## 1. When to draw, and when not

Draw only when the drawing carries something the paragraph cannot carry as well: who does what and in which order, what grows and what stays, two ways of doing the same thing side by side. A drawing that repeats what its paragraph already says clearly is filler, and so is a drawing used to decorate. Most parts of a document need none.

A drawing never replaces its explanation. It goes right after the paragraph that explains it, and the Studio reads the two together as one idea, with one «Entendido». After the drawing, the next paragraph says what to take from it, in one or two sentences.

## 2. The colors: who is who

Each box is colored by who acts in it, always with the Studio's CSS variables and a fallback, so the drawing follows the theme:

| Who | Fill | Border |
| --- | --- | --- |
| The person (the owner or a teammate): yellow | `var(--sobre,#fffdf5)` | `var(--sobre-borde,#ecdcae)` |
| The Studio's code, without a model: gray | `var(--panel-suave,#fbfaf7)` | `var(--borde-fuerte,#cdc8bc)` |
| The model (the director and its helpers): blue | `var(--acento-fondo,#eaf1fb)` | `var(--acento,#2f5fb3)` |

Titles inside a box use `var(--texto,#23221f)`, or `var(--acento-texto,#0c447c)` on blue; secondary text and arrows use `var(--suave,#5c5b55)`. When a drawing uses more than one of the three roles, it ends with a small legend, one square per role, in that same order.

## 3. How to write one

- One `svg` element, as its own block, with `viewBox="0 0 760 H"`, `width="100%"`, `role="img"`, an `aria-label` that says in one sentence what the drawing shows, and `style="max-width:760px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif"`.
- No blank line inside the block: Markdown closes the HTML block at the first one, and the rest would show as code. The Studio's audit of the cuts fails on it.
- Colors always through `style="fill:…;stroke:…"` with the variables above, never a bare color: a bare color breaks the dark theme.
- Boxes with rounded corners (`rx` 8 to 12); a title at 14 px and weight 600, secondary lines at 12 px. Every label starts with a capital letter, and none is longer than the box that holds it.
- Arrows with a `marker` whose `id` is unique in the whole document (for example `flecha-<part>`), because every drawing of a document lives in the same page.
- Nothing that runs or leaves the page: no scripts, event handlers, links, `foreignObject` or animations. The Studio removes them before showing the drawing.
- Labels in the language of the person who reads the document, like the rest of it.

## 4. A small example

The person asks for a review, the Studio launches it and the director answers:

<svg viewBox="0 0 760 120" width="100%" role="img" aria-label="Example: the person asks for the review, the Studio launches the director, and the director answers in the Studio" xmlns="http://www.w3.org/2000/svg" style="max-width:760px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif">
<defs><marker id="flecha-ejemplo" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--suave,#5c5b55)"/></marker></defs>
<rect x="8" y="8" width="180" height="60" rx="10" style="fill:var(--sobre,#fffdf5);stroke:var(--sobre-borde,#ecdcae)"/>
<text x="98" y="33" text-anchor="middle" font-size="14" font-weight="600" style="fill:var(--texto,#23221f)">You</text>
<text x="98" y="53" text-anchor="middle" font-size="12" style="fill:var(--suave,#5c5b55)">«Pedir revisión»</text>
<line x1="188" y1="38" x2="278" y2="38" stroke-width="1.5" marker-end="url(#flecha-ejemplo)" style="stroke:var(--suave,#5c5b55)"/>
<rect x="280" y="8" width="180" height="60" rx="10" style="fill:var(--panel-suave,#fbfaf7);stroke:var(--borde-fuerte,#cdc8bc)"/>
<text x="370" y="33" text-anchor="middle" font-size="14" font-weight="600" style="fill:var(--texto,#23221f)">The Studio</text>
<text x="370" y="53" text-anchor="middle" font-size="12" style="fill:var(--suave,#5c5b55)">Launches the director</text>
<line x1="460" y1="38" x2="550" y2="38" stroke-width="1.5" marker-end="url(#flecha-ejemplo)" style="stroke:var(--suave,#5c5b55)"/>
<rect x="552" y="8" width="200" height="60" rx="10" style="fill:var(--acento-fondo,#eaf1fb);stroke:var(--acento,#2f5fb3)"/>
<text x="652" y="33" text-anchor="middle" font-size="14" font-weight="600" style="fill:var(--acento-texto,#0c447c)">The director</text>
<text x="652" y="53" text-anchor="middle" font-size="12" style="fill:var(--suave,#5c5b55)">Answers in the Studio</text>
<rect x="8" y="94" width="12" height="12" rx="3" style="fill:var(--sobre,#fffdf5);stroke:var(--sobre-borde,#ecdcae)"/>
<text x="26" y="104" font-size="12" style="fill:var(--suave,#5c5b55)">You</text>
<rect x="70" y="94" width="12" height="12" rx="3" style="fill:var(--panel-suave,#fbfaf7);stroke:var(--borde-fuerte,#cdc8bc)"/>
<text x="88" y="104" font-size="12" style="fill:var(--suave,#5c5b55)">The Studio's code, without a model</text>
<rect x="320" y="94" width="12" height="12" rx="3" style="fill:var(--acento-fondo,#eaf1fb);stroke:var(--acento,#2f5fb3)"/>
<text x="338" y="104" font-size="12" style="fill:var(--suave,#5c5b55)">The model</text>
</svg>

What to take from it: only the yellow box is a person, and only the blue box spends tokens. That sentence is the reason the drawing exists.
