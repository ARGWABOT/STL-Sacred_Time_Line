# Initialize STL Studio: instructions for your agent

*The agent reads this English version; its Spanish version, [INSTALAR.md](INSTALAR.md), has the same parts and is
the one people read and approve. A change is written in both.*

These instructions are for the AI agent of whoever installs STL Studio. Only Claude Code is promised; Codex and Cursor
are still to be tested. If you are asked «initialize STL Studio» (in Spanish,
«inicializa STL Studio»), or `node_modules` is missing
in this folder (the package comes without its dependencies), follow these steps in order.

**You run the installation from start to finish.** The user does not have to read this file or copy commands: you run
each check and each installation, tell them in one or two sentences what you did and what comes next, and guide them
until the Studio is on and open in their browser. The only things you ask of them are what only they can give: their
«yes» before installing each thing, their git identity and what their system asks for (the administrator password,
signing in to their account). **Ask for permission before installing each thing**, even if your working mode does not
require it: the confirmation goes in the chat, with a clear «yes» from the user. Talk to them in their language.

## 1. The diagnosis, without installing anything

1. Check whether Node.js is there: `node --version`.
2. If there is Node 24 or newer, run `node tools/iniciar.ts --diagnostico`. It only looks: it installs or changes
   nothing.
3. Without Node, check the rest by hand: `git --version`, `git config user.name`, `git config user.email`, the
   operating system and the architecture.
4. Check the free disk space where the user's home folder and this folder are: the installation takes about 2.4 GB, and
   almost all of it goes in the home folder. On Windows, `Get-PSDrive` in PowerShell; on macOS and Linux, `df -h`.

## 2. What is missing, in a table

Show the user what is fine, what is missing and what is optional. For each missing thing say:
- what it is for in STL Studio;
- the exact command, from the official source;
- roughly how much it weighs, and whether it needs administrator permissions.

| What | What for | Windows | macOS | Linux |
| --- | --- | --- | --- | --- |
| Node.js 24 or newer | Runs the Studio | `winget install OpenJS.NodeJS.LTS` | `brew install node` | the distribution's package manager, or https://nodejs.org |
| git | Each decision is a commit; each project's memory lives in its repository | `winget install Git.Git` | `brew install git` (or the Xcode tools) | `sudo apt install git` (or the distribution's package manager) |
| The git identity | The Studio signs each decision with it | `git config --global user.name "…"` and `git config --global user.email "…"` | same | same |
| The dependencies | What the Studio uses | `npm install`, in this folder | same | same |
| Claude Code (optional, recommended) | The director's session | https://claude.com/claude-code | same | same |
| Voice notes (required: they are part of the method) | Transcribing locally what is recorded | see «Voice notes» in README.md | see README.md | see README.md |

**Ask the user** for the git identity: never make it up or use someone else's.

## 3. Install, one thing at a time

- **Before downloading anything**, tell the user how much it will take (about 2.4 GB) and how much is free, and continue
  only if it fits. If it does not fit, tell them how much is missing and stop: do not start an installation that would
  be left halfway.
- Only with a «yes» from the user for each thing. What is optional can be skipped. The voices that read aloud are not your call here: the Studio's assistant installs them, with the transcription, because they are part of the Studio.
- Use the official package managers (winget, Homebrew, the distribution's) or the official page. Never run `sudo` or
  `curl … | sh` without first showing the whole command.
- After each step, check the version. On Windows, if the PATH changed, say that the terminal (or the agent) has to be
  reopened.
- If something fails, give the error as it is and propose the next attempt. Do not go on as if it had worked.

## 4. The instant review (with Claude Code)

Check whether the Claude Code CLI is there and signed in (if `claude` is not in the console, look for the one the
desktop app brings: on Windows, `%APPDATA%\Claude\claude-code\<version>\…\claude.exe`). If it is not signed in, ask
the user to sign in **once** (`claude auth login`, with the account they want the reviews to use): then «Pedir
revisión» (request a review) calls the director at once, without a screen, and nothing is spent while no review is
requested. It is optional: without it, the Studio works and the review is requested in the director's session. The
Studio launches the Claude Code each person installs with their own account: it does not offer the claude.ai sign-in
itself, because Anthropic's documentation for its agent SDK does not let a third-party product offer it without their
approval.

## 5. Turn the Studio on and take the user to it

1. Run `node tools/iniciar.ts --diagnostico` again and show that everything is fine.
2. **Turn the Studio on yourself**: `npm run encender`. It keeps running apart, so it stays on even if your session or
   the terminal closes, and if its server falls it comes back up by itself. Open the browser at http://localhost:5180/.
   Do not use `npm run estudio` in your terminal: it dies with it.
3. Tell the user, briefly, what comes next:
   - the Studio is at **http://localhost:5180/** (bookmark it): from here on everything happens there;
   - first, **«Entregar proyectos»** (hand over projects): choose a project's folder and that is it;
   - if some day the Studio does not open (for example, after restarting the computer), `npm run encender` in this
     folder is enough, or asking their agent; on Windows, without a terminal, double-click `Abrir STL Studio.cmd` (it
     can be sent to the desktop: right click › Send to › Desktop);
   - the director's session is Claude Code open **in this folder**: there one writes «revisa estudio» whenever one
     wants. Without the signed-in CLI, leave `/loop 5m /vigila` running in that session so it takes the requested reviews
     by itself.

## What is never done when initializing

- **STL Studio is a separate project.** It keeps only its code and `estudio.local.json` (what belongs to this
  computer). Do not touch other projects when initializing.
- Each project's memory lives in **its own repository** (the `stl` branch, opened in its `.stl/` folder), and only when
  the user hands it over in the Studio.
- From the Studio, the user can also ask for work that changes a project's repository: the director executes it only
  with their approval in the Studio and with that project's rules (see CLAUDE.md).
