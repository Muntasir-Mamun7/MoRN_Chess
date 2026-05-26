import { useState, useEffect, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

const PIECE_NAMES = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };

const BOARD_THEMES = {
  green: { light: '#eeeed2', dark: '#769656' },
  wood: { light: '#f0d9b5', dark: '#b58863' },
  ocean: { light: '#dee3e6', dark: '#8ca2ad' },
  dark: { light: '#aaaaaa', dark: '#555555' },
  portugal: { light: '#f4f4f4', dark: '#d32f2f' }
};

// Comprehensive rich commentary matrix to eliminate repetitive reviews
const TACTICAL_COMMENTARY = {
  Blunder: {
    p: [
      "This pawn push is a fatal miscalculation. It fatally weakens your core pawn structure and leaves behind gaping holes your opponent can exploit.",
      "Blunder! Moving this pawn totally ignores an active threat on the board and drops crucial central space."
    ],
    n: [
      "A catastrophic blunder with the Knight. You jumped straight into a tactical pin or square where it can be trapped and picked off.",
      "Oh no! The Knight is completely misplaced here, handing over a clear tactical avenue or fork possibility to the enemy lines."
    ],
    b: [
      "You hung your Bishop! It completely cuts off its own diagonal and leaves a high-value piece exposed without defense.",
      "A terrible blunder. Moving the Bishop completely drops protection of an essential defensive square near your king."
    ],
    r: [
      "A devastating Rook blunder. You abandoned an open file or walked right into a tactical trap, throwing away massive endgame value.",
      "Tragic oversight! This Rook move leaves your back-rank or vital defense structures fully exposed to a direct onslaught."
    ],
    q: [
      "You blundered the Queen! Moving her here completely overlooks a basic tactical combination or hanging square.",
      "A fatal Queen move that ruins your structural advantage and leaves your most powerful piece in extreme danger."
    ],
    k: [
      "Moving the King here is a severe blunder. You step directly into a boxing angle or strip away your own crucial pawn shield.",
      "A major error. The King steps out into an incredibly vulnerable square, inviting immediate tactical mating nets."
    ]
  },
  Mistake: {
    p: ["This pawn move loses key tempos and lets your opponent seize control of the open files.", "A positional mistake that limits your piece development choices."],
    n: ["The Knight wanders away from the core action, giving up control of the central squares.", "A tactical misstep that permits your opponent to force an annoying piece trade."],
    b: ["The Bishop is forced onto a completely passive diagonal, effectively turning it into a tall pawn.", "This Bishop placement lets your opponent shut down your attacking lane instantly."],
    r: ["Moving the Rook away completely surrenders control over an essential open file.", "This Rook shift does nothing to optimize your endgame position."],
    q: ["Bringing the Queen out to this square exposes her to constant harassment from lower-value pieces.", "The Queen loses her alignment with your central attacking structures."],
    k: ["The King is drifting into a zone where it can easily be caught in annoying, tempo-winning checks.", "This King adjustment prematurely slows down your defensive layout options."]
  },
  "Best Move": {
    p: ["Flawless pawn structure maintenance! This anchors your layout and cuts off enemy infiltration lanes.", "Excellent choice. This pawn push constricts your opponent's breathing room."],
    n: ["Beautiful outpost generation! This Knight is perfectly centralized and dominates the surrounding squares.", "The ideal development square. Your Knight creates strong offensive options."],
    b: ["A spectacular open diagonal for the Bishop. It cuts cleanly across the board, pinning vital targets.", "Perfect positioning. Your Bishop actively coordinates with your long-range plans."],
    r: ["Masterclass placement. Your Rook locks down an unassailable open file, controlling the entire lane.", "The Rook is beautifully activated, applying maximum horizontal and vertical pressure."],
    q: ["Maximum efficiency. The Queen coordinates flawlessly with your pieces while staying entirely safe.", "Devastating alignment. Your Queen is primed to orchestrate a crushing breakthrough."],
    k: ["Excellent safety adjustment. Your King finds perfect sanctuary while preparing for endgame action.", "Superb king safety protocol. You eliminate any annoying tactical back-rank backdoors."]
  }
};

export default function App() {
  const [game, setGame] = useState(new Chess());
  const [engine, setEngine] = useState(null);
  
  // App Configurations
  const [gameMode, setGameMode] = useState('computer'); 
  const [engineThinking, setEngineThinking] = useState(false);
  const [rawScore, setRawScore] = useState(0);
  const [bestMoveArrow, setBestMoveArrow] = useState([]);
  const [history, setHistory] = useState([]);
  
  // Personal Settings
  const [aiLevel, setAiLevel] = useState(5); 
  const [boardTheme, setBoardTheme] = useState('green');
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [coachPersona, setCoachPersona] = useState('lively'); // lively, angry, charming, sexy
  const [systemVoices, setSystemVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState('');

  // Piece Highlights Tracker
  const [moveFrom, setMoveFrom] = useState('');
  const [optionSquares, setOptionSquares] = useState({});

  // Precise PGN Traversal Framework
  const [pgnInput, setPgnInput] = useState('');
  const [reviewMoves, setReviewMoves] = useState([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(-1);
  const [coachExplanation, setCoachExplanation] = useState('');
  const [currentClassification, setCurrentClassification] = useState('');
  const [suggestedAlternativeLAN, setSuggestedAlternativeLAN] = useState('');
  const [isViewingAlt, setIsViewingAlt] = useState(false);
  const [isReviewAnalyzing, setIsReviewAnalyzing] = useState(false);

  const evalRef = useRef({ step: 'idle', scoreBefore: 0, scoreAfter: 0, bestMove: '', moveData: null });

  // Load physical browser voice files natively
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setSystemVoices(voices);
      if (voices.length > 0 && !selectedVoiceName) {
        setSelectedVoiceName(voices[0].name);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // ==========================================
  // CUSTOM PERSONA VOICE SHAPER ENGINE
  // ==========================================
  const speakWithPersona = (text) => {
    if (isVoiceMuted || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); 

    const utterance = new SpeechSynthesisUtterance(text);
    const customVoice = systemVoices.find(v => v.name === selectedVoiceName);
    if (customVoice) utterance.voice = customVoice;

    // Modify speed (rate) and pitch dynamically to match the persona settings
    switch (coachPersona) {
      case 'angry':
        utterance.rate = 1.25;  // Fast, aggressive pacing
        utterance.pitch = 0.8;  // Deeper, commanding voice tone
        break;
      case 'charming':
        utterance.rate = 0.95;  // Smooth, measured pacing
        utterance.pitch = 1.1;  // Bright, pleasant pitch
        break;
      case 'sexy':
        utterance.rate = 0.75;  // Very slow, deliberate, whispered cadence
        utterance.pitch = 0.9;  // Slightly lower, huskier undertones
        break;
      case 'lively':
      default:
        utterance.rate = 1.1;   // Energetic, enthusiastic pace
        utterance.pitch = 1.2;   // High, expressive pitch range
        break;
    }

    window.speechSynthesis.speak(utterance);
  };

  // ==========================================
  // ENGINE LOGIC UNIT
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
            if (match) {
              const score = parseInt(match[1]);
              if (evalRef.current.step === 'eval_before') evalRef.current.scoreBefore = score;
              else if (evalRef.current.step === 'eval_after') evalRef.current.scoreAfter = score;
              else setRawScore(score); 
            }
          }
          
          if (line.includes('info') && line.includes('score mate')) {
            const match = line.match(/score mate (-?\d+)/);
            if (match) {
              const score = parseInt(match[1]) > 0 ? 2500 : -2500;
              if (evalRef.current.step === 'eval_before') evalRef.current.scoreBefore = score;
              else if (evalRef.current.step === 'eval_after') evalRef.current.scoreAfter = score;
            }
          }

          if (line.includes('bestmove')) {
            const moveLAN = line.split(' ')[1];
            
            if (evalRef.current.step === 'eval_before') {
              evalRef.current.bestMove = moveLAN;
              setSuggestedAlternativeLAN(moveLAN);
              evalRef.current.step = 'eval_after';
              worker.postMessage(`position fen ${evalRef.current.moveData.fenAfter}`);
              worker.postMessage('go depth 10');
            } 
            else if (evalRef.current.step === 'eval_after') {
              evalRef.current.step = 'idle';
              calculateDifferentialMetrics(); 
            } 
            else if (moveLAN && moveLAN !== '(none)') {
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
        setEngine(worker);
      });
    return () => engine?.terminate();
  }, [gameMode, game]);

  // Handle human play clicks
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

  // ==========================================
  // DIFFERENTIAL CALCULATION SYSTEM (CHESS.COM ALIGNMENT)
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
      setCurrentReviewIndex(-1);
      setGame(new Chess());
      setCoachExplanation("PGN imported safely. Click 'Next Move' to generate accurate engine commentary.");
    } catch(err) {
      alert("Invalid PGN format block.");
    }
  }

  function navigateReview(direction) {
    setIsViewingAlt(false);
    const newIdx = currentReviewIndex + direction;
    if (newIdx >= 0 && newIdx < reviewMoves.length) {
      setCurrentReviewIndex(newIdx);
      const move = reviewMoves[newIdx];
      
      setGame(new Chess(move.fenAfter));
      setIsReviewAnalyzing(true);
      setCurrentClassification("Analyzing...");
      
      evalRef.current = { step: 'eval_before', scoreBefore: 0, scoreAfter: 0, bestMove: '', moveData: move };
      engine?.postMessage(`position fen ${move.fenBefore}`);
      engine?.postMessage('go depth 10'); 
    }
  }

  function calculateDifferentialMetrics() {
    const move = evalRef.current.moveData;
    const before = evalRef.current.scoreBefore;
    const after = -evalRef.current.scoreAfter; // Invert evaluation layout perspectives
    const delta = after - before;

    let classification = "Good";
    if (delta < -250) classification = "Blunder";
    else if (delta < -90) classification = "Mistake";
    else if (delta < -35) classification = "Inaccuracy";
    else if (move.lan === evalRef.current.bestMove) classification = "Best Move";
    else if (delta > 40) classification = "Great Move";

    if (currentReviewIndex < 4 && classification !== "Blunder") classification = "Book";

    setCurrentClassification(classification);
    compileDeepCoachReport(move, classification);
    setIsReviewAnalyzing(false);
  }

  function compileDeepCoachReport(move, classification) {
    const piece = PIECE_NAMES[move.piece];
    const coords = `${move.from} to ${move.to}`;
    
    let report = "";
    const pool = TACTICAL_COMMENTARY[classification]?.[move.piece];
    
    if (pool && pool.length > 0) {
      // Fetch a varied dynamic phrase to break up conversational monotony
      report = pool[currentReviewIndex % pool.length];
    } else {
      // Dynamic fallback string injection utilizing accurate pieces & square coordinates
      if (classification === "Book") {
        report = `Moving the ${piece} to ${move.to} complies with standard theoretical opening structures. You are fighting for control of the central zones efficiently.`;
      } else if (classification === "Great Move") {
        report = `Outstanding spatial choice! Moving the ${piece} from ${coords} generates heavy pressure and actively forces an unfavorable piece defensive cycle.`;
      } else {
        report = `You decided to advance the ${piece} across coordinates ${coords}. The engine considers this a ${classification.toLowerCase()} continuation.`;
      }
    }

    // Append absolute notation parameters for context clarity
    if (classification === "Blunder" || classification === "Mistake") {
      report += ` Positional alternative analysis highlights that your played line drops massive value compared to what the engine wanted.`;
    }

    setCoachExplanation(report);
    speakWithPersona(report);
  }

  function showAlternativeLine() {
    if (!suggestedAlternativeLAN || currentReviewIndex === -1) return;
    const move = reviewMoves[currentReviewIndex];
    const altGame = new Chess(move.fenBefore); 
    try {
      altGame.move({ from: suggestedAlternativeLAN.substring(0, 2), to: suggestedAlternativeLAN.substring(2, 4), promotion: 'q' });
      setGame(altGame);
      setIsViewingAlt(true);
      const text = `Instead of your move, playing your piece across coordinates ${suggestedAlternativeLAN.substring(0,2)} to ${suggestedAlternativeLAN.substring(2,4)} preserves maximum pressure. Observe the spatial safety setup here.`;
      setCoachExplanation(text);
      speakWithPersona(text);
    } catch(e) {}
  }

  function resetToCurrentReviewMove() {
    const move = reviewMoves[currentReviewIndex];
    if (move) {
      setGame(new Chess(move.fenAfter));
      setIsViewingAlt(false);
      compileDeepCoachReport(move, currentClassification); 
    }
  }

  function resetToBase(mode) {
    setGameMode(mode);
    setGame(new Chess());
    setHistory([]);
    setReviewMoves([]);
    setCurrentReviewIndex(-1);
    setIsViewingAlt(false);
    window.speechSynthesis?.cancel();
  }

  const visualHeight = useMemo(() => {
    const clamped = Math.max(-500, Math.min(500, rawScore));
    return `${((clamped + 500) / 1000) * 100}%`;
  }, [rawScore]);

  const activeSquareStyles = useMemo(() => {
    let styles = { ...optionSquares };
    if (gameMode === 'review' && currentReviewIndex >= 0 && reviewMoves[currentReviewIndex] && !isViewingAlt) {
      const move = reviewMoves[currentReviewIndex];
      styles[move.from] = { backgroundColor: 'rgba(211, 47, 47, 0.4)' }; // Highlight start square
      styles[move.to] = { backgroundColor: 'rgba(76, 175, 80, 0.5)' };  // Highlight destination square
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

  const badgeColorMap = { "Best Move": "#4CAF50", "Great Move": "#1baca1", "Book": "#a5a5a5", "Good": "#96bc4b", "Inaccuracy": "#8c8c8c", "Mistake": "#f7c04a", "Blunder": "#b23333", "Analyzing...": "#555" };
  const currentTheme = BOARD_THEMES[boardTheme];

  return (
    <>
      <style>{`
        body { margin: 0; padding: 0; background-color: #121212; color: #fff; font-family: system-ui, sans-serif; }
        .app-container { display: flex; flex-direction: column; align-items: center; min-height: 100vh; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .menu { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 20px; }
        .btn { padding: 10px 16px; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
        
        .main-layout { display: flex; gap: 20px; width: 100%; max-width: 1000px; justify-content: center; align-items: flex-start; flex-wrap: wrap; }
        .board-container { flex: 1 1 400px; max-width: 550px; width: 100%; position: relative; }
        .side-panel { flex: 1 1 300px; max-width: 400px; width: 100%; background-color: #1e1e1e; border-radius: 8px; padding: 20px; box-sizing: border-box; min-height: 500px; display: flex; flex-direction: column; }
        
        @media (max-width: 768px) {
          .board-container { max-width: 100%; }
          .side-panel { max-width: 100%; min-height: auto; }
        }

        .action-btn { width: 100%; padding: 12px; background-color: #2196F3; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
        .badge { display: flex; flex-direction: column; align-items: center; background-color: #2d2d2d; padding: 15px; border-radius: 8px; border: 1px solid #444; text-align: center; }
        .badge-tag { font-size: 14px; font-weight: bold; color: #fff; padding: 6px 16px; border-radius: 4px; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .coach-box { background-color: #262626; border-left: 4px solid #2196F3; border-radius: 4px; padding: 15px; margin-top: 15px; }
        .setting-row { display: flex; flex-direction: column; gap: 6px; padding: 12px 0; border-bottom: 1px solid #333; }
        select, input[type="range"] { padding: 10px; border-radius: 4px; background: #333; color: white; border: 1px solid #555; width: 100%; box-sizing: border-box; }
      `}</style>

      <div className="app-container">
        <div className="header">
          <h1>MoRN Chess Engine</h1>
          <div className="menu">
            <button className="btn" style={{backgroundColor: gameMode === 'computer' ? '#4CAF50' : '#4a4a4a'}} onClick={() => resetToBase('computer')}>Play AI</button>
            <button className="btn" style={{backgroundColor: gameMode === 'review' ? '#2196F3' : '#4a4a4a'}} onClick={() => resetToBase('review')}>Game Review Suite</button>
            <button className="btn" style={{backgroundColor: gameMode === 'settings' ? '#FF9800' : '#4a4a4a'}} onClick={() => resetToBase('settings')}>Settings Panel</button>
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
              customArrowColor={isViewingAlt ? "rgba(33, 150, 243, 0.7)" : "rgba(76, 175, 80, 0.7)"}
              animationDuration={250}
            />
          </div>

          {/* DYNAMIC SIDE PANEL */}
          <div className="side-panel">
            
            {/* SETTINGS PANEL */}
            {gameMode === 'settings' && (
              <div>
                <h3 style={{color: '#FF9800', marginTop: 0}}>Customization & Profiles</h3>
                
                <div className="setting-row">
                  <label><strong>AI Playing Strength (Depth Limit)</strong></label>
                  <input type="range" min="1" max="10" value={aiLevel} onChange={(e) => setAiLevel(parseInt(e.target.value))} />
                </div>

                <div className="setting-row">
                  <label><strong>Board Interface Aesthetic Theme</strong></label>
                  <select value={boardTheme} onChange={(e) => setBoardTheme(e.target.value)}>
                    <option value="green">Classic Green</option>
                    <option value="wood">Tournament Wood</option>
                    <option value="portugal">Portugal Red</option>
                    <option value="ocean">Ocean Blue</option>
                    <option value="dark">Midnight Dark</option>
                  </select>
                </div>

                <div className="setting-row">
                  <label><strong>Coach Persona Mood Shaper</strong></label>
                  <select value={coachPersona} onChange={(e) => setCoachPersona(e.target.value)}>
                    <option value="lively">Lively & Energetic 🔊</option>
                    <option value="angry">Angry & Disciplined 💢</option>
                    <option value="charming">Charming & Supportive ✨</option>
                    <option value="sexy">Sultry & Smooth 🎙️</option>
                  </select>
                </div>

                <div className="setting-row">
                  <label><strong>Physical Voice Device Select</strong></label>
                  <select value={selectedVoiceName} onChange={(e) => setSelectedVoiceName(e.target.value)}>
                    {systemVoices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
                  </select>
                </div>

                <div className="setting-row" style={{border: 'none'}}>
                  <button className="btn" style={{backgroundColor: isVoiceMuted ? '#d32f2f' : '#4CAF50'}} onClick={() => { setIsVoiceMuted(!isVoiceMuted); window.speechSynthesis?.cancel(); }}>
                    {isVoiceMuted ? '🔇 Audio Outputs Disabled' : '🔊 Audio Outputs Active'}
                  </button>
                </div>
              </div>
            )}

            {/* REAL-TIME ENGINE REVIEW MODE */}
            {gameMode === 'review' && (
              <div style={{display: 'flex', flexDirection: 'column', height: '100%', flex: 1}}>
                <h3 style={{color: '#2196F3', marginTop: 0}}>Premium Review Engine</h3>
                
                {reviewMoves.length === 0 ? (
                  <div>
                    <textarea style={{width: '100%', height: '150px', background: '#2a2a2a', color: '#fff', border: '1px solid #444', padding: '10px', marginBottom: '10px', boxSizing:'border-box', borderRadius: '4px'}} placeholder="Paste Chess.com PGN notation blocks here..." value={pgnInput} onChange={(e) => setPgnInput(e.target.value)} />
                    <button className="action-btn" onClick={importPgn}>Boot Differential Analytics</button>
                  </div>
                ) : (
                  <div style={{display: 'flex', flexDirection: 'column', flex: 1}}>
                    {currentReviewIndex >= 0 ? (
                      <>
                        <div className="badge" style={{outline: isViewingAlt ? '2px solid #2196F3' : 'none'}}>
                           <span style={{fontSize: '14px', color: '#ccc'}}>Step Vector {currentReviewIndex + 1}</span>
                           <h2 style={{margin: '5px 0'}}>{isViewingAlt ? "Engine Alternative" : `Played: ${reviewMoves[currentReviewIndex]?.san}`}</h2>
                           {!isViewingAlt && (
                             <div className="badge-tag" style={{ backgroundColor: badgeColorMap[currentClassification] || '#444' }}>
                               {currentClassification}
                             </div>
                           )}
                        </div>

                        <div className="coach-box">
                           <div style={{fontWeight: 'bold', color: '#2196F3', marginBottom: '6px'}}>♟️ Coach Insights Analysis:</div>
                           <p style={{margin: 0, fontSize: '14px', lineHeight: '1.5', color: '#eee'}}>{coachExplanation}</p>
                        </div>

                        {(!isViewingAlt && !isReviewAnalyzing && (currentClassification === "Blunder" || currentClassification === "Mistake" || currentClassification === "Inaccuracy")) && (
                          <button className="action-btn" style={{backgroundColor: '#1baca1', marginTop: '15px'}} onClick={showAlternativeLine}>🔍 View Recommended Move</button>
                        )}
                        {isViewingAlt && (
                          <button className="action-btn" style={{backgroundColor: '#666', marginTop: '15px'}} onClick={resetToCurrentReviewMove}>↩ Return to My Move</button>
                        )}
                      </>
                    ) : (
                      <div className="coach-box" style={{textAlign: 'center', padding: '40px 20px'}}>
                         <p style={{margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold'}}>PGN Parsed Successfully!</p>
                         <p style={{color: '#aaa', fontSize: '13px', margin: 0}}>Click the 'Next' button down below to watch the board move and initiate direct engine coaching reports.</p>
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
                <h3 style={{margin: '0 0 15px 0'}}>Match Arena Logs</h3>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '14px', overflowY: 'auto', flex: 1}}>
                  {history.map((m, i) => (<span key={i} style={{backgroundColor: '#2d2d2d', padding: '4px 8px', borderRadius: '3px'}}>{i % 2 === 0 ? `${(i/2)+1}. ` : ''}{m.san}</span>))}
                  {history.length === 0 && <p style={{color: '#888', fontStyle: 'italic'}}>Make a physical legal move on the board to challenge the AI...</p>}
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </>
  );
}
