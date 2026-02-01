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
  settings: {
    invertY: false,
  },

  initGame: (size, mineCount) => {
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

    // Calculate neighbors
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

    set({ grid, size, mineCount, status: 'playing', flagsPlaced: 0 });
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
