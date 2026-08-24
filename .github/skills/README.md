# Local Skills for This Repository

These lightweight skills are inspired by Matt Pocock's approach. They are intentionally small, easy to adapt, and focused on making AI coding more reliable in this project.

## Skills

### `grill-with-docs`
Use this when a request is ambiguous or likely to be implemented in the wrong direction.

Trigger:
- unclear requirement
- feature request without acceptance criteria
- broad change that needs alignment first

Use the project context in `CONTEXT.md` and ask targeted questions before writing code.

### `tdd`
Use this for changes that affect behavior, not just copy or styling.

Flow:
1. Define the failing condition or expected behavior
2. Add the smallest regression check or repro
3. Implement the minimal fix
4. Verify and refactor if needed

### `deep-modules`
Use this when a feature is growing into a loose collection of helpers.

Preference:
- keep modules focused on one meaningful responsibility
- expose a small interface
- move complexity behind the module boundary

## Default workflow
1. Read `CONTEXT.md`
2. Use `grill-with-docs` if the task is not fully clear
3. Break the task into a vertical slice
4. Apply `tdd` when behavior matters
5. Verify with TypeScript/build checks before finishing
