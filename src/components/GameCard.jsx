export default function GameCard({ game }) {
  return (
    <div className="bg-gray-800 border-2 border-gray-700 rounded-xl p-4 min-h-[120px] flex flex-col justify-center items-center cursor-pointer hover:bg-gray-700 transition-all active:scale-95">
      <h3 className="text-xl font-bold text-white mb-1 text-center">{game.title}</h3>
      <p className="text-xs text-gray-400 text-center">{game.desc}</p>
    </div>
  )
}