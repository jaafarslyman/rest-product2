---
name: Large patch staging
description: Behavior of large existing-file edits made with the patch tool in this workspace.
---

For large replacements of existing TSX files, the patch tool may leave the intended content in a hidden sibling temporary file while the tracked source remains unchanged, even when it reports success.

**Why:** the tracked source can remain stale while adjacent types or helpers have already changed, causing build failures.

**How to apply:** reopen the target or check `git diff` after a large edit. Prefer smaller targeted hunks, and remove only temporary files created by the agent.