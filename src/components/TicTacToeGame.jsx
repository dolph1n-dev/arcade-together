import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Timer, Flag, RotateCcw, Wifi, Trophy, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react'
import confetti from 'canvas-confetti'
import { useStore } from '../store'
import { db } from '../lib/firebase'
import { ref, onValue, update, push, runTransaction } from 'firebase/database'
import { 
  checkTicTacToeWin, 
  generateActionId, 
  setupPresenceTracker 
} from '../lib/session'

export default function TicTacToeGame() {
  const { 
    roomId, 
    playerId, 
    playerSlot,
    nickname, 
    opponentNickname, 
    setView, 
    setActiveGame 
  } = useStore()

  // My authoritative slot: 'playerA' (Host / Cyan / X) or 'playerB' (Rival / Magenta / O)
  const mySlot = playerSlot || (playerId === 1 ? 'playerA' : 'playerB')
  const opponentSlot = mySlot === 'playerA' ? 'playerB' : 'playerA'
  const myNumericId = mySlot === 'playerA' ? 1 : 2
  const mySymbol = mySlot === 'playerA' ? 'X' : 'O'

  // Authoritative State (Rule 1, 4, 14)
  const [board, setBoard] = useState(Array(9).fill(''))
  const [turn, setTurn] = useState('playerA') // 'playerA' | 'playerB'
  const [gameStatus, setGameStatus] = useState('active') // 'active' | 'finished'
  const [winner, setWinner] = useState(null) // 'playerA' | 'playerB' | 'draw' | null
  const [winningLine, setWinningLine] = useState(null)
  const [scores, setScores] = useState({ playerA: 0, playerB: 0 })
  const [rematchRequests, setRematchRequests] = useState({ playerA: false, playerB: false })
  const [timeLeft, setTimeLeft] = useState(15)
  const [reactionToast, setReactionToast] = useState(null)
  const [opponentOnline, setOpponentOnline] = useState(true)

  // Monotonic version tracking (Rule 5 & 15)
  const lastVersionRef = useRef(0)

  // 1. Synchronize Game State & Presence
  useEffect(() => {
    if (!roomId) return

    // Setup presence tracking with grace period awareness (Rule 8 & 9)
    const cleanupPresence = setupPresenceTracker(roomId, mySlot, (opponentPresence) => {
      setOpponentOnline(opponentPresence?.connected ?? true)
    })

    const gameRef = ref(db, `sessions/${roomId}/game`)
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        // Monotonically increasing version check (Rule 5)
        if (data.version && data.version < lastVersionRef.current) {
          return // Ignore stale or out-of-order state
        }
        if (data.version) {
          lastVersionRef.current = data.version
        }

        // Normalize 9-element string board (Never nulls to prevent Firebase node deletion)
        const rawBoard = data.board
        const safeBoard = Array.isArray(rawBoard)
          ? rawBoard.map((c) => (c ? String(c) : ''))
          : rawBoard && typeof rawBoard === 'object'
          ? Array(9).fill('').map((_, i) => rawBoard[i] || '')
          : Array(9).fill('')

        while (safeBoard.length < 9) safeBoard.push('')

        setBoard(safeBoard)
        setTurn(data.turn || 'playerA')
        setGameStatus(data.status || 'active')
        setWinner(data.winner || null)
        setWinningLine(data.winningLine || null)

        if (data.scores) {
          setScores({
            playerA: Number(data.scores.playerA || 0),
            playerB: Number(data.scores.playerB || 0)
          })
        }

        if (data.rematchRequests) {
          setRematchRequests({
            playerA: !!data.rematchRequests.playerA,
            playerB: !!data.rematchRequests.playerB
          })
        }

        // Return to lobby synchronized signal
        if (data.status === 'exit_lobby') {
          setActiveGame(null)
          setView('lobby')
        }

        // Trigger confetti for winner
        if (data.winner === mySlot) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#00f5d4', '#26fedc', '#ffade6', '#ffffff']
          })
        }
      } else {
        // Initialize authoritative game node in Firebase if not yet seeded
        update(gameRef, {
          type: 'tictactoe',
          status: 'active',
          board: Array(9).fill(''),
          turn: 'playerA',
          version: 1,
          winner: null,
          winningLine: null,
          scores: { playerA: 0, playerB: 0 },
          rematchRequests: { playerA: false, playerB: false },
          lastActionId: 'init'
        })
      }
    })

    // Also listen to session root for lobby exit
    const sessionRef = ref(db, `sessions/${roomId}`)
    const unsubSession = onValue(sessionRef, (snapshot) => {
      const sess = snapshot.val()
      if (sess && sess.activeGame === null && sess.status === 'active') {
        setActiveGame(null)
        setView('lobby')
      }
    })

    return () => {
      cleanupPresence()
      unsubscribe()
      unsubSession()
    }
  }, [roomId, mySlot, setActiveGame, setView])

  // 2. Turn Timer
  useEffect(() => {
    if (winner || gameStatus !== 'active') return

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 15 : prev - 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [winner, gameStatus])

  // 3. Authoritative Atomic Move via Firebase Transaction (Rule 3, 4, 6, 12, 13)
  const handleCellClick = async (index) => {
    // Fast client pre-check
    if (board[index] !== '' || winner || gameStatus !== 'active' || turn !== mySlot) {
      return
    }

    const actionId = generateActionId('move')
    const gameRef = ref(db, `sessions/${roomId}/game`)

    try {
      await runTransaction(gameRef, (currentGame) => {
        if (!currentGame) return

        // 1. Authoritative checks
        if (currentGame.status !== 'active') return // Game is finished or closed
        if (currentGame.winner) return // Already concluded
        if (currentGame.turn !== mySlot) return // Not this player's turn!
        if (currentGame.lastActionId === actionId) return // Idempotency check

        // Normalize current board in transaction
        const currentBoard = Array.isArray(currentGame.board)
          ? [...currentGame.board]
          : currentGame.board && typeof currentGame.board === 'object'
          ? Array(9).fill('').map((_, i) => currentGame.board[i] || '')
          : Array(9).fill('')

        while (currentBoard.length < 9) currentBoard.push('')

        // 2. Verify cell is strictly empty
        if (currentBoard[index] && currentBoard[index] !== '') {
          return // Cell already occupied!
        }

        // 3. Apply move
        currentBoard[index] = mySymbol
        currentGame.board = currentBoard
        currentGame.lastActionId = actionId
        currentGame.version = (currentGame.version || 0) + 1

        // 4. Authoritative Win / Draw Evaluation
        const winResult = checkTicTacToeWin(currentBoard)
        const currentScores = currentGame.scores || { playerA: 0, playerB: 0 }

        if (winResult) {
          currentGame.winner = winResult.winner // 'playerA' | 'playerB' | 'draw'
          currentGame.winningLine = winResult.line || null
          currentGame.status = 'finished'
          currentGame.finishedAt = Date.now()

          if (winResult.winner === 'playerA') {
            currentScores.playerA = Number(currentScores.playerA || 0) + 1
          } else if (winResult.winner === 'playerB') {
            currentScores.playerB = Number(currentScores.playerB || 0) + 1
          }
          currentGame.scores = currentScores
        } else {
          // Flip turn
          currentGame.turn = mySlot === 'playerA' ? 'playerB' : 'playerA'
          currentGame.status = 'active'
        }

        // Reset rematch votes when new active moves are played
        currentGame.rematchRequests = { playerA: false, playerB: false }

        return currentGame
      })
    } catch (err) {
      console.warn('Move transaction error:', err)
    }
  }

  // 4. Authoritative Rematch State Machine (Rule 23)
  const handleRematch = async () => {
    const gameRef = ref(db, `sessions/${roomId}/game`)

    try {
      await runTransaction(gameRef, (currentGame) => {
        if (!currentGame) return

        currentGame.rematchRequests = currentGame.rematchRequests || { playerA: false, playerB: false }
        currentGame.rematchRequests[mySlot] = true

        const otherAgreed = !!currentGame.rematchRequests[opponentSlot]

        // If other player already agreed OR in single-player test mode, reset board atomically
        if (otherAgreed) {
          // Reset board to 9 empty strings
          currentGame.board = Array(9).fill('')
          // Alternate starting turn for fairness
          currentGame.turn = currentGame.winner === 'playerA' ? 'playerB' : 'playerA'
          currentGame.winner = null
          currentGame.winningLine = null
          currentGame.status = 'active'
          currentGame.rematchRequests = { playerA: false, playerB: false }
          currentGame.version = (currentGame.version || 0) + 1
          currentGame.lastActionId = generateActionId('rematch_reset')
        }

        return currentGame
      })

      // Send chat notification
      const messagesRef = ref(db, `sessions/${roomId}/messages`)
      await push(messagesRef, {
        playerId: mySlot,
        senderName: nickname,
        text: `Requested a rematch!`,
        timestamp: Date.now(),
      })
    } catch (err) {
      console.warn('Rematch transaction error:', err)
    }
  }

  // Force-start rematch if opponent is taking time or for instant test reset
  const handleForceReset = async () => {
    const gameRef = ref(db, `sessions/${roomId}/game`)
    try {
      await runTransaction(gameRef, (currentGame) => {
        if (!currentGame) return
        currentGame.board = Array(9).fill('')
        currentGame.turn = mySlot
        currentGame.winner = null
        currentGame.winningLine = null
        currentGame.status = 'active'
        currentGame.rematchRequests = { playerA: false, playerB: false }
        currentGame.version = (currentGame.version || 0) + 1
        currentGame.lastActionId = generateActionId('force_reset')
        return currentGame
      })
    } catch (err) {
      console.warn('Force reset error:', err)
    }
  }

  // 5. Forfeit Match (Rule 12)
  const handleSurrender = async () => {
    if (winner || gameStatus !== 'active') return

    const gameRef = ref(db, `sessions/${roomId}/game`)
    try {
      await runTransaction(gameRef, (currentGame) => {
        if (!currentGame || currentGame.status !== 'active') return

        const currentScores = currentGame.scores || { playerA: 0, playerB: 0 }
        currentGame.winner = opponentSlot
        currentGame.status = 'finished'
        currentGame.finishedAt = Date.now()
        currentGame.version = (currentGame.version || 0) + 1

        if (opponentSlot === 'playerA') {
          currentScores.playerA = Number(currentScores.playerA || 0) + 1
        } else {
          currentScores.playerB = Number(currentScores.playerB || 0) + 1
        }
        currentGame.scores = currentScores

        return currentGame
      })

      const messagesRef = ref(db, `sessions/${roomId}/messages`)
      await push(messagesRef, {
        playerId: 'system',
        senderName: 'SYSTEM',
        text: `${nickname} surrendered. ${opponentNickname || 'Opponent'} wins!`,
        timestamp: Date.now(),
      })
    } catch (err) {
      console.warn('Surrender error:', err)
    }
  }

  // 6. Return to Lobby
  const handleExitToLobby = async () => {
    try {
      const sessionRef = ref(db, `sessions/${roomId}`)
      await update(sessionRef, {
        activeGame: null,
        'game/status': 'exit_lobby'
      })
    } catch (err) {
      console.warn('Exit error:', err)
    } finally {
      setActiveGame(null)
      setView('lobby')
    }
  }

  const sendQuickReaction = async (reactionText) => {
    setReactionToast(reactionText)
    setTimeout(() => setReactionToast(null), 2500)

    if (roomId) {
      try {
        const messagesRef = ref(db, `sessions/${roomId}/messages`)
        await push(messagesRef, {
          playerId: myNumericId,
          senderName: nickname,
          text: reactionText,
          timestamp: Date.now(),
        })
      } catch (err) {
        console.warn('Reaction error:', err)
      }
    }
  }

  const isMyTurn = turn === mySlot && !winner && gameStatus === 'active'
  const myRematchVote = rematchRequests[mySlot]
  const opponentRematchVote = rematchRequests[opponentSlot]

  return (
    <main className="relative z-10 flex-1 max-w-[1440px] mx-auto w-full px-4 sm:px-6 py-4 md:py-6 flex flex-col justify-between">
      {/* 0. DISCONNECT / GRACE PERIOD BANNER */}
      {!opponentOnline && (
        <div className="w-full mb-3 bg-[#ffb4ab]/10 border border-[#ffb4ab]/40 rounded-xl px-4 py-2 flex items-center justify-between text-xs font-mono text-[#ffb4ab]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#ffb4ab] animate-pulse" />
            <span>Rival connection dropped. Waiting for reconnection (grace period active)...</span>
          </div>
          <span className="text-[10px] text-[#83948f]">Session preserved</span>
        </div>
      )}

      {/* 1. DUO POLARITY HEADER */}
      <section className="w-full mb-4 md:mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* P1 Card: CYAN NEON (Host / Player A) */}
          <div
            className={`md:col-span-4 rounded-xl p-4 transition-all duration-300 relative overflow-hidden bg-[#1a1b24]/85 backdrop-blur-md border ${
              turn === 'playerA' && !winner
                ? 'border-[#00f5d4] shadow-[0_0_20px_rgba(0,245,212,0.4),inset_0_0_12px_rgba(0,245,212,0.2)]'
                : 'border-[#3a4a46]/40'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-['Space_Grotesk'] text-base font-bold text-[#00f5d4]">
                      {mySlot === 'playerA' ? `${nickname} (You)` : opponentNickname || 'Player 1'}
                    </span>
                    <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-[#00f5d4]/20 text-[#00f5d4] border border-[#00f5d4]/40 font-bold">
                      P1 • HOST
                    </span>
                  </div>
                  {/* Turn Status */}
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-mono">
                    {turn === 'playerA' && !winner ? (
                      <span className="text-[#00f5d4] font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#00f5d4] animate-ping" />
                        {mySlot === 'playerA' ? 'YOUR TURN!' : "HOST'S TURN"}
                      </span>
                    ) : (
                      <span className="text-[#83948f]">Waiting...</span>
                    )}
                  </div>
                </div>
              </div>

              {/* P1 Score */}
              <div className="text-right">
                <span className="font-mono text-[10px] text-[#83948f] block uppercase">SCORE</span>
                <span className="font-['Space_Grotesk'] text-3xl font-bold text-[#00f5d4] glow-cyan-intense leading-none">
                  {scores.playerA}
                </span>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-[#00f5d4]/20 flex justify-between items-center text-xs font-mono text-[#83948f]">
              <span className="flex items-center gap-1 text-[#00f5d4]">
                <Wifi className="w-3.5 h-3.5" /> ONLINE
              </span>
              <span>
                Symbol: <strong className="text-[#00f5d4] font-bold text-sm">X</strong>
              </span>
            </div>
          </div>

          {/* CENTER: VS EMBLEM & TIMER */}
          <div className="md:col-span-4 flex flex-col items-center justify-center py-1">
            <div className="flex items-center justify-center gap-4 my-1">
              <span className="font-['Space_Grotesk'] text-3xl font-bold text-[#00f5d4] glow-cyan-intense">
                {scores.playerA}
              </span>
              <div className="relative w-11 h-11 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-[#3a4a46]/80 bg-[#1e1f29]/90 shadow-[0_0_16px_rgba(0,245,212,0.2)]" />
                <span className="relative font-['Space_Grotesk'] text-sm font-bold bg-gradient-to-r from-[#00f5d4] via-white to-[#ffade6] bg-clip-text text-transparent">
                  VS
                </span>
              </div>
              <span className="font-['Space_Grotesk'] text-3xl font-bold text-[#ffade6] glow-magenta-intense">
                {scores.playerB}
              </span>
            </div>

            {/* Turn Timer */}
            <div className="flex items-center gap-2 bg-[#1a1b24]/90 border border-[#00f5d4]/40 rounded-full px-4 py-1 shadow-[0_0_14px_rgba(0,245,212,0.2)]">
              <Timer className="w-4 h-4 text-[#00f5d4]" />
              <span className="font-mono text-[11px] text-[#b9cac4]">MOVE TIME:</span>
              <span className="font-mono text-sm font-bold text-[#00f5d4] tracking-wider">
                {timeLeft}s
              </span>
            </div>
          </div>

          {/* P2 Card: MAGENTA NEON (Guest / Player B) */}
          <div
            className={`md:col-span-4 rounded-xl p-4 transition-all duration-300 relative overflow-hidden bg-[#1a1b24]/85 backdrop-blur-md border ${
              turn === 'playerB' && !winner
                ? 'border-[#ffade6] shadow-[0_0_20px_rgba(181,23,158,0.4),inset_0_0_12px_rgba(181,23,158,0.2)]'
                : 'border-[#3a4a46]/40'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              {/* P2 Score */}
              <div className="text-left">
                <span className="font-mono text-[10px] text-[#83948f] block uppercase">SCORE</span>
                <span className="font-['Space_Grotesk'] text-3xl font-bold text-[#ffade6] glow-magenta-intense leading-none">
                  {scores.playerB}
                </span>
              </div>

              <div className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-[#aa0094]/30 text-[#ffd7ef] border border-[#ffade6]/30 font-bold">
                    P2 • RIVAL
                  </span>
                  <span className="font-['Space_Grotesk'] text-base font-bold text-[#ffade6]">
                    {mySlot === 'playerB' ? `${nickname} (You)` : opponentNickname || 'Player 2'}
                  </span>
                </div>
                {/* Status */}
                <div className="mt-1 flex items-center justify-end gap-1.5 text-xs font-mono">
                  {turn === 'playerB' && !winner ? (
                    <span className="text-[#ffade6] font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#ffade6] animate-ping" />
                      {mySlot === 'playerB' ? 'YOUR TURN!' : "RIVAL'S TURN"}
                    </span>
                  ) : (
                    <span className="text-[#83948f]">Waiting...</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-[#aa0094]/20 flex justify-between items-center text-xs font-mono text-[#83948f]">
              <span>
                Symbol: <strong className="text-[#ffade6] font-bold text-sm">O</strong>
              </span>
              <span className={`flex items-center gap-1 ${opponentOnline ? 'text-[#ffade6]' : 'text-[#ffb4ab]'}`}>
                <Wifi className="w-3.5 h-3.5" /> {opponentOnline ? 'ONLINE' : 'AWAY'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CENTER 3x3 MATRIX */}
      <section className="flex-1 flex flex-col items-center justify-center my-2">
        <div className="relative w-full max-w-[420px] aspect-square p-4 bg-[#1e1f29]/75 backdrop-blur-2xl rounded-2xl border border-[#3a4a46]/50 shadow-[0_12px_48px_rgba(0,0,0,0.7)] flex flex-col justify-between">
          {/* Tech Corner Accents */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#00f5d4]" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#ffade6]" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#00f5d4]" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#ffade6]" />

          {/* 3x3 Grid */}
          <div className="grid grid-cols-3 grid-rows-3 gap-2.5 w-full h-full p-1">
            {board.map((cell, index) => {
              const isWinningCell = winningLine?.includes(index)

              return (
                <button
                  key={index}
                  onClick={() => handleCellClick(index)}
                  disabled={cell !== '' || !!winner || !isMyTurn}
                  aria-label={`Cell ${index + 1}`}
                  className={`relative rounded-xl border flex items-center justify-center transition-all duration-200 select-none ${
                    cell === 'X'
                      ? 'bg-[#282933]/90 border-[#00f5d4]/60 shadow-[inset_0_0_16px_rgba(0,245,212,0.2)]'
                      : cell === 'O'
                      ? 'bg-[#282933]/90 border-[#ffade6]/60 shadow-[inset_0_0_16px_rgba(181,23,158,0.2)]'
                      : isMyTurn && !winner
                      ? 'bg-[#1a1b24]/70 border-[#3a4a46]/50 hover:border-[#00f5d4] hover:bg-[#282933] hover:shadow-[0_0_20px_rgba(0,245,212,0.3)] cursor-pointer active:scale-95 group'
                      : 'bg-[#1a1b24]/50 border-[#3a4a46]/30 cursor-not-allowed opacity-80'
                  } ${isWinningCell ? 'ring-2 ring-white animate-pulse' : ''}`}
                >
                  {cell === 'X' ? (
                    <span className="font-['Space_Grotesk'] text-4xl sm:text-5xl font-bold text-[#00f5d4] glow-cyan-intense">
                      X
                    </span>
                  ) : cell === 'O' ? (
                    <span className="font-['Space_Grotesk'] text-4xl sm:text-5xl font-bold text-[#ffade6] glow-magenta-intense">
                      O
                    </span>
                  ) : (
                    isMyTurn && !winner && (
                      <span className="font-['Space_Grotesk'] text-4xl font-bold opacity-0 group-hover:opacity-30 transition-opacity text-white">
                        {mySymbol}
                      </span>
                    )
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Winner Announcement or Turn Helper */}
        <div className="mt-4 flex flex-col items-center gap-2">
          {winner ? (
            <div className="flex flex-col items-center gap-2">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full font-mono text-sm font-bold bg-[#1e1f29] border border-[#00f5d4] shadow-[0_0_18px_rgba(0,245,212,0.4)] text-white">
                <Trophy className="w-4 h-4 text-[#00f5d4]" />
                <span>
                  {winner === 'draw'
                    ? "It's a Stalemate Draw!"
                    : winner === mySlot
                    ? 'Victory! You Won the Match!'
                    : 'Opponent Won! Good Game!'}
                </span>
              </div>

              {/* Rematch Status Indicator */}
              <div className="flex items-center gap-2 text-xs font-mono">
                {myRematchVote && !opponentRematchVote && (
                  <span className="text-[#00f5d4] flex items-center gap-1 bg-[#00f5d4]/10 px-3 py-1 rounded-full border border-[#00f5d4]/30">
                    <CheckCircle2 className="w-3.5 h-3.5" /> You requested rematch (Waiting for rival...)
                  </span>
                )}
                {!myRematchVote && opponentRematchVote && (
                  <span className="text-[#ffade6] flex items-center gap-1 bg-[#ffade6]/10 px-3 py-1 rounded-full border border-[#ffade6]/30 animate-pulse">
                    <Zap className="w-3.5 h-3.5" /> Rival wants a rematch! Click Rematch to Accept!
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 text-xs font-mono text-[#00f5d4] bg-[#1a1b24]/90 px-4 py-1.5 rounded-full border border-[#00f5d4]/30 shadow-[0_0_10px_rgba(0,245,212,0.15)]">
              <Zap className="w-3.5 h-3.5 animate-pulse" />
              <span>
                {isMyTurn ? 'Your turn! Click an open square.' : "Waiting for opponent's move..."}
              </span>
            </div>
          )}
        </div>

        {reactionToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-[#00f5d4] text-[#00201a] font-mono text-xs font-bold shadow-[0_0_20px_rgba(0,245,212,0.6)] animate-bounce">
            {reactionToast}
          </div>
        )}
      </section>

      {/* 3. BOTTOM CONTROL TRAY & REACTION DECK */}
      <section className="w-full mt-4 pt-3 border-t border-[#3a4a46]/30">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-[#1a1b24]/85 backdrop-blur-xl p-3 sm:p-4 rounded-2xl border border-[#3a4a46]/30">
          {/* Left Buttons: Match Actions */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-center lg:justify-start">
            <button
              onClick={handleSurrender}
              disabled={!!winner}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e1f29] hover:bg-[#93000a]/30 text-[#83948f] hover:text-[#ffb4ab] border border-[#3a4a46] hover:border-[#ffb4ab]/40 transition-all active:scale-95 text-xs font-mono cursor-pointer disabled:opacity-50"
              title="Surrender Match"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Forfeit</span>
            </button>

            {/* Authoritative Rematch Button */}
            <button
              onClick={handleRematch}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg font-['Space_Grotesk'] font-bold text-xs transition-all active:scale-95 cursor-pointer ${
                myRematchVote
                  ? 'bg-[#00f5d4]/20 text-[#00f5d4] border border-[#00f5d4]/50'
                  : opponentRematchVote
                  ? 'bg-[#ffade6] hover:bg-[#ffc2ee] text-[#12131c] shadow-[0_0_20px_rgba(255,173,230,0.6)] animate-bounce'
                  : 'bg-[#00f5d4] hover:bg-[#26fedc] text-[#00201a] shadow-[0_0_15px_rgba(0,245,212,0.35)]'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>
                {myRematchVote 
                  ? 'Rematch Voted (1/2)' 
                  : opponentRematchVote 
                  ? 'Accept Rematch!' 
                  : 'Rematch'}
              </span>
            </button>

            {/* Force Reset helper if solo or testing */}
            {winner && (
              <button
                onClick={handleForceReset}
                title="Reset board immediately"
                className="text-[11px] font-mono text-[#83948f] hover:text-[#00f5d4] underline px-2 cursor-pointer"
              >
                Instant Reset
              </button>
            )}

            <button
              onClick={handleExitToLobby}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e1f29] hover:bg-[#282933] text-[#b9cac4] hover:text-white border border-[#3a4a46] transition-all active:scale-95 text-xs font-mono cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Lobby</span>
            </button>
          </div>

          {/* Right: Quick Emoji Reactions */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-center lg:justify-end">
            <span className="text-[10px] font-mono text-[#83948f] uppercase tracking-wider hidden sm:inline-block">
              QUICK CHAT:
            </span>
            <div className="flex items-center gap-1.5 p-1 bg-[#1e1f29] rounded-xl border border-[#3a4a46]/40">
              <button
                onClick={() => sendQuickReaction('🎮 GG!')}
                className="px-2.5 py-1 rounded-lg bg-[#282933] hover:bg-[#00f5d4]/20 text-white hover:text-[#00f5d4] text-xs font-mono transition-all active:scale-90 cursor-pointer"
              >
                🎮 GG!
              </button>
              <button
                onClick={() => sendQuickReaction('👏 Well Played!')}
                className="px-2.5 py-1 rounded-lg bg-[#282933] hover:bg-[#00f5d4]/20 text-white hover:text-[#00f5d4] text-xs font-mono transition-all active:scale-90 cursor-pointer"
              >
                👏 Well Played
              </button>
              <button
                onClick={() => sendQuickReaction('🍀 Lucky move!')}
                className="px-2.5 py-1 rounded-lg bg-[#282933] hover:bg-[#aa0094]/30 text-white hover:text-[#ffade6] text-xs font-mono transition-all active:scale-90 cursor-pointer"
              >
                🍀 Lucky!
              </button>
              <button
                onClick={() => sendQuickReaction('🔥 On fire!')}
                className="px-2 py-1 rounded-lg bg-[#282933] hover:bg-[#00f5d4]/20 text-white text-xs font-mono transition-all active:scale-90 cursor-pointer"
              >
                🔥
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
