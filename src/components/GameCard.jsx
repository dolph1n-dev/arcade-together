import { useStore } from '../store'
import { db } from '../lib/firebase'
import { ref, update } from 'firebase/database'

export default function GameCard({ game }) {
  const { roomId, playerId, selectedGame, setSelectedGame } = useStore()
  const isSelected = selectedGame?.id === game.id

  const handleSelect = async () => {
    const gameData = { id: game.id, title: game.title, by: playerId }
    setSelectedGame(gameData)

    if (roomId) {
      try {
        const roomRef = ref(db, `rooms/${roomId}`)
        await update(roomRef, { selectedGame: gameData })
      } catch (err) {
        console.warn('Game select sync warning:', err)
      }
    }
  }

  return (
    <div 
      onClick={handleSelect}
      className={`bg-gray-800 border-2 rounded-xl p-4 min-h-[120px] flex flex-col justify-center items-center cursor-pointer transition-all active:scale-95 ${
        isSelected 
          ? 'border-cyan-400 bg-gray-700/80 shadow-[0_0_12px_rgba(34,211,238,0.4)]' 
          : 'border-gray-700 hover:border-gray-500 hover:bg-gray-700/50'
      }`}
    >
      <h3 className="text-xl font-bold text-white mb-1 text-center">{game.title}</h3>
      <p className="text-xs text-gray-400 text-center">{game.desc}</p>
      {isSelected && (
        <span className="mt-2 text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
          Seçildi
        </span>
      )}
    </div>
  )
}
