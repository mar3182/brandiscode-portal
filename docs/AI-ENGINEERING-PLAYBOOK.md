# AI Engineering Playbook

This playbook translates Matt Pocock's working style into this repository so that coding agents stay aligned, stay small, and produce higher-quality changes.

## 1. Work inside the smart zone
Large prompts and broad tasks make agents less reliable. Keep each task focused enough that the model can reason about it clearly.

Use this rule of thumb:
- If the task is ambiguous, clarify it first
- If the change touches many unrelated areas, split it into smaller slices
- If the context is already large, stop and summarize before continuing

## 2. Start with a short grilling session
Before implementation, ask the agent to clarify the requirement.

Use this when:
- The request is vague or open-ended
- Multiple implementation paths are possible
- The expected behavior is not obvious from the code

The goal is shared understanding, not a massive plan.

## 3. Prefer vertical slices over horizontal layers
Do not build the database layer, API layer, and UI layer as three separate disconnected steps if a user-visible feature is the goal.

Prefer a thin end-to-end slice that proves the whole flow works, for example:
- UI entry point
- validation or API call
- visible result or error state

This gives faster feedback and makes the change easier to verify.

## 4. Design for deep modules
Good code for AI agents is not just "more code"; it is code with a clear purpose and a small, stable interface.

Prefer:
- one module with meaningful behavior
- a small public surface
- internal complexity hidden behind the interface

Avoid:
- a single file that collects unrelated helpers
- shallow utilities with no real responsibility
- large functions that mix UI, persistence, and formatting

## 5. Use a red-green-refactor loop
For non-trivial changes, the agent should:
1. reproduce the issue or define the failing condition
2. add or update a test or a minimal verification path
3. implement the smallest fix
4. refactor only if the shape is now clear

For this repo, the fastest verification path is usually:
- `npx tsc --noEmit`
- `npm run build` in `client-portal/`

## 6. Keep the context small
The biggest failure mode with AI coding is not lack of capability; it is overload.

Good habits:
- read the most relevant files first
- reuse `CONTEXT.md` instead of restating the whole project
- avoid long multi-topic requests in one prompt
- summarize the previous result before asking for the next step

## 7. Quality bar for this project
Every change should be judged against:
- correctness for the user-facing flow
- TypeScript safety
- responsive UI behavior
- Dutch user-facing copy
- data safety requirements
- clear, testable behavior
