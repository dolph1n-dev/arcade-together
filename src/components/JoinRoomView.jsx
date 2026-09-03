import { useState, useRef } from 'react'
import { ArrowLeft, ArrowRight, LogIn, User, HelpCircle, AlertCircle } from 'lucide-react'
import { useStore } from '../store'
import { db } from '../lib/firebase'
import { ref, get, update, push } from 'firebase/database'

export default function JoinRoomView() {
  const { nickname, setNickname, setRoom, setView, setOpponentNickname } = useStore()
  const [nick, setNick] = useState(nickname || 'CyberPlayer')
  const [codeSlots, setCodeSlots] = useState(['', '', '', '', ''])
  const [errorMsg, setErrorMsg] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef()]

  const handleSlotChange = (index, value) => {
    setErrorMsg('')
    const char = value.slice(-1).toUpperCase()
    const updated = [...codeSlots]
    updated[index] = char
    setCodeSlots(updated)

    // Auto-advance to next slot
    if (char && index < 4) {
      inputRefs[index + 1].current?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !codeSlots[index] && index > 0) {
      inputRefs[index - 1].current?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    setErrorMsg('')
    const pasteData = (e.clipboardData || window.clipboardData)
      .getData('text')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 5)

    if (pasteData.length > 0) {
      const updated = ['', '', '', '', '']
      for (let i = 0; i < pasteData.length; i++) {
        updated[i] = pasteData[i]
      }
      setCodeSlots(updated)
      const targetFocus = Math.min(pasteData.length, 4)
      inputRefs[targetFocus].current?.focus()
    }
  }

  const handleConnect = async (e) => {
    e?.preventDefault()
    setErrorMsg('')
    const fullCode = codeSlots.join('').trim().toUpperCase()

    if (fullCode.length < 5) {
      setErrorMsg('Please enter all 5 characters of the room code.')
      return
    }

    const cleanNick = nick.trim() || 'CyberPlayer'
    setNickname(cleanNick)
    setIsConnecting(true)

    try {
      const roomRef = ref(db, `rooms/${fullCode}`)
      const snapshot = await get(roomRef)

      if (!snapshot.exists()) {
        setErrorMsg('Invalid room code! Please check with your friend.')
        setIsConnecting(false)
        return
      }

      const roomData = snapshot.val()
      if (roomData.guestReady) {
        setErrorMsg('This room is already full with 2 players!')
        setIsConnecting(false)
        return
      }

      // Join room: set guestReady to true and store guest nickname
      await update(roomRef, {
        guestReady: true,
        guestNickname: cleanNick,
      })

      // Send system message
      const messagesRef = ref(db, `rooms/${fullCode}/messages`)
      await push(messagesRef, {
        playerId: 0,
        senderName: 'SYSTEM',
        text: `${cleanNick} (P2) has joined the duel arena!`,
        timestamp: Date.now(),
      })

      if (roomData.hostNickname) {
        setOpponentNickname(roomData.hostNickname)
      }

      // Enter lobby as Player 2 (Magenta)
      setRoom(fullCode, 2, 'text-secondary', 'connected', 'lobby')
    } catch (err) {
      console.warn('Join error:', err)
      setErrorMsg('Failed to connect to Firebase. Please try again.')
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-8 md:py-16">
      {/* Background Glowing Ambient Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[540px] h-[540px] bg-[#00f5d4]/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-24 w-[480px] h-[480px] bg-[#aa0094]/15 rounded-full blur-[160px]" />
        <div className="absolute bottom-10 left-1/3 w-[600px] h-[350px] bg-[#00f5d4]/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 cyber-grid pointer-events-none opacity-40" />
      </div>

      <div className="w-full max-w-xl relative z-10">
        {/* Ambient Glow Behind Card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#00f5d4]/30 via-[#aa0094]/20 to-[#ffade6]/30 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition duration-1000" />

        {/* Glassmorphic Central Card */}
        <section className="relative bg-[#1a1b24]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 sm:p-8 md:p-10 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.85)] overflow-hidden">
          {/* Retro Edge Accent Line */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#00f5d4] via-[#00dfc1] to-[#aa0094]" />

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">
              Join a Room
            </h1>
            <p className="font-['Hanken_Grotesk'] text-sm sm:text-base text-[#b9cac4] max-w-md mx-auto">
              Enter the 5-character room code from your friend to jump straight into the match.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3 rounded-lg bg-[#93000a]/30 border border-[#ffb4ab]/40 text-[#ffdad6] text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#ffb4ab]" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleConnect} className="space-y-6">
            {/* Player Nickname Input */}
            <div className="space-y-2">
              <label className="block text-xs font-mono text-[#b9cac4] uppercase tracking-wider" htmlFor="nickname">
                Your Nickname
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#83948f] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="nickname"
                  type="text"
                  maxLength={16}
                  value={nick}
                  onChange={(e) => setNick(e.target.value)}
                  placeholder="e.g. CyberRival"
                  required
                  className="w-full bg-[#0d0e17] text-white placeholder:text-[#83948f]/60 text-sm font-mono pl-10 pr-4 py-3 rounded-lg border border-white/10 focus:border-[#00f5d4] focus:outline-none focus:shadow-[0_0_15px_rgba(0,245,212,0.3)] transition-all"
                />
              </div>
            </div>

            {/* 5-Slot Neon Code Input Area */}
            <div className="space-y-2">
              <label className="block text-xs font-mono text-[#b9cac4] uppercase tracking-wider">
                5-Character Room Code
              </label>
              <div className="grid grid-cols-5 gap-2 sm:gap-3" onPaste={handlePaste}>
                {codeSlots.map((char, index) => (
                  <input
                    key={index}
                    ref={inputRefs[index]}
                    type="text"
                    maxLength={1}
                    value={char}
                    onChange={(e) => handleSlotChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    placeholder={['H', 'S', '5', 'Q', '1'][index]}
                    required
                    className="h-16 sm:h-20 w-full text-center text-2xl sm:text-3xl font-mono font-bold uppercase bg-[#0d0e17] text-[#00f5d4] rounded-lg border border-[#3a4a46]/70 focus:border-[#00f5d4] focus:bg-[#1a1b24] focus:shadow-[0_0_20px_rgba(0,245,212,0.4),inset_0_0_12px_rgba(0,245,212,0.2)] focus:outline-none transition-all"
                  />
                ))}
              </div>
            </div>

            {/* Duo Polarity Bar */}
            <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#0d0e17]/90 border border-[#3a4a46]/30 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00f5d4] shadow-[0_0_8px_#00f5d4]" />
                <span className="text-[#b9cac4]">P1: HOST WAITING</span>
              </div>
              <div className="text-[#ffade6] flex items-center gap-2">
                <span>YOU: P2 RIVAL</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffade6] shadow-[0_0_8px_#ffade6]" />
              </div>
            </div>

            {/* Primary Submit Button: Magenta Glow */}
            <button
              type="submit"
              disabled={isConnecting}
              className="w-full group relative flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-['Space_Grotesk'] text-base font-bold text-white bg-[#aa0094] hover:bg-[#850074] border border-[#ffade6] shadow-[0_0_25px_rgba(170,0,148,0.55),inset_0_0_15px_rgba(255,173,230,0.3)] hover:shadow-[0_0_35px_rgba(170,0,148,0.85),inset_0_0_20px_rgba(255,173,230,0.5)] active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <LogIn className="w-5 h-5 text-[#ffade6] group-hover:rotate-6 transition-transform" />
              <span className="tracking-wide">
                {isConnecting ? 'Connecting to Room...' : 'Connect to Room'}
              </span>
              <ArrowRight className="w-5 h-5 text-[#ffd7ef] opacity-80 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Bottom Helper Cluster */}
          <div className="mt-8 pt-4 border-t border-[#3a4a46]/30 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[#b9cac4] text-xs font-mono">
              <HelpCircle className="w-4 h-4 text-[#00f5d4]" />
              <span>5 letters or numbers</span>
            </div>

            <button
              onClick={() => setView('home')}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[#83948f] hover:text-[#00f5d4] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return Home</span>
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
