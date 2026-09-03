import { useState } from 'react'
import { Gamepad2, Copy, Check, ArrowLeft, LogOut } from 'lucide-react'
import { useStore } from '../store'

export default function Header() {
  const [copied, setCopied] = useState(false)
  const { 
    roomId, 
    playerId, 
    nickname, 
    opponentNickname, 
    roomStatus, 
    currentView, 
    setView, 
    resetRoom, 
    activeGame, 
    setActiveGame 
  } = useStore()

  const handleCopyCode = () => {
    if (!roomId) return
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleBackToLobby = () => {
    setActiveGame(null)
    setView('lobby')
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-[#1a1b24]/85 backdrop-blur-xl border-b border-[#3a4a46]/30 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between px-4 sm:px-6 h-16 w-full">
        {/* Brand Logo */}
        <div 
          onClick={() => {
            if (currentView === 'game') handleBackToLobby()
            else if (currentView !== 'lobby') resetRoom()
          }}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-[#00f5d4]/10 border border-[#00f5d4]/30 flex items-center justify-center group-hover:border-[#00f5d4] transition-colors shadow-[0_0_12px_rgba(0,245,212,0.3)]">
            <Gamepad2 className="w-5 h-5 text-[#00f5d4]" />
          </div>
          <span className="font-['Space_Grotesk'] text-lg sm:text-xl font-bold text-[#00f5d4] tracking-wider drop-shadow-[0_0_12px_rgba(0,245,212,0.6)]">
            Arcade Together
          </span>
          {activeGame && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#282933] border border-[#3a4a46] text-[#00f5d4]">
              <span className="w-2 h-2 rounded-full bg-[#00f5d4] animate-ping" />
              LIVE: TIC-TAC-TOE
            </span>
          )}
        </div>

        {/* Center / Right Control Cluster */}
        <div className="flex items-center gap-2 sm:gap-4">
          {roomId && (
            <div className="flex items-center gap-2 bg-[#1e1f29] px-3 py-1.5 rounded-full border border-[#3a4a46]/50">
              <span className="text-[11px] font-mono text-[#b9cac4] hidden xs:inline">ROOM:</span>
              <span className="text-xs sm:text-sm font-mono font-bold text-[#00f5d4] tracking-wider">
                {roomId}
              </span>
              <button
                onClick={handleCopyCode}
                className="text-[#83948f] hover:text-[#00f5d4] transition-colors ml-0.5 cursor-pointer"
                title="Copy Room Code"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#00f5d4]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* Player Duo Status Badges */}
          {roomStatus === 'connected' && (
            <div className="hidden md:flex items-center gap-2 font-mono">
              {/* P1 Badge */}
              <div className="flex items-center gap-2 bg-[#1e1f29]/90 px-2.5 py-1 rounded-lg border border-[#00f5d4]/40 shadow-[0_0_10px_rgba(0,245,212,0.2)]">
                <span className="w-2 h-2 rounded-full bg-[#00f5d4] shadow-[0_0_6px_#00f5d4]" />
                <div className="flex flex-col text-left leading-tight text-[11px]">
                  <span className="text-[#00f5d4] font-bold">
                    {playerId === 1 ? `${nickname} (You)` : opponentNickname || 'P1'}
                  </span>
                  <span className="text-[9px] text-[#83948f]">HOST</span>
                </div>
              </div>

              <span className="text-[11px] font-bold text-[#3a4a46]">VS</span>

              {/* P2 Badge */}
              <div className="flex items-center gap-2 bg-[#1e1f29]/90 px-2.5 py-1 rounded-lg border border-[#aa0094]/60 shadow-[0_0_10px_rgba(170,0,148,0.25)]">
                <span className="w-2 h-2 rounded-full bg-[#ffade6] shadow-[0_0_6px_#ffade6]" />
                <div className="flex flex-col text-left leading-tight text-[11px]">
                  <span className="text-[#ffade6] font-bold">
                    {playerId === 2 ? `${nickname} (You)` : opponentNickname || 'P2'}
                  </span>
                  <span className="text-[9px] text-[#83948f]">RIVAL</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions depending on screen */}
          {currentView === 'game' ? (
            <button
              onClick={handleBackToLobby}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#282933] hover:bg-[#33343e] text-[#e3e1ef] hover:text-[#00f5d4] border border-[#3a4a46] hover:border-[#00f5d4]/50 text-xs font-mono transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Lobby</span>
            </button>
          ) : (
            roomId && (
              <button
                onClick={resetRoom}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#282933] hover:bg-[#93000a]/30 text-[#83948f] hover:text-[#ffb4ab] border border-[#3a4a46] hover:border-[#ffb4ab]/40 text-xs font-mono transition-all active:scale-95 cursor-pointer"
                title="Leave Room"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Leave</span>
              </button>
            )
          )}
        </div>
      </div>
    </header>
  )
}
