import { useState, useEffect } from 'react'
import { ArrowLeft, Timer, Flag, RotateCcw, Wifi, Trophy, Zap } from 'lucide-react'
import confetti from 'canvas-confetti'
import { useStore } from '../store'
import { db } from '../lib/firebase'
import { ref, onValue, update, push } from 'firebase/database'

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6],           // Diagonals
]

export default function TicTacToeGame() {
  const { 
    roomId, 
    playerId, 
    nickname, 
    opponentNickname, 
    setView, 
    setActiveGame 
  } = useStore()

  const [board, setBoard] = useState(Array(9).fill(null))
  const [turn, setTurn] = useState(1) // 1 for P1 (X), 2 for P2 (O)
  const [winner, setWinner] = useState(null) // 1, 2, 'draw', or null
  const [winningLine, setWinningLine] = useState(null)
  const [scores, setScores] = useState({ p1: 0, p2: 0 })
  const [timeLeft, setTimeLeft] = useState(15)
  const [reactionToast, setReactionToast] = useState(null)

  // Listen to live game state in Firebase
  useEffect(() => {
    if (!roomId) return

    const gameRef = ref(db, `rooms/${roomId}/game`)
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        if (data.board) setBoard(data.board)
        if (data.turn) {
          setTurn(data.turn)
        }
        setWinner(data.winner || null)
        setWinningLine(data.winningLine || null)
        if (data.scores) setScores(data.scores)

        // Check if returning to lobby was triggered
        if (data.gameStatus === 'exit_lobby') {
          setActiveGame(null)
          setView('lobby')
        }

        // Trigger confetti for winner
        if (data.winner === playerId) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#00f5d4', '#26fedc', '#ffade6', '#ffffff']
          })
        }
      } else {
        // Initialize game in Firebase if not present
        update(gameRef, {
          board: Array(9).fill(null),
          turn: 1,
          winner: null,
          winningLine: null,
          scores: { p1: 0, p2: 0 },
          gameStatus: 'active'
        })
      }
    })

    return () => unsubscribe()
  }, [roomId, playerId, setActiveGame, setView])

  // Turn timer countdown
  useEffect(() => {
    if (winner) return
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 15
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [turn, winner])

  const checkWinner = (currentBoard) => {
    for (const combo of WINNING_COMBOS) {
      const [a, b, c] = combo
      if (
        currentBoard[a] &&
        currentBoard[a] === currentBoard[b] &&
        currentBoard[a] === currentBoard[c]
      ) {
        return {
          winner: currentBoard[a] === 'X' ? 1 : 2,
          line: combo,
        }
      }
    }
    if (currentBoard.every((cell) => cell !== null)) {
      return { winner: 'draw', line: null }
    }
    return null
  }

  const handleCellClick = async (index) => {
    // Only allow click if it's the player's turn, cell is empty, and game is active
    if (board[index] !== null || winner || turn !== playerId) return

    const mySymbol = playerId === 1 ? 'X' : 'O'
    const newBoard = [...board]
    newBoard[index] = mySymbol

    const result = checkWinner(newBoard)
    const nextTurn = playerId === 1 ? 2 : 1
    const newScores = { ...scores }

    let winState = null
    let winCombo = null

    if (result) {
      winState = result.winner
      winCombo = result.line
      if (result.winner === 1) newScores.p1 += 1
      if (result.winner === 2) newScores.p2 += 1
    }

    try {
      const gameRef = ref(db, `rooms/${roomId}/game`)
      await update(gameRef, {
        board: newBoard,
        turn: nextTurn,
        winner: winState,
        winningLine: winCombo,
        scores: newScores,
        lastMoveAt: Date.now()
      })
    } catch (err) {
      console.warn('Move sync warning:', err)
    }
  }

  const handleRematch = async () => {
    try {
      const gameRef = ref(db, `rooms/${roomId}/game`)
      await update(gameRef, {
        board: Array(9).fill(null),
        turn: winner === 1 ? 2 : 1, // Alternate start
        winner: null,
        winningLine: null,
      })

      // Send chat notification
      const messagesRef = ref(db, `rooms/${roomId}/messages`)
      await push(messagesRef, {
        playerId: 0,
        senderName: 'SYSTEM',
        text: `Rematch started by ${nickname}!`,
        timestamp: Date.now(),
      })
    } catch (err) {
      console.warn('Rematch error:', err)
    }
  }

  const handleSurrender = async () => {
    if (winner) return
    const opponentId = playerId === 1 ? 2 : 1
    const newScores = { ...scores }
    if (opponentId === 1) newScores.p1 += 1
    if (opponentId === 2) newScores.p2 += 1

    try {
      const gameRef = ref(db, `rooms/${roomId}/game`)
      await update(gameRef, {
        winner: opponentId,
        scores: newScores
      })

      const messagesRef = ref(db, `rooms/${roomId}/messages`)
      await push(messagesRef, {
        playerId: 0,
        senderName: 'SYSTEM',
        text: `${nickname} forfeited the match. ${opponentNickname || 'Opponent'} wins!`,
        timestamp: Date.now(),
      })
    } catch (err) {
      console.warn('Surrender error:', err)
    }
  }

  const handleExitToLobby = async () => {
    try {
      const gameRef = ref(db, `rooms/${roomId}/game`)
      await update(gameRef, { gameStatus: 'exit_lobby' })
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
        const messagesRef = ref(db, `rooms/${roomId}/messages`)
        await push(messagesRef, {
          playerId,
          senderName: nickname,
          text: reactionText,
          timestamp: Date.now(),
        })
      } catch (err) {
        console.warn('Reaction error:', err)
      }
    }
  }

  const isMyTurn = turn === playerId
  const mySymbol = playerId === 1 ? 'X' : 'O'

  return (
    <main className="relative z-10 flex-1 max-w-[1440px] mx-auto w-full px-4 sm:px-6 py-4 md:py-6 flex flex-col justify-between">
      {/* 1. DUO POLARITY HEADER */}
      <section className="w-full mb-4 md:mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* P1 Card: CYAN NEON */}
          <div
            className={`md:col-span-4 rounded-xl p-4 transition-all duration-300 relative overflow-hidden bg-[#1a1b24]/85 backdrop-blur-md border ${
              turn === 1 && !winner
                ? 'border-[#00f5d4] shadow-[0_0_20px_rgba(0,245,212,0.4),inset_0_0_12px_rgba(0,245,212,0.2)]'
                : 'border-[#3a4a46]/40'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-['Space_Grotesk'] text-base font-bold text-[#00f5d4]">
                      {playerId === 1 ? `${nickname} (You)` : opponentNickname || 'Player 1'}
                    </span>
                    <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-[#00f5d4]/20 text-[#00f5d4] border border-[#00f5d4]/40 font-bold">
                      HOST
                    </span>
                  </div>
                  {/* Status */}
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-mono">
                    {turn === 1 && !winner ? (
                      <span className="text-[#00f5d4] font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#00f5d4] animate-ping" />
                        {playerId === 1 ? 'YOUR TURN!' : "HOST'S TURN"}
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
                  {scores.p1}
                </span>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-[#00f5d4]/20 flex justify-between items-center text-xs font-mono text-[#83948f]">
              <span className="flex items-center gap-1 text-[#00f5d4]">
                <Wifi className="w-3.5 h-3.5" /> 18ms
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
                {scores.p1}
              </span>
              <div className="relative w-11 h-11 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-[#3a4a46]/80 bg-[#1e1f29]/90 shadow-[0_0_16px_rgba(0,245,212,0.2)]" />
                <span className="relative font-['Space_Grotesk'] text-sm font-bold bg-gradient-to-r from-[#00f5d4] via-white to-[#ffade6] bg-clip-text text-transparent">
                  VS
                </span>
              </div>
              <span className="font-['Space_Grotesk'] text-3xl font-bold text-[#ffade6] glow-magenta-intense">
                {scores.p2}
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

          {/* P2 Card: MAGENTA NEON */}
          <div
            className={`md:col-span-4 rounded-xl p-4 transition-all duration-300 relative overflow-hidden bg-[#1a1b24]/85 backdrop-blur-md border ${
              turn === 2 && !winner
                ? 'border-[#ffade6] shadow-[0_0_20px_rgba(181,23,158,0.4),inset_0_0_12px_rgba(181,23,158,0.2)]'
                : 'border-[#3a4a46]/40'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              {/* P2 Score */}
              <div className="text-left">
                <span className="font-mono text-[10px] text-[#83948f] block uppercase">SCORE</span>
                <span className="font-['Space_Grotesk'] text-3xl font-bold text-[#ffade6] glow-magenta-intense leading-none">
                  {scores.p2}
                </span>
              </div>

              <div className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-[#aa0094]/30 text-[#ffd7ef] border border-[#ffade6]/30 font-bold">
                    RIVAL
                  </span>
                  <span className="font-['Space_Grotesk'] text-base font-bold text-[#ffade6]">
                    {playerId === 2 ? `${nickname} (You)` : opponentNickname || 'Player 2'}
                  </span>
                </div>
                {/* Status */}
                <div className="mt-1 flex items-center justify-end gap-1.5 text-xs font-mono">
                  {turn === 2 && !winner ? (
                    <span className="text-[#ffade6] font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#ffade6] animate-ping" />
                      {playerId === 2 ? 'YOUR TURN!' : "RIVAL'S TURN"}
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
              <span className="flex items-center gap-1 text-[#ffade6]">
                <Wifi className="w-3.5 h-3.5" /> 34ms
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
                  disabled={cell !== null || !!winner || !isMyTurn}
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
        <div className="mt-4">
          {winner ? (
            <div className="flex flex-col items-center gap-2">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full font-mono text-sm font-bold bg-[#1e1f29] border border-[#00f5d4] shadow-[0_0_18px_rgba(0,245,212,0.4)] text-white">
                <Trophy className="w-4 h-4 text-[#00f5d4]" />
                <span>
                  {winner === 'draw'
                    ? "It's a Stalemate Draw!"
                    : winner === playerId
                    ? 'Victory! You Won the Match!'
                    : 'Opponent Won! Good Game!'}
                </span>
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

            <button
              onClick={handleRematch}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#00f5d4] hover:bg-[#26fedc] text-[#00201a] font-['Space_Grotesk'] font-bold text-xs shadow-[0_0_15px_rgba(0,245,212,0.35)] hover:shadow-[0_0_25px_rgba(0,245,212,0.6)] transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rematch</span>
            </button>

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
