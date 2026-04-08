# Plan: Submit Patty Flipper for Reddit review (public / App Directory)

This document is a working plan to take **Patty Flipper** (`pattyflip` in `devvit.json`) from private playtest to **reviewed and publicly listable** on Reddit. It is based on Reddit’s [Launch your app](https://developers.reddit.com/docs/guides/launch/launch-guide) guide, [Devvit Rules](https://developers.reddit.com/docs/devvit_rules), and game-specific launch notes from the same guide.

---

## Goals (pick what you want)

| Goal                    | What it means                                                                                                                   | Typical CLI path              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| **Published, unlisted** | Approved build; install is not open to every subreddit by default. Good for iterating or community-specific rollout.            | `npx devvit publish`          |
| **Publicly listed**     | After approval, the app appears in the [App Directory](https://developers.reddit.com/apps) so **any moderator** can install it. | `npx devvit publish --public` |

Reddit’s docs note that **single-subreddit-only** experiences are often a poor fit for `--public` listing; for a **game** meant for many communities, public listing can be appropriate if the README and positioning are clear.

---

## Phase 1 — Launch readiness (before you publish)

### 1.1 Quality and testing

- [ ] Run full project gate: `npm run verify` (lint, format, typecheck, tests, build).
- [ ] **Playtest on Reddit** (not only `npm run dev`): `npm run build` then `npx devvit playtest <your-test-subreddit>` and exercise start → turns → bonus (if any) → leaderboard → menu “Create Patty Flipper post”.
- [ ] Test **web and mobile** Reddit clients; permissions differ for mod vs normal user—use multiple accounts where possible.
- [ ] Confirm **Redis-backed behavior** in production matches expectations (run state, leaderboard) under normal use.

### 1.2 Game-specific requirements (from Reddit’s launch guide)

Games should:

- [ ] Work across platforms with **responsive** layout.
- [ ] Include a clear **custom launch / first screen** (not a bare dev placeholder).
- [ ] **Avoid inline scrolling** inside the inline webview (scrolling inside the webview is called out as disallowed—verify your UI complies).
- [ ] Have a **dedicated, non-test subreddit** for the game’s “home” or community (example pattern: a real community sub, not only `*_dev`).
- [ ] Be **understandable to new users** without insider knowledge (short onboarding or rules on first paint).

Use these as a self-review before submit; reviewers will consider polish and clarity.

### 1.3 Policy and permissions

- [ ] Read [Devvit Rules](https://developers.reddit.com/docs/devvit_rules) and Reddit’s broader developer / content policies.
- [ ] Review `devvit.json` **permissions** (`redis`, `reddit.asUser: SUBMIT_POST`) and ensure each is **justified** and described accurately for reviewers (menu action creates posts as documented in your README).
- [ ] No logging of tokens, PII, or sensitive headers in production paths.

### 1.4 Documentation (required for public listing)

For **`--public`**, Reddit expects a detailed root **`README.md`** with:

- [ ] Comprehensive **app overview** (what it is, who it’s for).
- [ ] **Installer-facing instructions** (how mods install, how players start a game post, any limits).
- [ ] **Changelogs** for major updates (at least plan to maintain this after launch).

Your repo already has a solid README; before `--public`, do a pass to ensure it reads as **moderator-facing** and matches the live app behavior.

---

## Phase 2 — Submit for review

### 2.1 Versioning

- Default: `npx devvit publish` uses a **patch** bump unless you specify otherwise.
- Optional: `npx devvit publish --bump major|minor|patch` or `npx devvit publish --version 1.0.0` (stable versions only; no prerelease).

Batch non-urgent fixes into fewer publishes if possible—**each version you want live requires going through publish/review**.

### 2.2 Commands

**Unlisted publish (general “go live” review):**

```bash
npm run verify
npx devvit publish
```

**Request App Directory listing (public install):**

```bash
npm run verify
npx devvit publish --public
```

After submit, the app enters Reddit’s **review queue**. They may review code, example posts, and documentation.

**Source zip prompt:** `devvit publish` may ask whether to upload a **source code zip** (for Reddit’s review, per Developer Terms). Choose **Continue** when the tree is clean enough to share; the zip honors `.gitignore`. You can opt to stop and clean up first.

### 2.3 Optional community signal (recommended)

- [ ] Share build / feedback in [r/Devvit](https://www.reddit.com/r/Devvit/) (e.g. Feedback Friday) or Reddit Devs Discord.
- [ ] For games: consider [r/GamesOnReddit](https://www.reddit.com/r/GamesOnReddit/) with the Feedback flair.

---

## Phase 3 — Review outcomes and follow-up

Possible outcomes (per Reddit’s messaging): approved, approved with non-blocking feedback, rejected with actionable feedback, or rejected for policy violations.

- [ ] Watch for **email** confirmation when approved.
- [ ] If Reddit needs clarification, they may use **Modmail** or Reddit chat—monitor the account tied to the app.
- [ ] If no word after **~1 week**, follow up via [r/Devvit Modmail](https://www.reddit.com/message/compose/?to=r/Devvit) or Discord (reddit docs note holiday pauses—check r/Devvit announcements).

**Updates after launch:** substantive changes require **publishing a new version**; smaller updates may get a faster review, but plan for review on each publish.

---

## Phase 4 — After approval (optional)

- [ ] If you want **on-platform promotion**, read Reddit’s [featuring guide](https://developers.reddit.com/docs/guides/launch/feature-guide) and apply if eligible.
- [ ] Keep the app compliant; Reddit may **re-review** periodically.

---

## Quick reference — your app facts

| Item                 | Value                                                                        |
| -------------------- | ---------------------------------------------------------------------------- |
| App name (config)    | `pattyflip`                                                                  |
| Stack                | Devvit Web (`webroot` + `post.entrypoints`), Express server in `dist/server` |
| Notable capabilities | Redis, Reddit `SUBMIT_POST` (menu → create custom post)                      |

---

## Summary checklist

1. Satisfy **tests + build** and **Reddit playtest** on real clients.
2. Close **game launch** gaps (responsive UI, launch screen, **no bad inline scroll**, clear UX, real community sub).
3. Align **README** with moderator install + player flow; add changelog discipline for `--public`.
4. Run **`npx devvit publish`** or **`npx devvit publish --public`**.
5. Respond to **review** feedback; **republish** when you ship meaningful updates.

---

_This plan is a convenience summary. Reddit’s official docs and in-product flows prevail if anything changes._
