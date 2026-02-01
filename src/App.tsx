import { useGameStore } from './store';
import { GameScene } from './GameScene';

function UI() {
  const { status, mineCount, flagsPlaced, restart } = useGameStore();
  const minesLeft = mineCount - flagsPlaced;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      {/* Top Bar */}
      <div style={{
        padding: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '24px',
        textShadow: '2px 2px 0 #000'
      }}>
        <span>MINES: {minesLeft}</span>
        <span>STATUS: {status.toUpperCase()}</span>
      </div>

      {/* Crosshair */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '20px',
        height: '20px',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ width: '2px', height: '20px', background: 'white' }}></div>
        <div style={{ width: '20px', height: '2px', background: 'white', position: 'absolute' }}></div>
      </div>

      {/* Game Over Screen */}
      {(status === 'won' || status === 'lost') && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.8)',
          padding: '40px',
          textAlign: 'center',
          pointerEvents: 'auto', // Re-enable clicks
          border: '2px solid white'
        }}>
          <h1 style={{ color: status === 'won' ? '#0f0' : '#f00' }}>
            {status === 'won' ? 'VICTORY!' : 'GAME OVER'}
          </h1>
          <button 
            onClick={() => restart()}
            style={{
              fontSize: '20px',
              padding: '10px 20px',
              cursor: 'pointer',
              background: '#444',
              color: 'white',
              border: '1px solid white'
            }}
          >
            PLAY AGAIN
          </button>
        </div>
      )}
      
      {/* Instructions */}
      <div style={{
        padding: '20px',
        color: 'rgba(255,255,255,0.7)',
        fontFamily: 'monospace',
        textAlign: 'center'
      }}>
        WASD to Move | Click to Lock Mouse | Left Click: Dig | Right Click: Flag
      </div>
    </div>
  );
}

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <GameScene />
      <UI />
    </div>
  );
}

export default App;
