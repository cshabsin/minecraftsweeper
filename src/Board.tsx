import { useRef, useLayoutEffect, useMemo } from 'react';
import { InstancedMesh, Object3D, Vector2, CanvasTexture, NearestFilter, LinearFilter } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { useGameStore, Cell } from './store';
import { createNumberAtlas } from './textures';

const o = new Object3D();

export function Board() {
  const { grid, size, explodedMine } = useGameStore();
  
  // Refs for the three main layers
  const hiddenMesh = useRef<InstancedMesh>(null);
  const revealedMesh = useRef<InstancedMesh>(null);
  const flagMesh = useRef<InstancedMesh>(null);

  // Generate textures once
  const numberAtlas = useMemo(() => createNumberAtlas(), []);
  
  // Create Bevelled Geometry
  const bevelGeom = useMemo(() => {
      // Size 0.96 to leave a small gap
      // Radius 0.05 for a nice bevel
      // Smoothness 2 is enough for low poly look
      return new RoundedBoxGeometry(0.96, 0.96, 0.96, 2, 0.05);
  }, []);

  useLayoutEffect(() => {
    if (!hiddenMesh.current || !revealedMesh.current || !flagMesh.current) return;

    let hiddenCount = 0;
    let revealedCount = 0;
    let flagCount = 0;

    grid.forEach((cell) => {
      // Logic for positioning
      if (cell.isRevealed) {
        // Revealed: It's a floor tile
        o.position.set(cell.x, 0, cell.z);
        o.scale.set(1, 0.1, 1); // Thin tile
        o.updateMatrix();
        revealedMesh.current!.setMatrixAt(revealedCount, o.matrix);
        revealedCount++;
      } else {
        // Hidden or Flagged: It's a Wall
        o.position.set(cell.x, 0.5, cell.z); // Center is 0.5 up
        o.scale.set(1, 1, 1); // Full block
        o.updateMatrix();
        
        if (cell.isFlagged) {
          flagMesh.current!.setMatrixAt(flagCount, o.matrix);
          flagCount++;
        } else {
          hiddenMesh.current!.setMatrixAt(hiddenCount, o.matrix);
          hiddenCount++;
        }
      }
    });

    hiddenMesh.current.count = hiddenCount;
    revealedMesh.current.count = revealedCount; 
    flagMesh.current.count = flagCount;

    hiddenMesh.current.instanceMatrix.needsUpdate = true;
    revealedMesh.current.instanceMatrix.needsUpdate = true;
    flagMesh.current.instanceMatrix.needsUpdate = true;

    // Fix for raycasting issues when count grows from 0
    if (hiddenCount > 0) hiddenMesh.current.computeBoundingSphere();
    if (revealedCount > 0) revealedMesh.current.computeBoundingSphere();
    if (flagCount > 0) flagMesh.current.computeBoundingSphere();

  }, [grid]);

  return (
    <group position={[-size / 2, 0, -size / 2]}> 
      {/* Hidden Blocks (Toon Bevelled Grey) */}
      <instancedMesh ref={hiddenMesh} args={[bevelGeom, undefined, size * size]} frustumCulled={false}>
        <meshToonMaterial color="#bdbdbd" /> 
      </instancedMesh>

      {/* Flagged Blocks (Toon Bevelled Red) */}
      <instancedMesh ref={flagMesh} args={[bevelGeom, undefined, size * size]} frustumCulled={false}>
        <meshToonMaterial color="#FF4040" /> 
      </instancedMesh>

      {/* Revealed Floor (Stone) */}
      <instancedMesh ref={revealedMesh} args={[undefined, undefined, size * size]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#808080" /> 
      </instancedMesh>
      
      <Numbers grid={grid} />
      
      {explodedMine !== null && grid[explodedMine] && (
        <mesh position={[grid[explodedMine].x, 0.5, grid[explodedMine].z]}>
          <icosahedronGeometry args={[0.8, 2]} />
          <meshBasicMaterial color="red" wireframe />
        </mesh>
      )}
    </group>
  );
}

function Numbers({ grid }: { grid: Cell[] }) {
  const buckets = useMemo(() => {
    const b: Record<number, Cell[]> = {};
    for(let i=1; i<=8; i++) b[i] = [];
    grid.forEach(cell => {
      if (cell.isRevealed && !cell.isMine && cell.neighborMines > 0) {
        b[cell.neighborMines].push(cell);
      }
    });
    return b;
  }, [grid]);

  return (
    <>
      {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
        <NumberLayer key={num} num={num} cells={buckets[num]} />
      ))}
    </>
  );
}

function NumberLayer({ num, cells }: { num: number, cells: Cell[] }) {
  const mesh = useRef<InstancedMesh>(null);
  const texture = useMemo(() => createSingleNumberTexture(num), [num]);

  useLayoutEffect(() => {
    if (!mesh.current) return;
    const o = new Object3D();
    cells.forEach((cell, i) => {
      o.position.set(cell.x, 0.06, cell.z); // Slightly above the floor tile (0.05 + epsilon)
      o.rotation.x = -Math.PI / 2; // Flat on top
      o.updateMatrix();
      mesh.current!.setMatrixAt(i, o.matrix);
    });
    mesh.current.count = cells.length;
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [cells]);

  if (cells.length === 0) return null;

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, cells.length]}>
      <planeGeometry args={[0.8, 0.8]} />
      <meshBasicMaterial map={texture} transparent />
    </instancedMesh>
  );
}

// Helper for single number texture (easier than atlas for MVP instancing)
function createSingleNumberTexture(num: number): CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    const colors = ['', 'blue', 'green', 'red', 'darkblue', 'maroon', 'cyan', 'black', 'gray'];
    
    ctx.fillStyle = colors[num];
    ctx.font = 'bold 150px Arial, sans-serif'; // High-res, smooth font
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(num.toString(), size/2, size/2);
    
    const t = new CanvasTexture(canvas);
    t.minFilter = LinearFilter;
    t.magFilter = LinearFilter;
    return t;
}
