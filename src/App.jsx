import { useState, useEffect, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

const PIECE_NAMES = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };

// ==========================================
// THEMES & ACADEMY DATA
// ==========================================
const BOARD_THEMES = {
  green: { light: '#eeeed2', dark: '#769656' },
  wood: { light: '#f0d9b5', dark: '#b58863' },
  ocean: { light: '#dee3e6', dark: '#8ca2ad' },
  dark: { light: '#aaaaaa', dark: '#555555' },
  portugal: { light: '#f4f4f4', dark: '#d32f2f' } // Custom Red Theme
};

const ACADEMY = {
  openings: {
    london: {
      name: "The London System",
      description: "Learn how to react no matter what Black plays.",
      startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      tree: { "d4": { responses: { "d5": { correctMove: "Bf4", nextPrompt: "Bring out your dark-squared bishop to f4.", responses: { "Nf6": { correctMove: "e3", nextPrompt: "Solidify your center with e3." } } } } } }
    }
  }
};

export default function App() {
  const [game, setGame] = useState(new Chess());
  const [engine, setEngine] = useState(null);
  
  // Interface Configuration
  const [gameMode, setGameMode] = useState('computer'); 
  const [engineThinking, setEngineThinking] = useState(false);
  const [rawScore, setRawScore] = useState(0);
  const [bestMoveArrow, setBestMoveArrow] = useState([]);
  const [history, setHistory] = useState([]);
  
  // Settings
  const [aiLevel, setAiLevel] = useState(5); 
  const [boardTheme, setBoardTheme] = useState('green');
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);

  // Click-to-move Tracking
  const [moveFrom, setMoveFrom] = useState('');
  const [optionSquares, setOptionSquares] = useState({});

  // PGN Game Review States
  const [pgnInput, setPgnInput] = useState('');
  const [reviewMoves, setReviewMoves] = useState([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(-1);
  const [coachExplanation, setCoachExplanation] = useState('');
  const [currentClassification, setCurrentClassification] = useState('');
  const [suggestedAlternativeLAN, setSuggestedAlternativeLAN] = useState('');
  const [isViewingAlt, setIsViewingAlt] = useState(false);
  const [isReviewAnalyzing, setIsReviewAnalyzing] = useState(false);

  // Ref to handle Stockfish state machine without stale closures
  const evalRef = useRef({ step: 'idle', scoreBefore: 0, scoreAfter: 0, bestMove: '', moveData: null });

  // ==========================================
  // VOICE SYNTHESIS ENGINE
  // ==========================================
  const speakText = (text) => {
    if (isVoiceMuted || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop current speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  };

  // ==========================================
  // INITIALIZE STOCKFISH ENGINE
  // ==========================================
  useEffect(() => {
    fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.1/stockfish.js')
      .then(res => res.text())
      .then(workerCode => {
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        
        worker.onmessage = (e) => {
          const line = e.data;
          
          // 1. Capture Evaluation Scores
          if (line.includes('info') && line.includes('score cp')) {
            const match = line.match(/score cp (-?\d+)/);
            if (match) {
              const score = parseInt(match[1]);
              if (evalRef.current.step === 'eval_before') evalRef.current.scoreBefore = score;
              else if (evalRef.current.step === 'eval_after') evalRef.current.scoreAfter = score;
              else setRawScore(score); // Normal play updates
            }
          }
          
          if (line.includes('info') && line.includes('score mate')) {
            const match = line.match(/score mate (-?\d+)/);
            if (match) {
              const score = parseInt(match[1]) > 0 ? 2000 : -2000;
              if (evalRef.current.step === 'eval_before') evalRef.current.scoreBefore = score;
              else if (evalRef.current.step === 'eval_after') evalRef.current.scoreAfter = score;
            }
          }

          // 2. Capture Best Move & State Transitions
          if (line.includes('bestmove')) {
            const moveLAN = line.split(' ')[1];
            
            if (evalRef.current.step === 'eval_before') {
              // We just finished evaluating the position BEFORE the mistake.
              evalRef.current.bestMove = moveLAN;
              setSuggestedAlternativeLAN(moveLAN);
              evalRef.current.step = 'eval_after';
              // Now evaluate the position AFTER the user's move
              worker.postMessage(`position fen ${evalRef.current.moveData.fenAfter}`);
              worker.postMessage('go depth 10'); // Fast evaluation for the UI
            } 
            else if (evalRef.current.step === 'eval_after') {
              // We have both scores! Calculate the true differential.
              evalRef.current.step = 'idle';
              finalizeReviewAnalysis(); 
            } 
            else if (moveLAN && moveLAN !== '(none)') {
              // NORMAL PLAY AI RESPONSE
              const from = moveLAN.substring(0, 2);
              const to = moveLAN.substring(2, 4);
              setBestMoveArrow([[from, to]]);

              if (gameMode === 'computer' && game.turn() === 'b' && !game.isGameOver()) {
                setGame(curr => {
                  const c = new Chess(curr.fen());
                  try { c.move({ from, to, promotion: 'q' }); setHistory(c.history({ verbose: true })); return c; } 
                  catch(err) { return curr; }
                });
              }
              setEngineThinking(false);
            }
          }
        };
        worker.postMessage('uci');
        worker.postMessage('isready');
        setEngine(worker);
      });
    return () => engine?.terminate();
  }, [gameMode, game]);

  // General AI Difficulty Settings
  useEffect(() => {
    if (engine) engine.postMessage(`setoption name Skill Level value ${Math.max(0, (aiLevel - 1) * 2)}`);
  }, [aiLevel, engine]);

  // Trigger engine for normal play
  useEffect(() => {
    if (!engine || game.isGameOver() || gameMode === 'review') return;
    setEngineThinking(true);
    engine.postMessage(`position fen ${game.fen()}`);
    engine.postMessage(`go depth ${Math.max(2, aiLevel + 2)}`); 
  }, [game, engine, gameMode, aiLevel]);


  // ==========================================
  // CLICK TO MOVE & HIGHLIGHT SYSTEM
  // ==========================================
  function updateOptionSquares(square) {
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) { setOptionSquares({}); return; }
    const squares = {};
    moves.forEach(m => {
      squares[m.to] = { background: game.get(m.to) ? 'radial-gradient(circle, rgba(255,0,0,0.6) 85%, transparent 85%)' : 'radial-gradient(circle, rgba(0,255,0,0.4) 25%, transparent 25%)', borderRadius: '50%' };
    });
    squares[square] = { background: 'rgba(255, 255, 0, 0.4)' };
    setOptionSquares(squares);
  }

  function handleSquareClick(square) {
    if (gameMode === 'review' || engineThinking) return;
    if (!moveFrom) {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) { setMoveFrom(square); updateOptionSquares(square); }
      return;
    }
    const gameCopy = new Chess(game.fen());
    try {
      if (gameCopy.move({ from: moveFrom, to: square, promotion: 'q' })) { setGame(gameCopy); setHistory(gameCopy.history({ verbose: true })); }
    } catch (e) {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) { setMoveFrom(square); updateOptionSquares(square); return; }
    }
    setMoveFrom(''); setOptionSquares({});
  }

  function handlePieceDrop(source, target) {
    if (gameMode === 'review' || engineThinking) return false;
    const gameCopy = new Chess(game.fen());
    try {
      if (gameCopy.move({ from: source, to: target, promotion: 'q' })) { setGame(gameCopy); setHistory(gameCopy.history({ verbose: true })); return true; }
    } catch (e) { return false; }
    return false;
  }

  // ==========================================
  // TRUE DIFFERENTIAL GAME REVIEW ENGINE
  // ==========================================
  function importPgn() {
    if (!pgnInput) return;
    try {
      const tempGame = new Chess();
      tempGame.loadPgn(pgnInput);
      const moves = tempGame.history({ verbose: true });
      
      const replayBoard = new Chess();
      const parsedReview = moves.map((m) => {
        const fenBefore = replayBoard.fen();
        replayBoard.move(m.san);
        const fenAfter = replayBoard.fen();
        return { ...m, fenBefore, fenAfter };
      });

      setReviewMoves(parsedReview);
      setGameMode('review');
      setCurrentReviewIndex(-1); // Resets state so clicking 'Next' triggers Move 1 correctly
      setGame(new Chess());
      setCoachExplanation("Ready to review. Use the Next button to analyze your moves.");
    } catch(err) {
      alert("Invalid PGN Data. Ensure you copied raw game notation.");
    }
  }

  function navigateReview(direction) {
    setIsViewingAlt(false);
    const newIdx = currentReviewIndex + direction;
    if (newIdx >= 0 && newIdx < reviewMoves.length) {
      setCurrentReviewIndex(newIdx);
      const move = reviewMoves[newIdx];
      
      // Physically update the board to the played move
      setGame(new Chess(move.fenAfter));
      
      // Start the Live Stockfish Analysis
      setIsReviewAnalyzing(true);
      setCoachExplanation("Coach is calculating variations...");
      setCurrentClassification("Analyzing...");
      
      evalRef.current = { step: 'eval_before', scoreBefore: 0, scoreAfter: 0, bestMove: '', moveData: move };
      
      if (engine) {
        engine.postMessage(`position fen ${move.fenBefore}`);
        engine.postMessage('go depth 10'); 
      }
    }
  }

  function finalizeReviewAnalysis() {
    const move = evalRef.current.moveData;
    const scoreBefore = evalRef.current.scoreBefore;
    // Stockfish score is relative to the side to move. We must invert the after score to compare.
    const scoreAfter = -evalRef.current.scoreAfter; 
    const delta = scoreAfter - scoreBefore; // Negative delta means the move was bad for the player

    let classification = "Good";
    if (delta < -300) classification = "Blunder";
    else if (delta < -100) classification = "Mistake";
    else if (delta < -40) classification = "Inaccuracy";
    else if (delta > -20 && move.lan === evalRef.current.bestMove) classification = "Best Move";
    else if (delta > 50) classification = "Great Move";

    setCurrentClassification(classification);
    generateDynamicCoachText(move, classification);
    setIsReviewAnalyzing(false);
  }

  function generateDynamicCoachText(move, classification) {
    const piece = PIECE_NAMES[move.piece];
    const isCapture = move.flags.includes('c');
    let text = "";
    
    if (classification === "Blunder" || classification === "Mistake") {
      text = `This ${piece} move is a ${classification.toLowerCase()}. `;
      text += isCapture ? `Capturing on ${move.to} opens you up to a severe counter-attack. ` : `Moving to ${move.to} surrenders control and drops your evaluation significantly. `;
      text += "Click the 'View Best Move' button to see the engine's recommended line.";
    } 
    else if (classification === "Great Move" || classification === "Best Move") {
      text = `Excellent! You found the strongest continuation. `;
      text += isCapture ? `Capturing on ${move.to} secures a material advantage. ` : `Placing the ${piece} on ${move.to} commands the board perfectly.`;
    } 
    else {
      text = `A solid move. The ${piece} is safely placed on ${move.to}, though the engine had alternative ideas.`;
    }
    
    setCoachExplanation(text);
    speakText(text); // Speak the evaluation aloud!
  }

  function showAlternativeLine() {
    if (!suggestedAlternativeLAN || currentReviewIndex === -1) return;
    const move = reviewMoves[currentReviewIndex];
    const altGame = new Chess(move.fenBefore); 
    try {
      altGame.move({ from: suggestedAlternativeLAN.substring(0, 2), to: suggestedAlternativeLAN.substring(2, 4), promotion: 'q' });
      setGame(altGame);
      setIsViewingAlt(true);
      const text = `Here is the engine's alternative. Playing this maintains a much stronger evaluation.`;
      setCoachExplanation(text);
      speakText(text);
    } catch(e) {}
  }

  function resetToCurrentReviewMove() {
    const move = reviewMoves[currentReviewIndex];
    if (move) {
      setGame(new Chess(move.fenAfter));
      setIsViewingAlt(false);
      generateDynamicCoachText(move, currentClassification); 
    }
  }

  // ==========================================
  // DYNAMIC VISUALS
  // ==========================================
  function resetToBase(mode) {
    setGameMode(mode);
    setGame(new Chess());
    setHistory([]);
    setReviewMoves([]);
    setCurrentReviewIndex(-1);
    setIsViewingAlt(false);
    window.speechSynthesis?.cancel(); // Stop talking when leaving mode
  }

  const activeSquareStyles = useMemo(() => {
    let styles = { ...optionSquares };
    if (gameMode === 'review' && currentReviewIndex >= 0 && reviewMoves[currentReviewIndex] && !isViewingAlt) {
      const move = reviewMoves[currentReviewIndex];
      // Highlight exact moved squares automatically
      styles[move.from] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' };
      styles[move.to] = { backgroundColor: 'rgba(255, 255, 0, 0.6)' };
    }
    return styles;
  }, [optionSquares, gameMode, currentReviewIndex, reviewMoves, isViewingAlt]);

  const activeArrows = useMemo(() => {
    if (gameMode === 'review') {
       if (isViewingAlt) return []; 
       if (!isReviewAnalyzing && suggestedAlternativeLAN && currentClassification !== "Best Move" && currentClassification !== "Great Move") {
         return [[suggestedAlternativeLAN.substring(0, 2), suggestedAlternativeLAN.substring(2, 4)]];
       }
       return [];
    }
    return bestMoveArrow;
  }, [gameMode, isViewingAlt, suggestedAlternativeLAN, isReviewAnalyzing, currentClassification, bestMoveArrow]);

  const badgeColorMap = { "Best Move": "#4CAF50", "Great Move": "#1baca1", "Good": "#96bc4b", "Inaccuracy": "#8c8c8c", "Mistake": "#f7c04a", "Blunder": "#b23333", "Analyzing...": "#555" };
  const currentTheme = BOARD_THEMES[boardTheme];

  return (
    <>
      <style>{`
        body { margin: 0; padding: 0; background-color: #121212; color: #fff; font-family: system-ui, sans-serif; }
        .app-container { display: flex; flex-direction: column; align-items: center; min-height: 100vh; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .menu { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 20px; }
        .btn { padding: 10px 16px; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; transition: opacity 0.2s; }
        .btn:hover { opacity: 0.8; }
        
        .main-layout { display: flex; gap: 20px; width: 100%; max-width: 1000px; justify-content: center; align-items: flex-start; flex-wrap: wrap; }
        
        .board-container { flex: 1 1 400px; max-width: 600px; width: 100%; position: relative; }
        .side-panel { flex: 1 1 300px; max-width: 400px; width: 100%; background-color: #1e1e1e; border-radius: 8px; padding: 20px; box-sizing: border-box; min-height: 480px; display: flex; flex-direction: column; }
        
        @media (max-width: 768px) {
          .main-layout { gap: 15px; }
          .board-container { max-width: 100%; }
          .side-panel { max-width: 100%; min-height: auto; }
        }

        .action-btn { width: 100%; padding: 12px; background-color: #2196F3; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
        .badge { display: flex; flex-direction: column; align-items: center; background-color: #2d2d2d; padding: 15px; border-radius: 8px; border: 1px solid #444; text-align: center; }
        .badge-tag { font-size: 14px; font-weight: bold; color: #fff; padding: 6px 16px; border-radius: 4px; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.5px; transition: background-color 0.3s; }
        
        .coach-box { background-color: #262626; border-left: 4px solid #2196F3; border-radius: 4px; padding: 15px; margin-top: 15px; display: flex; flex-direction: column; }
        .setting-row { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #333; }
        select, input[type="range"] { padding: 8px; border-radius: 4px; background: #333; color: white; border: 1px solid #555; }
      `}</style>

      <div className="app-container">
        <div className="header">
          <h1>MoRN Chess Engine</h1>
          <div className="menu">
            <button className="btn" style={{backgroundColor: gameMode === 'computer' ? '#4CAF50' : '#4a4a4a'}} onClick={() => resetToBase('computer')}>Play AI</button>
            <button className="btn" style={{backgroundColor: gameMode === 'review' ? '#2196F3' : '#4a4a4a'}} onClick={() => resetToBase('review')}>Analyze Match</button>
            <button className="btn" style={{backgroundColor: gameMode === 'settings' ? '#FF9800' : '#4a4a4a'}} onClick={() => resetToBase('settings')}>Settings</button>
          </div>
        </div>

        <div className="main-layout">
          {/* CHESSBOARD */}
          <div className="board-container">
            <Chessboard
              position={game.fen()}
              onPieceDrop={handlePieceDrop}
              onSquareClick={handleSquareClick}
              customSquareStyles={activeSquareStyles}
              showBoardNotation={true}
              customDarkSquareStyle={{ backgroundColor: currentTheme.dark }}
              customLightSquareStyle={{ backgroundColor: currentTheme.light }}
              customArrows={activeArrows}
              customArrowColor={isViewingAlt ? "rgba(33, 150, 243, 0.6)" : "rgba(0, 255, 0, 0.6)"}
              animationDuration={300}
            />
          </div>

          {/* DYNAMIC SIDE PANEL */}
          <div className="side-panel">
            
            {/* SETTINGS PANEL */}
            {gameMode === 'settings' && (
              <div>
                <h3 style={{color: '#FF9800', marginTop: 0}}>Settings & Preferences</h3>
                
                <div className="setting-row">
                  <label><strong>AI Difficulty Level</strong><br/><span style={{fontSize:'12px', color:'#aaa'}}>Level {aiLevel} (1-10)</span></label>
                  <input type="range" min="1" max="10" value={aiLevel} onChange={(e) => setAiLevel(parseInt(e.target.value))} />
                </div>

                <div className="setting-row">
                  <label><strong>Board Theme</strong></label>
                  <select value={boardTheme} onChange={(e) => setBoardTheme(e.target.value)}>
                    <option value="green">Classic Green</option>
                    <option value="wood">Tournament Wood</option>
                    <option value="ocean">Ocean Blue</option>
                    <option value="portugal">Portugal Red</option>
                    <option value="dark">Midnight Dark</option>
                  </select>
                </div>

                <div className="setting-row">
                  <label><strong>Coach Voice</strong></label>
                  <button className="btn" style={{backgroundColor: isVoiceMuted ? '#d32f2f' : '#4CAF50'}} onClick={() => setIsVoiceMuted(!isVoiceMuted)}>
                    {isVoiceMuted ? '🔇 Muted' : '🔊 Active'}
                  </button>
                </div>
              </div>
            )}

            {/* TRUE GAME REVIEW PANEL */}
            {gameMode === 'review' && (
              <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <h3 style={{color: '#2196F3', marginTop: 0}}>Advanced Review</h3>
                  <button style={{background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px'}} onClick={() => setIsVoiceMuted(!isVoiceMuted)} title="Toggle Voice Coach">
                    {isVoiceMuted ? '🔇' : '🔊'}
                  </button>
                </div>
                
                {reviewMoves.length === 0 ? (
                  <div>
                    <textarea style={{width: '100%', height: '150px', background: '#2a2a2a', color: '#fff', border: '1px solid #444', padding: '10px', marginBottom: '10px', boxSizing:'border-box'}} placeholder="Paste PGN here..." value={pgnInput} onChange={(e) => setPgnInput(e.target.value)} />
                    <button className="action-btn" onClick={importPgn}>Evaluate Logic Flow</button>
                  </div>
                ) : (
                  <div style={{display: 'flex', flexDirection: 'column', flex: 1}}>
                    {currentReviewIndex >= 0 ? (
                      <>
                        <div className="badge" style={{outline: isViewingAlt ? '2px solid #2196F3' : 'none'}}>
                           <span style={{fontSize: '14px', color: '#ccc'}}>Move {currentReviewIndex + 1}</span>
                           <h2 style={{margin: '5px 0'}}>{isViewingAlt ? "Engine Alternative" : `Played: ${reviewMoves[currentReviewIndex]?.san}`}</h2>
                           {!isViewingAlt && (
                             <div className="badge-tag" style={{ backgroundColor: badgeColorMap[currentClassification] || '#444' }}>
                               {isReviewAnalyzing ? "Analyzing..." : currentClassification}
                             </div>
                           )}
                        </div>

                        <div className="coach-box">
                           <div style={{fontWeight: 'bold', color: '#2196F3', marginBottom: '6px'}}>♟️ Virtual Coach:</div>
                           <p style={{margin: 0, fontSize: '14px', lineHeight: '1.5'}}>{coachExplanation}</p>
                        </div>

                        {(!isViewingAlt && !isReviewAnalyzing && (currentClassification === "Blunder" || currentClassification === "Mistake" || currentClassification === "Inaccuracy")) && (
                          <button className="action-btn" style={{backgroundColor: '#1baca1', marginTop: '15px'}} onClick={showAlternativeLine}>🔍 View Best Alternative</button>
                        )}
                        {isViewingAlt && (
                          <button className="action-btn" style={{backgroundColor: '#666', marginTop: '15px'}} onClick={resetToCurrentReviewMove}>↩ Return to My Move</button>
                        )}
                      </>
                    ) : (
                      <div className="coach-box" style={{flex: 1, justifyContent: 'center', textAlign: 'center'}}>
                         <p style={{margin: 0, fontSize: '16px'}}>PGN Loaded Successfully.</p>
                         <p style={{color: '#aaa', fontSize: '13px'}}>Click Next to begin the deep tactical analysis.</p>
                      </div>
                    )}

                    <div style={{display:'flex', gap:'10px', marginTop:'auto', paddingTop: '20px'}}>
                       <button className="btn" style={{flex: 1, backgroundColor: '#2a2a2a', border: '1px solid #444'}} disabled={currentReviewIndex <= 0 || isReviewAnalyzing} onClick={() => navigateReview(-1)}>← Prev</button>
                       <button className="btn" style={{flex: 1, backgroundColor: '#2a2a2a', border: '1px solid #444'}} disabled={currentReviewIndex === reviewMoves.length - 1 || isReviewAnalyzing} onClick={() => navigateReview(1)}>Next →</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI PLAY LOGS */}
            {gameMode === 'computer' && (
              <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                  <h3 style={{margin: 0}}>Match Logs</h3>
                  <span style={{fontSize: '12px', background: '#333', padding: '4px 8px', borderRadius: '4px'}}>AI Level: {aiLevel}</span>
                </div>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '14px', overflowY: 'auto', flex: 1, alignContent: 'flex-start'}}>
                  {history.map((m, i) => (<span key={i} style={{backgroundColor: '#2d2d2d', padding: '4px 8px', borderRadius: '3px'}}>{i % 2 === 0 ? `${(i/2)+1}. ` : ''}{m.san}</span>))}
                  {history.length === 0 && <p style={{color: '#888', fontStyle: 'italic'}}>Make a move to start...</p>}
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </>
  );
}
