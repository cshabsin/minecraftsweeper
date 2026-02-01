import { useGameStore } from './store';
import { GameScene } from './GameScene';

function UI() {
  const { status, mineCount, flagsPlaced, restart, settings, toggleInvertY, initGame } = useGameStore();
  const minesLeft = mineCount - flagsPlaced;

  const setDifficulty = (level: 'easy' | 'medium' | 'hard') => {
    switch (level) {
      case 'easy': initGame(10, 10); break;
      case 'medium': initGame(20, 40); break;
      case 'hard': initGame(30, 150); break;
    }
    // Also unlock mouse if it was locked? 
    // Usually clicking the button requires mouse to be unlocked anyway.
  };

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
        alignItems: 'center', // Align vertically
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '24px',
        textShadow: '2px 2px 0 #000',
        pointerEvents: 'auto' // Allow clicks on the bar
      }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setDifficulty('easy')} style={btnStyle}>EASY</button>
          <button onClick={() => setDifficulty('medium')} style={btnStyle}>MED</button>
          <button onClick={() => setDifficulty('hard')} style={btnStyle}>HARD</button>
        </div>
        
        <span>MINES: {minesLeft}</span>
        
        <div style={{ display: 'flex', gap: '20px' }}>
          <button 
            onClick={toggleInvertY}
            style={{ 
              ...btnStyle,
              background: 'none', 
              border: 'none', 
              textDecoration: 'underline'
            }}
          >
            INVERT Y: {settings.invertY ? 'ON' : 'OFF'}
          </button>
          <span>STATUS: {status.toUpperCase()}</span>
        </div>
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
        justifyContent: 'center',
        pointerEvents: 'none' 
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
        textAlign: 'center',
        pointerEvents: 'none'
      }}>
        WASD to Move | Click to Lock Mouse | Left Click: Dig | Right Click: Flag
      </div>
    </div>
  );
}

const btnStyle = {
  fontSize: '16px',
  cursor: 'pointer',
  background: '#444',
  color: 'white',
  border: '1px solid white',
  padding: '5px 10px',
  fontFamily: 'monospace'
};

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <GameScene />
      <UI />
    </div>
  );
}

export default App;
