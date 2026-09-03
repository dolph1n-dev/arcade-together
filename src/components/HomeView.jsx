import { useState } from 'react'
import { PlusSquare, Key, ArrowRight, User, Sparkles, Check } from 'lucide-react'
import { useStore } from '../store'
import { db } from '../lib/firebase'
import { ref, set, serverTimestamp } from 'firebase/database'
import { setupPresenceTracker } from '../lib/session'

export default function HomeView() {
  const { nickname, userPlayerId, setNickname, setRoom, setView } = useStore()
  const [editingNick, setEditingNick] = useState(false)
  const [tempNick, setTempNick] = useState(nickname)
  const [isCreating, setIsCreating] = useState(false)

  // 5-character alphanumeric room code generator (matching Stitch format HS5Q1)
  const generate5CharCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const handleHost = async () => {
    setIsCreating(true)
    const code = generate5CharCode()
    const sessionRef = ref(db, `sessions/${code}`)

    try {
      // Create session under authoritative schema (Rule 1, 2, 14, 16)
      await set(sessionRef, {
        sessionId: code,
        status: 'waiting',
        gameType: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        hostPlayerId: userPlayerId,
        players: {
          playerA: {
            playerId: userPlayerId,
            nickname: nickname || 'CyberKnight',
            slot: 'playerA',
            connected: true,
            lastSeen: serverTimestamp()
          }
        },
        game: {
          type: 'tictactoe',
          status: 'active',
          board: ['', '', '', '', '', '', '', '', ''],
          turn: 'playerA',
          version: 1,
          winner: null,
          winningLine: null,
          scores: { playerA: 0, playerB: 0 },
          rematchRequests: { playerA: false, playerB: false },
          lastActionId: 'init'
        },
        messages: {
          init: {
            id: 'init',
            playerId: 'system',
            senderName: 'SYSTEM',
            text: `Room created by ${nickname || 'CyberKnight'}. Waiting for rival to connect...`,
            timestamp: Date.now()
          }
        }
      })

      // Setup presence for playerA
      setupPresenceTracker(code, 'playerA')
    } catch (err) {
      console.warn('Firebase session creation warning:', err)
    } finally {
      setIsCreating(false)
      setRoom(code, 1, 'text-primary-container', 'waiting', 'host_waiting')
    }
  }

  const handleSaveNick = (e) => {
    e?.preventDefault()
    if (tempNick.trim()) {
      setNickname(tempNick.trim())
    }
    setEditingNick(false)
  }

  return (
    <main className="relative z-10 flex-1 flex flex-col justify-center items-center px-4 sm:px-6 py-8 md:py-16 max-w-[1440px] mx-auto w-full">
      {/* Background Volumetric Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-96 h-96 bg-[#00f5d4]/10 rounded-full blur-[130px]" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#aa0094]/20 rounded-full blur-[140px]" />
        <div className="absolute -bottom-20 left-1/3 w-[500px] h-[350px] bg-[#73ebff]/10 rounded-full blur-[130px]" />
        <div className="absolute inset-0 cyber-grid opacity-50" />
        <div className="absolute bottom-0 left-0 right-0 h-64 cyber-perspective-floor opacity-35 pointer-events-none" />
      </div>

      {/* Hero Header Cluster */}
      <div className="text-center max-w-2xl mx-auto mb-8 md:mb-12 space-y-3 relative z-10">
        {/* Live Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1a1b24]/90 border border-[#00f5d4]/30 backdrop-blur-md mb-2 shadow-[0_0_15px_rgba(0,245,212,0.15)]">
          <span className="w-2 h-2 rounded-full bg-[#00f5d4] animate-ping" />
          <span className="font-mono text-xs text-[#00f5d4] tracking-widest uppercase font-bold">
            DUEL NETWORK • ONLINE
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="font-['Space_Grotesk'] text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow-[0_0_35px_rgba(0,245,212,0.4)]">
          Arcade Together
        </h1>

        {/* Subtitle */}
        <p className="font-['Hanken_Grotesk'] text-base md:text-lg text-[#b9cac4] max-w-lg mx-auto">
          Instant real-time two-player mini arcade games with friends in the browser.
        </p>
      </div>

      {/* Centerpiece: Futuristic Neon Glass Panel */}
      <div className="w-full max-w-xl relative group z-10">
        {/* Ambient Glow Behind Card */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#00f5d4]/30 via-transparent to-[#aa0094]/35 blur-xl opacity-75 group-hover:opacity-100 transition duration-500" />

        {/* Main Glassmorphism Card */}
        <div className="relative rounded-2xl bg-[#1a1b24]/85 backdrop-blur-2xl border border-white/10 p-6 md:p-8 shadow-[0_8px_40px_-4px_rgba(0,0,0,0.85)] overflow-hidden">
          {/* Retro Corner Decals */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#00f5d4]/70" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#ffade6]/70" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#00f5d4]/70" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#ffade6]/70" />

          {/* Terminal Header Strip */}
          <div className="flex items-center justify-between border-b border-[#3a4a46]/30 pb-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#00f5d4] drop-shadow-[0_0_6px_#00f5d4]" />
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#ffade6] drop-shadow-[0_0_6px_#ffade6]" />
            </div>
            <div className="font-mono text-xs text-[#00f5d4] tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SYNCHRONIZATION READY</span>
            </div>
          </div>

          {/* Nickname Bar */}
          <div className="mb-6 p-3 rounded-xl bg-[#0d0e17]/80 border border-[#3a4a46]/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#00f5d4]/10 border border-[#00f5d4]/30 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-[#00f5d4]" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-mono uppercase text-[#83948f] block tracking-wider">
                  YOUR NICKNAME
                </span>
                {editingNick ? (
                  <form onSubmit={handleSaveNick} className="flex items-center gap-2 mt-0.5">
                    <input
                      type="text"
                      maxLength={16}
                      value={tempNick}
                      onChange={(e) => setTempNick(e.target.value)}
                      className="bg-[#1e1f29] border border-[#00f5d4] text-[#00f5d4] px-2 py-0.5 rounded text-sm font-mono focus:outline-none w-full max-w-[180px]"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="text-xs px-2 py-1 rounded bg-[#00f5d4] text-[#00201a] font-bold cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <span className="font-['Space_Grotesk'] text-sm sm:text-base font-bold text-white truncate block">
                    {nickname}
                  </span>
                )}
              </div>
            </div>

            {!editingNick && (
              <button
                onClick={() => {
                  setTempNick(nickname)
                  setEditingNick(true)
                }}
                className="text-xs font-mono text-[#83948f] hover:text-[#00f5d4] px-2.5 py-1 rounded bg-[#1e1f29] hover:bg-[#282933] border border-[#3a4a46] transition-colors cursor-pointer"
              >
                Change
              </button>
            )}
          </div>

          {/* Action Buttons (Stacked High-Impact Cards) */}
          <div className="flex flex-col gap-4">
            {/* 1. HOST Button (Electric Cyan Glow) */}
            <button
              onClick={handleHost}
              disabled={isCreating}
              className="group/host relative w-full overflow-hidden rounded-xl bg-[#00f5d4] hover:bg-[#26fedc] text-[#00201a] p-5 sm:p-6 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between border border-[#00dfc1] shadow-[0_0_20px_rgba(0,245,212,0.4),inset_0_0_12px_rgba(0,245,212,0.2)] hover:shadow-[0_0_30px_rgba(0,245,212,0.65)] cursor-pointer"
            >
              {/* Glitch & Shine Hover Effect */}
              <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/35 to-transparent -skew-x-12 -translate-x-full group-hover/host:translate-x-[300%] transition-transform duration-1000" />
              
              <div className="flex items-center gap-4 text-left relative z-10">
                <div className="w-12 h-12 rounded-lg bg-[#00201a]/15 border border-[#00201a]/20 flex items-center justify-center text-[#00201a]">
                  <PlusSquare className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-['Space_Grotesk'] text-xl font-bold tracking-tight text-[#00201a]">
                      HOST
                    </span>
                    <span className="font-mono text-[10px] bg-[#00201a]/20 px-2 py-0.5 rounded text-[#00201a] tracking-wider font-bold">
                      P1 OWNER
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#00201a]/85 font-medium mt-0.5">
                    Create a new room & invite a friend
                  </p>
                </div>
              </div>

              <div className="relative z-10 hidden sm:flex flex-col items-end">
                <ArrowRight className="w-6 h-6 text-[#00201a] group-hover/host:translate-x-1 transition-transform" />
                <span className="font-mono text-[9px] text-[#00201a]/70 uppercase tracking-wider font-bold">
                  INSERT COIN
                </span>
              </div>
            </button>

            {/* 2. JOIN Button (Magenta Neon Glow) */}
            <button
              onClick={() => setView('join')}
              className="group/join relative w-full overflow-hidden rounded-xl bg-[#282933]/90 hover:bg-[#aa0094]/30 text-white p-5 sm:p-6 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] border border-[#aa0094]/80 shadow-[0_0_20px_rgba(181,23,158,0.35)] hover:shadow-[0_0_30px_rgba(181,23,158,0.6)] flex items-center justify-between cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#aa0094]/20 via-transparent to-[#aa0094]/30 opacity-60 group-hover/join:opacity-100 transition-opacity" />
              
              <div className="flex items-center gap-4 text-left relative z-10">
                <div className="w-12 h-12 rounded-lg bg-[#aa0094]/40 border border-[#ffade6]/40 flex items-center justify-center text-[#ffade6] shadow-[0_0_15px_rgba(170,0,148,0.5)]">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-['Space_Grotesk'] text-xl font-bold tracking-tight text-white">
                      JOIN
                    </span>
                    <span className="font-mono text-[10px] bg-[#aa0094]/50 text-[#ffd7ef] px-2 py-0.5 rounded tracking-wider font-bold">
                      P2 RIVAL
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#b9cac4] mt-0.5">
                    Enter 5-character code to join match
                  </p>
                </div>
              </div>

              <div className="relative z-10 hidden sm:flex flex-col items-end">
                <ArrowRight className="w-6 h-6 text-[#ffade6] group-hover/join:translate-x-1 transition-transform" />
                <span className="font-mono text-[9px] text-[#ffade6]/80 uppercase tracking-wider font-bold">
                  ENTER CODE
                </span>
              </div>
            </button>
          </div>

          {/* Quick Feature Pills */}
          <div className="mt-6 pt-4 border-t border-[#3a4a46]/30 flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-[#83948f]">
            <span className="px-2.5 py-1 rounded-full bg-[#1e1f29] border border-[#3a4a46]">
              • Zero Installation
            </span>
            <span className="px-2.5 py-1 rounded-full bg-[#1e1f29] border border-[#3a4a46]">
              • 5-Character Instant Match
            </span>
            <span className="px-2.5 py-1 rounded-full bg-[#1e1f29] border border-[#3a4a46]">
              • Real-Time Live Sync
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}
