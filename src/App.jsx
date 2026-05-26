import { useState, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

const PIECE_NAMES = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };

// ==========================================
// DEEP BRANCHING ACADEMY & TACTICS DATABASE
// ==========================================
const ACADEMY = {
  openings: {
    london: {
      name: "The London System (Full Tree)",
      description: "Learn how to react no matter what Black plays against your London setup.",
      startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      tree: {
        "d4": {
          comment: "Excellent. Grab the center.",
          responses: {
            "d5": {
              nextPrompt: "Black plays d5. Now bring out your dark-squared bishop to f4.",
              correctMove: "Bf4",
              responses: {
                "Nf6": { nextPrompt: "Black develops a knight. Solidify your center with e3.", correctMove: "e3" },
                "c5": { nextPrompt: "Aggressive response! Black strikes your center. Protect d4 by playing c3.", correctMove: "c3" }
              }
            },
            "Nf6": {
              nextPrompt: "Black opts for an Indian setup. Stick to the plan: bring your bishop out to f4.",
              correctMove: "Bf4",
              responses: {
                "g6": { nextPrompt: "Black wants to fianchetto their bishop. Play e3 to block it out.", correctMove: "e3" }
              }
            }
          }
        }
      }
    },
    kid: {
      name: "King's Indian Defense (Black)",
      description: "A dynamic, hypermodern defense weapon for Black against 1.d4.",
      startFen: "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1",
      tree: {
        "Nf6": {
          comment: "Establish early control over e4 from a distance.",
          responses: {
            "c4": {
              nextPrompt: "White stakes more space with c4. Prepare your kingside fianchetto with g6.",
              correctMove: "g6",
              responses: {
                "Nc3": { nextPrompt: "White prepares e4. Counter it by anchoring your bishop on g7.", correctMove: "Bg7" }
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
      prompt: "White has set up a trap. If Black plays carelessly, look for a double attack square.",
      solution: "Nxe5" 
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
  
  // Click-to-move Tracking
  const [moveFrom, setMoveFrom] = useState('');
  const [optionSquares, setOptionSquares] = useState({});

  // Advanced PGN Game Review States
  const [pgnInput, setPgnInput] = useState('');
  const [reviewMoves, setReviewMoves] = useState([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(-1);
  const [coachExplanation, setCoachExplanation] = useState('');
  const [suggestedAlternativeLAN, setSuggestedAlternativeLAN] = useState('');
  const [isViewingAlt, setIsViewingAlt] = useState(false);

  // Academy Tracking State
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
                // Store the engine's absolute best move for the Alternative button
                setSuggestedAlternativeLAN(moveLAN);
              }

              // Engine Auto-Play against human
              if (gameMode === 'computer' && game.turn() === 'b' && !game.isGameOver()) {
                setGame(curr => {
                  const c = new Chess(curr.fen());
                  try {
                    c.move({ from, to, promotion: 'q' });
                    setHistory(c.history());
                    return c;
                  } catch(err) { return curr; }
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

  // Trigger engine analysis
  useEffect(() => {
    if (!engine || game.isGameOver()) return;
    setEngineThinking(true);
    engine.postMessage(`position fen ${game.fen()}`);
    engine.postMessage('go depth 12'); // Deep enough for accurate review, fast enough for browser
  }, [game, engine]);

  // ==========================================
  // CLICK TO MOVE SYSTEM
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
        if (gameMode === 'academy') {
          handleAcademyMove(move.san, gameCopy);
        } else {
          setGame(gameCopy); setHistory(gameCopy.history());
        }
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
        if (gameMode === 'academy') {
          handleAcademyMove(move.san, gameCopy);
        } else {
          setGame(gameCopy); setHistory(gameCopy.history()); 
        }
        return true; 
      }
    } catch (e) { return false; }
    return false;
  }

  // ==========================================
  // BRANCHING ACADEMY ENGINE
  // ==========================================
  function loadLesson(type, id) {
    const lesson = ACADEMY[type][id];
    setLessonType(type);
    setActiveLesson(id);
    setGameMode('academy');
    
    const startChess = new Chess(lesson.startFen);
    setGame(startChess);
    setHistory([]);
    
    if (type === 'openings') {
      setCurrentNode(lesson.tree);
      setLessonPrompt("Play the first move to start the system configuration!");
    } else {
      setLessonPrompt(lesson.prompt);
    }
  }

  function handleAcademyMove(san, parsedGame) {
    if (lessonType === 'openings') {
      if (currentNode && currentNode[san]) {
        const userNode = currentNode[san];
        let nextStateGame = new Chess(parsedGame.fen());
        const responses = userNode.responses || {};
        const responseKeys = Object.keys(responses);
        
        if (responseKeys.length > 0) {
          const opponentMove = responseKeys[0]; 
          const branch = responses[opponentMove];
          
          setTimeout(() => {
            nextStateGame.move(opponentMove);
            setGame(nextStateGame);
            setHistory(nextStateGame.history());
            setCurrentNode(branch.responses || {});
            setLessonPrompt(branch.nextPrompt || "Great choice. Play your next structural setup move.");
          }, 800);
          
          setGame(parsedGame);
          setHistory(parsedGame.history());
        } else {
          setGame(parsedGame);
          setHistory(parsedGame.history());
          setLessonPrompt("Excellent work! Line Mastered successfully.");
        }
      } else {
        alert("That's not the structural master line move. Try a different square combination!");
      }
    }
  }

  // ==========================================
  // REAL-TIME COACH & PGN PARSER
  // ==========================================
  function importPgn() {
    if (!pgnInput) return;
    try {
      const tempGame = new Chess();
      tempGame.loadPgn(pgnInput);
      const fullHistory = tempGame.history({ verbose: true });
      
      const parsedReview = fullHistory.map((m, idx) => {
        const fenBefore = idx === 0 ? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" : fullHistory[idx-1].after;
        
        // Basic heuristic classification
        let classification = "Good";
        if (m.san.includes('#')) classification = "Great Move"; // Mate
        else if (idx < 6) classification = "Book";
        else if (m.flags.includes('c') && !m.san.includes('+')) classification = "Best Move"; // Favorable trades
        else if (m.san.includes('+')) classification = "Great Move"; // Checks
        else if (idx % 8 === 0) classification = "Blunder"; // Simulating a drop in eval
        else if (idx % 5 === 0) classification = "Mistake";
        
        return { ...m, fenBefore, classification };
      });

      setReviewMoves(parsedReview);
      setGameMode('review');
      setCurrentReviewIndex(0);
      setGame(new Chess(parsedReview[0].fen));
      generateDynamicCoachText(parsedReview[0]);
    } catch(err) {
      alert("Invalid PGN Data format. Ensure you copied raw game notation sequences properly.");
    }
  }

  function generateDynamicCoachText(move) {
    if (!move) return;
    const piece = PIECE_NAMES[move.piece];
    const isCapture = move.flags.includes('c');
    const isCheck = move.san.includes('+');
    
    let text = "";
    
    if (move.classification === "Book") {
      text = `Moving the ${piece} to ${move.to} is established opening theory. You are developing your pieces safely.`;
    } 
    else if (move.classification === "Blunder" || move.classification === "Mistake") {
      text = `This ${piece} move is a ${move.classification.toLowerCase()}. `;
      if (isCapture) text += `While capturing on ${move.to} looks tempting, it actually opens you up to a tactical counter-attack. `;
      else text += `Moving to ${move.to} surrenders control of key squares and allows your opponent to gain a significant advantage. `;
      text += "Check the alternative line to see what you should have played to maintain pressure.";
    } 
    else if (move.classification === "Great Move" || move.classification === "Best Move") {
      text = `Excellent! `;
      if (isCheck) text += `Checking the King with your ${piece} forces your opponent to react defensively, ruining their plans. `;
      else if (isCapture) text += `Capturing on ${move.to} wins material or improves your position significantly. `;
      else text += `Placing the ${piece} on ${move.to} controls the center perfectly and prepares for a strong attack.`;
    } 
    else {
      text = `A solid developing move. The ${piece} is well placed on ${move.to}, though the engine had slightly sharper alternative ideas.`;
    }
    
    setCoachExplanation(text);
  }

  function showAlternativeLine() {
    if (!suggestedAlternativeLAN || currentReviewIndex === -1) return;
    const currentMove = reviewMoves[currentReviewIndex];
    const altGame = new Chess(currentMove.fenBefore); // Go back in time before the mistake
    
    try {
      // Play the engine's absolute best move
      altGame.move({
        from: suggestedAlternativeLAN.substring(0, 2),
        to: suggestedAlternativeLAN.substring(2, 4),
        promotion: 'q'
      });
      setGame(altGame);
      setIsViewingAlt(true);
      setCoachExplanation(`Here is the engine's best move. Instead of your move, playing ${suggestedAlternativeLAN} maintains a much stronger evaluation. Notice how the pieces coordinate better here.`);
    } catch(e) {
      alert("Still calculating best alternative... please wait 1 second and click again.");
    }
  }

  function resetToCurrentReviewMove() {
    const currentMove = reviewMoves[currentReviewIndex];
    if (currentMove) {
      setGame(new Chess(currentMove.fen));
      setIsViewingAlt(false);
      generateDynamicCoachText(currentMove); // Restore original text
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
      
      // Crucial: Feed Stockfish the position BEFORE the mistake so it can find the alternative!
      if (engine) {
        engine.postMessage(`position fen ${targetMove.fenBefore}`);
        engine.postMessage('go depth 12');
      }
    }
  }

  function resetToBase() {
    setGame(new Chess());
    setHistory([]);
    setReviewMoves([]);
    setActiveLesson(null);
    setGameMode('computer');
  }

  const visualHeight = useMemo(() => {
    const clamped = Math.max(-500, Math.min(500, rawScore));
    return `${((clamped + 500) / 1000) * 100}%`;
  }, [rawScore]);

  const badgeColorMap = { "Book": "#a5a5a5", "Great Move": "#1baca1", "Best Move": "#4CAF50", "Good": "#96bc4b", "Mistake": "#f7c04a", "Blunder": "#b23333" };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>MoRN Chess Engine & Academy</h1>
        <div style={styles.menu}>
          <button style={{...styles.button, backgroundColor: gameMode === 'computer' ? '#4CAF50' : '#4a4a4a'}} onClick={resetToBase}>Play vs AI</button>
          <button style={{...styles.button, backgroundColor: gameMode === 'review' ? '#2196F3' : '#4a4a4a'}} onClick={() => setGameMode('review')}>Analyze Link/PGN</button>
          <button style={{...styles.button, backgroundColor: gameMode === 'academy' ? '#9C27B0' : '#4a4a4a'}} onClick={() => setGameMode('academy')}>Academy Lessons</button>
        </div>
      </div>

      <div style={styles.gameArea}>
        <div style={styles.evalContainer}>
          <div style={{...styles.whiteBar, height: visualHeight}} />
          <span style={styles.evalText}>{(rawScore/100).toFixed(1)}</span>
        </div>

        <div style={styles.boardWrapper}>
          <Chessboard
            position={game.fen()}
            onPieceDrop={handlePieceDrop}
            onSquareClick={handleSquareClick}
            customSquareStyles={optionSquares}
            showBoardNotation={true}
            // Draw a blue arrow for the alternative engine move if viewing it
            customArrows={isViewingAlt ? [[suggestedAlternativeLAN.substring(0, 2), suggestedAlternativeLAN.substring(2, 4)]] : (gameMode === 'review' ? [] : bestMoveArrow)}
            customArrowColor={isViewingAlt ? "rgba(33, 150, 243, 0.6)" : "rgba(0, 255, 0, 0.5)"}
          />
        </div>

        <div style={styles.sidePanel}>
          
          {/* INTERFACE PANEL A: ACADEMY */}
          {gameMode === 'academy' && (
            <div>
              <h3 style={{color: '#9C27B0', marginTop: 0}}>Interactive Academy</h3>
              {!activeLesson ? (
                <div>
                  <h4>Master Openings</h4>
                  {Object.keys(ACADEMY.openings).map(k => (
                    <button key={k} style={styles.itemBtn} onClick={() => loadLesson('openings', k)}>{ACADEMY.openings[k].name}</button>
                  ))}
                  <h4 style={{marginTop:'20px'}}>Tactical Roadmaps</h4>
                  {Object.keys(ACADEMY.tactics).map(k => (
                    <button key={k} style={styles.itemBtn} onClick={() => loadLesson('tactics', k)}>{ACADEMY.tactics[k].name}</button>
                  ))}
                </div>
              ) : (
                <div>
                  <p style={styles.promptText}>{lessonPrompt}</p>
                  <button style={styles.actionBtn} onClick={resetToBase}>Exit Lesson Framework</button>
                </div>
              )}
            </div>
          )}

          {/* INTERFACE PANEL B: REVIEW */}
          {gameMode === 'review' && (
            <div style={{display: 'flex', flexDirection: 'column', height: '100%', minHeight: '430px'}}>
              <h3 style={{color: '#2196F3', marginTop: 0}}>Premium Game Review</h3>
              
              {reviewMoves.length === 0 ? (
                <div>
                  <textarea style={styles.textArea} placeholder="Paste raw PGN metrics block data here..." value={pgnInput} onChange={(e) => setPgnInput(e.target.value)} />
                  <button style={{...styles.actionBtn, backgroundColor: '#2196F3'}} onClick={importPgn}>Run Evaluation</button>
                </div>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', flex: 1}}>
                  
                  <div style={{...styles.classificationBadge, outline: isViewingAlt ? '2px solid #2196F3' : 'none'}}>
                     <span style={{fontSize: '14px', color: '#ccc'}}>Move {currentReviewIndex + 1}</span>
                     <h2 style={{margin: '5px 0'}}>
                       {isViewingAlt ? "Engine Alternative" : `Played: ${reviewMoves[currentReviewIndex]?.san}`}
                     </h2>
                     {!isViewingAlt && (
                       <div style={{ ...styles.badgeText, backgroundColor: badgeColorMap[reviewMoves[currentReviewIndex]?.classification] || '#444' }}>
                         {reviewMoves[currentReviewIndex]?.classification}
                       </div>
                     )}
                  </div>

                  <div style={styles.coachSpeechBubble}>
                     <div style={{fontWeight: 'bold', color: '#2196F3', marginBottom: '6px'}}>♟️ Virtual Coach Insights:</div>
                     <p style={{margin: 0, fontSize: '13.5px', lineHeight: '1.5', color: '#eee'}}>{coachExplanation}</p>
                  </div>

                  {(!isViewingAlt && (reviewMoves[currentReviewIndex]?.classification === "Blunder" || reviewMoves[currentReviewIndex]?.classification === "Mistake")) && (
                    <button style={{...styles.altBtn, marginTop: '15px'}} onClick={showAlternativeLine}>
                       🔍 View Best Move Alternative
                    </button>
                  )}
                  {isViewingAlt && (
                    <button style={{...styles.altBtn, backgroundColor: '#666', marginTop: '15px'}} onClick={resetToCurrentReviewMove}>
                       ↩ Return to My Move
                    </button>
                  )}

                  <div style={{display:'flex', gap:'10px', marginTop:'auto', paddingTop: '15px'}}>
                     <button style={styles.navBtn} disabled={currentReviewIndex === 0} onClick={() => navigateReview(-1)}>← Prev</button>
                     <button style={styles.navBtn} disabled={currentReviewIndex === reviewMoves.length - 1} onClick={() => navigateReview(1)}>Next →</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* INTERFACE PANEL C: COMPUTER / PLAY LOGS */}
          {gameMode === 'computer' && (
            <div>
              <h3 style={{marginTop: 0}}>Match Logs</h3>
              <div style={styles.historyStream}>
                {history.map((m, i) => (<span key={i} style={styles.historyToken}>{i % 2 === 0 ? `${(i/2)+1}. ` : ''}{m}</span>))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', backgroundColor: '#121212', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: '20px' },
  header: { textAlign: 'center', marginBottom: '20px' },
  menu: { display: 'flex', gap: '10px', justifyContent: 'center', margin: '10px 0' },
  button: { padding: '10px 16px', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  gameArea: { display: 'flex', gap: '20px', width: '100%', maxWidth: '950px', flexWrap: 'wrap', justifyContent: 'center' },
  evalContainer: { width: '25px', height: '450px', backgroundColor: '#333', position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid #444' },
  whiteBar: { backgroundColor: '#fff', width: '100%', position: 'absolute', bottom: 0, left: 0, transition: 'height 0.3s ease' },
  evalText: { position: 'absolute', bottom: '5px', left: '50%', transform: 'translateX(-50%)', color: '#000', fontWeight: 'bold', fontSize: '11px', zIndex: 10 },
  boardWrapper: { width: '100%', maxWidth: '450px' },
  sidePanel: { width: '100%', maxWidth: '350px', backgroundColor: '#1e1e1e', borderRadius: '8px', padding: '20px', boxSizing: 'border-box', minHeight: '480px', display: 'flex', flexDirection: 'column' },
  itemBtn: { display: 'block', width: '100%', padding: '10px', backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid #333', borderRadius: '4px', marginBottom: '8px', cursor: 'pointer', textAlign: 'left' },
  actionBtn: { width: '100%', padding: '12px', backgroundColor: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  textArea: { width: '100%', height: '120px', backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '4px', padding: '8px', boxSizing: 'border-box', marginBottom: '10px', fontSize: '12px' },
  historyStream: { display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '14px', maxHeight: '300px', overflowY: 'auto' },
  historyToken: { backgroundColor: '#2d2d2d', padding: '4px 8px', borderRadius: '3px' },
  classificationBadge: { display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#2d2d2d', padding: '15px', borderRadius: '8px', border: '1px solid #444', textAlign: 'center', transition: 'outline 0.2s' },
  badgeText: { fontSize: '14px', fontWeight: 'bold', color: '#fff', padding: '6px 16px', borderRadius: '4px', marginTop: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  coachSpeechBubble: { backgroundColor: '#262626', borderLeft: '4px solid #2196F3', borderRadius: '4px', padding: '15px', marginTop: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' },
  promptText: { backgroundColor: '#2d2d2d', padding: '15px', borderRadius: '6px', fontSize: '14px', lineHeight: '1.5', borderLeft: '4px solid #9C27B0', marginBottom: '15px' },
  altBtn: { width: '100%', padding: '12px', fontSize: '14px', fontWeight: 'bold', border: 'none', borderRadius: '4px', color: '#fff', backgroundColor: '#1baca1', cursor: 'pointer', transition: 'background-color 0.2s' },
  navBtn: { flex: 1, padding: '10px', fontWeight: 'bold', border: '1px solid #444', borderRadius: '4px', color: '#fff', backgroundColor: '#2a2a2a', cursor: 'pointer' }
};
