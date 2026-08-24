# Skill: deep-modules

Use this skill when a feature is starting to turn into a bag of loosely related helpers.

## Goal
Keep the codebase structured around a few high-value modules with a small, stable interface.

## Principles
- Prefer one module with a clear responsibility over many shallow utilities
- Hide implementation detail behind a simple public API
- Make modules testable and composable
- Keep each module focused on one domain concept

## Good fit here
- admin flows
- invoice logic
- onboarding and intake helpers
- shared validation or formatting utilities

## Red flag
If a helper is only a pass-through around a few lines of code, it is probably too shallow and should be folded into the owning module.
