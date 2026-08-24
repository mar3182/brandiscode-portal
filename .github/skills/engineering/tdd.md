# Skill: tdd

Use this skill when the change affects behavior, validation, or user flows.

## Goal
Give the agent a reliable feedback loop before implementation.

## Flow
1. Reproduce the issue or describe the expected behavior
2. Add the smallest failing check or reproduction path
3. Implement the minimal fix
4. Verify the behavior
5. Refactor only after the behavior is correct

## Good fit here
- admin flows
- onboarding or intake behavior
- invoice logic
- API validation and error states
- any change that impacts users directly

## Verification in this repo
Use the project checks that are already meaningful:
- `npx tsc --noEmit`
- `npm run build` in `client-portal/`
