import { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PointerLockControls, Sky } from '@react-three/drei';
import { Vector2, Raycaster } from 'three';
import { Board } from './Board';
import { useGameStore } from './store';

function PlayerController() {
  const { camera, scene } = useThree();
  const { revealCell, toggleFlag, size } = useGameStore();
  const raycaster = useRef(new Raycaster());
  
  // Center of screen
  const center = new Vector2(0, 0); 

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      // 0 = Left Click, 2 = Right Click
      if (document.pointerLockElement === null) return;

      raycaster.current.setFromCamera(center, camera); // Ray from center
      
      const intersects = raycaster.current.intersectObjects(scene.children, true);
      
      // Filter for our game blocks
      // In a real app, we'd use layers or specific names.
      // Here, we assume the first hit is a block.
      if (intersects.length > 0) {
        const hit = intersects[0];
        
        // Convert world pos to grid pos
        // The board is centered at 0,0, but offset by -size/2
        // So world x = grid x - size/2
        // => grid x = world x + size/2
        const x = Math.round(hit.point.x + size / 2 - 0.5); // -0.5 adjustment for center of block
        const z = Math.round(hit.point.z + size / 2 - 0.5); 

        // Clamp to grid
        if (x >= 0 && x < size && z >= 0 && z < size) {
           if (e.button === 0) {
             revealCell(x, z);
           } else if (e.button === 2) {
             toggleFlag(x, z);
           }
        }
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    return () => window.removeEventListener('mousedown', handleMouseDown);
  }, [camera, scene, size, revealCell, toggleFlag]);

  return <PointerLockControls />;
}

export function GameScene() {
  const { initGame } = useGameStore();

  useEffect(() => {
    initGame(20, 40); // Start game
  }, []);

  return (
    <Canvas camera={{ position: [0, 1.7, 0], fov: 75 }}>
      <Sky sunPosition={[100, 20, 100]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      
      <Board />
      <PlayerController />
      
      {/* Floor plane to prevent falling forever if you walk off edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </Canvas>
  );
}
