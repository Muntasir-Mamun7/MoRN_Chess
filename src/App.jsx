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

// Comprehensive rich commentary matrix
const TACTICAL_COMMENTARY = {
  Blunder: {
    p: [
      "This pawn push is a fatal miscalculation. It fatally weakens your core pawn structure.",
      "Blunder! Moving this pawn totally ignores an active threat on the board.",
      "You've just created a severe pawn weakness. Your opponent can lock onto this target instantly.",
      "A tragic pawn move. It completely drops protection of an essential defensive square.",
      "This advance is a severe positional blunder. You've surrendered crucial central space for nothing.",
      "Terrible oversight! This pawn move allows an immediate and devastating tactical penetration.",
      "By moving this pawn, you've permanently weakened the squares around your king.",
      "A massive error. This pawn leaves its defensive post and gives the opponent a clear attacking lane.",
      "You hung a critical target! This pawn move is a complete misread of the board's tension."
    ],
    n: [
      "A catastrophic blunder with the Knight. You jumped straight into a tactical pin or trap.",
      "Oh no! The Knight is completely misplaced here, handing over a clear tactical fork possibility.",
      "This Knight leap is a massive miscalculation. It abandons the defense of your most vital sector.",
      "Blunder! You placed your Knight on a square where it can be immediately chased away or trapped.",
      "A terrible Knight maneuver. It steps right into the opponent's crosshairs without any backup.",
      "You've hung the Knight, or at least allowed a devastating tactic that wins material.",
      "This move completely ignores the board's geometry. The Knight is dead weight here.",
      "A tragic misstep. The Knight blocks your own pieces and creates a massive bottleneck.",
      "Moving the Knight here allows your opponent to seize total control of the initiative."
    ],
    b: [
      "You hung your Bishop! It leaves a high-value piece exposed without proper defense.",
      "A terrible blunder. Moving the Bishop drops protection of an essential defensive diagonal.",
      "This Bishop move walks right into a trap. You're giving away a critical long-range piece.",
      "Blunder! The Bishop is completely locked out of the game on this square.",
      "A massive oversight. You just allowed your opponent to completely neutralize your Bishop pair.",
      "This move abandons the defense of your King. The Bishop is now completely out of position.",
      "Tragic error. You've placed the Bishop right into a devastating tactical sequence.",
      "By placing the Bishop here, you've handed your opponent a massive tempo to launch an attack."
    ],
    r: [
      "A devastating Rook blunder. You abandoned an open file and threw away massive positional value.",
      "Tragic oversight! This Rook move leaves your back-rank fully exposed to a direct onslaught.",
      "Blunder! You walked your Rook right into a tactical pin or a devastating skewer.",
      "A massive error in judgment. The Rook is completely disconnected from the rest of your army.",
      "You've hung your heavy artillery! This Rook move miscalculates the opponent's threats entirely.",
      "This Rook placement is a disaster. It allows the enemy pieces to completely infiltrate your camp.",
      "A terrible blunder. The Rook moves to a completely passive square when action was needed elsewhere.",
      "Moving the Rook here drops the defense of a critical pawn or piece that was holding your position together."
    ],
    q: [
      "You blundered the Queen! Moving her here completely overlooks a basic tactical combination.",
      "A fatal Queen move that ruins your structural advantage and leaves your most powerful piece in extreme danger.",
      "Blunder! You've walked your Queen right into a discovered attack or a deadly trap.",
      "A catastrophic oversight. The Queen abandons the defense of your King at the worst possible moment.",
      "This Queen excursion is way too aggressive and completely ignores the safety of your own camp.",
      "Tragic error! You placed the Queen on a square where she can be easily trapped by minor pieces.",
      "A massive miscalculation. The Queen is now totally out of play while the opponent attacks on the other side.",
      "Moving the Queen here drops the entire game. You completely missed the opponent's primary threat."
    ],
    k: [
      "Moving the King here is a severe blunder. You step directly into a boxing angle.",
      "A major error. The King steps out into an incredibly vulnerable square, inviting mating nets.",
      "Blunder! You just walked your King right into the line of fire.",
      "A catastrophic King move. You've blocked your own escape route and invited disaster.",
      "Tragic oversight! The King is now perfectly aligned for a devastating tactical strike by the enemy.",
      "This King move ignores the basic principles of safety. You're wide open to checks and captures.",
      "A massive miscalculation in the endgame. You just handed the opposition the key opposition square.",
      "Moving the King here is fatal. It disconnects your Rooks and leaves your back rank completely weak."
    ]
  },
  Mistake: {
    p: [
      "This pawn move loses key tempos and lets your opponent seize control of the open files.",
      "A positional mistake. You are creating a backward pawn that will become a long-term target.",
      "Pushing this pawn prematurely releases the central tension in your opponent's favor.",
      "A strategic error. This pawn advance creates permanent weak squares in your camp.",
      "This move is a mistake. It blocks your own pieces from developing to their best squares.",
      "You're giving up too much space. This pawn move is far too passive for the current position.",
      "A slight miscalculation. This pawn structure makes it much harder to defend your King later."
    ],
    n: [
      "The Knight wanders away from the core action, giving up control of the central squares.",
      "A tactical misstep that permits your opponent to force an annoying piece trade.",
      "This Knight move is a mistake. It places the piece on the rim where it controls very little.",
      "You are allowing your Knight to be kicked around by enemy pawns. A loss of crucial tempo.",
      "A positional error. The Knight abandons a beautiful outpost for a much weaker square.",
      "This maneuver is too slow. The Knight is taking too many turns to get into the fight.",
      "A mistake in piece coordination. This Knight gets in the way of your Rooks or Queen."
    ],
    b: [
      "The Bishop is forced onto a passive diagonal, effectively turning it into a tall pawn.",
      "This Bishop placement lets your opponent shut down your attacking lane instantly.",
      "A mistake. You are trading off your good Bishop for a much less active enemy piece.",
      "Moving the Bishop here blocks your central pawns and severely cramps your position.",
      "This is a strategic error. The Bishop is biting on granite, staring at a solid pawn chain.",
      "You missed a much more active diagonal. This Bishop move is simply too slow.",
      "A positional misstep. The Bishop leaves a critical defensive post undefended."
    ],
    r: [
      "Moving the Rook away completely surrenders control over an essential open file.",
      "This Rook shift does nothing to optimize your endgame position.",
      "A mistake. The Rook should be centralized or placed behind a passed pawn, not here.",
      "You are lifting the Rook too early. It will become a target for enemy minor pieces.",
      "This Rook move is completely passive. You need your heavy pieces to be active and threatening.",
      "A positional error. You've allowed your opponent to dominate the only open file on the board.",
      "Moving the Rook here disconnects it from defending your other heavy pieces."
    ],
    q: [
      "Bringing the Queen out to this square exposes her to constant harassment from minor pieces.",
      "The Queen loses her alignment with your central attacking structures.",
      "A mistake. The Queen is trying to do too much on her own without any support.",
      "You are moving the Queen to a very passive square. She needs to dictate the flow of the game.",
      "This Queen move blocks your own development and creates a traffic jam in your camp.",
      "A strategic error. The Queen is now out of position to stop the opponent's main threat.",
      "Going here with the Queen allows the opponent to improve their pieces while attacking her."
    ],
    k: [
      "The King is drifting into a zone where it can easily be caught in annoying, tempo-winning checks.",
      "This King adjustment prematurely slows down your defensive layout options.",
      "A mistake. You are moving the King the wrong way, further away from safety.",
      "In the endgame, this King move is too passive. You need to activate the King immediately.",
      "This step places the King on the same file as an enemy Rook, which is asking for trouble.",
      "A positional error. You are blocking your own Rook from entering the game.",
      "Moving the King here voluntarily walks into a pin that will be very difficult to break."
    ]
  },
  Inaccuracy: {
    p: [
      "A minor inaccuracy. This pawn move is okay, but there were sharper ways to challenge the center.",
      "Slightly passive. You could have generated more pressure with a different pawn break.",
      "Not the most precise pawn push. It slightly restricts your own Bishop's mobility.",
      "An inaccuracy. You are committing the pawn structure a bit too early.",
      "This pawn move is playable, but the engine prefers maintaining the tension a little longer."
    ],
    n: [
      "An inaccuracy. The Knight goes to a decent square, but a much stronger outpost was available.",
      "Slightly suboptimal. The Knight route here is a bit slower than the absolute best engine line.",
      "Not a bad move, but it allows the opponent to equalize the position too easily.",
      "This Knight move is slightly passive. It defends well but lacks offensive bite.",
      "An inaccuracy. You are trading off a very active Knight for a passive enemy piece."
    ],
    b: [
      "Slightly inaccurate. The Bishop develops, but not to its absolute most active diagonal.",
      "A minor slip. You're allowing the opponent to blunt this Bishop's scope too easily.",
      "This Bishop move is a bit committal. It might have been better to wait and see.",
      "An inaccuracy. It would have been slightly better to preserve the Bishop pair here.",
      "Playable, but the engine sees a more pressing positional priority than moving this Bishop."
    ],
    r: [
      "An inaccuracy. The Rook is centralized, but perhaps the other file was slightly more critical.",
      "Slightly passive. The Rook defends, but you missed an opportunity to play actively.",
      "This Rook lift is a bit premature. The opponent can defend against it quite easily.",
      "Not the absolute best. You are giving the opponent a slight tempo to organize their defense.",
      "An inaccuracy. The engine prefers a slightly different coordination for your heavy pieces."
    ],
    q: [
      "Slightly inaccurate. The Queen is well placed, but there was a sharper, more forcing continuation.",
      "A minor slip. The Queen move allows the opponent to consolidate their position.",
      "Not bad, but moving the Queen here slightly neglects the defense of a key central square.",
      "An inaccuracy. You are initiating an attack a bit too early before your pieces are fully ready.",
      "This Queen placement is slightly passive compared to the engine's top recommendation."
    ],
    k: [
      "An inaccuracy. The King is safe, but this move wastes a tiny bit of time.",
      "Slightly suboptimal King placement. The other square would have been marginally safer.",
      "Not the most precise defensive step. It allows the opponent a slight positional squeeze.",
      "An inaccuracy in the endgame. The King took a slightly slower path to the center.",
      "Playable, but the engine prefers a slightly different prophylactic King move here."
    ]
  },
  Good: {
    p: [
      "A solid pawn push. It gains space and prepares for future development.",
      "Good move. This pawn secures a key central square and limits enemy mobility.",
      "A reliable choice. You are reinforcing your structure and maintaining a solid position.",
      "Good positional play. This pawn move asks a tough question of your opponent.",
      "A very fundamentally sound pawn advance. It supports your overall strategy well."
    ],
    n: [
      "A solid Knight development. It eyes the center and prepares for battle.",
      "Good maneuver. The Knight is heading toward a much more useful sector of the board.",
      "A reliable Knight move. It defends key squares and keeps your position rock solid.",
      "Good play. You are improving the Knight's scope without taking unnecessary risks.",
      "A fundamentally sound Knight placement that improves your overall piece coordination."
    ],
    b: [
      "Good development. The Bishop takes control of a useful diagonal.",
      "A solid Bishop move. It pins an enemy piece or controls crucial central space.",
      "Reliable positional play. The Bishop is well placed to support your pawn structure.",
      "Good choice. You are activating the Bishop safely and effectively.",
      "A very sound move. The Bishop finds a good home and prepares for the middlegame."
    ],
    r: [
      "Good Rook placement. It takes control of a semi-open file or supports a pawn break.",
      "A solid centralization of the Rook. It prepares for future action in the center.",
      "Reliable defense. The Rook is perfectly placed to guard your weaknesses.",
      "Good play. You are activating your heavy pieces logically.",
      "A fundamentally sound Rook move that improves your overall board control."
    ],
    q: [
      "A good Queen move. It applies pressure while remaining completely safe.",
      "Solid centralization. The Queen is well placed to orchestrate your strategy.",
      "Good play. You are improving the Queen's position without overextending.",
      "A reliable choice. The Queen ties down enemy pieces to defensive tasks.",
      "A fundamentally sound Queen maneuver that increases your positional advantage."
    ],
    k: [
      "Good King safety. You are stepping away from potential future checks.",
      "A solid prophylactic King move. It prevents any annoying back-rank tactics.",
      "Good endgame technique. The King is becoming more active.",
      "Reliable defense. The King is perfectly placed to support your pawns.",
      "A fundamentally sound King move that secures your position."
    ]
  },
  "Great Move": {
    p: [
      "A brilliant pawn break! You are shredding the opponent's center and opening critical lines.",
      "Great move! This pawn push perfectly exploits a tactical vulnerability in their structure.",
      "An incredibly strong pawn advance. It creates a massive space advantage that will be hard to stop.",
      "Great foresight! This pawn sacrifices itself or pushes forward to create a beautiful outpost.",
      "A fantastic strategic pawn decision. It completely paralyzes the opponent's queenside.",
      "Great play! You are using this pawn to pry open the defense around their king.",
      "An exceptionally strong pawn move that completely shifts the positional balance in your favor."
    ],
    n: [
      "A brilliant Knight maneuver! It jumps into an unassailable outpost and dominates the board.",
      "Great move! The Knight perfectly exploits the weak squares left behind by their pawns.",
      "An incredibly strong tactical Knight leap. It creates multiple simultaneous threats.",
      "Great foresight! The Knight reroutes beautifully to join the decisive attack.",
      "A fantastic Knight placement. It completely paralyzes the opponent's development.",
      "Great play! This Knight move creates a beautiful blockade that cannot be broken.",
      "An exceptionally strong move. The Knight is now the most powerful piece on the board."
    ],
    b: [
      "A brilliant Bishop placement! It slices through the board and paralyzes their entire defense.",
      "Great move! This Bishop skewers the enemy pieces or creates an unbreakable pin.",
      "An incredibly strong tactical Bishop move. It removes a key defender flawlessly.",
      "Great foresight! The Bishop perfectly controls the light or dark squares, suffocating the enemy.",
      "A fantastic Bishop maneuver. It eyes the enemy King with devastating intent.",
      "Great play! You traded the Bishop perfectly to create a permanent structural weakness.",
      "An exceptionally strong move. The Bishop operates with maximum efficiency here."
    ],
    r: [
      "A brilliant Rook lift! It swings into the attack with devastating speed and power.",
      "Great move! The Rook seizes absolute control of the critical open file.",
      "An incredibly strong tactical Rook sacrifice or placement. It cracks the position wide open.",
      "Great foresight! The Rook perfectly invades the 7th rank, paralyzing their pawns.",
      "A fantastic Rook maneuver. It doubled up and creates unstoppable pressure.",
      "Great play! This Rook move defends and attacks simultaneously with perfect harmony.",
      "An exceptionally strong move. The Rook operates flawlessly in this tactical sequence."
    ],
    q: [
      "A brilliant Queen sortie! It creates impossible threats and forces massive concessions.",
      "Great move! The Queen perfectly orchestrates a devastating mating attack.",
      "An incredibly strong tactical Queen move. It exploits multiple weaknesses at once.",
      "Great foresight! The Queen centralizes beautifully, dominating the entire board.",
      "A fantastic Queen maneuver. It pins a key piece and wins material by force.",
      "Great play! This Queen move perfectly defends your King while launching a counter-attack.",
      "An exceptionally strong move. The Queen shows exactly why she is the most powerful piece."
    ],
    k: [
      "A brilliant King walk! The King actively participates in the endgame to secure the win.",
      "Great move! The King perfectly sidesteps a dangerous tactical trap.",
      "An incredibly strong prophylactic King move. It stops their counterplay completely.",
      "Great foresight! The King perfectly marches up the board to support a pawn promotion.",
      "A fantastic defensive King maneuver. It finds absolute safety in a chaotic position.",
      "Great play! This King move seizes the critical opposition in the endgame.",
      "An exceptionally strong King move. It shows deep understanding of endgame geometry."
    ]
  },
  "Best Move": {
    p: [
      "Flawless pawn structure maintenance! This anchors your layout and cuts off enemy infiltration lanes.",
      "Excellent choice. This pawn push constricts your opponent's breathing room to zero.",
      "The absolute best move on the board. This pawn break destroys their central control.",
      "Engine approved! You found the one pawn move that guarantees a long-term advantage.",
      "A perfect pawn decision. It creates a passed pawn or secures an untouchable outpost.",
      "Brilliant positional understanding. This pawn completely shuts down their counterplay.",
      "The strongest continuation. This pawn move dictates the entire flow of the middlegame."
    ],
    n: [
      "Beautiful outpost generation! This Knight is perfectly centralized and dominates the surrounding squares.",
      "The ideal development square. Your Knight creates strong, unanswerable offensive options.",
      "The absolute best move on the board. The Knight forces a massive tactical concession.",
      "Engine approved! You found the perfect Knight reroute to launch a devastating attack.",
      "A perfect Knight decision. It blockades their pawns and restricts all enemy mobility.",
      "Brilliant positional understanding. The Knight is now an absolute monster on this square.",
      "The strongest continuation. This Knight maneuver wins the game by force or secures a huge edge."
    ],
    b: [
      "A spectacular open diagonal for the Bishop. It cuts cleanly across the board, pinning vital targets.",
      "Perfect positioning. Your Bishop actively coordinates with your long-range mating plans.",
      "The absolute best move on the board. The Bishop prevents any form of enemy development.",
      "Engine approved! You found the exact Bishop sacrifice or placement that breaks the defense.",
      "A perfect Bishop decision. It dominates the color complex and leaves the enemy helpless.",
      "Brilliant positional understanding. The Bishop is perfectly placed for both attack and defense.",
      "The strongest continuation. This Bishop move forces a winning tactical sequence."
    ],
    r: [
      "Masterclass placement. Your Rook locks down an unassailable open file, controlling the entire lane.",
      "The Rook is beautifully activated, applying maximum horizontal and vertical pressure.",
      "The absolute best move on the board. The Rook invades the enemy camp with lethal intent.",
      "Engine approved! You found the perfect Rook lift to join the final mating attack.",
      "A perfect Rook decision. It doubles up on the critical file, preparing a devastating breakthrough.",
      "Brilliant positional understanding. The Rook restricts the enemy King flawlessly.",
      "The strongest continuation. This Rook move secures a massive, undeniable advantage."
    ],
    q: [
      "Maximum efficiency. The Queen coordinates flawlessly with your pieces while staying entirely safe.",
      "Devastating alignment. Your Queen is primed to orchestrate a crushing breakthrough.",
      "The absolute best move on the board. The Queen centralizes and controls everything.",
      "Engine approved! You found the precise Queen maneuver that forces immediate resignation or material loss.",
      "A perfect Queen decision. It creates an unblockable multi-pronged tactical threat.",
      "Brilliant positional understanding. The Queen weaves through the defense beautifully.",
      "The strongest continuation. This Queen move is chess perfection."
    ],
    k: [
      "Excellent safety adjustment. Your King finds perfect sanctuary while preparing for endgame action.",
      "Superb king safety protocol. You eliminate any annoying tactical back-rank backdoors.",
      "The absolute best move on the board. The King actively wins the pawn race in the endgame.",
      "Engine approved! You found the exact King square to secure the draw or force the win.",
      "A perfect King decision. It steps exactly where it needs to be to avoid all checks.",
      "Brilliant positional understanding. The King uses the 'rule of the square' perfectly.",
      "The strongest continuation. This King move demonstrates absolute endgame mastery."
    ]
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
  }, [selectedVoiceName]);

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
        utterance.rate = 1.25; 
        utterance.pitch = 0.8;  
        break;
      case 'charming':
        utterance.rate = 0.95;  
        utterance.pitch = 1.1;  
        break;
      case 'sexy':
        utterance.rate = 0.75; 
        utterance.pitch = 0.9;  
        break;
      case 'lively':
      default:
        utterance.rate = 1.1;   
        utterance.pitch = 1.2;   
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
        worker.postMessage('isready');
        setEngine(worker);
      });
    return () => engine?.terminate();
  }, [gameMode, game]);

  useEffect(() => {
    if (engine) engine.postMessage(`setoption name Skill Level value ${Math.max(0, (aiLevel - 1) * 2)}`);
  }, [aiLevel, engine]);

  useEffect(() => {
    if (!engine || game.isGameOver() || gameMode === 'review') return;
    setEngineThinking(true);
    engine.postMessage(`position fen ${game.fen()}`);
    engine.postMessage(`go depth ${Math.max(2, aiLevel + 2)}`); 
  }, [game, engine, gameMode, aiLevel]);

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
        .eval-bar { width: 25px; height: 60vh; min-height: 400px; background-color: #333; position: relative; border-radius: 4px; overflow: hidden; border: 1px solid #444; }
        .eval-fill { background-color: #fff; width: 100%; position: absolute; bottom: 0; left: 0; transition: height 0.4s ease; }
        .eval-text { position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%); color: #000; font-weight: bold; font-size: 11px; z-index: 10; }
        .board-container { flex: 1 1 400px; max-width: 550px; width: 100%; position: relative; }
        .side-panel { flex: 1 1 300px; max-width: 400px; width: 100%; background-color: #1e1e1e; border-radius: 8px; padding: 20px; box-sizing: border-box; min-height: 500px; display: flex; flex-direction: column; }
        
        @media (max-width: 768px) {
          .eval-bar { display: none; }
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
                               {isReviewAnalyzing ? "Analyzing..." : currentClassification}
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
