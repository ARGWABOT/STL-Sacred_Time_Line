# The STL method

*How STL Studio, the interface between you and the model, turns an AI model into your project's assistant director. Its Spanish version, `metodologia.es.md`, has the same parts. The Studio's buttons and sections are named here as its interface shows them in English, between «».*

## 1. What it is and the problem it solves

**STL is a way of directing a project with an AI model through a single channel: the Studio.** You leave everything there (a comment, a voice note, a question, a decision); when you ask, the director reads it all at once, keeps the roadmap toward your goal and gives each person one mission at a time, with its why and a button to the exact place. You decide; the director proposes, orders the work and executes only what you approved.

Directing a long project by chat fails in predictable ways. What you send runs at once, and a correction is one more message, so the model mixes both versions. Every message costs the whole conversation. You cannot comment on a paragraph without explaining which one, and the model rewrites what you already reviewed. Nobody decides what comes next: the chat follows you into every topic instead of holding the line, and every new chat starts from zero.

The Studio separates thinking from sending. What you say waits in the «Inbox» until you request the review, so you can correct or delete it first, and what you delete never reaches the model. The director gets only what stayed firm, all together, and sees how the pieces relate. The state lives in files, not in a conversation: the model can forget, the project can't.

## 2. The cycle of a review

**Each turn of the method is a review, and only a person requests it.** It has five moments:

1. **You leave your notes,** written or recorded, on the exact paragraph, step or proposal you are on, without polishing. Voice is transcribed on your computer: the model receives text. Each note has its type («Comment», «Tweak», «Idea», «Bug» or question), and «Questions» are answered together, as a report.
2. **You request the review** with «Request review». Nothing else launches one: not delivering a mission, not the clock. The director can recommend one, with its reason; with «Request consecutive reviews», the Studio launches the next one as each closes, while the director says its queue goes on.
3. **The director answers everything:** it approves or returns each delivered mission, after checking the evidence of what happened outside the Studio, and answers each note with its treatment (done, declined, postponed, raised as a decision or informed) and the place where it went.
4. **It executes what you approved.** Its own work is a queue apart, in its own order, worked every review, each change with its tests and its local commit.
5. **It leaves you your mission:** one whole, with at least nine more behind it, so you request a review when you want, never because you ran out.

A mission is a concrete step of hours or a few days: what to do, why it matters and what to deliver. Each step is one action, with its button to the exact place and «← Back to your mission» to come back. A step that asks you to choose brings its options as buttons; one the director can do brings «Do it for me»; and «Explain it better» gets that step rewritten at once, without waiting for the review.

Documents are read one idea at a time: each idea is marked «Got it» or commented, and each decision at the end of a part is answered with «Approve recommendation» or «Decide otherwise» before moving on. A document someone already reviewed is sealed: what changes comes in a new, short document, so nobody rereads what they already decided.

## 3. The roadmap

**The roadmap goes from an honest diagnosis to a goal you set, in phases, one mission at a time.**

- **The diagnosis.** The director reads the repository (its history, structure, documentation, code and tests) and says frankly what is ready, what is missing and what risks there are, front by front: what does not exist, does not exist. A new project gets an approach instead.
- **The goal.** The director proposes two or three, each with its success criterion; you choose, mix or write your own, and set it.
- **The phases.** Each has its criteria, which must be at 100 % to cross its gate, and each front is in focus, in support or on hold. You cross the gate, never the calendar: progress comes from milestones, not dates.
- **The missions.** One at a time for each person, with ten within reach. Each goes after what it needs and never before its time; what closes a phase waits until the approved work of that phase is done.

The director orders with the owner's criterion first. The one STL Studio's owner set holds for any project until its owner says otherwise: what unblocks the rest; then what carries most risk if it goes wrong; then what puts something usable in someone's hands soonest; and what finishes quickly only breaks ties.

## 4. What the director can and cannot do

**The director proposes; you decide.** It diagnoses, recommends with its reasons, its risks and a real alternative, orders the work and executes what you approved. It never marks a criterion, crosses a gate, sets the goal or answers a proposal for you.

- **It works only on what was approved in the Studio:** an accepted proposal, an answered decision that asks for it, a delivered mission or a «Do it for me». Inside your repository, its rules govern: branches, style, tests.
- **It pushes, pulls or publishes only with your permission,** in «Model & usage» › «Permissions», never forced and never rewriting history.
- **What costs money or deletes data needs two steps:** the accepted proposal and an answered «Confirmo», with the cost or the list of what is deleted in view. Except what git keeps: a file of your repository that git keeps and that became unused through an approved change is deleted without asking, because its history keeps it, each deletion in its own commit and told in the answer. Whatever git does not keep (an untracked or ignored file, data outside the repository, a branch, a release) still needs the two steps.
- **If a permission is missing,** it does the rest and says what it could not do; the denied permission appears in «Permissions», with its checkbox. Installing what is needed is asked with «Authorize», saying what it is, what it weighs and what it is for.
- **It says «not yet»** to what does not serve the goal and the phase, with its reasons, and never asks you again for what is already done or what it can check itself.

## 5. The memory in your repository

**Each project's memory lives in its own repository, on a separate branch, `stl`, which the Studio opens in the project's `.stl/` folder.** It holds the plan (the roadmap and everything the director says, which only the director writes), what each person does (which only the Studio writes), the context with the goal and the team, the transcriptions of the voice notes (the audio never enters git), the map of the project and the director's documents. What closes leaves the plan for a monthly archive.

- **Nothing depends on a chat:** a session can be summarized or restarted without losing anything, because the state is in those files.
- **One Studio directs several projects, never mixed:** the active project is the only one the director directs; the others keep their inbox until you activate them.
- **Every decision is a commit:** the team's, «Estudio: …»; the director's, «Director (<id>): …». They go up only if you ask.
- **Nothing goes to Claude's web by default:** every report, plan or image is a local file in the project's memory.

## 6. When not to use it

**STL applies when there is a project, someone who decides and a repository.** It does not apply to a one-off task, to a flow without a person (an agent or an automation that runs alone), or to a project that cannot be in git or whose rules do not allow its content to reach an AI model. It serves any kind of project: software, a thesis, a website, a product.

What it costs, honestly:

- A review takes minutes, not seconds, and reads the project's context each time.
- A misunderstanding shows late; «What I understood», at the start of each document, catches it early.
- Much depends on how the director splits documents and missions.
- It asks for discipline: a single channel, or it turns into a messy chat again.
- The pace is yours: if nobody requests the review, nothing moves.
- It saves less than the simple count suggests, because chats reuse their context in cache: the real saving is what is never processed and the round trips not taken.

## Glossary

- **Assistant director:** the AI model working through the Studio. It proposes and orders.
- **Owner:** the person who directs the project. They decide.
- **Goal:** where you want to arrive and how you know you arrived; the owner sets it after the diagnosis.
- **Roadmap:** the path of the project to its goal, split into phases.
- **Mission:** a concrete step with its why and its delivery, one at a time.
- **Inbox:** where what you say waits until the review.
- **Review:** the moment the director receives what stayed firm and answers it all together.
- **Gate:** the step from one phase to the next, with its criteria at 100 %.
- **Front:** an area of the project's work, in focus, in support or on hold in each phase.
- **Seal:** the mark of what was already reviewed, which does not come back.
- **Memory:** the project's `stl` branch, where the plan and the documents live.
