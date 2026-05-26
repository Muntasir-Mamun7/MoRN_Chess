import { useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

export default function App() {
  const [game, setGame] = useState(new Chess());

  function makeAMove(move) {
    const gameCopy = new Chess(game.fen());
    
    try {
      const result = gameCopy.move(move);
      setGame(gameCopy);
      
      if (gameCopy.isCheckmate()) alert('Checkmate!');
      else if (gameCopy.isDraw()) alert('Draw!');
      
      return result; 
    } catch (error) {
      return null; 
    }
  }

  function onDrop(sourceSquare, targetSquare) {
    const move = makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q', 
    });

    if (move === null) return false;
    return true;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Open Chess Arena</h1>
        <p>Status: {game.turn() === 'w' ? "White's Turn" : "Black's Turn"}</p>
      </div>
      
      <div style={styles.boardWrapper}>
        <Chessboard 
          position={game.fen()} 
          onPieceDrop={onDrop}
          customBoardStyle={{
            borderRadius: '4px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
          }}
        />
      </div>
      
      <div style={styles.controls}>
        <button 
          onClick={() => setGame(new Chess())}
          style={styles.button}
        >
          Reset Game
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#242424',
    color: '#ffffff',
    fontFamily: 'sans-serif'
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px'
  },
  boardWrapper: {
    width: '100%',
    maxWidth: '600px', 
  },
  controls: {
    marginTop: '20px'
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    cursor: 'pointer',
    backgroundColor: '#4a4a4a',
    color: 'white',
    border: 'none',
    borderRadius: '4px'
  }
};