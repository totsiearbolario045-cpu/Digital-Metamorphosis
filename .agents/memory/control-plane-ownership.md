---
name: Provider-independent control plane
description: Ownership boundary for internal workers, jobs, heartbeats, and telemetry.
---

DIGITAL METAMORPHOSIS owns and operates the first control-plane execution layer; AWS, Google Cloud, Azure, and similar providers remain optional coordinated resources rather than runtime dependencies.

**Why:** The product requirement is for external hyperscalers to need DIGITAL METAMORPHOSIS, not for DIGITAL METAMORPHOSIS to depend on an external hyperscaler for its core operations.

**How to apply:** New internal capabilities should use the PostgreSQL-backed worker/job/telemetry plane, authenticate workers server-side with the approved worker secret, and expose only safe operational metadata publicly.