# Skill: grill-with-docs

Use this skill when the agent needs to understand a product request before making changes.

## Goal
Create shared understanding with the user or domain expert before implementation.

## Prompt pattern
Ask a short sequence of focused questions, one at a time.

Examples:
- What is the user-visible outcome?
- Which part of the portal does this affect?
- What should happen on success and on failure?
- What is out of scope for this task?

## Rules
- Keep the questions targeted and concrete
- Prefer one question at a time
- Use the project glossary in `CONTEXT.md`
- Stop once the task is clear enough to implement safely

## Output
The result should be a concise understanding of:
- the goal
- the scope
- the success criteria
- the risk or unknowns
