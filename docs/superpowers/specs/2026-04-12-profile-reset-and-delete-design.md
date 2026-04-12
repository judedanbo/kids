# Profile Reset and Delete — Design

**Date:** 2026-04-12
**Status:** Draft (awaiting user review)

## Problem

Parents currently have no way to reset or remove a child's profile. The only
destructive action available is per-game progress reset inside the Parental
Dashboard. `StorageManager.deleteProfile` exists but only deletes the profile
row — it leaves orphaned `progress`, `checkpoints`, `rewards`, and `events`
records behind.

Parents need to:

1. **Reset a profile's game progress** while keeping rewards, stats, and
   activity history intact (e.g., child wants to replay from scratch but the
   parent wants to preserve earned badges and play-time analytics).
2. **Remove a profile** in a forgiving, reversible way (soft delete), with the
   option to permanently delete later.

## Goals

- Parents can reset the progress of any profile from a single screen.
- Parents can soft-delete any profile; it disappears from `ProfileSelect` but
  remains restorable.
- Parents can restore a soft-deleted profile at any time.
- Parents can permanently purge a soft-deleted profile, cascading across all
  IndexedDB stores.
- No auto-purge. Deleted profiles persist until the parent acts.
- Auth posture unchanged: one `AdultGate` + one child PIN to enter the
  dashboard; in-session trust for managing sibling profiles.

## Non-goals

- No master/household PIN. Per-child PINs stay as they are.
- No auto-purge timer.
- No undo for permanent delete.
- No cross-device sync. All state remains local IndexedDB.

## Design

### Data model

Add one nullable field to `UserProfile` (`shared/src/types/user.ts`):

```ts
export interface UserProfile {
  // ...existing fields
  deletedAt: string | null; // ISO timestamp; null = active
}
```

Soft-deleted profiles live in the same `profiles` IndexedDB store, flagged by
`deletedAt`. No new stores are introduced.

### Storage layer (`platform/src/services/storage.ts`)

IndexedDB version bump **1 → 2**. Upgrade function iterates the `profiles`
store and sets `deletedAt: null` on any row missing the field.

Method changes on `IndexedDBStorageManager` (and the `StorageManager` interface
in `shared/src/types/services.ts`):

- `listProfiles()` — unchanged; returns all profiles (active + deleted).
- `listActiveProfiles()` — **new.** Returns profiles with `deletedAt === null`.
  Used by `ProfileSelect`.
- `softDeleteProfile(profileId: string): Promise<void>` — **new.** Loads the
  profile, sets `deletedAt` to the current ISO timestamp, saves it. Does not
  touch `progress`, `checkpoints`, `rewards`, or `events`.
- `restoreProfile(profileId: string): Promise<void>` — **new.** Loads the
  profile, sets `deletedAt = null`, saves it.
- `purgeProfile(profileId: string): Promise<void>` — **replaces the existing
  `deleteProfile`.** Deletes the profile row and cascades: removes all rows
  from `progress`, `checkpoints`, `rewards`, and `events` where
  `profileId === profileId`. Uses IndexedDB indexes (`profileId`) to locate
  rows efficiently.
- `resetProfileProgress(profileId: string): Promise<void>` — **new.** Deletes
  all rows from `progress` and `checkpoints` for the given `profileId`. Loads
  the profile and sets `profile.progress = {}`, then saves it. Leaves
  `rewards`, `events`, `stats`, and `preferences` untouched.

### Platform context (`platform/src/context/PlatformContext.tsx`)

Four new reducer actions:

- `SOFT_DELETE_PROFILE { profileId }` — updates the matching entry in
  `state.profiles` with `deletedAt`. If `state.currentProfile?.id ===
  profileId`, also clears `currentProfile`.
- `RESTORE_PROFILE { profileId }` — clears `deletedAt` on the matching entry
  in `state.profiles`.
- `PURGE_PROFILE { profileId }` — removes the profile from `state.profiles`.
  If it is the current profile, clears `currentProfile`.
- `RESET_PROFILE_PROGRESS { profileId }` — clears `progress` on the matching
  profile in state.

**Persistence order:** for these destructive actions, `await
storageManager.xxx(...)` first, then dispatch on success. If storage throws,
surface an inline error and do not mutate state. This differs from the
current `UPDATE_PROGRESS` pattern (dispatch first, save second) on purpose —
we never want the UI to reflect a deletion that did not persist.

### Parental Dashboard (`platform/src/pages/ParentalDashboard.tsx`)

The existing sections (activity summary, play-time chart, per-game progress)
remain unchanged. A new **Profiles** section is added below them.

Layout: a table listing every profile on the device.

| Avatar + Name | Status | Last played | Actions |
|---|---|---|---|
| 🦊 Amina | Active | 2d ago | **Reset progress** · **Delete** |
| 🐻 Noah | Deleted 3d ago | — | **Restore** · **Delete permanently** |

"Last played" reads from `profile.stats.lastPlayedAt` and is hidden ("—")
for deleted profiles. "Status" shows `Active` for active rows and
`Deleted <relative time>` derived from `profile.deletedAt` for deleted rows.

Action semantics:

- **Reset progress** (active rows only). Simple confirm dialog: *"Reset
  Amina's game progress? Rewards and stats will be kept."* On confirm, calls
  `resetProfileProgress` → dispatches `RESET_PROFILE_PROGRESS`.
- **Delete** (active rows only). Modal requires typing the child's name to
  confirm — match is case-insensitive against the displayed `profile.name`.
  Names are not globally unique; typing a name only has to match *that* row,
  not disambiguate across profiles. On confirm, calls `softDeleteProfile` →
  dispatches `SOFT_DELETE_PROFILE`.
- **Restore** (deleted rows only). Simple confirm dialog. On confirm, calls
  `restoreProfile` → dispatches `RESTORE_PROFILE`.
- **Delete permanently** (deleted rows only). Modal requires typing the
  child's name. On confirm, calls `purgeProfile` → dispatches
  `PURGE_PROFILE`. Warned as irreversible in the modal copy.

Empty state: if no deleted profiles exist, no deleted rows render; no
separate empty-state banner.

### ProfileSelect (`platform/src/pages/ProfileSelect.tsx`)

Filters profiles to `deletedAt === null`. If the resulting list is empty,
routes to the existing profile-creation flow (verify during implementation;
add the guard if missing).

### Currently-active profile deletion

When the parent deletes the profile they authed in as:

1. `softDeleteProfile` resolves.
2. `SOFT_DELETE_PROFILE` reducer clears `currentProfile`.
3. The dashboard's existing `if (!profile) navigate('/profile')` guard fires
   → route to `ProfileSelect`.
4. `ProfileSelect` filters out the now-deleted profile. If no active
   profiles remain, it routes to onboarding / profile creation.

Purge follows the same path symmetrically.

### i18n

All new strings live under `parental.profiles.*` in
`platform/src/locales/{en,fr}/common.json`. Examples:
`parental.profiles.title`, `parental.profiles.statusActive`,
`parental.profiles.statusDeleted`, `parental.profiles.confirmReset`,
`parental.profiles.confirmDelete`, `parental.profiles.typeName`,
`parental.profiles.permanentWarning`, etc.

### Auth

Unchanged. The existing `AdultGate → PinEntry` flow admits a parent into the
dashboard for the current child. Once inside, the session is trusted — no
re-auth required for managing sibling profiles, including destructive
actions.

## Testing

**Unit (vitest):**

- `storage.test.ts` — cases for `softDeleteProfile`, `restoreProfile`,
  `purgeProfile` (verify full cascade across all four stores),
  `resetProfileProgress` (verify progress + checkpoints gone; rewards,
  events, stats kept), `listActiveProfiles`, and the v1→v2 migration
  backfill.
- `PlatformContext.test.tsx` — cases for the four new reducer actions,
  including the `currentProfile` clearing behavior on soft delete / purge of
  the active profile.

**Component tests:**

- `ParentalDashboard` — renders the profiles table with correct actions per
  row status; reset / delete / restore / purge click paths; typed-
  confirmation modal rejects mismatched input; deleting the current profile
  navigates to `/profile`; deleting the last active profile routes to
  onboarding.

**a11y:** modals use the existing `vitest-axe` pattern. Focus management on
modal open/close. Typed-confirmation modal properly labels its input.

## Files changed

- `shared/src/types/user.ts` — add `deletedAt` to `UserProfile`.
- `shared/src/types/services.ts` — update `StorageManager` interface
  (replace `deleteProfile` with `purgeProfile`; add new methods).
- `platform/src/services/storage.ts` — implement new methods, bump DB
  version to 2 with migration.
- `platform/src/services/storage.test.ts` — new test cases.
- `platform/src/context/PlatformContext.tsx` — four new reducer actions.
- `platform/src/context/PlatformContext.test.tsx` — new reducer test cases.
- `platform/src/pages/ParentalDashboard.tsx` — new Profiles section with
  table + confirmation modals.
- `platform/src/pages/ParentalDashboard.module.css` — styles for the new
  section.
- `platform/src/pages/ProfileSelect.tsx` — filter out soft-deleted profiles;
  route to onboarding if the active list is empty.
- `platform/src/locales/en/common.json`, `platform/src/locales/fr/common.json`
  — new `parental.profiles.*` strings.

## Open questions

None at time of writing.
