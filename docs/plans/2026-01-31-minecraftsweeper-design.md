# Design: Minecraftsweeper

A 3D first-person Minesweeper game built with React, Three.js, and a Minecraft aesthetic.

## Tech Stack
- **Framework:** React 18 (Vite)
- **3D Engine:** React Three Fiber (R3F)
- **Helpers:** @react-three/drei (for controls and standard meshes)
- **State Management:** Zustand (for high-performance game logic outside the React render loop)
- **Language:** TypeScript

## Core Architecture

### 1. Game Logic (Zustand Store)
The "brain" of the game lives in a global store. It manages:
- **Grid State:** A 2D array of `Cell` objects.
- **Player State:** Current status (playing, won, lost), mine count, timer.
- **Actions:** `initGame`, `revealCell` (with recursive flood-fill for zeros), `toggleFlag`.

### 2. Rendering Strategy
To maintain 60fps with hundreds of blocks, we use **Instanced Rendering**:
- **HiddenMesh:** One `InstancedMesh` for all unrevealed blocks (Grass/Dirt).
- **RevealedMesh:** One `InstancedMesh` for revealed blocks (Stone).
- **NumberTextures:** A texture atlas (1-8) mapped to the top face of revealed blocks.
- **MineMesh:** TNT blocks for mines, shown only on game over or when hit.

### 3. Controls & Interaction
- **First Person:** `PointerLockControls` for WASD movement and mouse-look.
- **Interaction:** A central raycaster determines which block the player is looking at.
- **Input:**
    - `Left Click`: Reveal block.
    - `Right Click`: Toggle flag.

### 4. Coordinate System
- **Grid:** X and Z axes (Y is Up).
- **Block Size:** 1x1x1 units.
- **Player Height:** 1.7 units (camera at ~1.6).

## Visual Direction
- **Textures:** 16x16 pixel art textures for that authentic Minecraft feel.
- **Lighting:** Warm directional sunlight with soft ambient shadows.
- **UI:** Clean 2D overlay for crosshairs, mine counts, and game-over screens.

## Future Extensibility
- **Firebase:** Easily integrated for global high scores.
- **3D Volume:** The grid logic can be extended to a 3D volume (digging deep) in a future iteration.
