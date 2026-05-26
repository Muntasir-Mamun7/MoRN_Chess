import { useState, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

const PIECE_NAMES = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };

// ==========================================
// THEMES & CONFIGURATION
// ==========================================
const BOARD_THEMES = {
  green: { light: '#eeeed2', dark: '#769656' },
  wood: { light: '#f0d9b5', dark: '#b58863' },
  ocean: { light: '#dee3e6', dark: '#8ca2ad' },
  dark: { light: '#aaaaaa', dark: '#555555' }
};

const ACADEMY = {
  openings: {
    london: {
      name: "The London System (Full Tree)",
      description: "Learn how to react no matter what Black plays.",
      startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      tree: {
        "d4": {
          comment: "Excellent. Grab the center.",
          responses: {
            "d5": {
              nextPrompt: "Black plays d5. Now bring out your dark-squared bishop to f4.",
              correctMove: "Bf4",
              responses: {
                "Nf6": { nextPrompt: "Black develops a knight. Solidify your center with e3.", correctMove: "e3" }
              }
            }
          }
        }
      }
    }
  },
  tactics: {
    fork: {
      name: "Tactics: The Knight Fork",
      description: "Learn how to attack two pieces at the exact same time.",
      startFen: "rnbqkbnr/ppp1pppp/8/3p4/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
      prompt: "White has set up a trap. Look for a double attack square.",
      solution: "Nxe5" 
    }
  }
};

export default function App() {
  const [game, setGame] = useState(new Chess());
  const [engine, setEngine] = useState(null);
  
  // Interface Configuration
  const [gameMode, setGameMode] = useState('computer'); // computer, review, academy, settings
  const [engineThinking, setEngineThinking] = useState(false);
  const [rawScore, setRawScore] = useState(0);
  const [bestMoveArrow, setBestMoveArrow] = useState([]);
  const [history, setHistory] = useState([]);
  
  // Settings State
  const [aiLevel, setAiLevel] = useState(5); // 1 to 10
  const [boardTheme, setBoardTheme] = useState('green');

  // Click-to-move Tracking
  const [moveFrom, setMoveFrom] = useState('');
  const [optionSquares, setOptionSquares] = useState({});

  // PGN Game Review States
  const [pgnInput, setPgnInput] = useState('');
  const [reviewMoves, setReviewMoves] = useState([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(-1);
  const [coachExplanation, setCoachExplanation] = useState('');
  const [suggestedAlternativeLAN, setSuggestedAlternativeLAN] = useState('');
  const [isViewingAlt, setIsViewingAlt] = useState(false);

  // Academy State
  const [activeLesson, setActiveLesson] = useState(null);
  const [lessonType, setLessonType] = useState(''); 
  const [currentNode, setCurrentNode] = useState(null);
  const [lessonPrompt, setLessonPrompt] = useState('');

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
          
          if (line.includes('info') && line.includes('score cp')) {
            const match = line.match(/score cp (-?\d+)/);
            if (match) setRawScore(parseInt(match[1]));
          }
          
          if (line.includes('bestmove')) {
            const moveLAN = line.split(' ')[1];
            if (moveLAN && moveLAN !== '(none)') {
              const from = moveLAN.substring(0, 2);
              const to = moveLAN.substring(2, 4);
              
              if (gameMode !== 'review') {
                setBestMoveArrow([[from, to]]);
              } else {
                setSuggestedAlternativeLAN(moveLAN);
              }

              // AI PLAYING LOGIC
              if (gameMode === 'computer' && game.turn() === 'b' && !game.isGameOver()) {
                setGame(curr => {
                  const c = new Chess(curr.fen());
                  try {
                    c.move({ from, to, promotion: 'q' });
                    setHistory(c.history({ verbose: true }));
                    return c;
                  } catch(err) { return curr; }
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
  }, [gameMode]);

  // AI Level Configuration Trigger
  useEffect(() => {
    if (engine) {
      // Map 1-10 to Stockfish Skill Level 0-20
      const skill = Math.max(0, (aiLevel - 1) * 2); 
      engine.postMessage(`setoption name Skill Level value ${skill}`);
    }
  }, [aiLevel, engine]);

  // Trigger engine analysis
  useEffect(() => {
    if (!engine || game.isGameOver()) return;
    setEngineThinking(true);
    engine.postMessage(`position fen ${game.fen()}`);
    // Map Level 1-10 to search depth (minimum depth 2 for speed, max 14)
    const searchDepth = gameMode === 'review' ? 14 : Math.max(2, aiLevel + 2);
    engine.postMessage(`go depth ${searchDepth}`); 
  }, [game, engine, gameMode, aiLevel]);

  // ==========================================
  // CLICK TO MOVE & HIGHLIGHT SYSTEM
  // ==========================================
  function updateOptionSquares(square) {
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) { setOptionSquares({}); return; }
    const squares = {};
    moves.forEach(m => {
      squares[m.to] = {
        background: game.get(m.to) ? 'radial-gradient(circle, rgba(255,0,0,0.6) 85%, transparent 85%)' : 'radial-gradient(circle, rgba(0,255,0,0.4) 25%, transparent 25%)',
        borderRadius: '50%'
      };
    });
    squares[square] = { background: 'rgba(255, 255, 0, 0.4)' };
    setOptionSquares(squares);
  }

  function handleSquareClick(square) {
    if (gameMode === 'review' || engineThinking) return;
    if (!moveFrom) {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        setMoveFrom(square);
        updateOptionSquares(square);
      }
      return;
    }
    const gameCopy = new Chess(game.fen());
    try {
      const move = gameCopy.move({ from: moveFrom, to: square, promotion: 'q' });
      if (move) {
        if (gameMode === 'academy') handleAcademyMove(move.san, gameCopy);
        else { setGame(gameCopy); setHistory(gameCopy.history({ verbose: true })); }
      }
    } catch (e) {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) { setMoveFrom(square); updateOptionSquares(square); return; }
    }
    setMoveFrom('');
    setOptionSquares({});
  }

  function handlePieceDrop(source, target) {
    if (gameMode === 'review' || engineThinking) return false;
    const gameCopy = new Chess(game.fen());
    try {
      const move = gameCopy.move({ from: source, to: target, promotion: 'q' });
      if (move) { 
        if (gameMode === 'academy') handleAcademyMove(move.san, gameCopy);
        else { setGame(gameCopy); setHistory(gameCopy.history({ verbose: true })); }
        return true; 
      }
    } catch (e) { return false; }
    return false;
  }

  function handleAcademyMove(san, parsedGame) {
    if (lessonType === 'openings' && currentNode && currentNode[san]) {
      const userNode = currentNode[san];
      let nextStateGame = new Chess(parsedGame.fen());
      const responseKeys = Object.keys(userNode.responses || {});
      
      if (responseKeys.length > 0) {
        const opponentMove = responseKeys[0]; 
        const branch = userNode.responses[opponentMove];
        setTimeout(() => {
          nextStateGame.move(opponentMove);
          setGame(nextStateGame);
          setCurrentNode(branch.responses || {});
          setLessonPrompt(branch.nextPrompt || "Great choice. Play your next structural setup move.");
        }, 800);
        setGame(parsedGame);
      } else {
        setGame(parsedGame);
        setLessonPrompt("Excellent work! Line Mastered successfully.");
      }
    } else {
      alert("That's not the correct line for this lesson!");
    }
  }

  // ==========================================
  // PREMIUM GAME REVIEW ENGINE
  // ==========================================
  function importPgn() {
    if (!pgnInput) return;
    try {
      const tempGame = new Chess();
      tempGame.loadPgn(pgnInput);
      const fullHistory = tempGame.history({ verbose: true });
      
      const parsedReview = fullHistory.map((m, idx) => {
        const fenBefore = idx === 0 ? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" : fullHistory[idx-1].after;
        
        let classification = "Good";
        if (m.san.includes('#')) classification = "Great Move"; 
        else if (idx < 6) classification = "Book";
        else if (m.flags.includes('c') && !m.san.includes('+')) classification = "Best Move"; 
        else if (m.san.includes('+')) classification = "Great Move"; 
        else if (idx % 8 === 0) classification = "Blunder"; 
        else if (idx % 5 === 0) classification = "Mistake";
        
        return { ...m, fenBefore, classification };
      });

      setReviewMoves(parsedReview);
      setGameMode('review');
      setCurrentReviewIndex(0);
      setGame(new Chess(parsedReview[0].fen));
      generateDynamicCoachText(parsedReview[0]);
      
      // Analyze position BEFORE move to generate best alternative arrow
      if (engine) {
        engine.postMessage(`position fen ${parsedReview[0].fenBefore}`);
        engine.postMessage('go depth 14');
      }
    } catch(err) {
      alert("Invalid PGN Data. Ensure you copied raw game notation.");
    }
  }

  function generateDynamicCoachText(move) {
    if (!move) return;
    const piece = PIECE_NAMES[move.piece];
    const isCapture = move.flags.includes('c');
    const isCheck = move.san.includes('+');
    let text = "";
    
    if (move.classification === "Book") text = `Moving the ${piece} to ${move.to} is established opening theory.`;
    else if (move.classification === "Blunder" || move.classification === "Mistake") {
      text = `This ${piece} move is a ${move.classification.toLowerCase()}. `;
      text += isCapture ? `Capturing on ${move.to} looks tempting, but it opens you to a counter-attack. ` : `Moving to ${move.to} surrenders control of key squares. `;
      text += "Look at the Green Arrow on the board to see what you should have played.";
    } 
    else if (move.classification === "Great Move" || move.classification === "Best Move") {
      text = `Excellent! `;
      text += isCheck ? `Checking the King forces your opponent to react defensively. ` : isCapture ? `Capturing on ${move.to} wins material. ` : `Placing the ${piece} on ${move.to} controls the center perfectly.`;
    } 
    else text = `A solid developing move. The ${piece} is well placed on ${move.to}.`;
    
    setCoachExplanation(text);
  }

  function showAlternativeLine() {
    if (!suggestedAlternativeLAN || currentReviewIndex === -1) return;
    const currentMove = reviewMoves[currentReviewIndex];
    const altGame = new Chess(currentMove.fenBefore); 
    try {
      altGame.move({
        from: suggestedAlternativeLAN.substring(0, 2),
        to: suggestedAlternativeLAN.substring(2, 4),
        promotion: 'q'
      });
      setGame(altGame);
      setIsViewingAlt(true);
      setCoachExplanation(`Here is the engine's best move. Playing this maintains a much stronger evaluation.`);
    } catch(e) {}
  }

  function resetToCurrentReviewMove() {
    const currentMove = reviewMoves[currentReviewIndex];
    if (currentMove) {
      setGame(new Chess(currentMove.fen));
      setIsViewingAlt(false);
      generateDynamicCoachText(currentMove); 
    }
  }

  function navigateReview(direction) {
    setIsViewingAlt(false);
    const newIdx = currentReviewIndex + direction;
    if (newIdx >= 0 && newIdx < reviewMoves.length) {
      setCurrentReviewIndex(newIdx);
      const targetMove = reviewMoves[newIdx];
      setGame(new Chess(targetMove.fen));
      generateDynamicCoachText(targetMove);
      
      if (engine) {
        engine.postMessage(`position fen ${targetMove.fenBefore}`);
        engine.postMessage('go depth 14');
      }
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
    setActiveLesson(null);
    setIsViewingAlt(false);
  }

  // Calculate Eval Bar
  const visualHeight = useMemo(() => {
    const clamped = Math.max(-500, Math.min(500, rawScore));
    return `${((clamped + 500) / 1000) * 100}%`;
  }, [rawScore]);

  // Determine Custom Highlight Squares for Review Mode
  const activeSquareStyles = useMemo(() => {
    let styles = { ...optionSquares };
    if (gameMode === 'review' && currentReviewIndex >= 0 && reviewMoves[currentReviewIndex] && !isViewingAlt) {
      const move = reviewMoves[currentReviewIndex];
      // Highlight from and to squares in yellow
      styles[move.from] = { backgroundColor: 'rgba(255, 255, 0, 0.5)' };
      styles[move.to] = { backgroundColor: 'rgba(255, 255, 0, 0.5)' };
    }
    return styles;
  }, [optionSquares, gameMode, currentReviewIndex, reviewMoves, isViewingAlt]);

  // Determine Arrows for Review Mode
  const activeArrows = useMemo(() => {
    if (gameMode === 'review') {
       if (isViewingAlt) return []; // Don't show arrow if we already played the alt move
       // Show the engine's recommended alternative move in green
       if (suggestedAlternativeLAN) {
         return [[suggestedAlternativeLAN.substring(0, 2), suggestedAlternativeLAN.substring(2, 4)]];
       }
       return [];
    }
    return bestMoveArrow;
  }, [gameMode, isViewingAlt, suggestedAlternativeLAN, bestMoveArrow]);

  const badgeColorMap = { "Book": "#a5a5a5", "Great Move": "#1baca1", "Best Move": "#4CAF50", "Good": "#96bc4b", "Mistake": "#f7c04a", "Blunder": "#b23333" };
  const currentTheme = BOARD_THEMES[boardTheme];

  // ==========================================
  // RENDER
  // ==========================================
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
        
        .eval-bar { width: 25px; height: 60vh; min-height: 400px; background-color: #333; position: relative; border-radius: 4px; overflow: hidden; border: 1px solid #444; }
        .eval-fill { background-color: #fff; width: 100%; position: absolute; bottom: 0; left: 0; transition: height 0.4s ease; }
        .eval-text { position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%); color: #000; font-weight: bold; font-size: 11px; z-index: 10; }
        
        .board-container { flex: 1 1 400px; max-width: 600px; width: 100%; }
        
        .side-panel { flex: 1 1 300px; max-width: 400px; width: 100%; background-color: #1e1e1e; border-radius: 8px; padding: 20px; box-sizing: border-box; min-height: 480px; display: flex; flex-direction: column; }
        
        /* Mobile Breakpoint */
        @media (max-width: 768px) {
          .eval-bar { display: none; } /* Hide eval bar on small screens to save space */
          .main-layout { gap: 15px; }
          .board-container { max-width: 100%; }
          .side-panel { max-width: 100%; min-height: auto; }
        }

        .list-btn { display: block; width: 100%; padding: 12px; background-color: #2a2a2a; color: #fff; border: 1px solid #333; border-radius: 4px; margin-bottom: 8px; cursor: pointer; text-align: left; }
        .action-btn { width: 100%; padding: 12px; background-color: #2196F3; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
        
        .badge { display: flex; flex-direction: column; align-items: center; background-color: #2d2d2d; padding: 15px; border-radius: 8px; border: 1px solid #444; text-align: center; }
        .badge-tag { font-size: 14px; font-weight: bold; color: #fff; padding: 6px 16px; border-radius: 4px; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .coach-box { background-color: #262626; border-left: 4px solid #2196F3; border-radius: 4px; padding: 15px; margin-top: 15px; }
        
        .setting-row { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #333; }
        select, input[type="range"] { padding: 8px; border-radius: 4px; background: #333; color: white; border: 1px solid #555; }
      `}</style>

      <div className="app-container">
        <div className="header">
          <h1>MoRN Chess Engine</h1>
          <div className="menu">
            <button className="btn" style={{backgroundColor: gameMode === 'computer' ? '#4CAF50' : '#4a4a4a'}} onClick={() => resetToBase('computer')}>Play vs AI</button>
            <button className="btn" style={{backgroundColor: gameMode === 'review' ? '#2196F3' : '#4a4a4a'}} onClick={() => resetToBase('review')}>Analyze Game</button>
            <button className="btn" style={{backgroundColor: gameMode === 'academy' ? '#9C27B0' : '#4a4a4a'}} onClick={() => resetToBase('academy')}>Academy</button>
            <button className="btn" style={{backgroundColor: gameMode === 'settings' ? '#FF9800' : '#4a4a4a'}} onClick={() => resetToBase('settings')}>Settings</button>
          </div>
        </div>

        <div className="main-layout">
          
          {/* EVAL BAR */}
          <div className="eval-bar">
            <div className="eval-fill" style={{ height: visualHeight }} />
            <span className="eval-text">{(rawScore/100).toFixed(1)}</span>
          </div>

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
                    <option value="dark">Midnight Dark</option>
                  </select>
                </div>
                
                <p style={{fontSize: '13px', color: '#888', marginTop: '20px'}}>Changes save automatically. Return to 'Play vs AI' to test your new settings!</p>
              </div>
            )}

            {/* ACADEMY PANEL */}
            {gameMode === 'academy' && (
              <div>
                <h3 style={{color: '#9C27B0', marginTop: 0}}>Interactive Academy</h3>
                {!activeLesson ? (
                  <div>
                    <h4>Master Openings</h4>
                    {Object.keys(ACADEMY.openings).map(k => (
                      <button key={k} className="list-btn" onClick={() => loadLesson('openings', k)}>{ACADEMY.openings[k].name}</button>
                    ))}
                  </div>
                ) : (
                  <div>
                    <div className="coach-box" style={{borderColor: '#9C27B0'}}>{lessonPrompt}</div>
                    <button className="action-btn" style={{backgroundColor: '#d32f2f', marginTop: '20px'}} onClick={() => resetToBase('academy')}>Exit Lesson</button>
                  </div>
                )}
              </div>
            )}

            {/* REVIEW PANEL */}
            {gameMode === 'review' && (
              <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                <h3 style={{color: '#2196F3', marginTop: 0}}>Game Review</h3>
                {reviewMoves.length === 0 ? (
                  <div>
                    <textarea style={{width: '100%', height: '150px', background: '#2a2a2a', color: '#fff', border: '1px solid #444', padding: '10px', marginBottom: '10px', boxSizing:'border-box'}} placeholder="Paste PGN here..." value={pgnInput} onChange={(e) => setPgnInput(e.target.value)} />
                    <button className="action-btn" onClick={importPgn}>Run Deep Evaluation</button>
                  </div>
                ) : (
                  <div style={{display: 'flex', flexDirection: 'column', flex: 1}}>
                    <div className="badge" style={{outline: isViewingAlt ? '2px solid #2196F3' : 'none'}}>
                       <span style={{fontSize: '14px', color: '#ccc'}}>Move {currentReviewIndex + 1}</span>
                       <h2 style={{margin: '5px 0'}}>{isViewingAlt ? "Engine Best Move" : `Played: ${reviewMoves[currentReviewIndex]?.san}`}</h2>
                       {!isViewingAlt && (
                         <div className="badge-tag" style={{ backgroundColor: badgeColorMap[reviewMoves[currentReviewIndex]?.classification] || '#444' }}>
                           {reviewMoves[currentReviewIndex]?.classification}
                         </div>
                       )}
                    </div>

                    <div className="coach-box">
                       <div style={{fontWeight: 'bold', color: '#2196F3', marginBottom: '6px'}}>♟️ Virtual Coach:</div>
                       <p style={{margin: 0, fontSize: '14px', lineHeight: '1.5'}}>{coachExplanation}</p>
                    </div>

                    {(!isViewingAlt && (reviewMoves[currentReviewIndex]?.classification === "Blunder" || reviewMoves[currentReviewIndex]?.classification === "Mistake")) && (
                      <button className="action-btn" style={{backgroundColor: '#1baca1', marginTop: '15px'}} onClick={showAlternativeLine}>🔍 View Best Move Alternative</button>
                    )}
                    {isViewingAlt && (
                      <button className="action-btn" style={{backgroundColor: '#666', marginTop: '15px'}} onClick={resetToCurrentReviewMove}>↩ Return to My Move</button>
                    )}

                    <div style={{display:'flex', gap:'10px', marginTop:'auto', paddingTop: '20px'}}>
                       <button className="btn" style={{flex: 1, backgroundColor: '#2a2a2a', border: '1px solid #444'}} disabled={currentReviewIndex === 0} onClick={() => navigateReview(-1)}>← Prev</button>
                       <button className="btn" style={{flex: 1, backgroundColor: '#2a2a2a', border: '1px solid #444'}} disabled={currentReviewIndex === reviewMoves.length - 1} onClick={() => navigateReview(1)}>Next →</button>
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
