import { useState, useEffect } from 'react'
import { ArrowLeft, Copy, Share2, Check, CheckCircle2, User, Sparkles, AlertCircle, X } from 'lucide-react'
import { useStore } from '../store'
import { db } from '../lib/firebase'
import { ref, onValue, update } from 'firebase/database'

export default function HostWaitingView() {
  const { roomId, nickname, setNickname, setRoom, resetRoom, setOpponentNickname } = useStore()
  const [copied, setCopied] = useState(false)
  const [editingNick, setEditingNick] = useState(false)
  const [tempNick, setTempNick] = useState(nickname)

  // Listen for guest joining
  useEffect(() => {
    if (!roomId) return

    const roomRef = ref(db, `rooms/${roomId}`)
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val()
      if (data && data.guestReady) {
        if (data.guestNickname) {
          setOpponentNickname(data.guestNickname)
        }
        // Guest joined! Transition seamlessly into the lobby!
        setRoom(roomId, 1, 'text-primary-container', 'connected', 'lobby')
      }
    })

    return () => unsubscribe()
  }, [roomId, setRoom, setOpponentNickname])

  const handleCopyCode = () => {
    if (!roomId) return
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    })
  }

  const handleShare = () => {
    if (!roomId) return
    const shareData = {
      title: 'Arcade Together Match Invitation',
      text: `Join my Arcade Together match! Room Code: ${roomId}`,
      url: window.location.href,
    }
    if (navigator.share) {
      navigator.share(shareData).catch(() => {})
    } else {
      handleCopyCode()
    }
  }

  const handleUpdateNickname = async (e) => {
    e?.preventDefault()
    const clean = tempNick.trim() || 'CyberKnight'
    setNickname(clean)
    setEditingNick(false)
    if (roomId) {
      try {
        const roomRef = ref(db, `rooms/${roomId}`)
        await update(roomRef, { hostNickname: clean })
      } catch (err) {
        console.warn('Update nickname error:', err)
      }
    }
  }

  return (
    <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-8 md:py-12">
      {/* Background Volumetric Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-[#00f5d4]/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[550px] h-[550px] bg-[#aa0094]/15 rounded-full blur-[160px]" />
        <div className="absolute -bottom-32 left-1/3 w-[700px] h-[500px] bg-[#73ebff]/10 rounded-full blur-[180px]" />
        <div className="crt-scanlines absolute inset-0 opacity-20 pointer-events-none" />
      </div>

      <div className="w-full max-w-[840px] mx-auto relative z-10">
        {/* Back Context Bar */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={resetRoom}
            className="inline-flex items-center gap-1.5 text-[#b9cac4] hover:text-[#00f5d4] transition-colors text-xs font-mono cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Home</span>
          </button>
          <span className="text-[11px] font-mono text-[#83948f]">
            STATUS: P1 HOST ACTIVE
          </span>
        </div>

        {/* Core Glassmorphic Host Card */}
        <div className="relative rounded-2xl bg-[#121424]/90 backdrop-blur-2xl border border-white/10 shadow-[0_16px_50px_-10px_rgba(0,0,0,0.85)] p-6 md:p-10 overflow-hidden">
          {/* Subtle Neon Accents Corners */}
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#00f5d4]/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-[#ffade6]/20 rounded-full blur-2xl pointer-events-none" />

          {/* Header Section */}
          <div className="text-center max-w-xl mx-auto mb-8">
            <h1 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2 drop-shadow-[0_2px_16px_rgba(0,245,212,0.3)]">
              Room Created!
            </h1>
            <p className="font-['Hanken_Grotesk'] text-sm sm:text-base text-[#b9cac4] max-w-lg mx-auto">
              Your room is live! Share this code with the friend you want to challenge:
            </p>
          </div>

          {/* Big Neon Room Code Box & Quick Actions */}
          <div className="relative max-w-lg mx-auto mb-8">
            <div className="relative rounded-xl p-4 sm:p-6 bg-[#0d0e17]/90 border-2 border-[#00f5d4]/70 shadow-[0_0_30px_rgba(0,245,212,0.3),inset_0_0_20px_rgba(0,245,212,0.15)] flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Code Display */}
              <div className="flex flex-col items-center sm:items-start">
                <span className="font-mono text-[11px] text-[#83948f] tracking-wider uppercase mb-0.5">
                  ROOM ACCESS CODE
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-3xl sm:text-4xl font-bold text-[#00f5d4] tracking-widest drop-shadow-[0_0_18px_rgba(0,245,212,0.7)] select-all">
                    {roomId}
                  </span>
                  <Sparkles className="w-5 h-5 text-[#00dfc1] animate-pulse" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCopyCode}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#00f5d4] hover:bg-[#26fedc] text-[#00201a] font-['Space_Grotesk'] font-bold text-sm transition-all duration-200 shadow-[0_0_18px_rgba(0,245,212,0.45)] hover:shadow-[0_0_26px_rgba(0,245,212,0.75)] active:scale-95 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>

                <button
                  onClick={handleShare}
                  className="p-3 rounded-lg bg-[#282933] hover:bg-[#33343e] border border-white/10 hover:border-[#00f5d4]/50 text-[#00f5d4] transition-all duration-200 active:scale-95 shadow-md flex items-center justify-center cursor-pointer"
                  title="Share Invite"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Feedback Toast */}
            <div
              className={`transition-opacity duration-300 pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 font-mono text-xs text-[#00f5d4] tracking-wide flex items-center gap-1.5 ${
                copied ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Room code copied to clipboard!</span>
            </div>
          </div>

          {/* Waiting Status & Loader */}
          <div className="flex flex-col items-center justify-center my-6 text-center">
            <div className="flex items-center gap-3 mb-1.5">
              <div className="relative w-5 h-5">
                <div className="absolute inset-0 rounded-full border-2 border-[#3a4a46]/40" />
                <div className="absolute inset-0 rounded-full border-2 border-[#00f5d4] border-t-transparent animate-spin" />
              </div>
              <p className="font-['Hanken_Grotesk'] text-sm sm:text-base text-white font-medium">
                Waiting for opponent to connect...{' '}
                <span className="text-[#00f5d4] font-mono text-xs">(1/2 Players Connected)</span>
              </p>
            </div>
            <p className="text-xs text-[#83948f]">
              Once your opponent enters the code, the game lobby will automatically synchronize.
            </p>
          </div>

          {/* Host Nickname Input */}
          <div className="max-w-lg mx-auto w-full my-4 bg-[#0d0e17]/80 border border-[#3a4a46]/40 hover:border-[#00f5d4]/50 rounded-xl p-3 transition-all">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-mono text-[#83948f] uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#00f5d4]" />
                <span>Your Nickname (Host)</span>
              </label>
            </div>
            {editingNick ? (
              <form onSubmit={handleUpdateNickname} className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={16}
                  value={tempNick}
                  onChange={(e) => setTempNick(e.target.value)}
                  className="bg-[#1e1f29] text-white px-3 py-1.5 rounded-lg border border-[#00f5d4] text-sm font-mono flex-1 focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-[#00f5d4] text-[#00201a] font-mono text-xs font-bold cursor-pointer hover:bg-[#26fedc]"
                >
                  Save
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm font-['Space_Grotesk'] font-bold text-white px-1">
                  {nickname}
                </span>
                <button
                  onClick={() => {
                    setTempNick(nickname)
                    setEditingNick(true)
                  }}
                  className="text-xs font-mono text-[#83948f] hover:text-[#00f5d4] px-2 py-1 rounded bg-[#1e1f29] border border-[#3a4a46] cursor-pointer"
                >
                  Edit Name
                </button>
              </div>
            )}
          </div>

          {/* Player Duo Polarity Slots (P1 Host vs P2 Challenger) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
            {/* Player 1: Host (Active Cyan) */}
            <div className="relative rounded-xl p-4 bg-[#1e1f29]/70 border border-[#00f5d4]/40 neon-border-p1 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-lg bg-[#0d0e17] border border-[#00f5d4] flex items-center justify-center shadow-[0_0_12px_rgba(0,245,212,0.5)]">
                    <User className="w-6 h-6 text-[#00f5d4]" />
                  </div>
                  <div className="absolute -top-2 -left-2 px-1.5 py-0.5 rounded bg-[#00f5d4] text-[#00201a] text-[10px] font-mono font-bold shadow-md">
                    P1
                  </div>
                </div>
                <div>
                  <h3 className="font-['Space_Grotesk'] text-base font-bold text-white">
                    {nickname} <span className="text-[#00f5d4] text-xs font-normal">(You)</span>
                  </h3>
                  <span className="font-mono text-[11px] text-[#83948f]">
                    ROOM HOST • PING: 18ms
                  </span>
                </div>
              </div>

              {/* Ready Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00f5d4]/15 border border-[#00f5d4]/40 text-[#00f5d4] text-xs font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-[#00f5d4] shadow-[0_0_6px_#00f5d4]" />
                <span>Ready</span>
              </div>
            </div>

            {/* Player 2: Guest (Waiting / Dashed Magenta) */}
            <div className="relative rounded-xl p-4 bg-[#1a1b24]/40 border-2 border-dashed border-[#ffade6]/40 neon-border-p2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-lg border-2 border-dashed border-[#ffade6]/50 bg-[#aa0094]/10 flex items-center justify-center">
                    <span className="text-xl animate-pulse text-[#ffade6]">?</span>
                  </div>
                  <div className="absolute -top-2 -left-2 px-1.5 py-0.5 rounded bg-[#aa0094] text-white text-[10px] font-mono font-bold shadow-md">
                    P2
                  </div>
                </div>
                <div>
                  <h3 className="font-['Space_Grotesk'] text-base font-bold text-[#b9cac4]">
                    Waiting for Player 2...
                  </h3>
                  <span className="font-mono text-[11px] text-[#83948f]">
                    INVITE CHALLENGER
                  </span>
                </div>
              </div>

              {/* Waiting Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#aa0094]/15 border border-[#ffade6]/30 text-[#ffade6] text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-[#ffade6] animate-ping" />
                <span>Waiting</span>
              </div>
            </div>
          </div>

          {/* Footer Action: Cancel Room / Return */}
          <div className="pt-4 border-t border-[#3a4a46]/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[#83948f] text-xs font-mono">
              <AlertCircle className="w-4 h-4 text-[#00f5d4]" />
              <span>Room closes automatically after 15 minutes of inactivity.</span>
            </div>
            <button
              onClick={resetRoom}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[#ffb4ab]/40 hover:border-[#ffb4ab] bg-[#93000a]/20 hover:bg-[#93000a]/40 text-[#ffb4ab] hover:text-white font-mono text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel Room / Return</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
