# RFC Governance Policy

Status: Active
Owner: PM + ARCH
Scope: Entire repository

## Purpose

This policy defines how RFCs are created, reviewed, accepted, and enforced.

## Foundational RFC

The foundational RFC is:

- RFC-0001: Data-First AI Platform Strategy

All changes must comply with RFC-0001.

## Mandatory Rules

1. No implementation may conflict with RFC-0001.
2. Architecture decisions must include an RFC-0001 alignment check.
3. Every new RFC must include a References section with RFC-0001.
4. Every new RFC must include a Compatibility section describing impact on RFC-0001.
5. If a proposal conflicts with RFC-0001, it must be rejected or explicitly positioned as a superseding foundational RFC.

## Required RFC Sections

Every RFC must include at minimum:

- RFC ID
- Status
- Context
- Decision
- Alternatives
- Consequences
- Compatibility with RFC-0001
- References

## Status Model

Use one of:

- Draft
- Proposed
- Accepted
- Superseded
- Rejected

## Acceptance Criteria

An RFC can only move to Accepted when:

1. PM confirms business alignment.
2. ARCH confirms technical feasibility.
3. SEC confirms privacy and security implications.
4. Compatibility with RFC-0001 is explicit and non-conflicting.

## Change Control

- Minor editorial updates are allowed without changing RFC ID.
- Normative decision changes require version bump and a change log entry.
- Superseding RFCs must explicitly state which RFC they supersede.

## Enforcement in Practice

Before implementation starts, PR description or issue must include:

- RFC reference(s)
- RFC-0001 alignment statement
- Risk notes if architectural scope is affected
