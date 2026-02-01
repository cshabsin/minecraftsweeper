import { useRef, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import { Vector2, Vector3, Raycaster, Euler } from 'three';
import { Board } from './Board';
import { useGameStore } from './store';

function PlayerController() {
  const { camera, scene, gl } = useThree();
  const { revealCell, toggleFlag, size, grid, settings, status, playerStart } = useGameStore();
  const raycaster = useRef(new Raycaster());
  
  // Movement State
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const moveLeft = useRef(false);
  const moveRight = useRef(false);
  const isLocked = useRef(false);
  
  // Center of screen
  const center = new Vector2(0, 0); 
  
  // Camera State
  const euler = useRef(new Euler(0, 0, 0, 'YXZ'));

  // Teleport to start position
  useEffect(() => {
    if (status === 'playing') {
        // Offset by -size/2 to match Board's group position
        camera.position.set(playerStart.x - size / 2, 1.7, playerStart.z - size / 2);
        
        // Look towards the horizon (forward)
        // We look towards positive Z or something? 
        // Let's just reset rotation to 0,0,0 which is "Forward" in Three.js
        euler.current.set(0, 0, 0);
        camera.quaternion.setFromEuler(euler.current);
    }
  }, [playerStart, status, camera, size]);

  // Unlock mouse on Game Over
  useEffect(() => {
    if (status === 'won' || status === 'lost') {
      document.exitPointerLock();
    }
  }, [status]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!isLocked.current) return;
      
      const movementX = event.movementX || 0;
      const movementY = event.movementY || 0;
      
      const sensitivity = 0.002;
      
      euler.current.setFromQuaternion(camera.quaternion);
      
      euler.current.y -= movementX * sensitivity;
      // Invert Y logic: standard is "up moves up" (subtracting from X rotation).
      // Invert Y means "up moves down" (adding to X rotation).
      const invertFactor = settings.invertY ? 1 : -1;
      euler.current.x += movementY * sensitivity * invertFactor;
      
      // Clamp Look Up/Down
      euler.current.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, euler.current.x));
      
      camera.quaternion.setFromEuler(euler.current);
    };
    
    const onPointerLockChange = () => {
      isLocked.current = document.pointerLockElement === gl.domElement;
    };
    
    const onClick = () => {
        if (!isLocked.current && status === 'playing') {
            gl.domElement.requestPointerLock();
        }
    };

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
      if (!isLocked.current) return;

      raycaster.current.setFromCamera(center, camera);
      const intersects = raycaster.current.intersectObjects(scene.children, true);
      
      if (intersects.length > 0) {
        const hit = intersects[0];
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

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    gl.domElement.addEventListener('click', onClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      gl.domElement.removeEventListener('click', onClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [camera, scene, size, revealCell, toggleFlag, gl, settings.invertY]); // Re-bind if setting changes

  useFrame((_, delta) => {
    if (!isLocked.current) return;
    
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

    const checkCollision = (newPos: Vector3) => {
      const r = 0.2;
      const corners = [
        { x: newPos.x + r, z: newPos.z + r },
        { x: newPos.x - r, z: newPos.z + r },
        { x: newPos.x + r, z: newPos.z - r },
        { x: newPos.x - r, z: newPos.z - r },
      ];

      for (const corner of corners) {
        const gx = Math.floor(corner.x + size / 2 + 0.5);
        const gz = Math.floor(corner.z + size / 2 + 0.5);
        if (gx < 0 || gx >= size || gz < 0 || gz >= size) return true;
        const idx = gx + gz * size;
        const cell = grid[idx];
        if (cell && !cell.isRevealed) return true;
      }
      return false;
    };

    const oldX = camera.position.x;
    camera.position.x += direction.x;
    if (checkCollision(camera.position)) camera.position.x = oldX;

    const oldZ = camera.position.z;
    camera.position.z += direction.z;
    if (checkCollision(camera.position)) camera.position.z = oldZ;
    
    camera.position.y = 1.7;
  });

  return null; // No visual component needed
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
