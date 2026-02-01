import { useRef, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls, Sky } from '@react-three/drei';
import { Vector2, Vector3, Raycaster } from 'three';
import { Board } from './Board';
import { useGameStore } from './store';

function PlayerController() {
  const { camera, scene } = useThree();
  const { revealCell, toggleFlag, size, grid } = useGameStore();
  const raycaster = useRef(new Raycaster());
  
  // Movement State
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const moveLeft = useRef(false);
  const moveRight = useRef(false);
  
  // Center of screen
  const center = new Vector2(0, 0); 

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          moveForward.current = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          moveLeft.current = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          moveBackward.current = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          moveRight.current = true;
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          moveForward.current = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          moveLeft.current = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          moveBackward.current = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          moveRight.current = false;
          break;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement === null) return;

      raycaster.current.setFromCamera(center, camera);
      const intersects = raycaster.current.intersectObjects(scene.children, true);
      
      if (intersects.length > 0) {
        const hit = intersects[0];
        
        // Nudge the point slightly INTO the block to ensure we select the right one
        // when clicking a face.
        const point = hit.point.clone();
        if (hit.face) {
          point.addScaledVector(hit.face.normal, -0.01);
        }

        const x = Math.floor(point.x + size / 2 + 0.5); 
        const z = Math.floor(point.z + size / 2 + 0.5); 

        if (x >= 0 && x < size && z >= 0 && z < size) {
           if (e.button === 0) {
             revealCell(x, z);
           } else if (e.button === 2) {
             toggleFlag(x, z);
           }
        }
      }
    };

    // Prevent context menu
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [camera, scene, size, revealCell, toggleFlag]);

  useFrame((_, delta) => {
    if (document.pointerLockElement === null) return;
    
    const speed = 10.0;
    const actualSpeed = speed * delta;

    const direction = new Vector3();
    const frontVector = new Vector3(
      0,
      0,
      Number(moveBackward.current) - Number(moveForward.current)
    );
    const sideVector = new Vector3(
      Number(moveLeft.current) - Number(moveRight.current),
      0,
      0
    );

    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(actualSpeed)
      .applyEuler(camera.rotation);

    // Collision Detection Function
    const checkCollision = (newPos: Vector3) => {
      // Player radius (approx)
      const r = 0.2;
      
      // Check 4 corners of player bounding box
      const corners = [
        { x: newPos.x + r, z: newPos.z + r },
        { x: newPos.x - r, z: newPos.z + r },
        { x: newPos.x + r, z: newPos.z - r },
        { x: newPos.x - r, z: newPos.z - r },
      ];

      for (const corner of corners) {
        const gx = Math.floor(corner.x + size / 2 + 0.5);
        const gz = Math.floor(corner.z + size / 2 + 0.5);

        // Out of bounds is a wall
        if (gx < 0 || gx >= size || gz < 0 || gz >= size) return true;

        // Find cell
        const cell = grid.find(c => c.x === gx && c.z === gz);
        
        // If cell is NOT revealed, it is a wall (solid)
        // Also check if it's flagged? Flagged usually means "don't dig", but is it solid? 
        // In our visuals, flagged is a wall.
        if (cell && !cell.isRevealed) {
          return true; // Collision!
        }
      }
      return false;
    };

    // Move X
    const oldX = camera.position.x;
    camera.position.x += direction.x;
    if (checkCollision(camera.position)) {
      camera.position.x = oldX; // Revert if hit
    }

    // Move Z
    const oldZ = camera.position.z;
    camera.position.z += direction.z;
    if (checkCollision(camera.position)) {
      camera.position.z = oldZ; // Revert if hit
    }
    
    // Lock Y
    camera.position.y = 1.7;
  });

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
