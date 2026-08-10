---
name: Agent secret boundary
description: Security boundary for agent-facing runtime capabilities that depend on Replit Secrets.
---

Agent capabilities must access secrets through a server-only, explicit allowlist. Public endpoints may report capability IDs and readiness, but must never return secret values or log them.

**Why:** Agent runtime configuration needs to be observable without turning the API into a secret exfiltration path.

**How to apply:** Add new secret-backed capabilities to the allowlist and expose only non-sensitive status metadata. Keep secret reads in backend-only modules. Treat persisted worker rows as historical state: public online/operational status must also require the current capability to be configured, not only a recent stored heartbeat.