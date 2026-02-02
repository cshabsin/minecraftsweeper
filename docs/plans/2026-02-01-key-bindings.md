# Key Bindings & Help Dialog Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add keyboard shortcuts for core actions (Dig, Flag, Help) and a visual Help dialog.

**Architecture:**
- Refactor `GameScene.tsx` raycasting logic into a reusable `interact()` function.
- Update `handleKeyDown` to map keys to interactions.
- Add `HelpModal` state and component to `App.tsx`.
- Add "?" button to UI.

**Tech Stack:** React, Three.js (Raycasting), Zustand (State)

---

### Task 1: Refactor Raycasting Logic

**Files:**
- Modify: `src/GameScene.tsx`

**Step 1: Extract interaction logic**

Refactor the raycasting and grid logic inside `handleMouseDown` into a standalone function (inside the component or hook) called `performRaycastAction(action: 'reveal' | 'flag')`.

This function should:
1. Raycast from center.
2. Filter highlight/helpers.
3. Calculate grid coordinates.
4. Call `revealCell`/`chordCell` or `toggleFlag` based on action.

**Step 2: Update handleMouseDown**

Update `handleMouseDown` to call `performRaycastAction`.

**Step 3: Verify behavior**

Manually verify clicking still works.

**Step 4: Commit**

```bash
git add src/GameScene.tsx
git commit -m "refactor: extract raycast interaction logic"
```

---

### Task 2: Add Key Bindings

**Files:**
- Modify: `src/GameScene.tsx`

**Step 1: Update handleKeyDown**

Add cases:
- `Space`: Call `performRaycastAction('flag')`.
- `KeyD`: Call `performRaycastAction('reveal')`.
- `Slash` (Shift+? check): Call `toggleHelp` (will implement state in next task).

**Step 2: Commit**

```bash
git add src/GameScene.tsx
git commit -m "feat: add key bindings for dig and flag"
```

---

### Task 3: Help Dialog UI

**Files:**
- Modify: `src/store.ts`
- Modify: `src/App.tsx`

**Step 1: Add help state**

Add `showHelp: boolean` and `toggleHelp: () => void` to `useGameStore`.

**Step 2: Implement Help Modal**

In `App.tsx`, create a `HelpModal` component overlaid on the screen.
- Show keys: WASD (Move), Mouse (Look), Left Click / D (Dig), Right Click / Space (Flag), M (Mute), ? (Help).
- Style keys as "squares" (border, padding).

**Step 3: Add ? Button**

Add a button with `?` inside a square to the top bar in `UI`.

**Step 4: Connect Key Binding**

Update `GameScene.tsx` to call `toggleHelp` on `?` key.

**Step 5: Commit**

```bash
git add src/store.ts src/App.tsx src/GameScene.tsx
git commit -m "feat: add help dialog and toggle"
```
