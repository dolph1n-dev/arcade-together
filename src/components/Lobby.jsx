import { useEffect } from 'react'
import GameCard from './GameCard'
import ChatPanel from './ChatPanel'
import { useStore } from '../store'
import { db } from '../lib/firebase'
import { ref, onValue } from 'firebase/database'

export default function Lobby() {
  const { roomId, playerColor, resetRoom, setSelectedGame } = useStore()

  // Örnek oyun verileri
  const games = [
    { id: 'pong', title: 'NEON PONG', desc: 'Klasik pinpon' },
    { id: 'tictactoe', title: 'XOX', desc: 'Taktiksel savaş' },
    { id: 'memory', title: 'HAFIZA', desc: 'Kart eşleştirme' },
    { id: 'snake', title: 'SNAKE', desc: 'Yılan yarışı' },
  ]

  // Seçilen oyunu Firebase üzerinden diğer oyuncuyla senkronize et
  useEffect(() => {
    if (roomId) {
      const selectedGameRef = ref(db, `rooms/${roomId}/selectedGame`)
      const unsubscribe = onValue(selectedGameRef, (snapshot) => {
        const data = snapshot.val()
        if (data) {
          setSelectedGame(data)
        }
      })
      return () => unsubscribe()
    }
  }, [roomId, setSelectedGame])

  return (
    // Mobilde alt alta (flex-col), tablet ve üzeri masaüstünde yan yana (md:flex-row)
    <div className="flex flex-col md:flex-row w-full h-[100dvh] max-w-7xl mx-auto p-2 md:p-4 gap-4 md:gap-6 bg-gray-900">
      
      {/* SOL TARAF: Oyun Listesi (Mobilde üstte) */}
      <div className="flex-1 flex flex-col min-h-[50dvh] overflow-hidden">
        <div className="flex justify-between items-center mb-4 px-2">
          <h2 className="text-2xl font-bold tracking-wider text-white">LOBİ</h2>
          <div className="flex items-center gap-3">
            <div className="text-sm bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
              ODA: <span className={`font-bold ${playerColor}`}>{roomId}</span>
            </div>
            <button
              onClick={() => resetRoom()}
              className="text-xs text-gray-400 hover:text-white px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-700 cursor-pointer"
            >
              Çıkış
            </button>
          </div>
        </div>
        
        {/* Grid yapısı: Mobilde 2 sütun, masaüstünde 2 veya 3 sütun */}
        <div className="flex-1 overflow-y-auto pb-4 pr-2 custom-scrollbar">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {games.map(game => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </div>
      </div>

      {/* SAĞ TARAF: Chat Paneli (Mobilde altta, Masaüstünde sağda sabit genişlik) */}
      <div className="w-full md:w-80 lg:w-96 h-[40dvh] md:h-full shrink-0 bg-gray-800 rounded-xl shadow-lg border-2 border-gray-700 overflow-hidden flex flex-col">
        <ChatPanel />
      </div>

    </div>
  )
}