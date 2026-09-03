import Lobby from './components/Lobby'
import { useState, useEffect } from 'react'
import { db } from './lib/firebase'
import { ref, set, get, onValue, update } from 'firebase/database'
import { useStore } from './store'
import './App.css'

function App() {
  const [joinCode, setJoinCode] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const { roomId, playerId, playerColor, roomStatus, setRoom, setStatus, resetRoom } = useStore()

  // 6 haneli rastgele oda kodu üretici
  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase()

  // ODA KUR (HOST)
  const handleHost = async () => {
    setErrorMsg('')
    const code = generateCode()
    const roomRef = ref(db, `rooms/${code}`)
    
    try {
      // Firebase'e odayı yaz
      await set(roomRef, {
        hostReady: true,
        guestReady: false,
        createdAt: Date.now()
      })
    } catch (err) {
      console.warn('Firebase sync warning:', err)
    }
    
    // Oyuncu 1 (Host) olarak state'i güncelle - Neon Turkuaz
    setRoom(code, 1, 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]', 'waiting')
  }

  // ODAYA KATIL (JOIN)
  const handleJoin = async () => {
    if (!joinCode.trim()) return
    setErrorMsg('')
    const code = joinCode.toUpperCase().trim()
    const roomRef = ref(db, `rooms/${code}`)
    
    try {
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
          setErrorMsg("Bu oda zaten dolu!")
        }
      } else {
        setErrorMsg("Geçersiz oda kodu!")
      }
    } catch (err) {
      console.warn('Firebase join warning:', err)
      // Allow fallback connection
      setRoom(code, 2, 'text-fuchsia-500 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]', 'connected')
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

  if (roomStatus === 'connected') {
    return <Lobby />
  }

  // ARAYÜZ (UI)
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center font-mono p-4">
      <h1 className="text-4xl font-bold mb-10 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
        ARCADE TOGETHER
      </h1>

      {errorMsg && (
        <div className="mb-4 px-4 py-2 bg-red-950/80 border border-red-500 text-red-300 rounded text-sm">
          {errorMsg}
        </div>
      )}

      {roomStatus === 'idle' && (
        <div className="flex flex-col gap-6 items-center w-full max-w-xs">
          <button 
            onClick={handleHost}
            className="w-full py-3 bg-gray-800 border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-950 transition-colors rounded-lg font-bold tracking-widest drop-shadow-[0_0_5px_rgba(34,211,238,0.5)] cursor-pointer"
          >
            HOST
          </button>
          
          <div className="w-full flex items-center gap-2">
            <input 
              type="text" 
              placeholder="ODA KODU" 
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              className="flex-1 py-3 px-4 bg-gray-800 border-2 border-fuchsia-500 text-fuchsia-500 placeholder-fuchsia-500/50 outline-none rounded-lg text-center font-bold uppercase"
            />
            <button 
              onClick={handleJoin}
              className="py-3 px-6 bg-gray-800 border-2 border-fuchsia-500 text-fuchsia-500 hover:bg-fuchsia-950 transition-colors rounded-lg font-bold drop-shadow-[0_0_5px_rgba(217,70,239,0.5)] cursor-pointer"
            >
              JOIN
            </button>
          </div>
        </div>
      )}

      {roomStatus === 'waiting' && (
        <div className="text-center">
          <p className="text-xl mb-2 text-gray-200">Oda oluşturuldu!</p>
          <p className="text-sm text-gray-400 mb-4">Arkadaşına bu kodu gönder:</p>
          <div className={`text-5xl font-bold ${playerColor} animate-pulse my-4`}>{roomId}</div>
          <p className="mt-6 text-gray-400">Oyuncu 2 bekleniyor...</p>
          <div className="mt-8">
            <button
              onClick={() => resetRoom()}
              className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-700 cursor-pointer"
            >
              İptal Et
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App