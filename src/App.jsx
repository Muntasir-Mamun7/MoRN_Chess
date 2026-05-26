import { useState, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

// --- DRILL LIBRARY ---
// You can easily add more drills here later by finding the FEN string for any position!
const DRILLS = {
  openings: [
    { name: "Sicilian Defense", fen: "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2" },
    { name: "Ruy Lopez", fen: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3" },
    { name: "Italian Game", fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3" },
    { name: "Queen's Gambit", fen: "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2" }
  ],
  endgames: [
    { name: "King & Queen vs King", fen: "8/8/8/8/8/8/5Q2/K6k w - - 0 1" }, // White to mate
    { name: "King & Rook vs King", fen: "8/8/8/8/8/8/5R2/K6k w - - 0 1" }, // White to mate
    { name: "Pawn Promotion Race", fen: "8/4P3/8/8/8/8/3p4/K6k w - - 0 1" }
  ]
};

export default function App() {
  const [game, setGame] = useState(new Chess());
  const [engine, setEngine] = useState(null);
  
  // App States
  const [gameMode, setGameMode] = useState('computer'); // 'computer', 'analyze', 'practice'
  const [engineThinking, setEngineThinking] = useState(false);
  
  // Analysis & History States
  const [rawScore, setRawScore] = useState(0); 
  const [bestMoveArrow, setBestMoveArrow] = useState([]); 
  const [history, setHistory] = useState([]); 

  // 1. Initialize Stockfish
  useEffect(() => {
    fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.1/stockfish.js')
      .then((res) => res.text())
      .then((text) => {
        const blob = new Blob([text], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        
        worker.onmessage = (event) => {
          const line = event.data;
          
          if (line.includes('info') && line.includes('score cp')) {
            const match = line.match(/score cp (-?\d+)/);
            if (match) setRawScore(parseInt(match[1]));
          }
          
          if (line.includes('info') && line.includes('score mate')) {
             const match = line.match(/score mate (-?\d+)/);
             if(match) {
                const mateIn = parseInt(match[1]);
                setRawScore(mateIn > 0 ? 2000 : -2000); 
             }
          }

          if (line.includes('bestmove')) {
            const moveLAN = line.split(' ')[1]; 
            if (moveLAN && moveLAN !== '(none)') {
              setBestMoveArrow([[moveLAN.substring(0, 2), moveLAN.substring(2, 4)]]);

              // If playing against computer (or in practice mode), make the engine's move
              if ((gameMode === 'computer' || gameMode === 'practice') && game.turn() === 'b') {
                setGame((currentGame) => {
                  const gameCopy = new Chess(currentGame.fen());
                  try {
                    gameCopy.move({
                      from: moveLAN.substring(0, 2),
                      to: moveLAN.substring(2, 4),
                      promotion: moveLAN.substring(4, 5) || 'q'
                    });
                    setHistory(gameCopy.history());
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
  }, [gameMode]); 

  // 2. Control Engine Cycles
  useEffect(() => {
    if (!engine || game.isGameOver()) return;
    
    setBestMoveArrow([]);

    const runAnalysis = () => {
        setEngineThinking(true);
        engine.postMessage(`position fen ${game.fen()}`);
        engine.postMessage('go depth 12'); 
    }

    if ((gameMode === 'computer' || gameMode === 'practice') && game.turn() === 'b') {
        runAnalysis();
    } else if (gameMode === 'analyze') {
        runAnalysis();
    }
  }, [game, gameMode, engine]);

  // 3. Handle human moves
  function onDrop(sourceSquare, targetSquare) {
    if (engineThinking || game.isGameOver()) return false;
    if ((gameMode === 'computer' || gameMode === 'practice') && game.turn() === 'b') return false;

    const gameCopy = new Chess(game.fen());
    try {
      gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', 
      });
      
      setGame(gameCopy);
      setHistory(gameCopy.history());
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

  function loadDrill(fen) {
    setGame(new Chess(fen));
    setRawScore(0);
    setBestMoveArrow([]);
    setHistory([]);
    setEngineThinking(false);
  }

  // 4. Calculations
  const whiteBarHeight = useMemo(() => {
    const limit = 500; 
    const clampedScore = Math.max(-limit, Math.min(limit, rawScore));
    const percentage = ((clampedScore + limit) / (limit * 2)) * 100;
    return `${percentage}%`;
  }, [rawScore]);

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
            Analyze Review
          </button>
          <button 
            style={{...styles.button, backgroundColor: gameMode === 'practice' ? '#FF9800' : '#4a4a4a'}}
            onClick={() => { setGameMode('practice'); resetGame(); }}
          >
            Practice Drills
          </button>
        </div>
      </div>
      
      <div style={styles.gameArea}>
        <div style={styles.evalBarContainer} title={`Evaluation: ${displayScore}`}>
          <div style={{...styles.whiteBar, height: whiteBarHeight}} />
          <span style={styles.evalText}>{displayScore}</span>
        </div>

        <div style={styles.boardWrapper}>
          <Chessboard 
            position={game.fen()} 
            onPieceDrop={onDrop}
            customArrows={gameMode === 'analyze' ? bestMoveArrow : []}
            customArrowColor="rgba(0, 255, 0, 0.5)"
            customBoardStyle={styles.boardStyle}
          />
        </div>

        {/* SIDE PANEL: Swaps between History and Drills based on Game Mode */}
        <div style={styles.sidePanel}>
          {gameMode === 'practice' ? (
            <div>
              <h3 style={{marginTop: 0, color: '#FF9800'}}>Strategy Drills</h3>
              <p style={{fontSize: '13px', color: '#ccc'}}>Load a position and play it out against Stockfish.</p>
              
              <h4 style={{marginBottom: '5px', borderBottom: '1px solid #444'}}>Openings</h4>
              {DRILLS.openings.map(drill => (
                <button key={drill.name} style={styles.drillBtn} onClick={() => loadDrill(drill.fen)}>
                  {drill.name}
                </button>
              ))}

              <h4 style={{marginBottom: '5px', marginTop: '15px', borderBottom: '1px solid #444'}}>Endgames</h4>
              {DRILLS.endgames.map(drill => (
                <button key={drill.name} style={styles.drillBtn} onClick={() => loadDrill(drill.fen)}>
                  {drill.name}
                </button>
              ))}
            </div>
          ) : (
            <div>
              <h3 style={{marginTop: 0}}>Move History</h3>
              <div style={styles.historyList}>
                  {history.length === 0 && <p style={{color:'#aaa', fontStyle:'italic'}}>No moves yet...</p>}
                  {history.map((move, index) => (
                      <span key={index} style={styles.historyMove}>
                          {index % 2 === 0 ? `${(index/2)+1}. ` : ''}{move}
                      </span>
                  ))}
              </div>
              {game.isGameOver() && <button onClick={resetGame} style={{...styles.button, marginTop:'15px', width:'100%'}}>New Game</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// STYLES
const styles = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', backgroundColor: '#161616', color: '#ffffff', fontFamily: 'sans-serif', padding: '10px' },
  header: { textAlign: 'center', width: '100%', marginBottom: '15px' },
  menu: { display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' },
  gameArea: { display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '15px', width: '95%', maxWidth: '1000px', flexWrap: 'wrap', justifyContent: 'center' },
  
  evalBarContainer: { width: '25px', height: '60vh', minHeight: '400px', backgroundColor: '#333', border: '1px solid #555', position: 'relative', overflow: 'hidden', borderRadius: '3px' },
  whiteBar: { backgroundColor: '#eee', width: '100%', position: 'absolute', bottom: 0, left: 0, transition: 'height 0.3s ease-out' },
  evalText: { position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)', color: '#000', fontSize: '10px', fontWeight: 'bold', zIndex: 2, textShadow: '0 0 2px #fff' },

  boardWrapper: { flex: '1 1 400px', maxWidth: '600px' },
  boardStyle: { borderRadius: '4px', boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)' },
  
  sidePanel: { flex: '1 1 200px', maxWidth: '300px', backgroundColor: '#242424', padding: '15px', borderRadius: '8px', minHeight: '400px', boxSizing:'border-box' },
  historyList: { display: 'flex', flexWrap: 'wrap', gap: '5px', fontSize: '14px', maxHeight: '45vh', overflowY: 'auto' },
  historyMove: { color: '#ddd' },
  
  button: { padding: '8px 16px', fontSize: '14px', cursor: 'pointer', color: 'white', border: 'none', borderRadius: '4px', transition: 'background-color 0.2s' },
  drillBtn: { display: 'block', width: '100%', padding: '6px', marginBottom: '5px', backgroundColor: '#333', color: '#fff', border: '1px solid #444', borderRadius: '3px', cursor: 'pointer', textAlign: 'left', fontSize: '13px' }
};
