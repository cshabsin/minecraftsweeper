import { useRef, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import { Vector2, Vector3, Raycaster, Euler } from 'three';
import { Board } from './Board';
import { useGameStore } from './store';

function PlayerController() {
  const { camera, scene, gl } = useThree();
  const { revealCell, toggleFlag, chordCell, size, grid, settings, status, playerStart, restart, toggleMute, toggleHelp } = useGameStore();
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
        const worldX = playerStart.x - size / 2;
        const worldZ = playerStart.z - size / 2;
        
        // Offset by -size/2 to match Board's group position
        camera.position.set(worldX, 1.7, worldZ);
        
        // Calculate direction to center (0,0)
        const dx = 0 - worldX;
        const dz = 0 - worldZ;
        const angle = Math.atan2(dx, dz);
        
        euler.current.set(0, angle, 0);
        camera.quaternion.setFromEuler(euler.current);
    }
  }, [playerStart, status, camera, size]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!isLocked.current) return;
      
      const movementX = event.movementX || 0;
      const movementY = event.movementY || 0;
      
      const sensitivity = 0.002;
      
      euler.current.setFromQuaternion(camera.quaternion);
      
      euler.current.y -= movementX * sensitivity;
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
        case 'KeyR':
          restart();
          break;
        case 'KeyM':
          toggleMute();
          break;
        case 'KeyF':
          performRaycastAction('flag');
          break;
        case 'Space':
          performRaycastAction('reveal');
          break;
      }
      
      if (event.key === '?' || event.code === 'Slash') {
          toggleHelp();
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

    const performRaycastAction = (action: 'reveal' | 'flag') => {
      const { grid: freshGrid, size: freshSize, revealCell, chordCell, toggleFlag } = useGameStore.getState();

      raycaster.current.setFromCamera(center, camera);
      const intersects = raycaster.current.intersectObjects(scene.children, true);
      
      const hit = intersects.find(h => h.object !== highlightMesh.current && h.object.type !== 'LineSegments');

      if (hit) {
        const point = hit.point.clone();
        if (hit.face) {
          point.addScaledVector(hit.face.normal, -0.01);
        }

        const x = Math.floor(point.x + freshSize / 2 + 0.5); 
        const z = Math.floor(point.z + freshSize / 2 + 0.5); 
        
        if (x >= 0 && x < freshSize && z >= 0 && z < freshSize) {
           const idx = x + z * freshSize;
           const cell = freshGrid[idx];
           
           if (action === 'reveal') {
             if (cell.isRevealed) {
               chordCell(x, z);
             } else {
               revealCell(x, z);
             }
           } else if (action === 'flag') {
             toggleFlag(x, z);
           }
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!isLocked.current) return;
      if (status !== 'playing') return;

      if (e.button === 0) {
        performRaycastAction('reveal');
      } else if (e.button === 2) {
        performRaycastAction('flag');
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
  }, [camera, scene, size, revealCell, toggleFlag, gl, settings.invertY, status, restart, toggleMute]);

  // Highlight Cursor logic
  const highlightMesh = useRef<any>(null);

  useFrame((_, delta) => {
    if (isLocked.current) {
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
    }

    if (isLocked.current && highlightMesh.current) {
        raycaster.current.setFromCamera(center, camera);
        const intersects = raycaster.current.intersectObjects(scene.children, true);
        const hit = intersects.find(h => h.object !== highlightMesh.current && h.object.type !== 'LineSegments');

        if (hit) {
            const point = hit.point.clone();
            if (hit.face) point.addScaledVector(hit.face.normal, -0.01);
            const x = Math.floor(point.x + size / 2 + 0.5); 
            const z = Math.floor(point.z + size / 2 + 0.5); 

            if (x >= 0 && x < size && z >= 0 && z < size) {
                const idx = x + z * size;
                const cell = grid[idx];
                highlightMesh.current.visible = true;
                if (cell && cell.isRevealed) {
                    highlightMesh.current.position.set(x - size / 2, 0, z - size / 2);
                    highlightMesh.current.scale.set(1, 0.1, 1);
                } else {
                    highlightMesh.current.position.set(x - size / 2, 0.5, z - size / 2);
                    highlightMesh.current.scale.set(1, 1, 1);
                }
            } else {
                highlightMesh.current.visible = false;
            }
        } else {
            highlightMesh.current.visible = false;
        }
    } else if (highlightMesh.current) {
        highlightMesh.current.visible = false;
    }
  });

  return (
    <mesh ref={highlightMesh} visible={false}>
      <boxGeometry args={[1.01, 1.01, 1.01]} /> 
      <meshBasicMaterial color="yellow" transparent opacity={0.2} />
    </mesh>
  );
}

export function GameScene() {
  const { initGame, size } = useGameStore();

  useEffect(() => {
    initGame(20, 40, 'medium'); // Start game
  }, []);

  const skyBlue = "#87ceeb";

  return (
    <Canvas camera={{ position: [0, 1.7, 0], fov: 75 }}>
      <Sky sunPosition={[100, 20, 100]} />
      <fog attach="fog" args={[skyBlue, 5, size + 15]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} />
      
      <Board />
      <PlayerController />
      
      {/* Floor plane restricted to board size */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#808080" />
      </mesh>
    </Canvas>
  );
}