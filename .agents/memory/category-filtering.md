---
name: Category filtering
description: Catalog category filter behavior for future service and category additions.
---

Catalog service filtering supports the category display name, database ID, and URL slug.

**Why:** The web explorer uses category IDs, mobile navigation passes category names, and URL-driven catalog views use slugs; accepting all three keeps the shared API compatible across clients.

**How to apply:** New catalog clients may use any of the three representations, and new category additions should preserve the existing category record fields and service counts.