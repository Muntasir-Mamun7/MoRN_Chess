import { useState, useEffect, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

// ==========================================
// CONSTANTS, THEMES & ICONS
// ==========================================
const PIECE_NAMES = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };

const COLORS = {
  Brilliant: "#1baca1", Great: "#5c8bb0", Best: "#81b64c", Excellent: "#96bc4b",
  Good: "#96bc4b", Book: "#a5a5a5", Inaccuracy: "#f0c15c", Mistake: "#e58f2a",
  Blunder: "#ca3431", Miss: "#ff7769", Default: "#312e2b"
};

const ICONS = {
  Brilliant: "!!", Great: "!", Best: "★", Excellent: "👍",
  Good: "✓", Book: "📖", Inaccuracy: "?!", Mistake: "?",
  Blunder: "??", Miss: "✖"
};

// ==========================================
// CHESS.COM CAPS v2 ACCURACY ALGORITHM
// ==========================================
// 1. Convert raw engine Centipawns (cp) to Expected Win Percentage (0 to 100)
function cpToWinProb(cp) {
  // Using the standard logistic curve parameter: 0.00368208
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

// 2. Classify move based on Win Probability Loss
function classifyMove(cpBefore, cpAfter, isBook) {
  if (isBook) return "Book";
  
  const wpBefore = cpToWinProb(cpBefore);
  const wpAfter = cpToWinProb(cpAfter);
  const loss = Math.max(0, wpBefore - wpAfter);

  if (loss <= 2) return "Best Move";
  if (loss <= 5) return "Excellent";
  if (loss <= 10) return "Good";
  if (loss <= 20) return "Inaccuracy";
  if (loss <= 30) return "Mistake";
  return "Blunder";
}

// 3. Calculate Overall Accuracy (0 - 100)
function calculateAccuracy(winProbBefore, winProbAfter) {
  const diff = Math.max(0, winProbBefore - winProbAfter);
  let accuracy = 103.1668 * Math.exp(-0.04354 * diff) - 3.1669;
  return Math.max(0, Math.min(100, accuracy));
}

// ==========================================
// MAIN APPLICATION
// ==========================================
export default function App() {
  const [game, setGame] = useState(new Chess());
  const [engine, setEngine] = useState(null);
  
  const [gameMode, setGameMode] = useState('input'); // input, review, summary
  const [pgnInput, setPgnInput] = useState('');
  const [reviewMoves, setReviewMoves] = useState([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(-1);
  const [isViewingAlt, setIsViewingAlt] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const [summaryData, setSummaryData] = useState(null);
  const batchRef = useRef({ isActive: false, queue: [], results: [], currentScore: 0, currentMate: null, parsedReview: [] });

  // Initialize Stockfish Web Worker
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
            if (match) {
              batchRef.current.currentScore = parseInt(match[1]);
              batchRef.current.currentMate = null;
            }
          }
          if (line.includes('info') && line.includes('score mate')) {
            const match = line.match(/score mate (-?\d+)/);
            if (match) {
              batchRef.current.currentMate = parseInt(match[1]);
              batchRef.current.currentScore = batchRef.current.currentMate > 0 ? 30000 : -30000;
            }
          }

          if (line.includes('bestmove')) {
            const moveLAN = line.split(' ')[1];
            if (batchRef.current.isActive) {
              batchRef.current.results.push({
                score: batchRef.current.currentScore,
                mate: batchRef.current.currentMate,
                bestMove: moveLAN !== '(none)' ? moveLAN : ''
              });

              const completed = batchRef.current.results.length;
              const total = batchRef.current.queue.length;
              setProgress((completed / total) * 100);

              if (completed < total) {
                worker.postMessage(`position fen ${batchRef.current.queue[completed]}`);
                // Use Depth 12 for accuracy matching Chess.com's baseline analysis
                worker.postMessage('go depth 12'); 
              } else {
                finishBatchAnalysis();
              }
            }
          }
        };
        worker.postMessage('uci');
        setEngine(worker);
      });
    return () => engine?.terminate();
  }, []);

  function startAnalysis() {
    if (!pgnInput || !engine) return;
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

      const fenList = ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", ...parsedReview.map(m => m.fenAfter)];
      
      batchRef.current = { isActive: true, queue: fenList, results: [], currentScore: 0, currentMate: null, parsedReview };
      setIsAnalyzing(true);
      setProgress(0);
      setGameMode('review');
      
      engine.postMessage(`position fen ${fenList[0]}`);
      engine.postMessage('go depth 12');
    } catch(err) { alert("Invalid PGN."); }
  }

  function finishBatchAnalysis() {
    const { parsedReview, results } = batchRef.current;
    
    let wAccSum = 0, bAccSum = 0, wMoves = 0, bMoves = 0;
    const counts = { w: { Best:0, Excellent:0, Good:0, Inaccuracy:0, Mistake:0, Blunder:0, Book:0 }, b: { Best:0, Excellent:0, Good:0, Inaccuracy:0, Mistake:0, Blunder:0, Book:0 } };

    const finalizedMoves = parsedReview.map((m, idx) => {
      const beforeData = results[idx] || {score: 0, mate: null, bestMove: ''};
      const afterData = results[idx + 1] || {score: 0, mate: null, bestMove: ''};

      const scoreBefore = beforeData.score;
      const scoreAfter = -afterData.score; // Invert to current player's perspective

      const isBook = idx < 8 && (scoreAfter - scoreBefore) > -50;
      let classification = classifyMove(scoreBefore, scoreAfter, isBook);

      if (m.san.includes('#')) classification = "Best Move"; // Mates are always best

      const wpBefore = cpToWinProb(scoreBefore);
      const wpAfter = cpToWinProb(scoreAfter);
      const accuracy = calculateAccuracy(wpBefore, wpAfter);

      // Tally mapping logic
      const mapKey = classification === "Best Move" ? "Best" : classification;
      if (counts[m.color][mapKey] !== undefined) counts[m.color][mapKey]++;
      
      if (m.color === 'w' && !isBook) { wAccSum += accuracy; wMoves++; }
      if (m.color === 'b' && !isBook) { bAccSum += accuracy; bMoves++; }

      return { 
        ...m, 
        classification, 
        bestMoveLAN: beforeData.bestMove, 
        evalScore: scoreAfter,
        evalMate: afterData.mate,
        accuracy
      };
    });

    setSummaryData({
      wAcc: wMoves ? (wAccSum / wMoves).toFixed(1) : 100,
      bAcc: bMoves ? (bAccSum / bMoves).toFixed(1) : 100,
      counts
    });

    setReviewMoves(finalizedMoves);
    setIsAnalyzing(false);
    batchRef.current.isActive = false;
    setCurrentReviewIndex(-1);
    setGameMode('review');
  }

  function navigateReview(direction) {
    if (direction === 'start') setCurrentReviewIndex(-1);
    else if (direction === 'end') setCurrentReviewIndex(reviewMoves.length - 1);
    else {
      const newIdx = currentReviewIndex + direction;
      if (newIdx >= -1 && newIdx < reviewMoves.length) {
        setCurrentReviewIndex(newIdx);
        setGame(newIdx === -1 ? new Chess() : new Chess(reviewMoves[newIdx].fenAfter));
      }
    }
    setIsViewingAlt(false);
  }

  const currentMove = currentReviewIndex >= 0 ? reviewMoves[currentReviewIndex] : null;
  const currentFen = currentMove ? currentMove.fenAfter : "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  
  let evalString = "0.00";
  let evalRaw = 0;
  if (currentMove) {
    if (currentMove.evalMate) {
      evalString = `M${Math.abs(currentMove.evalMate)}`;
      evalRaw = currentMove.evalMate > 0 ? 1000 : -1000;
    } else {
      evalRaw = currentMove.color === 'w' ? currentMove.evalScore : -currentMove.evalScore;
      evalString = `${evalRaw > 0 ? '+' : ''}${(evalRaw / 100).toFixed(2)}`;
    }
  } else if (reviewMoves.length > 0) {
    evalRaw = reviewMoves[0].evalScore;
    evalString = `${evalRaw > 0 ? '+' : ''}${(evalRaw / 100).toFixed(2)}`;
  }

  const evalHeight = useMemo(() => {
    const clamped = Math.max(-500, Math.min(500, evalRaw));
    return `${((clamped + 500) / 1000) * 100}%`;
  }, [evalRaw]);

  const activeSquareStyles = useMemo(() => {
    let styles = {};
    if (currentMove && !isViewingAlt) {
      styles[currentMove.from] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' }; 
      styles[currentMove.to] = { backgroundColor: 'rgba(255, 255, 0, 0.6)' };  
    }
    return styles;
  }, [currentMove, isViewingAlt]);

  const activeArrows = useMemo(() => {
    if (isViewingAlt) return []; 
    if (currentMove && currentMove.bestMoveLAN && ["Blunder", "Mistake", "Inaccuracy"].includes(currentMove.classification)) {
      return [
        [currentMove.from, currentMove.to, "rgba(202, 52, 49, 0.8)"], 
        [currentMove.bestMoveLAN.substring(0, 2), currentMove.bestMoveLAN.substring(2, 4), "rgba(129, 182, 76, 0.8)"]
      ];
    }
    return [];
  }, [currentMove, isViewingAlt]);

  const classificationColor = COLORS[currentMove?.classification] || COLORS.Good;
  const classificationIcon = ICONS[currentMove?.classification] || '✓';

  return (
    <>
      <style>{`
        body { margin: 0; padding: 0; background-color: #312e2b; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; overflow: hidden; }
        .layout-grid { display: flex; height: 100vh; width: 100vw; }
        
        /* LEFT: EVAL BAR + BOARD */
        .left-panel { flex: 1; display: flex; align-items: center; justify-content: center; background: #312e2b; padding: 20px; gap: 20px; min-width: 600px; }
        
        .eval-container { width: 30px; height: calc(100vh - 120px); max-height: 720px; background: #403d39; border-radius: 4px; display: flex; flex-direction: column; overflow: hidden; position: relative; border: 2px solid #262421; }
        .eval-fill { background: #fff; width: 100%; position: absolute; bottom: 0; transition: height 0.4s ease; }
        .eval-text { position: absolute; width: 100%; text-align: center; font-size: 10px; font-weight: bold; z-index: 10; padding: 4px 0; }

        .board-container { width: 100%; max-width: 720px; display: flex; flex-direction: column; gap: 12px; }
        .player-tag { display: flex; justify-content: space-between; align-items: center; font-size: 14px; color: #a59f97; }
        .player-tag-left { display: flex; align-items: center; gap: 10px; }
        .player-tag strong { color: #fff; font-size: 15px; }
        .avatar { width: 36px; height: 36px; background: #403d39; border-radius: 4px; background-size: cover; background-position: center; }
        .clock { background: #fff; color: #333; font-weight: bold; padding: 6px 12px; border-radius: 4px; font-size: 16px; font-family: monospace; }
        .clock.dark { background: #262421; color: #a59f97; }

        /* RIGHT: REVIEW PANEL */
        .right-panel { width: 450px; background: #262421; display: flex; flex-direction: column; height: 100%; border-left: 1px solid #403d39; }
        
        .panel-header { display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid #403d39; font-weight: bold; font-size: 16px; background: #1e1e1e; }
        .header-icons { color: #a59f97; display: flex; gap: 15px; cursor: pointer; }

        .coach-section { padding: 20px; display: flex; gap: 15px; background: #262421; }
        .coach-avatar { width: 48px; height: 48px; background: url('https://www.chess.com/bundles/web/images/coach/coach-anya.png') center/cover; border-radius: 50%; }
        .coach-bubble { flex: 1; background: #fff; color: #333; padding: 15px; border-radius: 12px; border-top-left-radius: 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); position: relative; }
        .bubble-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .bubble-badge { display: flex; align-items: center; gap: 8px; font-weight: bold; font-size: 14px; }
        .icon-badge { width: 20px; height: 20px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; }
        .eval-pill { background: #333; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }

        .resume-bar { padding: 0 20px 20px 20px; }
        .resume-btn { width: 100%; background: #81b64c; color: #fff; border: none; padding: 12px; border-radius: 6px; font-weight: bold; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .resume-btn:hover { background: #96bc4b; }

        .move-list { flex: 1; overflow-y: auto; background: #2b2826; }
        .move-row { display: flex; border-bottom: 1px solid #312e2b; background: #262421; }
        .move-num { width: 45px; text-align: center; padding: 10px 0; color: #888; font-size: 13px; background: #312e2b; }
        .move-cell { flex: 1; padding: 10px 15px; cursor: pointer; display: flex; align-items: center; font-weight: bold; font-size: 14px; color: #a59f97; }
        .move-cell:hover { background: #312e2b; }
        .move-cell.active { background: #403d39; color: #fff; }
        .inline-icon { width: 16px; height: 16px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 9px; margin-right: 8px; }

        .graph-section { height: 80px; background: #1e1e1e; border-top: 1px solid #403d39; position: relative; display: flex; align-items: flex-end; }
        .graph-area { width: 100%; height: 100%; }

        .nav-controls { display: flex; background: #262421; padding: 15px; gap: 5px; align-items: center; border-top: 1px solid #403d39; }
        .nav-icon-btn { flex: 1; background: #312e2b; border: none; color: #a59f97; padding: 15px 0; border-radius: 6px; cursor: pointer; font-size: 18px; transition: background 0.2s; }
        .nav-icon-btn:hover:not(:disabled) { background: #403d39; color: #fff; }
        .nav-icon-btn:disabled { opacity: 0.5; cursor: default; }

        .pgn-input { padding: 30px; display: flex; flex-direction: column; height: 100%; }
        .pgn-textarea { width: 100%; height: 250px; background: #1e1e1e; color: #fff; border: 1px solid #403d39; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-family: monospace; resize: none; box-sizing: border-box; }
        
        /* Graph Styles */
        svg path.fill { fill: rgba(255, 255, 255, 0.1); }
      `}</style>

      <div className="layout-grid">
        
        {/* LEFT PANEL */}
        <div className="left-panel">
          {/* Evaluation Bar */}
          <div className="eval-container">
            <div className="eval-text" style={{ top: 0, color: evalRaw < 0 ? '#fff' : '#888' }}>
              {evalRaw < 0 ? evalString : ''}
            </div>
            <div className="eval-fill" style={{ height: evalHeight }} />
            <div className="eval-text" style={{ bottom: 0, color: evalRaw > 0 ? '#333' : '#888' }}>
              {evalRaw > 0 ? evalString : ''}
            </div>
          </div>

          {/* Board Area */}
          <div className="board-container">
            
            {/* Top Player (Opponent) */}
            <div className="player-tag">
              <div className="player-tag-left">
                <div className="avatar" style={{backgroundImage: "url('https://www.chess.com/bundles/web/images/user-image.svg')"}}></div>
                <div>
                  <strong>sjjad_98</strong> (319) 🇮🇶
                </div>
              </div>
              <div className="clock dark">06:33</div>
            </div>

            <Chessboard
              position={currentFen}
              customSquareStyles={activeSquareStyles}
              showBoardNotation={true}
              customDarkSquareStyle={{ backgroundColor: "#b58863" }} // Classic wood dark
              customLightSquareStyle={{ backgroundColor: "#f0d9b5" }} // Classic wood light
              customArrows={activeArrows.map(arr => [arr[0], arr[1]])}
              customArrowColor={activeArrows.length > 0 ? activeArrows[0][2] : "rgba(129, 182, 76, 0.8)"}
              animationDuration={200}
            />

            {/* Bottom Player (MoRN07) */}
            <div className="player-tag">
              <div className="player-tag-left">
                <div className="avatar" style={{backgroundImage: "url('https://images.chesscomfiles.com/uploads/v1/user/326880000.3fa6db7f.160x160o.22304859846b.png')"}}></div>
                <div>
                  <strong>MoRN07</strong> (326) 🇵🇹 💎
                  <div style={{fontSize: '11px', color: '#888', marginTop: '2px'}}>♙♙♘♗♕ +6</div>
                </div>
              </div>
              <div className="clock">07:53</div>
            </div>

          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">
          
          <div className="panel-header">
            <span style={{cursor:'pointer', color:'#a59f97'}} onClick={() => setGameMode('input')}>←</span>
            <span>★ Game Review</span>
            <div className="header-icons">
              <span>🔊</span>
              <span>⚙</span>
            </div>
          </div>

          {gameMode === 'input' && (
            <div className="pgn-input">
              <h2 style={{marginTop: 0}}>Analyze Game</h2>
              <textarea className="pgn-textarea" placeholder="Paste PGN text here..." value={pgnInput} onChange={(e) => setPgnInput(e.target.value)} />
              <button className="resume-btn" onClick={startAnalysis}>Run Review</button>
            </div>
          )}

          {isAnalyzing && (
            <div className="pgn-input" style={{alignItems: 'center', textAlign: 'center'}}>
              <h2>Deep Analysis Running</h2>
              <p style={{color: '#a59f97'}}>Stockfish 16 is evaluating the game...</p>
              <div style={{width: '100%', height: '8px', background: '#403d39', borderRadius: '4px', marginTop: '20px', overflow: 'hidden'}}>
                <div style={{width: `${progress}%`, height: '100%', background: '#81b64c', transition: 'width 0.2s'}} />
              </div>
            </div>
          )}

          {gameMode === 'review' && (
            <>
              {/* Coach Section */}
              <div className="coach-section">
                <div className="coach-avatar"></div>
                <div className="coach-bubble">
                  {currentReviewIndex === -1 ? (
                    <div style={{fontSize: '15px', fontWeight: 'bold'}}>You had a nice tactical find in this game. Let's review!</div>
                  ) : (
                    <>
                      <div className="bubble-top">
                        <div className="bubble-badge">
                          <div className="icon-badge" style={{backgroundColor: classificationColor}}>{classificationIcon}</div>
                          {currentMove?.san} is {currentMove?.classification?.toLowerCase()}
                        </div>
                        <div className="eval-pill">{evalString}</div>
                      </div>
                      <div style={{fontSize: '13px', lineHeight: '1.5'}}>
                        {currentMove?.classification === "Best Move" ? "This keeps an eye on the position while staying active." : 
                         currentMove?.classification === "Blunder" ? "You permitted the opponent to win material." : 
                         "A solid move that controls space."}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action Bar */}
              <div className="resume-bar">
                <button className="resume-btn">▶ Resume</button>
              </div>

              {/* Move List */}
              <div className="move-list">
                {Array.from({ length: Math.ceil(reviewMoves.length / 2) }).map((_, i) => {
                  const wMove = reviewMoves[i * 2];
                  const bMove = reviewMoves[i * 2 + 1];
                  return (
                    <div className="move-row" key={i}>
                      <div className="move-num">{i + 1}.</div>
                      
                      <div className={`move-cell ${currentReviewIndex === i * 2 ? 'active' : ''}`} onClick={() => navigateReview((i * 2) - currentReviewIndex)}>
                        {wMove.classification && <div className="inline-icon" style={{backgroundColor: COLORS[wMove.classification]}}>{ICONS[wMove.classification]}</div>}
                        {wMove.san}
                      </div>

                      {bMove ? (
                        <div className={`move-cell ${currentReviewIndex === i * 2 + 1 ? 'active' : ''}`} onClick={() => navigateReview((i * 2 + 1) - currentReviewIndex)}>
                          {bMove.classification && <div className="inline-icon" style={{backgroundColor: COLORS[bMove.classification]}}>{ICONS[bMove.classification]}</div>}
                          {bMove.san}
                        </div>
                      ) : <div className="move-cell"></div>}
                    </div>
                  );
                })}
              </div>

              {/* Graph Area */}
              <div className="graph-section">
                <svg className="graph-area" preserveAspectRatio="none">
                  {/* Center Line */}
                  <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#555" strokeWidth="1" />
                  
                  {/* Filled Area & Line */}
                  {reviewMoves.length > 0 && (
                    <>
                      <path 
                        className="fill"
                        d={`M 0,40 ${reviewMoves.map((m, i) => {
                          const x = ((i + 1) / reviewMoves.length) * 100;
                          const cp = m.color === 'w' ? m.evalScore : -m.evalScore; 
                          const clamped = Math.max(-500, Math.min(500, cp));
                          const y = 40 - (clamped / 500) * 40;
                          return `L ${x}%,${y}`;
                        }).join(' ')} L 100%,40 Z`}
                      />
                      <path 
                        d={`M 0,40 ${reviewMoves.map((m, i) => {
                          const x = ((i + 1) / reviewMoves.length) * 100;
                          const cp = m.color === 'w' ? m.evalScore : -m.evalScore; 
                          const clamped = Math.max(-500, Math.min(500, cp));
                          const y = 40 - (clamped / 500) * 40;
                          return `L ${x}%,${y}`;
                        }).join(' ')}`}
                        fill="none" stroke="#fff" strokeWidth="2"
                      />
                      {/* Dots */}
                      {reviewMoves.map((m, i) => {
                        const x = ((i + 1) / reviewMoves.length) * 100;
                        const cp = m.color === 'w' ? m.evalScore : -m.evalScore;
                        const clamped = Math.max(-500, Math.min(500, cp));
                        const y = 40 - (clamped / 500) * 40;
                        return <circle key={i} cx={`${x}%`} cy={y} r="3" fill={COLORS[m.classification] || '#fff'} />;
                      })}
                    </>
                  )}
                </svg>
              </div>

              {/* Bottom Nav Controls */}
              <div className="nav-controls">
                <button className="nav-icon-btn" onClick={() => navigateReview('start')}>|❮</button>
                <button className="nav-icon-btn" disabled={currentReviewIndex <= -1} onClick={() => navigateReview(-1)}>❮</button>
                <button className="nav-icon-btn" style={{flex: 2}}>▶</button>
                <button className="nav-icon-btn" disabled={currentReviewIndex >= reviewMoves.length - 1} onClick={() => navigateReview(1)}>❯</button>
                <button className="nav-icon-btn" onClick={() => navigateReview('end')}>❯|</button>
              </div>
            </>
          )}
        </div>

      </div>
    </>
  );
}
