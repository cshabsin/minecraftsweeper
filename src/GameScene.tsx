import { useRef, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls, Sky } from '@react-three/drei';
import { Vector2, Vector3, Raycaster } from 'three';
import { Board } from './Board';
import { useGameStore } from './store';

function PlayerController() {
  const { camera, scene } = useThree();
  const { revealCell, toggleFlag, size } = useGameStore();
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
        
        // Raycast logic:
        // Because blocks are 1x1 centered at integer coords, 
        // using floor(point + normal * 0.5) is usually safer than round().
        // But for top-down clicking on a flat grid, round() is usually okay.
        // Let's refine it slightly to be more robust by using the face normal if needed,
        // but for now, the previous math was "okay" assuming we hit the top face.
        //
        // However, if we hit the *side* of a block, simple rounding might be off.
        // Better 3D grid selection: hit.point + hit.face.normal * 0.5 (to move into the block center)
        
        // But wait, if we want to SELECT the block we hit:
        // The block's center is floor(position).
        // If we hit a face, the point is on the surface.
        // To find the block *containing* the point (or the block *behind* the face),
        // we can move slightly *into* the object along the ray direction? 
        // No, simplest is: map the INSTANCE index to the grid coordinate.
        
        // Since we rely on generic intersection, let's try the "move into block" trick.
        // gridX = Math.floor(hit.point.x - hit.face.normal.x * 0.1 + size/2)
        // Actually, just rounding x/z works if we are hitting unit cubes aligned to grid.
        
        const x = Math.round(hit.point.x + size / 2 - 0.5); 
        const z = Math.round(hit.point.z + size / 2 - 0.5); 

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

    // Lock Y movement (stay on ground)
    camera.position.x += direction.x;
    camera.position.z += direction.z;
    
    // Optional: Head bob or simple gravity could go here
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
