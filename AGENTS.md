# One Holy Bible Project Instructions

These instructions apply to the `one-holy-bible` project in this workspace.

## Coordination Mode

- For One Holy Bible work, Codex should act as the coordinator.
- Before every substantive task, use the relevant Superpower workflow to plan the task.
- When research, implementation, verification, or review can be split into independent work, use parallel agents.
- Give each agent a detailed, action-oriented assignment with clear scope, expected artifacts, iteration expectations, and a requirement to return a deep report.
- Drive agents to act, iterate, and finish their assigned work rather than stopping at shallow analysis.
- After agents report back, Codex should analyze their findings, give feedback, reconcile disagreements, and assign follow-up tasks until the project goal is genuinely handled.

## Repository Hygiene

- Keep the codebase clean and organized at all times.
- Do not leave temporary files, dead code, dead files, unused folders, or unnecessary nested directories in the repository.
- Prefer small, purposeful files and folders that match the existing project structure.
- Remove or avoid any throwaway artifacts created during research, testing, builds, or experiments unless they are intentionally tracked project assets.

## Browser Verification

- These browser rules apply only inside this Codex workspace and this `one-holy-bible` project.
- Whenever Codex needs to open a browser for this project, use the browser inside Codex rather than the Mac's system browser.
- This especially applies after project changes, when Codex performs manual review, smoke testing, or visual verification.
- Do not launch or control the user's installed Chrome, Safari, or other system browsers for this project unless the user explicitly asks for that in the current task.
