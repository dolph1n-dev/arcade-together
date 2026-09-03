import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store'
import { db } from '../lib/firebase'
import { ref, push, onValue } from 'firebase/database'

export default function ChatPanel() {
  const [text, setText] = useState('')
  const [messages, setMessages] = useState([])
  const { roomId, playerId, selectedGame } = useStore()
  const messagesEndRef = useRef(null)

  // Mesajları Firebase'den dinle
  useEffect(() => {
    if (!roomId) return

    const messagesRef = ref(db, `rooms/${roomId}/messages`)
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const msgList = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }))
        setMessages(msgList)
      }
    })

    return () => unsubscribe()
  }, [roomId])

  // Yeni mesaj geldiğinde alta kaydır
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed) return

    const newMsg = {
      playerId,
      senderName: playerId === 1 ? 'Oyuncu 1' : 'Oyuncu 2',
      color: playerId === 1 ? 'text-cyan-400' : 'text-fuchsia-400',
      text: trimmed,
      timestamp: Date.now(),
    }

    setText('')

    if (roomId) {
      try {
        const messagesRef = ref(db, `rooms/${roomId}/messages`)
        await push(messagesRef, newMsg)
      } catch (err) {
        console.warn('Message sync warning:', err)
        // Fallback local display
        setMessages((prev) => [...prev, { id: String(Date.now()), ...newMsg }])
      }
    } else {
      setMessages((prev) => [...prev, { id: String(Date.now()), ...newMsg }])
    }
  }

  return (
    <div className="flex flex-col h-full w-full p-3 font-mono">
      {/* Sistem Bildirim Alanı (Oyuncu 1 oyun seçti vb.) */}
      <div className="bg-gray-900 border border-gray-600 rounded-lg p-2 mb-3 min-h-[50px] flex items-center justify-center text-center text-sm">
        {selectedGame ? (
          <span className="text-cyan-400">
            {selectedGame.by ? `Oyuncu ${selectedGame.by}` : 'Biri'} <strong className="text-white">{selectedGame.title}</strong> oyununu seçti!
          </span>
        ) : (
          <span className="text-gray-400 animate-pulse">Oyun seçimi bekleniyor...</span>
        )}
      </div>

      {/* Mesajların Akacağı Alan */}
      <div className="flex-1 bg-gray-900 rounded-lg p-3 mb-3 overflow-y-auto custom-scrollbar flex flex-col gap-2">
        <p className="text-xs text-gray-500 text-center mb-1">Sohbet başladı</p>
        
        {messages.map((msg) => {
          const isMe = msg.playerId === playerId
          return (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[85%] ${
                isMe ? 'self-end items-end' : 'self-start items-start'
              }`}
            >
              <span className={`text-[10px] font-bold ${msg.color || 'text-gray-400'}`}>
                {msg.senderName || `Oyuncu ${msg.playerId}`}
              </span>
              <div
                className={`rounded-lg px-3 py-1.5 text-sm break-words mt-0.5 ${
                  isMe
                    ? 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-100'
                    : 'bg-fuchsia-950/80 border border-fuchsia-500/40 text-fuchsia-100'
                }`}
              >
                {msg.text}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Mesaj Gönderme Girdisi */}
      <div className="flex gap-2 h-12">
        <input 
          type="text" 
          placeholder="Mesaj yaz..." 
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 text-sm outline-none focus:border-white text-white placeholder-gray-500 transition-colors"
        />
        <button 
          onClick={handleSend}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 rounded-lg font-bold transition-colors cursor-pointer"
        >
          &gt;
        </button>
      </div>
    </div>
  )
}
