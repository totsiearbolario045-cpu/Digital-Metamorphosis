---
name: Category filtering
description: Catalog category filter behavior for future service and category additions.
---

Catalog service filtering supports both the category display name and the category ID.

**Why:** The web explorer uses category IDs while mobile navigation passes category names; accepting both keeps the shared API compatible across clients.

**How to apply:** New catalog clients may use either representation, and new category additions should preserve the existing category record fields and service counts.