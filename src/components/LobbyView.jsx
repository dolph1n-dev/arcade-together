import { useState, useEffect, useRef } from 'react'
import { 
  Gamepad2, 
  Wifi, 
  Play, 
  Send, 
  MessageSquare, 
  Radio, 
  Check
} from 'lucide-react'
import { useStore } from '../store'
import { db } from '../lib/firebase'
import { ref, onValue, push, update } from 'firebase/database'

export default function LobbyView() {
  const { 
    roomId, 
    playerId, 
    nickname, 
    selectedGame, 
    setSelectedGame, 
    setActiveGame, 
    setView 
  } = useStore()

  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const chatBottomRef = useRef(null)

  // 6 Mini Games definition matching Google Stitch design
  const games = [
    {
      id: 'tictactoe',
      title: 'TicTacToe',
      desc: 'Classic Neon XOX Fast Duel',
      isPlayable: true,
      renderGraphic: () => (
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#33343e]/50 border border-[#00f5d4]/30 flex items-center justify-center relative mb-2 group-hover:scale-105 transition-transform duration-300">
          <div className="grid grid-cols-2 gap-2 text-xl sm:text-2xl font-bold font-['Space_Grotesk']">
            <span className="text-[#00f5d4] drop-shadow-[0_0_8px_#00f5d4]">X</span>
            <span className="text-[#ffade6] drop-shadow-[0_0_8px_#ffade6]">O</span>
            <span className="text-[#ffade6] drop-shadow-[0_0_8px_#ffade6]">O</span>
            <span className="text-[#00f5d4] drop-shadow-[0_0_8px_#00f5d4]">X</span>
          </div>
        </div>
      )
    },
    {
      id: 'connect4',
      title: 'Connect 4',
      desc: 'Four-in-a-Row Arena Duel',
      isPlayable: false,
      renderGraphic: () => (
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#33343e]/40 border border-[#3a4a46]/50 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform duration-300">
          <div className="flex gap-1.5">
            <div className="flex flex-col gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#00f5d4] shadow-[0_0_6px_#00f5d4]" />
              <span className="w-3 h-3 rounded-full bg-[#ffade6] shadow-[0_0_6px_#ffade6]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#ffade6] shadow-[0_0_6px_#ffade6]" />
              <span className="w-3 h-3 rounded-full bg-[#00f5d4] shadow-[0_0_6px_#00f5d4]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#00f5d4] shadow-[0_0_6px_#00f5d4]" />
              <span className="w-3 h-3 rounded-full bg-[#3a4a46]" />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'pong',
      title: 'Neon Pong',
      desc: 'Fast Retro Paddle Clash',
      isPlayable: false,
      renderGraphic: () => (
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#33343e]/40 border border-[#3a4a46]/50 flex items-center justify-between px-3 relative mb-2 group-hover:scale-105 transition-transform duration-300">
          <div className="w-1.5 h-8 bg-[#00f5d4] rounded-full shadow-[0_0_8px_#00f5d4]" />
          <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_#fff]" />
          <div className="w-1.5 h-8 bg-[#ffade6] rounded-full shadow-[0_0_8px_#ffade6]" />
        </div>
      )
    },
    {
      id: 'airhockey',
      title: 'Air Hockey Blitz',
      desc: 'High-Speed Puck Arena',
      isPlayable: false,
      renderGraphic: () => (
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#33343e]/40 border border-[#3a4a46]/50 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform duration-300">
          <div className="w-10 h-10 rounded-full border border-[#73ebff]/40 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-[#73ebff] shadow-[0_0_10px_#73ebff]" />
          </div>
        </div>
      )
    },
    {
      id: 'memory',
      title: 'Memory Matrix',
      desc: 'Cybernetic Card Matching',
      isPlayable: false,
      renderGraphic: () => (
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#33343e]/40 border border-[#3a4a46]/50 flex items-center justify-center p-2 mb-2 group-hover:scale-105 transition-transform duration-300">
          <div className="grid grid-cols-3 gap-1 w-full h-full">
            <div className="bg-[#282933] rounded-xs" />
            <div className="bg-[#ffade6]/70 rounded-xs shadow-[0_0_4px_#ffade6]" />
            <div className="bg-[#282933] rounded-xs" />
            <div className="bg-[#ffade6]/70 rounded-xs shadow-[0_0_4px_#ffade6]" />
            <div className="bg-[#282933] rounded-xs" />
            <div className="bg-[#00f5d4]/70 rounded-xs shadow-[0_0_4px_#00f5d4]" />
            <div className="bg-[#282933] rounded-xs" />
            <div className="bg-[#00f5d4]/70 rounded-xs shadow-[0_0_4px_#00f5d4]" />
            <div className="bg-[#282933] rounded-xs" />
          </div>
        </div>
      )
    },
    {
      id: 'naval',
      title: 'Naval Strike',
      desc: 'Radar Battlefield Warfare',
      isPlayable: false,
      renderGraphic: () => (
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#33343e]/40 border border-[#3a4a46]/50 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform duration-300">
          <Radio className="w-8 h-8 text-[#26fedc] drop-shadow-[0_0_10px_#26fedc]" />
        </div>
      )
    }
  ]

  // Listen to messages & room sync in Firebase
  useEffect(() => {
    if (!roomId) return

    // Messages sync
    const messagesRef = ref(db, `rooms/${roomId}/messages`)
    const unsubMessages = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.keys(data).map((key) => ({
          id: key,
          ...data[key]
        }))
        setMessages(list)
      }
    })

    // Active game & selection sync
    const roomRef = ref(db, `rooms/${roomId}`)
    const unsubRoom = onValue(roomRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        if (data.selectedGame) setSelectedGame(data.selectedGame)
        if (data.activeGame) {
          setActiveGame(data.activeGame)
          setView('game')
        }
      }
    })

    return () => {
      unsubMessages()
      unsubRoom()
    }
  }, [roomId, setSelectedGame, setActiveGame, setView])

  // Scroll chat to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Launch Game
  const handleStartGame = async (game) => {
    setSelectedGame(game)
    if (roomId) {
      try {
        const roomRef = ref(db, `rooms/${roomId}`)
        await update(roomRef, {
          activeGame: game.id,
          selectedGame: game,
          'game/gameStatus': 'active'
        })

        const messagesRef = ref(db, `rooms/${roomId}/messages`)
        await push(messagesRef, {
          playerId: 0,
          senderName: 'SYSTEM',
          text: `${nickname} launched ${game.title}! Duel begins now!`,
          timestamp: Date.now()
        })
      } catch (err) {
        console.warn('Game launch warning:', err)
      }
    }
    setActiveGame(game.id)
    setView('game')
  }

  // Send Chat Message
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputText).trim()
    if (!text) return

    setInputText('')
    const newMsg = {
      playerId,
      senderName: nickname,
      color: playerId === 1 ? 'text-[#00f5d4]' : 'text-[#ffade6]',
      text,
      timestamp: Date.now()
    }

    if (roomId) {
      try {
        const messagesRef = ref(db, `rooms/${roomId}/messages`)
        await push(messagesRef, newMsg)
      } catch (err) {
        console.warn('Send message error:', err)
        setMessages((prev) => [...prev, { id: String(Date.now()), ...newMsg }])
      }
    } else {
      setMessages((prev) => [...prev, { id: String(Date.now()), ...newMsg }])
    }
  }

  return (
    <main className="flex-1 max-w-[1440px] mx-auto w-full px-4 sm:px-6 py-4 md:py-6 flex flex-col gap-6 relative z-10">
      {/* Hero Status Bar */}
      <div className="w-full bg-[#1a1b24]/75 backdrop-blur-md rounded-xl p-4 border border-[#3a4a46]/30 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#282933] flex items-center justify-center text-[#00f5d4] border border-[#00f5d4]/20 shadow-[0_0_10px_rgba(0,245,212,0.2)]">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-['Space_Grotesk'] text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Dual Arcade Station</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00f5d4]/10 text-[#00f5d4] border border-[#00f5d4]/30">
                LIVE LOBBY
              </span>
            </h1>
            <p className="text-xs text-[#b9cac4]">
              {selectedGame
                ? `Opponent selected ${selectedGame.title}! Press Start Game to duel.`
                : 'Select a game below and jump directly into synchronous multiplayer competition.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-[#b9cac4]">
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-[#00f5d4]" />
            <span>
              Latency: <span className="text-[#00f5d4] font-bold">18ms</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main 75% / 25% Split (Game Catalog 9 cols / Chat 3 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT SECTION: MINI GAMES CATALOG (9 of 12 cols) */}
        <section className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {games.map((game) => {
              const isSelected = selectedGame?.id === game.id

              return (
                <div
                  key={game.id}
                  className={`group relative bg-[#1a1b24]/90 backdrop-blur-md rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between aspect-square ${
                    game.isPlayable
                      ? 'border-[#00f5d4]/60 hover:border-[#00f5d4] shadow-[0_0_20px_rgba(0,245,212,0.15)] hover:shadow-[0_0_25px_rgba(0,245,212,0.3)]'
                      : 'border-[#3a4a46]/40 hover:border-[#ffade6]/50'
                  }`}
                >
                  {/* Top Badge */}
                  <div className="flex items-center justify-between w-full">
                    {game.isPlayable ? (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#00f5d4]/15 text-[#00f5d4] border border-[#00f5d4]/30">
                        MULTIPLAYER READY
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-[#83948f] px-2 py-0.5 rounded bg-[#282933]">
                        ARCADE CLASSIC
                      </span>
                    )}

                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-[#00f5d4] font-bold">
                        <Check className="w-3 h-3" /> SELECTED
                      </span>
                    )}
                  </div>

                  {/* Graphic Artwork */}
                  <div className="my-auto flex flex-col items-center justify-center text-center py-2">
                    {game.renderGraphic()}
                    <h3 className="font-['Space_Grotesk'] text-lg font-bold text-white group-hover:text-[#00f5d4] transition-colors">
                      {game.title}
                    </h3>
                    <p className="text-xs text-[#b9cac4] line-clamp-1 mt-0.5 font-['Hanken_Grotesk']">
                      {game.desc}
                    </p>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleStartGame(game)}
                    className={`w-full py-2.5 px-4 rounded-xl font-mono text-xs font-bold tracking-wider uppercase transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                      game.isPlayable
                        ? 'bg-[#00f5d4] hover:bg-[#26fedc] text-[#00201a] shadow-[0_0_15px_rgba(0,245,212,0.4)] hover:shadow-[0_0_25px_rgba(0,245,212,0.7)]'
                        : 'bg-[#282933] hover:bg-[#33343e] text-white border border-[#3a4a46]'
                    }`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{game.isPlayable ? 'Start Game' : 'Play Now'}</span>
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        {/* RIGHT SECTION: LIVE LOBBY CHAT (3 of 12 cols / 4 on lg) */}
        <aside className="lg:col-span-4 xl:col-span-3 flex flex-col bg-[#1a1b24]/90 backdrop-blur-xl border border-[#3a4a46]/40 rounded-2xl overflow-hidden shadow-2xl h-[560px] lg:h-[620px]">
          {/* Chat Header */}
          <div className="px-4 py-3 bg-[#1e1f29] border-b border-[#3a4a46]/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#00f5d4]" />
              <span className="font-['Space_Grotesk'] text-sm font-bold text-white">
                Lobby Chat
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#83948f]">
              {messages.length} messages
            </span>
          </div>

          {/* Chat Stream */}
          <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-2 text-xs font-mono flex flex-col">
            <div className="text-center my-1">
              <span className="text-[10px] font-mono bg-[#282933]/60 text-[#83948f] px-2.5 py-1 rounded-full border border-[#3a4a46]/30 inline-block">
                Room Synchronized • 2 Players Connected
              </span>
            </div>

            {messages.map((msg) => {
              const isSystem = msg.playerId === 0
              const isMe = msg.playerId === playerId

              if (isSystem) {
                return (
                  <div key={msg.id} className="text-center my-1">
                    <span className="text-[10px] bg-[#00f5d4]/10 text-[#00f5d4] px-2 py-0.5 rounded border border-[#00f5d4]/20 inline-block">
                      {msg.text}
                    </span>
                  </div>
                )
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[88%] ${
                    isMe ? 'self-end items-end' : 'self-start items-start'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] mb-0.5">
                    <span className={msg.color || 'text-[#83948f]'}>
                      {isMe ? `${msg.senderName || 'You'} (Me)` : msg.senderName || 'Opponent'}
                    </span>
                    <span className="text-[#83948f]/60">
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : ''}
                    </span>
                  </div>

                  <div
                    className={`rounded-xl px-3 py-2 text-xs break-words ${
                      isMe
                        ? 'bg-[#00f5d4]/15 border border-[#00f5d4]/40 text-[#d7fff3] rounded-tr-none shadow-[0_0_10px_rgba(0,245,212,0.15)]'
                        : 'bg-[#aa0094]/20 border border-[#ffade6]/30 text-[#ffd7ef] rounded-tl-none shadow-[0_0_10px_rgba(170,0,148,0.15)]'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              )
            })}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Reaction Emojis */}
          <div className="px-3 py-2 bg-[#1e1f29]/70 border-t border-[#3a4a46]/30 flex items-center justify-between">
            {['🏆', '🔥', '😎', '😱', '🚀', '🎮'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSendMessage(emoji)}
                className="hover:scale-125 transition-transform text-base p-1 cursor-pointer"
                title={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Message Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="p-3 bg-[#1e1f29] border-t border-[#3a4a46]/40 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Send message..."
              className="flex-1 bg-[#0d0e17] border border-[#3a4a46]/60 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-[#83948f] focus:outline-none focus:border-[#00f5d4] transition-all"
            />
            <button
              type="submit"
              className="bg-[#00f5d4] hover:bg-[#26fedc] text-[#00201a] p-2 rounded-lg transition-all active:scale-90 cursor-pointer shadow-[0_0_8px_rgba(0,245,212,0.4)]"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </aside>
      </div>
    </main>
  )
}
