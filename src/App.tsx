import { useState, useEffect } from 'react';
import { useGameStore } from './store';
import { GameScene } from './GameScene';

function KeyCap({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      border: '1px solid white',
      borderRadius: '4px',
      padding: '2px 6px',
      background: '#444',
      fontFamily: 'monospace',
      margin: '0 4px'
    }}>
      {children}
    </span>
  );
}

function HelpModal() {
  const { toggleHelp } = useGameStore();
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(0,0,0,0.9)',
      padding: '40px',
      border: '2px solid white',
      color: 'white',
      textAlign: 'left',
      pointerEvents: 'auto',
      zIndex: 200,
      minWidth: '300px'
    }}>
      <h2 style={{ textAlign: 'center', marginTop: 0 }}>CONTROLS</h2>
      <ul style={{ listStyle: 'none', padding: 0, lineHeight: '2' }}>
        <li><KeyCap>W</KeyCap><KeyCap>A</KeyCap><KeyCap>S</KeyCap><KeyCap>D</KeyCap> Move</li>
        <li><KeyCap>Mouse</KeyCap> Look</li>
        <li><KeyCap>L-Click</KeyCap> / <KeyCap>Space</KeyCap> Dig</li>
        <li><KeyCap>R-Click</KeyCap> / <KeyCap>Ctrl+Click</KeyCap> / <KeyCap>F</KeyCap> Flag</li>
        <li><KeyCap>M</KeyCap> Mute</li>
        <li><KeyCap>R</KeyCap> Restart</li>
        <li><KeyCap>?</KeyCap> Help</li>
        <li><KeyCap>Esc</KeyCap> Unlock Mouse</li>
      </ul>
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button onClick={toggleHelp} style={btnStyle}>CLOSE</button>
      </div>
    </div>
  );
}

function TitleScreen() {
  const { startGame, initGame, difficulty } = useGameStore();

  const setDifficulty = (level: 'easy' | 'medium' | 'hard') => {
    switch (level) {
      case 'easy': initGame(10, 10, 'easy'); break;
      case 'medium': initGame(20, 40, 'medium'); break;
      case 'hard': initGame(30, 150, 'hard'); break;
    }
  };

  const getButtonStyle = (level: 'easy' | 'medium' | 'hard') => ({
      ...btnStyle,
      background: difficulty === level ? '#666' : '#444',
      border: difficulty === level ? '2px solid #4f4' : '1px solid white',
      fontWeight: difficulty === level ? 'bold' : 'normal',
      padding: '10px 20px',
      fontSize: '18px'
  });

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.9)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      zIndex: 300,
      pointerEvents: 'auto',
      backdropFilter: 'blur(10px)'
    }}>
      <h1 style={{ fontSize: '64px', marginBottom: '40px', letterSpacing: '4px', textShadow: '4px 4px 0 #000' }}>
        MINECRAFTSWEEPER
      </h1>
      
      <div style={{ marginBottom: '40px', display: 'flex', gap: '20px' }}>
          <button onClick={() => setDifficulty('easy')} style={getButtonStyle('easy')}>EASY</button>
          <button onClick={() => setDifficulty('medium')} style={getButtonStyle('medium')}>MEDIUM</button>
          <button onClick={() => setDifficulty('hard')} style={getButtonStyle('hard')}>HARD</button>
      </div>

      <button 
        onClick={startGame}
        style={{
          fontSize: '32px',
          padding: '20px 60px',
          cursor: 'pointer',
          background: '#4CAF50',
          color: 'white',
          border: '2px solid white',
          borderRadius: '8px',
          marginBottom: '40px'
        }}
      >
        PLAY
      </button>

      <div style={{ fontFamily: 'monospace', textAlign: 'center', lineHeight: '1.5', opacity: 0.8 }}>
        <p>WASD to Move &nbsp;|&nbsp; Mouse to Look</p>
        <p>Space to Dig &nbsp;|&nbsp; F to Flag</p>
      </div>
    </div>
  );
}

function UI() {
  const { status, mineCount, flagsPlaced, restart, settings, toggleInvertY, toggleMute, toggleHelp, showHelp, isTitleScreen, initGame, startTime, endTime, difficulty, bestTimes } = useGameStore();
  const minesLeft = mineCount - flagsPlaced;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (status !== 'playing') return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [status]);

  if (isTitleScreen) {
      return <TitleScreen />;
  }

  const setDifficulty = (level: 'easy' | 'medium' | 'hard') => {
    switch (level) {
      case 'easy': initGame(10, 10, 'easy'); break;
      case 'medium': initGame(20, 40, 'medium'); break;
      case 'hard': initGame(30, 150, 'hard'); break;
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getButtonText = (level: 'easy' | 'medium' | 'hard', label: string) => {
      const best = bestTimes[level];
      return best ? `${label} (${formatTime(best)})` : label;
  };

  const getButtonStyle = (level: 'easy' | 'medium' | 'hard') => ({
      ...btnStyle,
      background: difficulty === level ? '#666' : '#444',
      border: difficulty === level ? '2px solid #4f4' : '1px solid white',
      fontWeight: difficulty === level ? 'bold' : 'normal'
  });

  const displayTime = (status === 'playing' && startTime > 0)
    ? formatTime(now - startTime) 
    : (startTime > 0 ? formatTime((endTime || startTime) - startTime) : '0:00');

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
      justifyContent: 'space-between',
      zIndex: 100
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
          <button onClick={() => setDifficulty('easy')} style={getButtonStyle('easy')}>{getButtonText('easy', 'EASY')}</button>
          <button onClick={() => setDifficulty('medium')} style={getButtonStyle('medium')}>{getButtonText('medium', 'MED')}</button>
          <button onClick={() => setDifficulty('hard')} style={getButtonStyle('hard')}>{getButtonText('hard', 'HARD')}</button>
        </div>
        
        <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
            <span>MINES: {minesLeft}</span>
            <span>TIME: {displayTime}</span>
            <button 
              onClick={toggleMute}
              style={{ ...btnStyle, fontSize: '24px', background: 'none', border: 'none' }}
              title="Toggle Mute (M)"
            >
              {settings.muted ? '🔇' : '🔊'}
            </button>
        </div>
        
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

      {showHelp && <HelpModal />}

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
          background: 'rgba(0,0,0,0.6)', // More transparent
          padding: '40px',
          textAlign: 'center',
          pointerEvents: 'auto', // Re-enable clicks if they unlock mouse
          border: '2px solid white',
          backdropFilter: 'blur(5px)' // Nice blur effect
        }}>
          <h1 style={{ color: status === 'won' ? '#0f0' : '#f00' }}>
            {status === 'won' ? 'VICTORY!' : 'GAME OVER'}
          </h1>
          {status === 'won' && (
             <h2 style={{ color: 'white' }}>Time: {displayTime}</h2>
          )}
          <div style={{ color: 'white', marginTop: '20px', fontFamily: 'monospace' }}>
            <p>Press <b>R</b> to Restart</p>
            <p style={{ fontSize: '14px', opacity: 0.7 }}>Press ESC to unlock mouse</p>
          </div>
          <button 
            onClick={() => restart()}
            style={{
              fontSize: '20px',
              padding: '10px 20px',
              marginTop: '20px',
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
        WASD Move | Click to Lock | Space: Dig | F: Flag | ? Keybindings
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
