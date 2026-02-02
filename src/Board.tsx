import { useRef, useLayoutEffect, useMemo } from 'react';
import { InstancedMesh, Object3D, Vector2, CanvasTexture, NearestFilter, LinearFilter, IcosahedronGeometry, CylinderGeometry, ConeGeometry, BoxGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { useGameStore, Cell } from './store';
import { createNumberAtlas } from './textures';

const o = new Object3D();

export function Board() {
  const { grid, size, explodedMine, status } = useGameStore();
  
  // Refs for the layers
  const hiddenMesh = useRef<InstancedMesh>(null);
  const revealedMesh = useRef<InstancedMesh>(null);
  const flagBaseMesh = useRef<InstancedMesh>(null);
  const poleMesh = useRef<InstancedMesh>(null);
  const triangleMesh = useRef<InstancedMesh>(null);
  const missedMineMesh = useRef<InstancedMesh>(null);
  const incorrectFlagMesh = useRef<InstancedMesh>(null);

  // Generate textures once
  const numberAtlas = useMemo(() => createNumberAtlas(), []);
  
  // Geometries
  const bevelGeom = useMemo(() => {
      return new RoundedBoxGeometry(0.96, 0.96, 0.96, 2, 0.05);
  }, []);
  
  const mineGeom = useMemo(() => {
      return new IcosahedronGeometry(0.4, 0); 
  }, []);

  const poleGeom = useMemo(() => new CylinderGeometry(0.02, 0.02, 0.6), []);
  // Triangular prism (Short) -> Stretched to be pennant
  const flagGeom = useMemo(() => new CylinderGeometry(0.2, 0.2, 0.05, 3), []); 
  const revealedGeom = useMemo(() => new BoxGeometry(1, 1, 1), []);

  useLayoutEffect(() => {
    if (!hiddenMesh.current || !revealedMesh.current || !flagBaseMesh.current || !poleMesh.current || !triangleMesh.current || !missedMineMesh.current || !incorrectFlagMesh.current) return;

    let hiddenCount = 0;
    let revealedCount = 0;
    let flagBaseCount = 0;
    let poleCount = 0;
    let triangleCount = 0;
    let missedCount = 0;
    let incorrectCount = 0;

    grid.forEach((cell) => {
      o.rotation.set(0, 0, 0);
      o.scale.set(1, 1, 1);

      if (cell.isRevealed) {
        if (!cell.isMine) {
            o.position.set(cell.x, 0, cell.z);
            o.scale.set(1, 0.1, 1);
            o.updateMatrix();
            revealedMesh.current!.setMatrixAt(revealedCount, o.matrix);
            revealedCount++;
        }
      } else {
        // Wall position
        o.position.set(cell.x, 0.5, cell.z);
        o.scale.set(1, 1, 1);
        o.updateMatrix();
        
        if (cell.isFlagged) {
          if (status === 'lost' && !cell.isMine) {
            // Incorrect Flag
            incorrectFlagMesh.current!.setMatrixAt(incorrectCount, o.matrix);
            incorrectCount++;
          } else {
            // Correct Flag -> Pink Base Block
            flagBaseMesh.current!.setMatrixAt(flagBaseCount, o.matrix);
            flagBaseCount++;
          }
          
          // Pole
          o.position.set(cell.x, 1.0, cell.z);
          o.scale.set(1, 1, 1);
          o.updateMatrix();
          poleMesh.current!.setMatrixAt(poleCount, o.matrix);
          poleCount++;
          
          // Triangle (Flat Prism Pennant)
          o.position.set(cell.x + 0.1, 1.35, cell.z); 
          o.rotation.x = Math.PI / 2;
          o.rotation.y = Math.PI / 2;
          o.rotation.z = 0;
          o.scale.set(1, 1, 1.4); 
          
          o.updateMatrix();
          triangleMesh.current!.setMatrixAt(triangleCount, o.matrix);
          triangleCount++;
          o.rotation.set(0, 0, 0);
          o.scale.set(1, 1, 1);
          
        } else {
          if (status === 'lost' && cell.isMine) {
            missedMineMesh.current!.setMatrixAt(missedCount, o.matrix);
            missedCount++;
          } else {
            hiddenMesh.current!.setMatrixAt(hiddenCount, o.matrix);
            hiddenCount++;
          }
        }
      }
    });

    hiddenMesh.current.count = hiddenCount;
    revealedMesh.current.count = revealedCount; 
    flagBaseMesh.current.count = flagBaseCount;
    poleMesh.current.count = poleCount;
    triangleMesh.current.count = triangleCount;
    missedMineMesh.current.count = missedCount;
    incorrectFlagMesh.current.count = incorrectCount;

    hiddenMesh.current.instanceMatrix.needsUpdate = true;
    revealedMesh.current.instanceMatrix.needsUpdate = true;
    flagBaseMesh.current.instanceMatrix.needsUpdate = true;
    poleMesh.current.instanceMatrix.needsUpdate = true;
    triangleMesh.current.instanceMatrix.needsUpdate = true;
    missedMineMesh.current.instanceMatrix.needsUpdate = true;
    incorrectFlagMesh.current.instanceMatrix.needsUpdate = true;

    if (hiddenCount > 0) hiddenMesh.current.computeBoundingSphere();
    if (revealedCount > 0) revealedMesh.current.computeBoundingSphere();
    if (flagBaseCount > 0) flagBaseMesh.current.computeBoundingSphere();
    if (poleCount > 0) poleMesh.current.computeBoundingSphere();
    if (triangleCount > 0) triangleMesh.current.computeBoundingSphere();
    if (missedCount > 0) missedMineMesh.current.computeBoundingSphere();
    if (incorrectCount > 0) incorrectFlagMesh.current.computeBoundingSphere();

  }, [grid, status]);

  return (
    <group position={[-size / 2, 0, -size / 2]}> 
      {/* Hidden Blocks (Toon Bevelled Grey) */}
      <instancedMesh ref={hiddenMesh} args={[bevelGeom, undefined, size * size]} frustumCulled={false}>
        <meshToonMaterial color="#bdbdbd" /> 
      </instancedMesh>

      {/* Flag Base Blocks (Toon Bevelled Pink) */}
      <instancedMesh ref={flagBaseMesh} args={[bevelGeom, undefined, size * size]} frustumCulled={false}>
        <meshToonMaterial color="#e8a8b8" /> 
      </instancedMesh>

      {/* Flag Poles (Black) */}
      <instancedMesh ref={poleMesh} args={[poleGeom, undefined, size * size]} frustumCulled={false}>
        <meshStandardMaterial color="#222" /> 
      </instancedMesh>

      {/* Flag Triangles (Red Prism) */}
      <instancedMesh ref={triangleMesh} args={[flagGeom, undefined, size * size]} frustumCulled={false}>
        <meshStandardMaterial color="#FF0000" /> 
      </instancedMesh>

      {/* Missed Mines (Metallic Black Icosahedrons) */}
      <instancedMesh ref={missedMineMesh} args={[mineGeom, undefined, size * size]} frustumCulled={false}>
        <meshStandardMaterial color="#444444" roughness={0.4} metalness={0.6} /> 
      </instancedMesh>

      {/* Incorrect Flags (Toon Bevelled Orange) */}
      <instancedMesh ref={incorrectFlagMesh} args={[bevelGeom, undefined, size * size]} frustumCulled={false}>
        <meshToonMaterial color="#FFA500" /> 
      </instancedMesh>

      {/* Revealed Floor (Stone) */}
      <instancedMesh ref={revealedMesh} args={[revealedGeom, undefined, size * size]} frustumCulled={false}>
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
