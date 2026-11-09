# The design of STL Studio

*The graphic restructuring of the Studio: what was found, with which principles it was redesigned and how «What is STL» and the questions to the director turned out. 16 October 2026. Its Spanish version is `diseno-studio.es.md`. The Studio's buttons and sections are named here as its interface shows them in English, between «».*

## 1. What I understood

STL Studio is the base, simplified application with which the STL (Sacred Time Line) methodology is applied. In its basic version it is the assistant director's interface with its sub-tabs: nothing more.

You asked for four things:

1. **Fix the modal** of «Scan this computer», which looked messy.
2. **Redesign the whole Studio** so that it reads better:
   - everything easy to see;
   - suitable reading widths;
   - controls that can be understood without explanation.
3. **A section that explains the methodology**: what it is, how it works and why it is better than other ways of working with AI.
4. **Custom tabs per project.** They were built and later you decided to remove them, to keep the Studio focused on the director (part 7).

The Studio will be a free product for developers, so it has to be understood on its own. The director must always keep you up to date: what was the last thing completed and what comes next. Switching project must be easy.

## 2. What I found

I checked it at three widths: the app's panel (about 850 px), a laptop (1440 px) and a phone (390 px).

- **What is yours today ends up at the bottom.** At 850 px, your mission of now appears three screens away. Before it come six figure cards, the start-up, the roadmap line, two rows with 13 tabs and a help box.
- **Too many options at the same level.** The 13 tabs have the same visual weight, and the figure cards compete with the director's message.
- **Small type and small controls.** A good part of the text is between 11 and 13 px and many buttons are less than 30 px tall.
- **Forms that break.** A rule gave 100 % of the width to every `input` in the dialogs, checkboxes included. So, in the scan modal, each checkbox sat alone in the middle of the row and its text went to the right.
- **Floating elements that cover.** The director's face and the «Write to the director» button cover the content at the bottom right.
- **No place to grow.** A new section had nowhere to go without a third row of buttons.

## 3. The principles of the redesign

Each principle comes from a well-known user experience or accessibility guide:

1. **A single line: your mission.** The first glance answers «what do I do now?» with your mission, complete, and nothing else competes with it. What happened (what the director said, what was advanced, the results) is not fixed on the screen: it is read in «Where we left off», whose button says how many lines are left to read and pulses when the director left something new. What is expected of you goes only in your mission (and the floating director leads to it): neither the summary, nor the message, nor the answers list pending items. The steps you mark travel with the rest, so the director never again asks for something you already marked. Never two steps ahead: the mission queue is not shown, and the sidebar keeps in view only the everyday things (the project's settings go in the selector's gear, and the director's, at the bottom). The floating director talks about what comes next and responds to what you do (when you mark a step, it says which one is next). The rest opens when needed (progressive disclosure, [NN/g](https://www.nngroup.com/articles/progressive-disclosure/)).
2. **Grouped side navigation.** With more than seven sections, a sidebar is easier to scan and to extend than a row of tabs ([NN/g, vertical navigation](https://www.nngroup.com/articles/vertical-nav/)). The sections go in groups (the everyday things on top and, with its name, «The project»), because fewer options in view make the decision faster ([Hick's law](https://lawsofux.com/hicks-law/)).
3. **Reading lines of 60 to 75 characters.** Documents, the diagnosis and long texts carry a maximum width of about 72 characters ([Baymard Institute](https://baymard.com/blog/line-length-readability)). The cards that contain them, on the other hand, use all the width they have: a card with a cap leaves a gap on the right, and two cards that do not fit well side by side go one on top of the other (owner's voice note nmvow70jqtit, 26 October 2026).
4. **Legible type.** The base text goes up to 15 px, that of documents to 16 px and the smallest stays at 12 px, only for secondary data.
5. **Controls that are easy to touch.** Normal buttons are 36 px tall and the main ones, 40 px. They exceed the 24 px minimum of [WCAG 2.2 (2.5.8)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
6. **AA contrast.** All text against its background meets at least 4.5 : 1 ([WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)).
7. **Checkboxes as the standard demands.** The checkbox goes on the left, its text after it and the whole row can be pressed; when there is a choice with an explanation, cards that get checked are used ([NN/g, checkboxes](https://www.nngroup.com/articles/checkboxes-vs-radio-buttons/)).
8. **A single main button per screen or dialog.** It goes at the bottom right. Cancel and Back go to its left, with no color.
9. **Notices that do not get in the way.** Messages («Saved», an error) come out at the top right, in a narrow notification that goes away by itself, instead of moving the page: one per event, with few words, and if two coincide, stacked one under the other, never one on top of the other (owner's voice notes nmvvk7nw2tit and nmvvk9zwktit, 30 October 2026). No notice takes up the screen in a fixed way: what is new is signaled on the button that leads to reading it.
10. **A single path to each thing.** The same summary or the same link is not repeated in several places: each piece of information lives in one place, and the interface leads to that place when needed.
11. **Wide screens only.** The Studio is designed for screens at least 1350 pixels wide, from a laptop upward. With less width, a cover hides everything and asks for a wider screen or a bigger window: there is no version for phones or tablets, and no work is invested in one (owner's voice note nmvvkgk2qtit, 30 October 2026; note nmw1cmg9btit, of 3 November 2026, lowered the minimum from 1370 to 1350, so that it opens on a 1360 screen). What the code keeps of the earlier small sizes is no longer looked after.

## 4. The new structure

```
┌───────────────────┬──────────────────────────────────────────────┐
│ STL Studio        │ My project · Today         Where we left off │
│ [ My project ⚙▾ ] │ ███████░░░░ 2 of 4 criteria for the gate     │
│                   ├──────────────────────────────────────────────┤
│  ● Today        1 │                                              │
│    Inbox        2 │   Your mission of now, complete              │
│    Questions    1 │                                              │
│ THE PROJECT       │                                              │
│    Roadmap        │                                              │
│    Documents    1 │                                              │
│    Proposals    6 │                                              │
│ ───────────────── │                                              │
│ Model & usage     │                                              │
│ Ana · Owner       │                                              │
│ What is STL ↗     │                                              │
└───────────────────┴──────────────────────────────────────────────┘
```

- **The project selector** goes at the top of the sidebar. It shows each project with its stage, what it has to review and its alert, if there is one. On switching, the director tells you where they left off («Where we left off») and takes you to your mission.
- **Project, in the selector's gear** (in the bar only while the project is starting up): the goal on top, what the project is, **the director's diagnosis**, folded (its summary, the most ready and the weakest of the fronts in one paragraph, the strategy for that type of project and the document one click away), and where it is. The goals the director proposes are seen only while there is none; «Reset the goal» changes it and asks for the review.
- **«Model & usage», at the foot of the bar**, apart from the project's sections because it belongs to none: the director's model and effort (Claude Code's configuration on that computer, that of `/model` and `/effort`), the plan's limits and what each launch spent.
- **The figures move into the navigation.** Each section carries its number (your missions, unanswered notes, documents to read, proposals to decide). The phase's full board, with the roadmap line, stays in «Roadmap».
- **The project header** takes two lines: the name, the phase, the progress toward the gate, «Request review», «Where we left off» and, in an open document or in your mission of now, «Focus mode».
- **Focus mode** is a single one for a document and for the mission: a veil blurs the whole screen, the header too and without any strip, and leaves sharp what is to be read (the document or your mission's card) in a wide window in the center (up to 1200 px or 92 % of the width), with its own scrolling. It enters and leaves smoothly, and afterwards nothing moves. It is turned on and off with the same button, at the top right, whose exit floats above the veil in the same place (leaving is where you entered), or with its shortcut next to the director's face; Esc also leaves.
- **«Today» always opens with the director**: the last thing completed, what comes next in the roadmap and your mission of now, complete. While the project is starting up, the start-up is seen right there, in a four-step strip.
- **Two shortcuts float next to the director's face**, at the bottom right, on every screen: a **comment** (goes to the Inbox) and the **questions** (go apart, answered as a report). They are the most direct way of telling it something without leaving what you are doing. Where focus mode applies, its shortcut is added. «Request review» does not go here but at the top, in the header: it is delicate, and next to «Comment» one extra click launched the director. The content leaves room at the bottom so that they never cover the last of the page.
- **On narrow screens** (under 760 px), the sidebar hides behind the «Menu» button.
- **No list folds by itself** (owner's rule, 22 October 2026): opening an element of a list (a document, a proposal, a note) does not fold the list where it is. It stays as the person left it, with what is open marked, so that it is always visible what is being read: folding is decided by the reader, it is never an effect of opening.
- **No button leads to where you already are** (owner's rule, 22 October 2026): a button that returns to the same part, the same mission or the same view confuses, because it seems to lead elsewhere. If the destination is the place where the person already is, the Studio says it in text («It ended up here, in this same part») instead of drawing the button.

## 5. The visual system

- **Typography:** the system's own. Base of 15 px and a scale of 12 / 13 / 15 / 17 / 20 / 26 px.
- **Widths:**
  - reading of 72 characters;
  - content of up to 1180 px;
  - sidebar of 252 px;
  - dialogs of 560 to 760 px depending on what they ask for.
- **Spacing:** a scale of 4, 8, 12, 16, 24 and 32 px.
- **Color:** the Studio's warm paper and the action blue are kept. Gold stays only for what goes to the director's Inbox, and green, amber and red only for states.
- **Controls:** text fields, lists and checkboxes have their own style and none inherits another's.

## 6. «What is STL»

It is a separate page, at the foot of the sidebar and on the welcome screen, for whoever arrives new and to present the method. It has seven parts:

1. **The idea**: a single timeline for the project. Ideas and detours are not lost in loose chats: they are integrated, postponed or discarded with their reason.
2. **The problem** of directing a long project by chat.
3. **How it works**:
   - the start-up: hand over, diagnose, set the goal and draw the roadmap;
   - the cycle: mission, comment, inbox, the completed mission (its last step delivers it), «revisa» and the answer to each observation.
4. **The eight principles.**
5. **How it differs** from Spec Kit, BMad and the plan mode of Cursor, Claude Code and Codex. It is an honest comparison: it says what each does well and what STL adds.
6. **When not to use it.**
7. **How to use the Studio**: the guide that used to push the mission downward.

## 7. The questions to the director

Sometimes questions occur to you in the middle of work and asking them at that moment would break your flow. That is why they go apart from the comments:

- **They accumulate without leaving what you are doing.** The questions shortcut, next to the director's face, opens the list: you jot them down, written or recorded (recorded, it is heard and another fragment is added to it as everywhere in the Studio, or it is added at once with «Send now»), and each one is saved instantly. They are corrected or removed until the director reads them.
- A batch with approved sending was tried and removed by the owner's decision: questions accumulate just like comments and are answered in the next review.
- **They are answered as a report.** The director answers them all together in its next review: first the direct answer and then the why. They are read in **Questions**, apart from the comments and the Inbox requests, in one report per review that can be copied.

The **custom tabs** (a viewer of the project's result and tailor-made tabs that the director built) were built and removed afterwards, by your decision: the Studio stays focused on the director's functions, as simple as possible. The official sections will be evaluated during development.

**Decided (17 October 2026):** the public name is «Sacred Time Line», in three words: the literal expression of the metaphor, in an open, non-commercial project, with no trademark registration. The only caution: do not use logos or images from third parties' works.

## 8. What the Studio does on its own

The director's rules (`CLAUDE.md`) say only what the director decides or does; what the Studio does by itself, with its code, is told here, for people. It came out of the rules in the purge of the instructions (request pd_purga_reglas), and the history of each rule is in its inventory (`src/director/reglasDelTitular.ts`).

- **Requesting the review.** Only a person requests it, with a button that says so; the server accepts no other (`proyectos.ts` › `ORIGENES_REVISION`, guarded by `revision-solo-persona.test.ts`). On requesting it, a mark is left in `estudio.local.json` and the server calls the reviewer at that moment (`director.ts` › `pedirYLanzar`; `revisor.ts` › `mirar`), which launches the director without a screen (`claude -p`, with a clean context); every 15 seconds it looks at the mark again, which costs nothing. There is only one review, the complete one, with the notes, the deliveries and the queue: no button asks for less. The tray marks it in progress at the start and `--listo` leaves it done. While a director is alive, no other is launched and no other review can be requested. If this computer does not have Claude Code with its session started, the Studio says so and the review is taken by the director's session with `/loop 5m /vigila` (`bandeja.ts --pedida`).
- **The log.** Each request, cancellation and launch is recorded in `.estudio/bitacora.jsonl` (outside git; `src/director/bitacora.ts`): who, what, from which button and when.
- **Consecutive reviews.** With «Request consecutive reviews», on closing each one the Studio launches the next in the name of whoever requested them as long as the plan says the queue continues (`plan.tramo`), and they stop when the director says something needs the person, when one fails, when the five-hour or the weekly limit passes 80 % (or is unknown), or with «Stop» (`revisor.ts` › `seguirLaCadena`, the only place where they are chained).
- **While the director reviews.** You can navigate, read, comment, record, ask and advance in the missions and the decisions, but what arrives after the review was launched waits for the next one, and the Studio tells whoever does it (the tray cuts at that moment, `corteDeRevision`). Changing the roadmap, correcting what the director is reading and «I don't get it» wait until it finishes. What the director changes is held and arrives in a single reload at the end, with a three-second countdown, which waits until nobody is typing or recording (`estudio/servidor/recarga.ts`).
- **The urgent and the clarifications.** An urgent note does not request the review: the Studio launches the director only for it (`bandeja.ts --urgente`) before everything else; an «I don't get it», only for that step (`bandeja.ts --aclarar`). Both wait for a review in progress, and the 15-second clock launches them when it ends.
- **No failure in silence.** If a launched review does not close (it is cut at its limit, Claude Code dies or ends without `--listo`), the Studio says so at that moment and «Why?» opens «What happened with the review», with its report read from the log (`revisor.ts` › `diagnosticarFalla`) and its exits: request it again, without ultracode, with a note to the director or cancel it. If the log does not change in 10 minutes, it says «no activity for N min». A review that closed with `--listo` is never shown as failed: the closing is told by the plan, and `estudio.local.json` is always changed with its lock (`proyectos.ts` › `cambiarLocal`).
- **The closing.** If the director is still alive 3 minutes after its closing (`GRACIA_CIERRE_MIN`), the Studio stops it and leaves it written in its log (`revisor.ts` › `detenerTrasCierre`).
- **The launched director's permissions** (`revisor.ts` › `permitido` and `negado`): the commands that only read or check (git in another folder, with cd and then the command), a part of the tests, reading only the Studio, the project's repository and its previous sessions (never a `.env` nor Claude's settings, and without editing its own permissions, `estudio.local.json`, the logs or `.git`), `git mv` and local backup branches, `git rm` only for what git keeps and with the owner's two steps, and `npm install` without package names when an approved change changes `package.json`. What is denied to it goes only to the «Model & usage» › «Permissions» panel (`estudio/servidor/permisosNegados.ts`), with the general permission for that type of action, its checkbox, its scope («Only this project» or «All projects on this computer»), «Authorize the checked» and «Authorize and request the review»; what it never does goes in the same list, without a checkbox. «Ultracode», when turned on, asks in this way for the permission of the multi-agent flows.
- **A single server.** Opening the Studio again (the double click, `npm run encender`) does not start another: it reloads the open page (`estudio/servidor/unico.ts`: the lock `.estudio/servidor.json`, the strict port and a single server per process on restart).
