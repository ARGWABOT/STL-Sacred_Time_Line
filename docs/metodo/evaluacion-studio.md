# STL Studio against the STL Methodology: evaluation and improvements

*The assistant director's evaluation of the document «STL Studio Methodology» (versions 1, 2 and 3), 16 October 2026. Its Spanish version is `evaluacion-studio.es.md`.*

## 1. What I understood

STL is the methodology and STL Studio is the environment that makes it applicable. The goal is not only to manage your local projects, but to **demonstrate the efficiency the research promises** and reach something **replicable**: clone the repository on another computer, hand projects to the director and work with the method, as you do.

You also asked me to distinguish from the start between a **new project** (the director asks for the explanation, the goal and when it is considered complete) and an **existing project** (the director diagnoses it first, detects what is in progress and the goals in its own documentation, and proposes the goals itself).

## 2. What the Studio already meets of the methodology

| STL piece (version 2) | In the Studio today |
| --- | --- |
| One director, one memory in files | Yes: `plan.json`, state per person and documents, per project |
| Think before sending (editable inbox) | Yes: notes can be corrected or deleted until the review |
| Comments anchored to the fragment | Yes: by document part, by mission step, by diagnosis front and by decision |
| Grouped review | Yes: «revisa estudio» with the tray |
| Roadmap by phases and gates, fronts and exceptions | Yes |
| Explicit next step | Yes: one mission at a time, with the floating director |
| Progress with traceability (seals) | Partial: the seal exists and the tray detects changes, but there is no mechanism to correct a real error explicitly |
| Human authority | Yes: the owner signs, crosses gates and decides proposals |
| Voice with local transcription | Yes |
| Team and synchronization | Yes |

## 3. What is missing, by priority

**Priority 1: what you asked for and what defines the cycle.** I am implementing it now:

1. **New or existing project.** Two different starts:
   - **existing**: connect the repository → diagnosis → goals proposed by the director → roadmap;
   - **new**: tell the project (explanation, goal and when it is complete) → the director's approach → goal → roadmap.
2. **The treatment of each observation** (step 7 of version 2): integrated, rejected, postponed or requires your decision. Today the answers are free text; with this, each note shows its treatment, and the director is obliged to give it.
3. **Basic replicability**:
   - an `npm run iniciar` that checks the computer and says what is missing;
   - a visible check on the welcome screen;
   - the `/revisa` command in Claude Code;
   - an `AGENTS.md` so that other agents (Codex, Cursor) follow the same rules.

**Priority 2: the three-layer memory** (section 5 of version 2). Today the decisions are scattered: the goal in the project, the answers to proposals in the state, the decisions of the documents in the notes. I propose:

- **a decision log** with what is in force, the reason, the alternatives, the origin (which note or which document) and the condition to reconsider it, with its own tab in the Studio;
- **an operational state** generated at each review (`ESTADO.md` per project), to resume the project after restarting the session or changing model.

**Priority 3: the validation metrics** (section 10 of version 2 and section 7 of version 3). The research says a saving must not be claimed without measuring it. The Studio can measure only what it already records:

- observations per review;
- turns that were avoided;
- time of each mission until its approval;
- percentage of observations by treatment;
- regressions detected by the seals;
- consumption per review, in tokens and as a percentage of the plan.

With that, the A/B experiment with developers would have data from day one.

**Priority 4: the fine discipline.**

- **The explicit correction of a sealed document**: a traceable erratum, instead of forbidding it.
- **A quick-consultation path** that does not break the discipline, for the doubts that hold you back.
- **Forks** with their resolution: integrate, experiment in a bounded way, postpone or discard.
- **Separating what the director can adjust alone** from what needs your approval in the roadmap.

**Priority 5: the publishable product.**

- **Separate the code from the data**: today `proyectos/` lives in the same repository as the Studio. A clone for another developer would bring your projects.
- An installer with no technical requirements.
- The interface also in English.
- The license.
- The brand (section 11 of version 2).

## 4. What was decided in this review

- **A single channel**: every project that enters the Studio is directed only from here; what the director needs from the owner is asked for as a mission or a decision, and the technical work is executed with approval in the Studio.
- **One project at a time**: an agenda that took the owner between missions of several projects was tried and discarded, because it breaks «one mission at a time» and multiplies the cost of switching context. Instead, when switching project the director gives the **«Where we left off»** summary and leads to the mission of now. Between projects only a one-line alert crosses (a deadline or an active risk).

## 5. The risk your own research points out

Version 3 warns that the Studio may become at once a document manager, a project manager, an agent orchestrator and a memory system. My recommendation is to **protect the differentiating core**, which is precisely what nobody else brings together:

1. anchored comment;
2. editable inbox;
3. grouped review;
4. treatment per observation;
5. recorded decisions;
6. a single next mission.

Everything else should serve that cycle or wait.

**To decide:**

1. **The order of the priorities.** I recommend 1 → 2 → 3: first make the cycle complete (treatment, memory), and then measure it.
2. **Separating code and data.** I recommend deciding it before publishing: either `proyectos/` in a separate repository per user, or ignored in the product's repository. It changes how teams synchronize.
3. **The first validation.** I recommend starting the version 3 experiment with 3 to 5 developers and a single cycle (document → comments → grouped review), as soon as the metrics are in place.
