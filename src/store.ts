import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sounds } from './audio';

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
  difficulty: 'easy' | 'medium' | 'hard';
  bestTimes: Record<'easy' | 'medium' | 'hard', number | null>;
  flagsPlaced: number;
  playerStart: { x: number, z: number };
  explodedMine: number | null;
  startTime: number;
  endTime: number;
  settings: {
    invertY: boolean;
    muted: boolean;
  };
  
  initGame: (size: number, mineCount: number, difficulty: 'easy' | 'medium' | 'hard') => void;
  revealCell: (x: number, z: number) => void;
  chordCell: (x: number, z: number) => void;
  toggleFlag: (x: number, z: number) => void;
  restart: () => void;
  toggleInvertY: () => void;
  toggleMute: () => void;
}

// Helper to get array index from x,z
const getIndex = (x: number, z: number, size: number) => x + z * size;

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      grid: [],
      size: 20,
      mineCount: 40,
      status: 'playing',
      difficulty: 'medium',
      bestTimes: { easy: null, medium: null, hard: null },
      flagsPlaced: 0,
      playerStart: { x: 0, z: 0 },
      explodedMine: null,
      startTime: 0,
      endTime: 0,
      settings: {
        invertY: false,
        muted: false,
      },

      initGame: (size, mineCount, difficulty) => {
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

          // Calculate neighbors EARLY
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
          const candidates0 = grid.filter(c => !c.isMine && c.neighborMines === 0);
          let startCell: Cell | undefined;
          
          if (candidates0.length > 0) {
            startCell = candidates0[Math.floor(Math.random() * candidates0.length)];
          } else {
            const candidatesSafe = grid.filter(c => !c.isMine);
            startCell = candidatesSafe[Math.floor(Math.random() * candidatesSafe.length)];
          }
          
          if (!startCell) { 
            attempts++; continue; 
          }
          
          const startIdx = getIndex(startCell.x, startCell.z, size);

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
            // SUCCESS
            const revealQueue = [startIdx];
            const revealedSet = new Set<number>();
            
            while (revealQueue.length > 0) {
                const rIdx = revealQueue.pop()!;
                if (revealedSet.has(rIdx)) continue;
                revealedSet.add(rIdx);
                
                const rCell = grid[rIdx];
                rCell.isRevealed = true;
                
                if (rCell.neighborMines === 0) {
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
                difficulty,
                status: 'playing', 
                flagsPlaced: 0,
                playerStart: { x: startCell.x, z: startCell.z },
                explodedMine: null,
                startTime: Date.now(),
                endTime: 0
            });
            return;
          }
          attempts++;
        }
        console.warn("Failed to generate connected board");
      },

      revealCell: (x, z) => {
        const { grid, size, status, startTime, difficulty, bestTimes } = get();
        if (status !== 'playing') return;

        const index = getIndex(x, z, size);
        const cell = grid[index];

        if (cell.isRevealed || cell.isFlagged) return;

        // Game Over Logic
        if (cell.isMine) {
          const newGrid = [...grid];
          newGrid[index] = { ...cell, isRevealed: true };
          sounds.explode();
          set({ grid: newGrid, status: 'lost', explodedMine: index, endTime: Date.now() });
          return;
        }

        // Reveal Logic (Flood Fill)
        const newGrid = [...grid];
        const stack = [index];
        let revealedCount = 0;

        while (stack.length > 0) {
          const currIdx = stack.pop()!;
          const curr = newGrid[currIdx];

          if (curr.isRevealed || curr.isFlagged) continue;

          newGrid[currIdx] = { ...curr, isRevealed: true };
          revealedCount++;

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

        if (revealedCount > 0) sounds.dig();

        // Check Win Condition
        const hiddenNonMines = newGrid.filter(c => !c.isMine && !c.isRevealed).length;
        const newStatus = hiddenNonMines === 0 ? 'won' : 'playing';
        const endTime = newStatus !== 'playing' ? Date.now() : 0;
        
        let newBestTimes = bestTimes;
        if (newStatus === 'won') {
            sounds.win();
            const time = endTime - startTime;
            if (bestTimes[difficulty] === null || time < bestTimes[difficulty]!) {
                newBestTimes = { ...bestTimes, [difficulty]: time };
            }
        }

        set({ grid: newGrid, status: newStatus, bestTimes: newBestTimes, ...(endTime ? { endTime } : {}) });
      },

      chordCell: (x, z) => {
        const { grid, size, status, revealCell } = get();
        if (status !== 'playing') return;

        const index = getIndex(x, z, size);
        const cell = grid[index];

        if (!cell.isRevealed) return; // Can only chord revealed cells

        // Count flagged neighbors
        let flaggedCount = 0;
        for (let dz = -1; dz <= 1; dz++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dz === 0) continue;
            const nx = cell.x + dx;
            const nz = cell.z + dz;
            if (nx >= 0 && nx < size && nz >= 0 && nz < size) {
              const neighborIdx = getIndex(nx, nz, size);
              if (grid[neighborIdx].isFlagged) flaggedCount++;
            }
          }
        }

        if (flaggedCount === cell.neighborMines) {
          // Reveal remaining neighbors
          for (let dz = -1; dz <= 1; dz++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dz === 0) continue;
              const nx = cell.x + dx;
              const nz = cell.z + dz;
              if (nx >= 0 && nx < size && nz >= 0 && nz < size) {
                 const neighborIdx = getIndex(nx, nz, size);
                 const neighbor = grid[neighborIdx];
                 if (!neighbor.isRevealed && !neighbor.isFlagged) {
                   revealCell(nx, nz);
                 }
              }
            }
          }
        }
      },

      toggleFlag: (x, z) => {
        const { grid, size, status, flagsPlaced } = get();
        if (status !== 'playing') return;

        const index = getIndex(x, z, size);
        const cell = grid[index];

        if (cell.isRevealed) return;

        const newGrid = [...grid];
        newGrid[index] = { ...cell, isFlagged: !cell.isFlagged };
        
        sounds.flag();
        set({ 
          grid: newGrid, 
          flagsPlaced: flagsPlaced + (newGrid[index].isFlagged ? 1 : -1) 
        });
      },

      restart: () => {
        const { size, mineCount, initGame, difficulty } = get();
        initGame(size, mineCount, difficulty);
      },

      toggleInvertY: () => {
        set(state => ({ settings: { ...state.settings, invertY: !state.settings.invertY } }));
      },

      toggleMute: () => {
        set(state => ({ settings: { ...state.settings, muted: !state.settings.muted } }));
      }
    }),
    {
      name: 'minecraftsweeper-storage',
      partialize: (state) => ({ settings: state.settings, bestTimes: state.bestTimes }),
    }
  )
);
