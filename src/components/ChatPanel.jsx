export default function ChatPanel() {
  return (
    <div className="flex flex-col h-full w-full p-3">
      {/* Sistem Bildirim Alanı (Oyuncu 1 oyun seçti vb.) */}
      <div className="bg-gray-900 border border-gray-600 rounded-lg p-2 mb-3 min-h-[50px] flex items-center justify-center text-center text-sm">
        <span className="text-gray-400 animate-pulse">Oyun seçimi bekleniyor...</span>
      </div>

      {/* Mesajların Akacağı Alan */}
      <div className="flex-1 bg-gray-900 rounded-lg p-3 mb-3 overflow-y-auto">
        <p className="text-xs text-gray-500 text-center">Sohbet başladı</p>
        {/* Mesajlar buraya gelecek */}
      </div>

      {/* Mesaj Gönderme Girdisi */}
      <div className="flex gap-2 h-12">
        <input 
          type="text" 
          placeholder="Mesaj yaz..." 
          className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 text-sm outline-none focus:border-white transition-colors"
        />
        <button className="bg-gray-700 hover:bg-gray-600 px-4 rounded-lg font-bold">
          &gt;
        </button>
      </div>
    </div>
  )
}