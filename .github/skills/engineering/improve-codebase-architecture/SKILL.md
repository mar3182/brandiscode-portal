# Skill: improve-codebase-architecture

Use this skill when a feature or page has become harder to reason about than it should be.

## Goal
Improve the structure of the codebase without changing the user behavior.

## Approach
1. Identify a module that is doing too much work.
2. Separate responsibilities into smaller, focused modules.
3. Preserve a simple interface for the caller.
4. Keep the behavior the same while making the code easier to read and maintain.

## Good targets in this repo
- large page components with mixed UI, state, and API logic
- helper code that is doing both formatting and domain behavior
- repeated request or notice handling spread across multiple pages

## Rules
- Prefer a deep module over a shallow utility layer.
- Keep the public interface small and explicit.
- Move behavior into the module that owns it.
- Verify the change with the normal project checks after refactoring.
