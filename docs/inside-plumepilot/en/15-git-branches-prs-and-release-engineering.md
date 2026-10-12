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

## 81. Squash and bisect

A squash may isolate a problem to one large PR rather than its twenty internal steps. This is a real cost when diagnosing a regression with git bisect.

---

## 82. But detail is not always helpful

Preserving messy “try fix, undo fix” commits on main may make bisect less meaningful. Ideally each integrated commit is coherent and testable.

---

# Part XX — Tags and GitHub Releases

## 83. What is a tag?

A Git tag names a specific point in history, such as v2.35.1. It should remain stable after publication.

---

## 84. Tag versus main

Main advances with new commits; a published tag is intended as a fixed reference to the released state.

---

## 85. Tag versus GitHub Release

A tag is a Git concept. GitHub Releases add titles, notes, and downloadable assets around that tag.

---

## 86. Historical tag example

The v2.35.1 release identifies the exact Git commit used to represent that product version. Its descriptive title is separate release metadata.

---

# Part XXI — Version metadata consistency

## 87. Metadata should agree

During preparation, the candidate may already contain an updated manifest before a tag or Release exists. That temporary discrepancy is expected.

---

## 88. At release time

Manifest version, tag, GitHub Release, and browser artifacts should describe the same intended version and source state.

---

## 89. A classic mismatch

A package can run correctly yet bear the wrong manifest version or be associated with the wrong tag. That is still a release defect.

---

## 90. Validate release metadata

Automated validators check version fields, localized data, expected packages, and metadata consistency rather than leaving those checks to memory.

---

# Part XXII — Versioning policy

## 91. Version-number structure

PlumePilot uses versions such as 2.35.1 and 2.35.2, following a three-part version-numbering convention.

---

## 92. Practical version meaning

Version 2.35.0 introduced a significant feature set; 2.35.1 and 2.35.2 are smaller improvements or subsequent changes within the same product line.

---

## 93. SemVer is guidance, not a product oracle

Semantic Versioning is useful vocabulary, but deciding whether a consumer extension change is major, minor, or patch depends on product compatibility and real user impact, not a conventional library API alone.

---

## 94. Versions diagnose installations

The manifest version helps identify precisely which code an end user has installed, which is vital when investigating browser/store discrepancies.

---

# Part XXIII — Store preparations

## 95. Prepare store drafts early

Screenshots, reviewer access, listing copy, and test procedures can be assembled before the final candidate reaches main.

---

## 96. Keep drafts synchronized

A store draft must not become a second source of truth. If runtime features or permissions change, update the corresponding listing and reviewer instructions.

---

# Part XXIV — Three independent release clocks

## 97. The Git clock

The time at which changes are merged into main is one timeline.

---

## 98. The GitHub Release clock

Creating the tag and Release is a separate event, often later.

---

## 99. The store clock

Upload, review, approval, listing publication, and user rollout follow each store's independent schedule.

---

## 100. These clocks differ

Main may contain v2.35.2 while a store still serves v2.35.1, and the three stores may be at different versions.

---

## 101. Distributed release state

For every store, distinguish source ready, artifact built, submitted, under review, accepted, published, and installed.

---

## 102. Three browsers, three schedules

Chrome may publish the newest package while Firefox is still reviewing it. This is a valid state of one multi-browser product.

---

## 103. “Released” is ambiguous

It might mean merged, tagged, uploaded, accepted, visible in a store, or actually installed. Avoid that ambiguity when decisions depend on precise state.

---

## 104. Use concrete status wording

Say “Chrome 2.35.2 accepted and published” or “Firefox 2.35.2 under review” instead of the unqualified “released” where timing matters.

---

# Part XXV — Release provenance

## 105. A user installs the package

An end user receives a browser store artifact, not the Git commit object itself.

---

## 106. Trace the supply chain

Commit → build script → target-specific ZIP → store submission → user installation. Each boundary can introduce an inconsistency.

```text
Git commit → release builder → browser ZIP → store review → user installation
```

---

## 107. Commit SHA

Identifies the exact Git commit object and its history.

---

## 108. ZIP SHA-256

Identifies the exact bytes of one packaged browser artifact.

---

## 109. Version string

Identifies the human-facing product version and the update ordering expected by stores. These are three distinct identity schemes.

---

## 110. The provenance question

We should be able to answer which commit and build produced a given published ZIP, and what SHA-256 identifies its bytes.

---

# Part XXVI — Deterministic builds

## 111. Deterministic builds, revisited

Chapter 13 introduced fixed ZIP timestamps, sorted entries, and controlled build inputs. These make artifact comparisons more reliable.

---

## 112. Why reproducibility matters

A released tag should be enough to reproduce its corresponding packages using a documented build recipe—without guessing which manual patches were applied.

---

# Part XXVII — Clean working trees

## 113. Dirty working trees are risky

Building with uncommitted local changes produces an artifact that may not match the named commit.

---

## 114. A clean-build rule

Before shipping, understand git status and preferably build from a clean, identifiable checkout of the intended release commit.

**Historical command or diagram:**

```bash
git status
```

---

# Part XXVIII — Release building workflows

## 115. Two valid workflows

Build and validate the candidate before merge, or merge then build from main. Both can be sound if the published artifact is verified against the final intended source.

---

## 116. The invariant matters more than the ritual

The published ZIP must correspond to the intended reviewed, versioned source. Whether a preliminary build happened before merge is secondary.

---

## 117. Why build before merge?

Pre-merge packages support browser smoke testing, reviewer preparation, and validating that packaging is ready.

---

## 118. Why rebuild after a changed merge commit?

A squash or merge may create a new commit. Confirm that packages submitted to stores were produced from the final intended tree, not an obsolete or modified candidate.

---

## 119. SHA256SUMS.txt

The release process records SHA-256 hashes for its generated browser archives, allowing exact byte-level verification.

---

## 120. Why hashes help

Unexpected changes to a file's digest reveal that output changed, even when the package name and version appear identical.

---

# Part XXIX — Changelog and reviewers

## 121. Technical changelog

A developer-oriented changelog explains architecture, fixes, regressions, and implementation details.

---

## 122. Store description

User-facing What's New copy should explain visible benefits clearly and avoid internal implementation jargon.

---

## 123. Reviewer notes

Reviewer-facing instructions must provide access, steps, expected results, and relevant packaging or permission context.

---

## 124. First-incomplete as a communication example

A changelog might describe master-guided API discovery; store copy says finding unfinished lessons is more efficient; review instructions tell a tester how to verify the feature.

---

## 125. Different projections of the same work

One source change has multiple legitimate descriptions for developers, users, and reviewers. They should agree factually while using different levels of detail.

---

# Part XXX — Store review schedules

## 126. Once the package is submitted

Review and publication depend on an external actor. The project controls its submission, but not every step of the approval clock.

---

## 127. Firefox release lag

If Firefox skips an intermediate version or remains behind Chrome, its next release notes may need to describe the full change set since its previous published version.

---

# Part XXXI — Release cadence

## 128. Smaller frequent releases

A small release delta is easier to review, test, diagnose, and potentially correct quickly.

---

## 129. The cost of excessive frequency

Every upload incurs packaging, review instructions, QA, possible rejection, and publication overhead.

---

## 130. PlumePilot's compromise

Separate releases into coherent feature or improvement groups rather than publishing every small commit.

---

# Part XXXII — Hotfix and maintenance branches

## 131. When main is already ahead

A hotfix for the version users currently have may not be safe to build from main if main also includes unreleased features.

---

## 132. Release branches

Start a stable patch branch from the relevant release tag, apply the fix, and ship a higher patch version without unrelated future work.

**Historical command or diagram:**

```bash
git switch -c release/2.35 v2.35.2
```

---

## 133. Forward-port afterward

Move the stable fix into the future mainline via merge, cherry-pick, or another controlled change so the defect does not reappear.

---

## 134. Main-first strategy

Fix on main and backport to a stable release branch when main already has the correct isolated solution.

---

## 135. Release-first strategy

Fix the deployed maintenance branch, publish safely, and forward-port to main when urgent stability is the priority.

---

# Part XXXIII — Roll-forward after publication

## 136. A problematic published release

Removing a local commit or tag does not remove a version already installed by users.

---

## 137. Roll-forward instead of binary rollback

Stores generally require increasing versions. Publish a new version that restores the intended behavior, rather than trying to republish older version bytes.

```text
2.35.2 released → issue discovered → 2.35.3 corrective release
```

---

## 138. Store update ordering

Update systems compare versions and publication state. A previous lower version cannot simply be reissued as if newer installations had never happened.

---

## 139. The roll-forward pattern

Release v2.35.2 → discover regression → publish v2.35.3 restoring behavior. History remains explicit and update versions increase.

---

# Part XXXIV — Commit quality and hygiene

## 140. Commit messages as future documentation

A good message explains the meaningful change and helps future maintainers inspect why it was introduced.

---

## 141. A useful message

“fix(autoplay): preserve lesson identity after accordion rerender” conveys purpose and scope.

---

## 142. A weak message

“fix” or “updates” contributes almost no reusable knowledge.

---

## 143. The a8007425 release commit

A squash/release commit can legitimately summarize the entire reviewed 2.35.1 unit rather than one tiny internal edit.

---

## 144. Titles must survive time

Write commit subjects that will still communicate useful intent six months later.

---

## 145. Branch names are metadata

Names such as feat/ui-ux-2.35.2 tell humans the intended topic but do not enforce behavior or readiness.

---

# Part XXXV — Branch and PR cleanup

## 146. Why prune old branches?

Stale refs increase UI noise, confusion about active work, and the risk of reviewing the wrong candidate.

---

## 147. Deleting a ref is not erasing history

Commits already reachable from main, tags, or other refs remain accessible after a branch is deleted.

---

## 148. Historical PRs may remain open

A feature can reach main by another PR or cherry-pick while its original PR was never closed.

---

## 149. Why stale PRs are confusing

The dashboard can show apparently unmerged work that users already have. Close or annotate obsolete PRs to clarify product status.

---

## 150. A feature can ship without its original PR merging

Squash, cherry-pick, integration, or other merges may introduce equivalent content through a different ancestry path. PR state alone does not determine installed features.

---

# Part XXXVI — Merge conflict taxonomy

## 151. What a merge conflict means

Git cannot automatically decide how overlapping changes should combine. It is not proof that two functional changes are incompatible.

---

## 152. Semantic conflicts can be invisible to Git

Two branches may change different lines but together violate one assumption, such as version ownership or callback ordering.

---

## 153. Git resolves source structure, tests resolve meaning

A clean textual merge does not prove correct behavior. The combined result still requires tests.

---

# Part XXXVII — Test the merged result

## 154. Test after important convergence

When major branches join, rerun affected tests and exercise the combined features.

---

## 155. Green feature tests are not enough

Two branches can each pass independently while the merged tree fails. The actual integrated candidate is what must be tested.

---

# Part XXXVIII — Virtual merge candidates

## 156. GitHub's virtual merge candidate

GitHub may synthesize a merge result for status checks; its SHA need not equal the PR head SHA.

---

## 157. Head SHA

Identifies the actual tip commit of the source branch.

---

## 158. Merge-candidate SHA

Identifies a synthetic or computed integration result that checks might evaluate.

---

## 159. The 2.35.2 equivalence proof

Matching tree hashes established that the candidate's files did not change during the history reconstruction.

---

## 160. Tree equality and an empty diff

A shared tree SHA is strong evidence of identical snapshots. A simple zero diff can be helpful, but the object identity directly identifies the full tree.

---
