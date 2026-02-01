import { create } from 'zustand';

export interface Cell {
  x: number;
  z: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
}

interface GameState {
  grid: Cell[];
  size: number;
  mineCount: number;
  status: 'playing' | 'won' | 'lost';
  flagsPlaced: number;
  playerStart: { x: number, z: number };
  settings: {
    invertY: boolean;
  };
  
  initGame: (size: number, mineCount: number) => void;
  revealCell: (x: number, z: number) => void;
  toggleFlag: (x: number, z: number) => void;
  restart: () => void;
  toggleInvertY: () => void;
}

// Helper to get array index from x,z
const getIndex = (x: number, z: number, size: number) => x + z * size;

export const useGameStore = create<GameState>((set, get) => ({
  grid: [],
  size: 20,
  mineCount: 40,
  status: 'playing',
  flagsPlaced: 0,
  playerStart: { x: 0, z: 0 },
  settings: {
    invertY: false,
  },

  initGame: (size, mineCount) => {
    // Retry loop to ensure valid board
    let attempts = 0;
    while (attempts < 50) {
      const grid: Cell[] = [];
      for (let z = 0; z < size; z++) {
        for (let x = 0; x < size; x++) {
          grid.push({
            x,
            z,
            isMine: false,
            isRevealed: false,
            isFlagged: false,
            neighborMines: 0,
          });
        }
      }

      // Place mines
      let minesPlaced = 0;
      while (minesPlaced < mineCount) {
        const idx = Math.floor(Math.random() * grid.length);
        if (!grid[idx].isMine) {
          grid[idx].isMine = true;
          minesPlaced++;
        }
      }

      // Calculate neighbors EARLY (so we can pick a nice start spot)
      for (let i = 0; i < grid.length; i++) {
        const cell = grid[i];
        if (cell.isMine) continue;

        let count = 0;
        for (let dz = -1; dz <= 1; dz++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dz === 0) continue;
            const nx = cell.x + dx;
            const nz = cell.z + dz;
            if (nx >= 0 && nx < size && nz >= 0 && nz < size) {
              const neighborIdx = getIndex(nx, nz, size);
              if (grid[neighborIdx].isMine) count++;
            }
          }
        }
        cell.neighborMines = count;
      }

      // Connectivity Check (BFS)
      // 1. Find a safe start cell. Prioritize '0' neighbors (clearings).
      let startIdx = grid.findIndex(c => !c.isMine && c.neighborMines === 0);
      
      // If no '0' cells, try '1', then any safe cell.
      if (startIdx === -1) startIdx = grid.findIndex(c => !c.isMine && c.neighborMines === 1);
      if (startIdx === -1) startIdx = grid.findIndex(c => !c.isMine);
      
      if (startIdx === -1) { 
        // All mines?! Retry.
        attempts++; continue; 
      }

      // 2. Count total safe cells
      const totalSafe = size * size - mineCount;

      // 3. BFS to count reachable safe cells
      const visited = new Set<number>();
      const queue = [startIdx];
      visited.add(startIdx);
      
      let reachableSafe = 0;

      while (queue.length > 0) {
        const currIdx = queue.shift()!;
        reachableSafe++;

        const cx = grid[currIdx].x;
        const cz = grid[currIdx].z;

        // Check neighbors (4-connectivity for movement)
        const deltas = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        
        for (const [dx, dz] of deltas) {
          const nx = cx + dx;
          const nz = cz + dz;
          if (nx >= 0 && nx < size && nz >= 0 && nz < size) {
             const nIdx = getIndex(nx, nz, size);
             if (!grid[nIdx].isMine && !visited.has(nIdx)) {
               visited.add(nIdx);
               queue.push(nIdx);
             }
          }
        }
      }

      if (reachableSafe === totalSafe) {
        // SUCCESS: Valid board found.
        
        const startCell = grid[startIdx];
        
        // Auto-reveal the start cell
        // We use the same logic as revealCell but synchronously here to ensure state is consistent
        // Or we can just set isRevealed=true. 
        // If it's a 0, we want to trigger the flood fill visually?
        // Actually, if we just set isRevealed=true, the 'revealCell' function isn't called.
        // But we can replicate the reveal logic or simply call revealCell immediately after setting state?
        // Better: Pre-process the reveal in the grid data before setting state.
        
        const revealQueue = [startIdx];
        const revealedSet = new Set<number>();
        
        while (revealQueue.length > 0) {
            const rIdx = revealQueue.pop()!;
            if (revealedSet.has(rIdx)) continue;
            revealedSet.add(rIdx);
            
            const rCell = grid[rIdx];
            rCell.isRevealed = true;
            
            if (rCell.neighborMines === 0) {
                // Flood fill neighbors (8-way for reveal)
                for (let dz = -1; dz <= 1; dz++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dz === 0) continue;
                        const nx = rCell.x + dx;
                        const nz = rCell.z + dz;
                        if (nx >= 0 && nx < size && nz >= 0 && nz < size) {
                            const nIdx = getIndex(nx, nz, size);
                            if (!grid[nIdx].isRevealed && !grid[nIdx].isMine) {
                                revealQueue.push(nIdx);
                            }
                        }
                    }
                }
            }
        }

        set({ 
            grid, 
            size, 
            mineCount, 
            status: 'playing', 
            flagsPlaced: 0,
            playerStart: { x: startCell.x, z: startCell.z } 
        });
        return;
      }

      attempts++;
    }
    console.warn("Failed to generate connected board");
  },

  revealCell: (x, z) => {
    const { grid, size, status } = get();
    if (status !== 'playing') return;

    const index = getIndex(x, z, size);
    const cell = grid[index];

    if (cell.isRevealed || cell.isFlagged) return;

    // Game Over Logic
    if (cell.isMine) {
      const newGrid = [...grid];
      newGrid[index] = { ...cell, isRevealed: true };
      set({ grid: newGrid, status: 'lost' });
      return;
    }

    // Reveal Logic (Flood Fill)
    const newGrid = [...grid];
    const stack = [index];

    while (stack.length > 0) {
      const currIdx = stack.pop()!;
      const curr = newGrid[currIdx];

      if (curr.isRevealed || curr.isFlagged) continue;

      newGrid[currIdx] = { ...curr, isRevealed: true };

      // If it's a "0", reveal neighbors
      if (curr.neighborMines === 0) {
        for (let dz = -1; dz <= 1; dz++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dz === 0) continue;
            const nx = curr.x + dx;
            const nz = curr.z + dz;
            if (nx >= 0 && nx < size && nz >= 0 && nz < size) {
              const neighborIdx = getIndex(nx, nz, size);
              if (!newGrid[neighborIdx].isRevealed) {
                stack.push(neighborIdx);
              }
            }
          }
        }
      }
    }

    // Check Win Condition
    const hiddenNonMines = newGrid.filter(c => !c.isMine && !c.isRevealed).length;
    const newStatus = hiddenNonMines === 0 ? 'won' : 'playing';

    set({ grid: newGrid, status: newStatus });
  },

  toggleFlag: (x, z) => {
    const { grid, size, status, flagsPlaced } = get();
    if (status !== 'playing') return;

    const index = getIndex(x, z, size);
    const cell = grid[index];

    if (cell.isRevealed) return;

    const newGrid = [...grid];
    newGrid[index] = { ...cell, isFlagged: !cell.isFlagged };
    
    set({ 
      grid: newGrid, 
      flagsPlaced: flagsPlaced + (newGrid[index].isFlagged ? 1 : -1) 
    });
  },

  restart: () => {
    const { size, mineCount, initGame } = get();
    initGame(size, mineCount);
  },

  toggleInvertY: () => {
    set(state => ({ settings: { ...state.settings, invertY: !state.settings.invertY } }));
  }
}));
