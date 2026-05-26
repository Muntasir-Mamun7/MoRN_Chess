import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

export default function App() {
  const [game, setGame] = useState(new Chess());
  const [engine, setEngine] = useState(null);
  const [gameMode, setGameMode] = useState('computer'); // 'friend' or 'computer'
  const [engineThinking, setEngineThinking] = useState(false);
  const [evaluation, setEvaluation] = useState("0.00");

  // 1. Initialize the Stockfish Engine in a Web Worker
  useEffect(() => {
    // We fetch Stockfish from a CDN so you don't have to deal with complex Vite worker configurations
    fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.1/stockfish.js')
      .then((res) => res.text())
      .then((text) => {
        const blob = new Blob([text], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        
        worker.onmessage = (event) => {
          const line = event.data;
          
          // Parse the evaluation score (Centipawns)
          if (line.includes('info') && line.includes('score cp')) {
            const match = line.match(/score cp (-?\d+)/);
            if (match) {
              const score = (parseInt(match[1]) / 100).toFixed(2);
              setEvaluation(score > 0 ? `+${score}` : score);
            }
          }
          
          // Parse the best move and execute it
          if (line.includes('bestmove')) {
            const move = line.split(' ')[1];
            if (move && move !== '(none)') {
              setGame((currentGame) => {
                const gameCopy = new Chess(currentGame.fen());
                try {
                  gameCopy.move({
                    from: move.substring(0, 2),
                    to: move.substring(2, 4),
                    promotion: move.substring(4, 5) || 'q'
                  });
                  return gameCopy;
                } catch (e) {
                  return currentGame; // Ignore if the user moved before the engine finished
                }
              });
              setEngineThinking(false);
            }
          }
        };
        
        worker.postMessage('uci'); // Initialize UCI protocol
        setEngine(worker);
      });

    return () => {
      if (engine) engine.terminate();
    };
  }, []);

  // 2. Trigger the engine whenever it is Black's turn (if playing against computer)
  useEffect(() => {
    if (!engine) return;

    if (gameMode === 'computer' && game.turn() === 'b' && !game.isGameOver()) {
      setEngineThinking(true);
      engine.postMessage(`position fen ${game.fen()}`);
      engine.postMessage('go depth 10'); // Depth 10 is fast but challenging enough for practice
    } else if (gameMode === 'friend') {
      // If playing a friend, just evaluate the board for the Analysis UI
      engine.postMessage(`position fen ${game.fen()}`);
      engine.postMessage('go depth 10');
    }
  }, [game, gameMode, engine]);

  // 3. Handle human moves
  function onDrop(sourceSquare, targetSquare) {
    // Prevent human from moving if the engine is thinking, or if the game is over
    if (engineThinking || game.isGameOver()) return false;
    // Prevent human from moving Black pieces if playing against the computer
    if (gameMode === 'computer' && game.turn() === 'b') return false;

    const gameCopy = new Chess(game.fen());
    try {
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', 
      });
      
      setGame(gameCopy);
      return true;
    } catch (error) {
      return false; // Illegal move
    }
  }

  function resetGame() {
    setGame(new Chess());
    setEvaluation("0.00");
    setEngineThinking(false);
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Open Chess Arena</h1>
        <div style={styles.menu}>
          <button 
            style={{...styles.button, backgroundColor: gameMode === 'computer' ? '#4CAF50' : '#4a4a4a'}}
            onClick={() => { setGameMode('computer'); resetGame(); }}
          >
            Play Computer
          </button>
          <button 
            style={{...styles.button, backgroundColor: gameMode === 'friend' ? '#4CAF50' : '#4a4a4a'}}
            onClick={() => { setGameMode('friend'); resetGame(); }}
          >
            Pass & Play / Analyze
          </button>
        </div>
        
        <div style={styles.statusBox}>
          <p><strong>Evaluation:</strong> {evaluation}</p>
          <p><strong>Status:</strong> {
            game.isCheckmate() ? "Checkmate!" : 
            game.isDraw() ? "Draw!" : 
            engineThinking ? "Engine is thinking..." : 
            (game.turn() === 'w' ? "White's Turn" : "Black's Turn")
          }</p>
        </div>
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
        <button onClick={resetGame} style={styles.button}>
          Reset Board
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', backgroundColor: '#242424', color: '#ffffff', fontFamily: 'sans-serif', padding: '20px' },
  header: { textAlign: 'center', width: '100%', maxWidth: '600px', marginBottom: '20px' },
  menu: { display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '15px' },
  statusBox: { backgroundColor: '#333', padding: '10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '14px' },
  boardWrapper: { width: '100%', maxWidth: '600px' },
  controls: { marginTop: '20px' },
  button: { padding: '10px 20px', fontSize: '14px', cursor: 'pointer', color: 'white', border: 'none', borderRadius: '4px', transition: 'background-color 0.2s' }
};
