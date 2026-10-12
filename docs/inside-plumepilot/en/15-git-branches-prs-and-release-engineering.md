# 15 — Git, branches, PRs, builds, and release engineering

## Software beyond the code

> **Reference snapshot for this chapter**  
> PlumePilot **2.35.2 release candidate**, branch `feat/ui-ux-2.35.2`, commit `f6fcb4c29c83ba9150df0be31da04fc91dffb634`. The historical narrative also covers v2.35.1 and PRs #26, #31, #34, #39, #40, #41, and #42.

A software project exists as a working tree, commit graph, branch, PR, tag, release, browser archive, store submission, and installed user version. These are related but not identical.

The old candidate `170b21ec` and realigned candidate `4d32a8c2` share tree `992149b6`: **the files were identical, but the histories and parent commits differed**. This is our starting point for understanding Git as a data model and release engineering as a separate discipline.

---

# Part I — Git objects rather than version folders

## 1. The wrong mental model

Git is not a folder full of saved version copies. Branching, merging, rebasing, squashing, and reverting become understandable through Git objects and references.

**Historical example:**

```bash
git add
git commit
git push
```

---

## 2. Git's essential objects

A blob contains file bytes, a tree records directory entries, a commit identifies a tree and its parent history, and a tag points to a chosen object. The graph, not file copying, is the fundamental model.

---

# Part II — Trees and commit identity

## 3. Tree SHA

The original 2.35.2 candidate 170b21ec and rebuilt candidate 4d32a8c2 both point at tree 992149b6. They therefore contain the same project files.

---

## 4. Different commits, same tree

The old candidate had merge ancestry; the new candidate was attached to the actual 2.35.1 release parent. Identical tree bytes do not imply identical commits.

---

## 5. Why does the commit SHA change?

A commit's hash covers parent links, tree reference, message, and author/committer metadata. Changing ancestry creates a new commit identity even with unchanged files.

---

## 6. Practical consequence

Two branches may check out the same filesystem state yet appear divergent in Git comparisons because their history differs. This happened during PlumePilot 2.35.2 preparation.

---

# Part III — Branches and HEAD

## 7. A branch is a moving reference

A branch name is essentially a ref such as refs/heads/main pointing at one commit. Commits are reachable through refs; they do not belong exclusively to a branch.

---

## 8. Visualizing the graph

Main can point to C while a feature points to E after diverging at B. A, B, C, D, and E are commit objects; main and feature are movable labels at their tips.

```text
A──B──C  ← main
    └──D──E  ← feature
```

---

## 9. HEAD

HEAD normally refers to the checked-out branch. In detached HEAD mode it points at a commit directly without an intermediary branch ref.

---

# Part IV — Working tree, index, and commits

## 10. Three states

The working tree holds your edits, the index holds the staged snapshot, and the commit holds the repository snapshot. They need not contain the same file state.

**Historical example:**

```bash
git add
```

```bash
git commit
```

---

## 11. Working tree to commit

git add moves selected changes into the index; git commit records those staged changes in a new commit. This allows coherent commits even if the working directory contains unrelated edits.

---

# Part V — Feature branches and pull requests

## 12. Why not always work on main?

Feature branches isolate work that is not yet validated. PlumePilot used dedicated branches for autoplay, notes, cross-platform changes, and UI redesign.

---

## 13. The branch as a hypothesis container

A branch expresses a proposed implementation that may evolve or be discarded. It does not itself state that the feature is production-ready.

---

## 14. A pull request is not a Git primitive

GitHub adds a collaboration object around Git: base, head, review, discussion, status checks, and a decision to merge.

---

## 15. A PR proposes a transition

A pull request asks whether the proposed changes should enter its target base. PR #41 represented the 2.35.2 UI candidate under review rather than an already published release.

---

# Part VI — Stacked PRs

## 16. Base and head

The base is the target branch; the head carries the proposed commits. Selecting the right comparison base determines the actual review scope.

---

## 17. Changing base changes the diff

Comparing the same head to main versus a prerequisite feature branch can produce dramatically different diffs. This is crucial for stacked PRs.

---

## 18. PR #40 as a case study

PR #40 was stacked on earlier autoplay work rather than being compared directly with main. Its incremental change depended on that earlier branch.

---

## 19. The stacked graph

PR #39 represents the upstream work and PR #40 is reviewed against its tip. Otherwise a direct comparison to main may include the upstream work twice conceptually.

---

## 20. Why stack pull requests?

Stacking permits dependent work before its prerequisite has been merged and keeps the incremental review smaller.

---

## 21. The downside

Squashing, rebasing, or rewriting a stacked PR's base can leave downstream branches with history that no longer matches main.

---

# Part VII — Merge, squash, and ancestry

## 22. Traditional merge commits

A merge may create commit M with two parents. This records the point at which two lines of development were integrated.

---

## 23. What merging preserves

The original commits remain ancestors of the merge. This retains detailed historical provenance and is useful for audits.

---

## 24. What a squash merge does

Squash turns the net effect of several commits into one new commit on the target. The original commits stay on their feature branch, but are not ancestors of the squash on main.

---

## 25. The real 2.35.1 release

The work in PR #39 was squashed onto main as a8007425f81792e7570516dbdf1e7fb2cbda4d53, the 2.35.1 release commit.

---

## 26. A readable mainline

Squash can preserve one logical unit per PR instead of every intermediate experiment, cleanup, or review fix in main's history.

---

## 27. Atomic PR units

Squashing represents the complete reviewed pull request as one change. That simplifies main at the cost of some history detail.

---

# Part VIII — The 2.35.2 case study

## 28. A downstream branch after squash

A 2.35.2 branch based on original 2.35.1 commits cannot recognize the squashed commit as the same ancestry even when it contains equivalent changes.

---

## 29. Why comparisons become confusing

Ahead/behind counts and merge conflicts may be dominated by ancestry mismatch, not genuine file differences. Inspect the intended tree rather than assuming each reported commit matters.

---

## 30. Before candidate realignment

Commit 170b21ec retained merge-oriented ancestry while its tree 992149b6 represented the intended 2.35.2 UI content.

---

## 31. What main contained

Main already contained the actual 2.35.1 squash release commit a8007425, with different parentage from the feature's original chain.

---

## 32. Apparent divergence

The branch looked unexpectedly far ahead and behind even though much of that distance came from history noise.

---

# Part IX — Understanding conflicts

## 33. The standard strategy

git merge main or git rebase main is usually the right way to update a feature branch. Try ordinary approaches before exceptional reconstruction.

**Historical example:**

```bash
git checkout feature
git merge main
```

---

## 34. Why it was problematic here

Git attempted to merge two representations of the same 2.35.1 work, generating confusing and noisy conflicts instead of a clear 2.35.2 delta.

---

## 35. The principle behind conflict resolution

A conflict does not mean choosing ours or theirs indiscriminately. Identify each historical contribution and the exact desired resulting tree.

---

## 36. Ask the correct question

What exact files should this release candidate contain, and which published commit should be its parent? The target tree is more important than silencing Git warnings.

---

# Part X — Content-first reconciliation

## 37. Reconstructing the intended tree

The team rebuilt the 2.35.2 file snapshot above the actual v2.35.1 release, changing only files belonging to the UI/UX candidate.

---

## 38. The decisive equality check

The rebuilt snapshot produced the same tree SHA, 992149b6, as the old candidate. That strongly verified no intended file content changed.

---

## 39. Creating the new commit

Commit 4d32a8c2 was created with the candidate tree and correct release parent, yielding a new commit hash but unchanged release candidate content.

---

## 40. The result

2.35.2 became a clean descendant of the actual 2.35.1 release while preserving the old candidate's tree.

---

# Part XI — Reparenting and rewriting

## 41. Conceptually like a rebase

The objective resembled rebasing: take the desired change and place it after the current release. The method used was more direct.

---

## 42. Technically a reconstruction

Rather than replaying every old commit, the team constructed the desired commit object from an explicitly verified tree and parent. This is advanced maintenance, not a routine workflow.

---

## 43. When is reconstruction appropriate?

Only when the desired snapshot is unambiguous and verifiable. Here equal tree SHAs supplied the safety evidence.

---

## 44. Moving the ref

The release-candidate branch pointer was moved from the old commit to the reconstructed one, rewriting the branch's visible history.

---

## 45. The risk of rewriting shared history

Collaborators using old hashes may be disrupted by a forced update. Prefer avoiding rewrites on shared protected branches.

---

## 46. Expected SHA and optimistic concurrency

A compare-and-swap or force-with-lease-style check prevents overwriting another person's new push while updating a branch ref.

---

# Part XII — Rebase and merging

## 47. Rebase graph

If main moves to F while a feature contains D and E based on C, rebase produces new D′ and E′ commits after F.

**Historical example:**

```bash
git rebase main
```

```text
main:    A──B──C──F
feature:       └──D──E
after rebase: A──B──C──F──D′──E′
```

---

## 48. Why D′ and E′ are new objects

Their parent relationships have changed, so their SHAs change even when their logical patches remain similar.

---

## 49. When to use rebase

Useful for private feature history, keeping a PR comparison focused, and moving commits onto the current mainline.

---

## 50. When to be cautious with rebase

Changing already-shared commit IDs requires coordination with collaborators and dependent branches.

---

## 51. Merge and rebase are different models

Merge preserves divergence and records integration. Rebase creates a new linear ancestry. Neither is universally right.

---

# Part XIII — Cherry-pick and revert

## 52. What squash changes

Squash changes the granularity of history from many development commits to one logical commit.

---

## 53. What rebase changes

Rebase changes ancestry while normally recreating multiple commits in sequence.

---

## 54. Squash plus downstream branches

This combination leaves downstream work referring to original commits while main contains their squashed equivalent.

---

## 55. Cherry-pick model

git cherry-pick copies the change introduced by one commit onto the current branch as a new commit.

---

## 56. A logical copy, not the same commit

Two equivalent patches can yield different commit SHAs because their parent histories differ.

---

## 57. When cherry-pick helps

Bring a specific fix to a release branch, backport a patch, or select one verified change without merging the rest.

---

## 58. Revert does not erase history

git revert creates a new commit undoing an earlier change's effect. The original commit remains in the graph.

---

# Part XIV — The 2.34.0 release history

## 59. The complicated 2.34.0 story

Premature integration into main was corrected through an explicit revert in PR #31 rather than silently erasing published history.

---

## 60. Why not force-reset main?

A public mainline may already have triggered CI, builds, reviews, or downstream work. Reverting preserves an auditable sequence.

---

## 61. An imperfect but truthful history

Merge then revert records what actually occurred. A force reset may create the illusion that the integration never existed.

---

## 62. PR #30 and #32

The integration branch also required revert and follow-up correction. Revert is a normal change and may itself need additional fixes.

---

# Part XV — Integration branches

## 63. Why integration exists

Before 2.34.0, an integration branch combined work for multiple LMS platforms and related features ahead of a mainline release.

---

## 64. Integration graph

Several feature branches feed into integration for combined testing. Main receives the tested, selected candidate afterward.

---

## 65. The benefit

Integration can expose interactions among multiple new features without destabilizing main throughout development.

---

## 66. The cost

Long-lived integration diverges from main and accumulates merge debt, conflicts, and complex ancestry.

---

# Part XVI — Branching models

## 67. Trunk-based versus integration-heavy

Trunk-based development integrates small changes frequently. Integration-heavy workflows validate a collection of changes before main.

---

## 68. PlumePilot's hybrid workflow

Large releases can use integration while smaller fixes take shorter paths. The goal is less coordination risk, not a doctrinaire branching model.

---

# Part XVII — The meaning of main

## 69. What main promises

Main should represent a coherent integrated state, not necessarily something that every store has already approved.

---

## 70. How this project uses main

Candidates are usually tested, merged into main, then tagged and packaged. The installed user version can lag behind main.

---

# Part XVIII — Release candidates and Draft PRs

## 71. A feature branch becomes a candidate

feat/ui-ux-2.35.2 began as a feature branch and gradually served as the complete release candidate.

---

## 72. The name is historical

Branch names are helpful human metadata, not guarantees about current responsibility or deployment readiness.

---

## 73. Why PR #41 stays Draft

Draft signals that development and review can continue without declaring the candidate merge-ready.

---

## 74. A social state machine

GitHub adds statuses such as draft, ready, review, and merged. Git tracks file objects; GitHub coordinates humans.

---

# Part XIX — Merge strategy

## 75. Small commits during development

Fine-grained commits make local troubleshooting and experimentation manageable.

---

## 76. Mainline commit granularity

The repository can favor a coherent PR-sized commit when integrating into main.

---

## 77. Merge commits

Retain the original branch commits and explicit integration ancestry.

---

## 78. Squash merges

Represent a branch's total result as one new commit, simplifying main but changing downstream ancestry relationships.

---

## 79. Rebase-and-merge

Replays commits onto the base so a linear sequence remains, with new commit IDs.

---

## 80. No strategy is free

Readability, auditing, downstream dependencies, conflict handling, and coordination costs must be balanced.

---
