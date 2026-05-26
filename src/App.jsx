import { useState, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

// ==========================================
// 1. CHESS ACADEMY CONTENT (Courses & Drills)
// ==========================================
const COURSES = {
  london: {
    name: "Master the London System",
    color: "w", // User plays White
    description: "An unbreakable, universal setup for White. Perfect for beginners to 1500+.",
    steps: [
      { move: "d4", text: "Welcome to the London System! Start by grabbing the center with your Queen's pawn. Play d4." },
      { move: "d5", isOpponent: true, text: "Black fights back for the center." },
      { move: "Bf4", text: "The signature move! Bring your dark-squared bishop outside the pawn chain to f4." },
      { move: "Nf6", isOpponent: true, text: "Black develops their knight." },
      { move: "e3", text: "Solidify your center. Notice how your Bishop is safely outside the pawn triangle you are building." },
      { move: "e6", isOpponent: true, text: "Black prepares to develop." },
      { move: "Nf3", text: "Develop your kingside knight to f3 to control e5." },
      { move: "Bd6", isOpponent: true, text: "Black challenges your strong London bishop." },
      { move: "Bg3", text: "PRO TIP: Retreat to g3! If Black captures it, your h-file opens up for your Rook. Play Bg3." }
    ]
  },
  italian: {
    name: "The Italian Game",
    color: "w",
    description: "The classic, aggressive opening focusing on the weak f7 square.",
    steps: [
      { move: "e4", text: "Start with the classic King's pawn opening. Play e4." },
      { move: "e5", isOpponent: true, text: "Black mirrors your move." },
      { move: "Nf3", text: "Develop your knight and attack Black's pawn on e5." },
      { move: "Nc6", isOpponent: true, text: "Black defends the pawn." },
      { move: "Bc4", text: "The Italian Bishop! Aim it directly at Black's weakest point: the f7 pawn." }
    ]
  }
};

const DRILLS = {
  tactics: [
    { name: "The Royal Fork", fen: "8/8/8/8/8/4k3/8/R3K2R w KQ - 0 1", instructions: "Find the Knight move that attacks both the King and Queen! (Hint: Set up a position like this mentally)" }, // Placeholder example, let's use a real fork fen
    { name: "Knight Fork Example", fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", instructions: "Look for squares where a knight can attack two major pieces." },
    { name: "The Deadly Pin", fen: "4k3/8/8/8/8/8/4Q3/4K3 w - - 0 1", instructions: "Use your bishop or rook to pin a piece to the king!" }
  ],
  endgames: [
    { name: "King & Queen vs King", fen: "8/8/8/8/8/8/5Q2/K6k w - - 0 1", instructions: "Force the king to the edge of the board, then deliver mate." },
    { name: "King & Rook vs King", fen: "8/8/8/8/8/8/5R2/K6k w - - 0 1", instructions: "Use the 'box' method to trap the king." }
  ]
};

export default function App() {
  const [game, setGame] = useState(new Chess());
  const [engine, setEngine] = useState(null);
  
  // App States
  const [gameMode, setGameMode] = useState('computer'); // 'computer', 'analyze', 'practice', 'course'
  const [engineThinking, setEngineThinking] = useState(false);
  
  // Analysis & UI States
  const [rawScore, setRawScore] = useState(0); 
  const [bestMoveArrow, setBestMoveArrow] = useState([]); 
  const [history, setHistory] = useState([]); 
  const [optionSquares, setOptionSquares] = useState({}); // Stores legal move highlight dots

  // Course States
  const [activeCourse, setActiveCourse] = useState(null);
  const [courseStep, setCourseStep] = useState(0);

  // ==========================================
  // ENGINE INITIALIZATION
  // ==========================================
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
             if(match) setRawScore(parseInt(match[1]) > 0 ? 2000 : -2000); 
          }
          if (line.includes('bestmove')) {
            const moveLAN = line.split(' ')[1]; 
            if (moveLAN && moveLAN !== '(none)') {
              setBestMoveArrow([[moveLAN.substring(0, 2), moveLAN.substring(2, 4)]]);
              if ((gameMode === 'computer' || gameMode === 'practice') && game.turn() === 'b') {
                setGame((currentGame) => {
                  const gameCopy = new Chess(currentGame.fen());
                  try {
                    gameCopy.move({ from: moveLAN.substring(0, 2), to: moveLAN.substring(2, 4), promotion: 'q' });
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

  useEffect(() => {
    if (!engine || game.isGameOver()) return;
    setBestMoveArrow([]);
    const runAnalysis = () => {
        setEngineThinking(true);
        engine.postMessage(`position fen ${game.fen()}`);
        engine.postMessage('go depth 12'); 
    }
    if ((gameMode === 'computer' || gameMode === 'practice') && game.turn() === 'b') runAnalysis();
    else if (gameMode === 'analyze') runAnalysis();
  }, [game, gameMode, engine]);

  // ==========================================
  // COURSE AUTO-PLAY LOGIC
  // ==========================================
  useEffect(() => {
    if (gameMode !== 'course' || !activeCourse) return;
    
    const currentStepData = COURSES[activeCourse].steps[courseStep];
    if (!currentStepData) return; // Course finished!

    // If it's the opponent's turn in the lesson, auto-play their move after a 1 second delay
    if (currentStepData.isOpponent) {
      const timer = setTimeout(() => {
        const gameCopy = new Chess(game.fen());
        gameCopy.move(currentStepData.move);
        setGame(gameCopy);
        setHistory(gameCopy.history());
        setCourseStep(s => s + 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameMode, activeCourse, courseStep, game]);

  // ==========================================
  // HUMAN MOVES & HIGHLIGHTING
  // ==========================================
  // Highlight legal moves when clicking a piece
  function getMoveOptions(square) {
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }
    const newSquares = {};
    moves.map((move) => {
      newSquares[move.to] = {
        background: game.get(move.to) && game.get(move.to).color !== game.get(square).color
          ? 'radial-gradient(circle, rgba(255,0,0,.5) 85%, transparent 85%)' // Red dot for captures
          : 'radial-gradient(circle, rgba(0,0,0,.3) 25%, transparent 25%)', // Black dot for normal moves
        borderRadius: '50%'
      };
    });
    newSquares[square] = { background: 'rgba(255, 255, 0, 0.4)' }; // Highlight selected piece
    setOptionSquares(newSquares);
    return true;
  }

  function onSquareClick(square) {
    getMoveOptions(square);
  }

  function onDrop(sourceSquare, targetSquare) {
    setOptionSquares({}); // Clear highlights on drop

    if (engineThinking || game.isGameOver()) return false;
    
    // COURSE MODE LOGIC: Restrict to correct lesson move
    if (gameMode === 'course') {
        const currentStepData = COURSES[activeCourse].steps[courseStep];
        if (currentStepData && !currentStepData.isOpponent) {
            const gameCopy = new Chess(game.fen());
            try {
                const attemptedMove = gameCopy.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
                // Check if they played the specific move the lesson requires (e.g., "d4")
                if (attemptedMove.san !== currentStepData.move) {
                    alert(`Incorrect move! The lesson requires: ${currentStepData.move}`);
                    return false; 
                }
                setGame(gameCopy);
                setHistory(gameCopy.history());
                setCourseStep(s => s + 1); // Advance lesson
                return true;
            } catch (error) { return false; }
        }
        return false;
    }

    // NORMAL MODE LOGIC
    if ((gameMode === 'computer' || gameMode === 'practice') && game.turn() === 'b') return false;

    const gameCopy = new Chess(game.fen());
    try {
      gameCopy.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      setGame(gameCopy);
      setHistory(gameCopy.history());
      return true;
    } catch (error) { return false; }
  }

  // ==========================================
  // CONTROLS
  // ==========================================
  function resetGame() {
    setGame(new Chess());
    setRawScore(0);
    setBestMoveArrow([]);
    setHistory([]);
    setOptionSquares({});
    setEngineThinking(false);
    setActiveCourse(null);
    setCourseStep(0);
  }

  function loadDrill(fen) {
    setGame(new Chess(fen));
    setRawScore(0);
    setBestMoveArrow([]);
    setHistory([]);
    setOptionSquares({});
    setEngineThinking(false);
  }

  function startCourse(courseId) {
    resetGame();
    setGameMode('course');
    setActiveCourse(courseId);
  }

  const whiteBarHeight = useMemo(() => {
    const limit = 500; 
    const clampedScore = Math.max(-limit, Math.min(limit, rawScore));
    return `${((clampedScore + limit) / (limit * 2)) * 100}%`;
  }, [rawScore]);

  const displayScore = useMemo(() => {
    if (Math.abs(rawScore) >= 2000) return "MATE";
    const score = (rawScore / 100).toFixed(1);
    return score > 0 ? `+${score}` : score;
  }, [rawScore]);

  // ==========================================
  // UI RENDER
  // ==========================================
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={{marginBottom: '10px'}}>Open Chess Arena</h1>
        <div style={styles.menu}>
          <button style={{...styles.button, backgroundColor: gameMode === 'computer' ? '#4CAF50' : '#4a4a4a'}} onClick={() => { setGameMode('computer'); resetGame(); }}>Play AI</button>
          <button style={{...styles.button, backgroundColor: gameMode === 'analyze' ? '#2196F3' : '#4a4a4a'}} onClick={() => { setGameMode('analyze'); resetGame(); }}>Review</button>
          <button style={{...styles.button, backgroundColor: gameMode === 'practice' ? '#FF9800' : '#4a4a4a'}} onClick={() => { setGameMode('practice'); resetGame(); }}>Drills</button>
          <button style={{...styles.button, backgroundColor: gameMode === 'course' ? '#9C27B0' : '#4a4a4a'}} onClick={() => { setGameMode('course'); resetGame(); }}>Academy</button>
        </div>
      </div>
      
      <div style={styles.gameArea}>
        
        {/* EVAL BAR (Hidden in Course Mode to avoid distraction) */}
        {gameMode !== 'course' && (
          <div style={styles.evalBarContainer} title={`Evaluation: ${displayScore}`}>
            <div style={{...styles.whiteBar, height: whiteBarHeight}} />
            <span style={styles.evalText}>{displayScore}</span>
          </div>
        )}

        {/* CHESSBOARD */}
        <div style={styles.boardWrapper}>
          <Chessboard 
            position={game.fen()} 
            onPieceDrop={onDrop}
            onSquareClick={onSquareClick}
            customSquareStyles={optionSquares} // Adds the move highlight dots!
            showBoardNotation={true} // Ensures A-H, 1-8 coordinates are shown
            customArrows={gameMode === 'analyze' ? bestMoveArrow : []}
            customArrowColor="rgba(0, 255, 0, 0.5)"
            customBoardStyle={styles.boardStyle}
          />
        </div>

        {/* DYNAMIC SIDE PANEL */}
        <div style={styles.sidePanel}>
          
          {/* SCENARIO 1: ACADEMY / COURSE MODE */}
          {gameMode === 'course' ? (
            <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
              <h3 style={{marginTop: 0, color: '#9C27B0'}}>Chess Academy</h3>
              
              {!activeCourse ? (
                // Show list of courses
                <div>
                   <p style={{fontSize: '13px', color: '#ccc', marginBottom: '15px'}}>Interactive step-by-step masterclasses.</p>
                   {Object.keys(COURSES).map(key => (
                     <button key={key} style={styles.drillBtn} onClick={() => startCourse(key)}>
                        <strong>{COURSES[key].name}</strong><br/>
                        <span style={{fontSize:'11px', color:'#aaa'}}>{COURSES[key].description}</span>
                     </button>
                   ))}
                </div>
              ) : (
                // Show active lesson step
                <div style={styles.lessonCard}>
                  <h4 style={{margin: '0 0 10px 0', borderBottom: '1px solid #555', paddingBottom: '5px'}}>{COURSES[activeCourse].name}</h4>
                  
                  {courseStep < COURSES[activeCourse].steps.length ? (
                     <div>
                       <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', color:'#888', marginBottom:'10px'}}>
                          <span>Step {courseStep + 1} of {COURSES[activeCourse].steps.length}</span>
                       </div>
                       
                       <p style={{fontSize: '15px', lineHeight: '1.4', backgroundColor: '#333', padding: '10px', borderRadius: '5px'}}>
                          {COURSES[activeCourse].steps[courseStep].text}
                       </p>
                       
                       {COURSES[activeCourse].steps[courseStep].isOpponent ? (
                          <p style={{color: '#FF9800', fontStyle: 'italic', fontSize: '13px'}}>Opponent is thinking...</p>
                       ) : (
                          <p style={{color: '#4CAF50', fontWeight: 'bold', fontSize: '13px'}}>Your turn! Play: {COURSES[activeCourse].steps[courseStep].move}</p>
                       )}
                     </div>
                  ) : (
                     <div style={{textAlign: 'center', marginTop: '20px'}}>
                        <h2 style={{color: '#4CAF50'}}>Course Complete!</h2>
                        <p style={{fontSize: '14px'}}>You've mastered the main line of this opening.</p>
                        <button onClick={() => setActiveCourse(null)} style={{...styles.button, backgroundColor: '#9C27B0', marginTop: '10px'}}>Back to Courses</button>
                     </div>
                  )}
                </div>
              )}
            </div>

          // SCENARIO 2: DRILLS / PUZZLES
          ) : gameMode === 'practice' ? (
            <div style={{overflowY: 'auto', height: '100%'}}>
              <h3 style={{marginTop: 0, color: '#FF9800'}}>Path to 1500</h3>
              <p style={{fontSize: '13px', color: '#ccc', marginBottom: '15px'}}>Play winning positions against the AI to build technique.</p>
              
              <h4 style={styles.sectionHeader}>Tactics & Puzzles</h4>
              {DRILLS.tactics.map(drill => (
                <button key={drill.name} style={styles.drillBtn} onClick={() => loadDrill(drill.fen)}>
                  <strong>{drill.name}</strong><br/>
                  <span style={{fontSize:'11px', color:'#aaa'}}>{drill.instructions}</span>
                </button>
              ))}

              <h4 style={{...styles.sectionHeader, marginTop: '20px'}}>Essential Endgames</h4>
              {DRILLS.endgames.map(drill => (
                <button key={drill.name} style={styles.drillBtn} onClick={() => loadDrill(drill.fen)}>
                  <strong>{drill.name}</strong><br/>
                  <span style={{fontSize:'11px', color:'#aaa'}}>{drill.instructions}</span>
                </button>
              ))}
            </div>

          // SCENARIO 3: PLAY / REVIEW (Move History)
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
              <h3 style={{marginTop: 0, borderBottom: '1px solid #444', paddingBottom: '8px'}}>Move History</h3>
              <div style={styles.historyList}>
                  {history.length === 0 && <p style={{color:'#aaa', fontStyle:'italic'}}>No moves yet...</p>}
                  {history.map((move, index) => (
                      <span key={index} style={{...styles.historyMove, fontWeight: index % 2 === 0 ? 'bold' : 'normal'}}>
                          {index % 2 === 0 ? `${(index/2)+1}. ` : ''}{move}
                      </span>
                  ))}
              </div>
              <div style={{marginTop: 'auto', paddingTop: '15px'}}>
                 <button onClick={resetGame} style={{...styles.button, width:'100%', backgroundColor: '#d32f2f'}}>Reset Board</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', backgroundColor: '#161616', color: '#ffffff', fontFamily: 'sans-serif', padding: '10px 20px', boxSizing: 'border-box' },
  header: { textAlign: 'center', width: '100%', marginBottom: '25px' },
  menu: { display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' },
  gameArea: { display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '15px', width: '100%', maxWidth: '1000px', flexWrap: 'wrap', justifyContent: 'center' },
  
  evalBarContainer: { width: '25px', height: '60vh', minHeight: '400px', backgroundColor: '#333', border: '1px solid #555', position: 'relative', overflow: 'hidden', borderRadius: '4px' },
  whiteBar: { backgroundColor: '#eee', width: '100%', position: 'absolute', bottom: 0, left: 0, transition: 'height 0.4s ease-out' },
  evalText: { position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)', color: '#000', fontSize: '11px', fontWeight: 'bold', zIndex: 2, textShadow: '0px 0px 3px rgba(255,255,255,0.8)' },

  boardWrapper: { flex: '1 1 400px', maxWidth: '600px' },
  boardStyle: { borderRadius: '6px', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)' },
  
  sidePanel: { flex: '1 1 250px', maxWidth: '350px', backgroundColor: '#242424', padding: '20px', borderRadius: '8px', height: '60vh', minHeight: '400px', boxSizing:'border-box', overflowY: 'hidden', display: 'flex', flexDirection: 'column' },
  historyList: { display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '15px', overflowY: 'auto', flex: 1, alignContent: 'flex-start' },
  historyMove: { color: '#e0e0e0', padding: '2px 4px', backgroundColor: '#333', borderRadius: '3px' },
  
  button: { padding: '10px 16px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', color: 'white', border: 'none', borderRadius: '5px', transition: 'filter 0.2s', outline: 'none' },
  drillBtn: { display: 'block', width: '100%', padding: '12px', marginBottom: '8px', backgroundColor: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer', textAlign: 'left', transition: 'background-color 0.2s' },
  sectionHeader: { marginBottom: '8px', borderBottom: '1px solid #444', paddingBottom: '4px' },
  lessonCard: { flex: 1, display: 'flex', flexDirection: 'column' }
};
