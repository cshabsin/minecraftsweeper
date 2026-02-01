import { useRef, useLayoutEffect, useMemo } from 'react';
import { InstancedMesh, Object3D, Vector2, CanvasTexture, NearestFilter } from 'three';
import { useGameStore, Cell } from './store';
import { createNumberAtlas } from './textures';

const o = new Object3D();

export function Board() {
  const { grid, size } = useGameStore();
  
  // Refs for the three main layers
  const hiddenMesh = useRef<InstancedMesh>(null);
  const revealedMesh = useRef<InstancedMesh>(null);
  const flagMesh = useRef<InstancedMesh>(null);

  // Generate textures once
  const numberAtlas = useMemo(() => createNumberAtlas(), []);

  useLayoutEffect(() => {
    if (!hiddenMesh.current || !revealedMesh.current || !flagMesh.current) return;

    let hiddenCount = 0;
    let revealedCount = 0;
    let flagCount = 0;

    grid.forEach((cell) => {
      // Position: x, 0, z
      o.position.set(cell.x, 0, cell.z);
      o.updateMatrix();

      if (cell.isRevealed) {
        revealedMesh.current!.setMatrixAt(revealedCount, o.matrix);
        
        // Handle UV mapping for the texture atlas
        // This is tricky with InstancedMesh without custom shaders or attribute magic.
        // For MVP, we might just put the number texture on ALL revealed blocks, 
        // but we need *specific* numbers.
        // simplified approach: usage of setInstanceColor to Tint or just geometry attributes?
        // Actually, pure InstancedMesh doesn't easily support different texture offsets per instance
        // without a custom shader.
        //
        // ALTERNATIVE FOR MVP:
        // Use 9 separate InstancedMeshes? (One for "1", one for "2"...)
        // Or 1 InstancedMesh but modify the geometry UVs in a shader.
        // Let's stick to the SIMPLEST first: 
        // Just render text? No, that's heavy.
        //
        // Let's use `drei`'s <Instance> or similar if we were using it, 
        // but raw InstancedMesh is faster.
        //
        // Let's do the "Multiple InstancedMesh" approach for numbers. 
        // It's 8 extra draw calls, which is negligible.
        
        revealedCount++;
      } else {
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
    revealedMesh.current.count = revealedCount; // We are treating "Revealed" as just the generic "Empty/0" stone for now.
    flagMesh.current.count = flagCount;

    hiddenMesh.current.instanceMatrix.needsUpdate = true;
    revealedMesh.current.instanceMatrix.needsUpdate = true;
    flagMesh.current.instanceMatrix.needsUpdate = true;

  }, [grid]);

  return (
    <group position={[-size / 2, 0, -size / 2]}> 
      {/* Hidden Blocks (Grass) */}
      <instancedMesh ref={hiddenMesh} args={[undefined, undefined, size * size]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#5C9E5C" /> {/* Green */}
      </instancedMesh>

      {/* Flagged Blocks (Red Tint) */}
      <instancedMesh ref={flagMesh} args={[undefined, undefined, size * size]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#FF4040" /> {/* Red */}
      </instancedMesh>

      {/* Revealed Empty Blocks (Stone) */}
      <instancedMesh ref={revealedMesh} args={[undefined, undefined, size * size]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#808080" /> {/* Grey */}
      </instancedMesh>
      
      {/* 
         TODO: Add Number rendering. 
         For the MVP, I'm just going to place simple Text 
         objects for non-zero revealed blocks. 
         Ideally, this should be instanced too, but `drei/Text` is heavy.
         
         Better: A separate InstancedMesh for each number 1-8.
      */}
      <Numbers grid={grid} />
    </group>
  );
}

function Numbers({ grid }: { grid: Cell[] }) {
  // We bucket cells by their neighbor count to render them efficiently
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
  const texture = useMemo(() => {
    const t = createNumberAtlas(); 
    // We need to clone and offset texture for this specific number? 
    // Actually, createNumberAtlas makes a whole grid.
    // Easier: Just make a specific texture for THIS number to avoid UV math complexity in React.
    return createSingleNumberTexture(num);
  }, [num]);

  useLayoutEffect(() => {
    if (!mesh.current) return;
    const o = new Object3D();
    cells.forEach((cell, i) => {
      o.position.set(cell.x, 0.51, cell.z); // Slightly above the block
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
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    const colors = ['', 'blue', 'green', 'red', 'darkblue', 'maroon', 'cyan', 'black', 'gray'];
    
    ctx.fillStyle = colors[num];
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(num.toString(), size/2, size/2);
    
    const t = new CanvasTexture(canvas);
    t.magFilter = NearestFilter;
    return t;
}
