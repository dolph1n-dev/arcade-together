import Lobby from './components/Lobby'
import { useState, useEffect } from 'react'
import { db } from './lib/firebase'
import { ref, set, get, onValue, update } from 'firebase/database'
import { useStore } from './store'
import './App.css'

function App() {
  const [joinCode, setJoinCode] = useState('')
  const { roomId, playerId, playerColor, roomStatus, setRoom, setStatus } = useStore()

  // 6 haneli rastgele oda kodu üretici
  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase()

  // ODA KUR (HOST)
  const handleHost = async () => {
    const code = generateCode()
    const roomRef = ref(db, `rooms/${code}`)
    
    // Firebase'e odayı yaz
    await set(roomRef, {
      hostReady: true,
      guestReady: false,
      createdAt: Date.now()
    })
    
    // Oyuncu 1 (Host) olarak state'i güncelle - Neon Turkuaz
    setRoom(code, 1, 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]', 'waiting')
  }

  // ODAYA KATIL (JOIN)
  const handleJoin = async () => {
    if (!joinCode.trim()) return
    const code = joinCode.toUpperCase()
    const roomRef = ref(db, `rooms/${code}`)
    
    // Oda var mı kontrol et
    const snapshot = await get(roomRef)

    if (snapshot.exists()) {
      const data = snapshot.val()
      if (!data.guestReady) {
        // Oda müsait, Firebase'i güncelle
        await update(roomRef, { guestReady: true })
        // Oyuncu 2 (Guest) olarak state'i güncelle - Neon Kırmızı/Mor
        setRoom(code, 2, 'text-fuchsia-500 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]', 'connected')
      } else {
        alert("Bu oda zaten dolu!")
      }
    } else {
      alert("Geçersiz oda kodu!")
    }
  }

  // HOST İÇİN DİNLEYİCİ: Oyuncu 2 geldiğinde haberdar ol
  useEffect(() => {
    if (roomId && playerId === 1) {
      const roomRef = ref(db, `rooms/${roomId}`)
      
      // onValue, veritabanındaki değişiklikleri anlık dinler
      const unsubscribe = onValue(roomRef, (snapshot) => {
        const data = snapshot.val()
        if (data && data.guestReady) {
          setStatus('connected')
        }
      })
      
      // Bileşen ekrandan kalktığında dinlemeyi bırak
      return () => unsubscribe()
    }
  }, [roomId, playerId, setStatus])


  // ARAYÜZ (UI)
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center font-mono p-4">
      <h1 className="text-4xl font-bold mb-10 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
        ARCADE TOGETHER
      </h1>

      {roomStatus === 'idle' && (
        <div className="flex flex-col gap-6 items-center w-full max-w-xs">
          <button 
            onClick={handleHost}
            className="w-full py-3 bg-gray-800 border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-950 transition-colors rounded-lg font-bold tracking-widest drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]"
          >
            HOST
          </button>
          
          <div className="w-full flex items-center gap-2">
            <input 
              type="text" 
              placeholder="ODA KODU" 
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="flex-1 py-3 px-4 bg-gray-800 border-2 border-fuchsia-500 text-fuchsia-500 placeholder-fuchsia-500/50 outline-none rounded-lg text-center font-bold uppercase"
            />
            <button 
              onClick={handleJoin}
              className="py-3 px-6 bg-gray-800 border-2 border-fuchsia-500 text-fuchsia-500 hover:bg-fuchsia-950 transition-colors rounded-lg font-bold drop-shadow-[0_0_5px_rgba(217,70,239,0.5)]"
            >
              JOIN
            </button>
          </div>
        </div>
      )}

      {roomStatus === 'waiting' && (
        <div className="text-center animate-pulse">
          <p className="text-xl mb-2">Oda oluşturuldu!</p>
          <p className="text-sm text-gray-400 mb-4">Arkadaşına bu kodu gönder:</p>
          <div className={`text-5xl font-bold ${playerColor}`}>{roomId}</div>
          <p className="mt-8 text-gray-400">Oyuncu 2 bekleniyor...</p>
        </div>
      )}

      {roomStatus === 'connected' ? (
        <Lobby />
      ) : (
        <div className="text-center">
          <p className="text-2xl mb-4">Bağlantı Kuruldu!</p>
          <p className="mb-2">Oda: <span className="font-bold">{roomId}</span></p>
          <p className={`text-xl font-bold ${playerColor}`}>
            Sen {playerId === 1 ? 'Oyuncu 1 (Host)' : 'Oyuncu 2 (Join)'} olarak oynuyorsun.
          </p>
        </div>
      )}
    </div>
  )
}

export default App