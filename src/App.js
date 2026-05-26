import { useState, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

export default function App() {
  const [game, setGame] = useState(new Chess());
  const [engine, setEngine] = useState(null);
  
  // App States
  const [gameMode, setGameMode] = useState('computer'); // 'computer' or 'analyze'
  const [engineThinking, setEngineThinking] = useState(false);
  
  // Analysis Data States
  const [rawScore, setRawScore] = useState(0); // Evaluation score in centipawns
  const [bestMoveArrow, setBestMoveArrow] = useState([]); // Array of squares for arrow drawing
  const [history, setHistory] = useState([]); // Store PGN history for game review

  // 1. Initialize Stockfish (Same as before)
  useEffect(() => {
    fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.1/stockfish.js')
      .then((res) => res.text())
      .then((text) => {
        const blob = new Blob([text], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        
        worker.onmessage = (event) => {
          const line = event.data;
          
          // Parse Evaluation Score
          if (line.includes('info') && line.includes('score cp')) {
            const match = line.match(/score cp (-?\d+)/);
            if (match) {
              setRawScore(parseInt(match[1]));
            }
          }
          
          // Parse Mate in X
          if (line.includes('info') && line.includes('score mate')) {
             const match = line.match(/score mate (-?\d+)/);
             if(match) {
                // Map mates to high centipawn scores for the bar logic
                const mateIn = parseInt(match[1]);
                setRawScore(mateIn > 0 ? 2000 : -2000); 
             }
          }

          // Parse Best Move
          if (line.includes('bestmove')) {
            const moveLAN = line.split(' ')[1]; // LAN format e.g., "e2e4"
            if (moveLAN && moveLAN !== '(none)') {
              
              // Handle Arrow Drawing Data
              setBestMoveArrow([[moveLAN.substring(0, 2), moveLAN.substring(2, 4)]]);

              // Handle Computer Playing
              if (gameMode === 'computer' && game.turn() === 'b') {
                setGame((currentGame) => {
                  const gameCopy = new Chess(currentGame.fen());
                  try {
                    gameCopy.move({
                      from: moveLAN.substring(0, 2),
                      to: moveLAN.substring(2, 4),
                      promotion: moveLAN.substring(4, 5) || 'q'
                    });
                    return gameCopy;
                  } catch (e) { return currentGame; }
                });
              }
              setEngineThinking(false);
            }
          }
        };
        
        worker.postMessage('uci');
        setEngine(worker);
      });
    return () => engine?.terminate();
  }, [gameMode]); // Re-init engine when mode changes for safety

  // 2. Control Engine Analysis Cycles
  useEffect(() => {
    if (!engine || game.isGameOver()) return;
    
    // Always clear arrows when board state changes
    setBestMoveArrow([]);

    const runAnalysis = () => {
        setEngineThinking(true);
        engine.postMessage(`position fen ${game.fen()}`);
        engine.postMessage('go depth 12'); // Slightly deeper for better review accuracy
    }

    if (gameMode === 'computer' && game.turn() === 'b') {
        // Computer is playing
        runAnalysis();
    } else if (gameMode === 'analyze') {
        // Human is reviewing, provide hint arrows instantly
        runAnalysis();
    }
  }, [game, gameMode, engine]);

  // 3. Handle human moves & capture history
  function onDrop(sourceSquare, targetSquare) {
    if (engineThinking || game.isGameOver()) return false;
    if (gameMode === 'computer' && game.turn() === 'b') return false;

    const gameCopy = new Chess(game.fen());
    try {
      gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', 
      });
      
      setGame(gameCopy);
      setHistory(gameCopy.history()); // Store the new move history list
      return true;
    } catch (error) { return false; }
  }

  function resetGame() {
    setGame(new Chess());
    setRawScore(0);
    setBestMoveArrow([]);
    setHistory([]);
    setEngineThinking(false);
  }

  // 4. UNLIMITED REVIEW CALCULATIONS (The "Premium" stuff)
  // Calculate the visual height of the white bar
  const whiteBarHeight = useMemo(() => {
    // Treat any advantage > +/- 5 pawns as 'total winning'
    const limit = 500; 
    const clampedScore = Math.max(-limit, Math.min(limit, rawScore));
    
    // Map -500 to 0% and +500 to 100%
    const percentage = ((clampedScore + limit) / (limit * 2)) * 100;
    return `${percentage}%`;
  }, [rawScore]);

  // Format score for display text
  const displayScore = useMemo(() => {
    if (Math.abs(rawScore) >= 2000) return "MATE";
    const score = (rawScore / 100).toFixed(1);
    return score > 0 ? `+${score}` : score;
  }, [rawScore]);

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
            style={{...styles.button, backgroundColor: gameMode === 'analyze' ? '#2196F3' : '#4a4a4a'}}
            onClick={() => { setGameMode('analyze'); resetGame(); }}
          >
            Analyze / Game Review
          </button>
        </div>
      </div>
      
      <div style={styles.gameArea}>
        {/* === VISUAL EVALUATION BAR === */}
        <div style={styles.evalBarContainer} title={`Evaluation: ${displayScore}`}>
          <div style={{...styles.whiteBar, height: whiteBarHeight}} />
          <span style={styles.evalText}>{displayScore}</span>
        </div>

        {/* === THE BOARD === */}
        <div style={styles.boardWrapper}>
          <Chessboard 
            position={game.fen()} 
            onPieceDrop={onDrop}
            // Logic to only draw arrows when in Analyze mode
            customArrows={gameMode === 'analyze' ? bestMoveArrow : []}
            customArrowColor="rgba(0, 255, 0, 0.5)" // Semi-transparent green
            customBoardStyle={styles.boardStyle}
          />
        </div>

        {/* === GAME HISTORY PANEL (Simplified Review) === */}
        <div style={styles.historyPanel}>
            <h3>Move History</h3>
            <div style={styles.historyList}>
                {history.length === 0 && <p style={{color:'#aaa', fontStyle:'italic'}}>No moves yet...</p>}
                {history.map((move, index) => (
                    <span key={index} style={styles.historyMove}>
                        {index % 2 === 0 ? `${(index/2)+1}. ` : ''}{move}
                    </span>
                ))}
            </div>
            {game.isGameOver() && <button onClick={resetGame} style={{...styles.button, marginTop:'10px', width:'100%'}}>New Game</button>}
        </div>
      </div>
    </div>
  );
}

// Styling (Updated for layout)
const styles = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', backgroundColor: '#161616', color: '#ffffff', fontFamily: 'sans-serif', padding: '10px' },
  header: { textAlign: 'center', width: '100%', marginBottom: '15px' },
  menu: { display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '10px' },
  gameArea: { display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '10px', width: '95%', maxWidth: '1000px', flexWrap: 'wrap', justifyContent: 'center' },
  
  // Eval Bar Styles
  evalBarContainer: { width: '25px', height: '60vh', backgroundColor: '#333', border: '1px solid #555', position: 'relative', overflow: 'hidden', borderRadius: '3px' },
  whiteBar: { backgroundColor: '#eee', width: '100%', position: 'absolute', bottom: 0, left: 0, transition: 'height 0.3s ease-out' },
  evalText: { position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)', color: '#000', fontSize: '10px', fontWeight: 'bold', zIndex: 2, textShadow: '0 0 2px #fff' },

  boardWrapper: { flex: '1 1 500px', maxWidth: '600px' },
  boardStyle: { borderRadius: '4px', boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)' },
  
  // History Styles
  historyPanel: { flex: '1 1 200px', maxWidth: '300px', backgroundColor: '#242424', padding: '15px', borderRadius: '8px', minHeight: '300px', boxSizing:'border-box' },
  historyList: { display: 'flex', flexWrap: 'wrap', gap: '5px', fontSize: '14px', maxHeight: '40vh', overflowY: 'auto' },
  historyMove: { color: '#ddd' },
  
  button: { padding: '8px 16px', fontSize: '14px', cursor: 'pointer', color: 'white', border: 'none', borderRadius: '4px', transition: 'background-color 0.2s' }
};
