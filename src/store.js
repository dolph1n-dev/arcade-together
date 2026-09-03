import { create } from 'zustand'

export const useStore = create((set) => ({
  roomId: null,
  playerId: null, // 1 (Host) veya 2 (Join)
  playerColor: null, // 'cyan' (Turkuaz) veya 'fuchsia' (Mor/Kırmızı)
  roomStatus: 'idle', // 'idle' (boşta), 'waiting' (bekliyor), 'connected' (bağlandı)
  
  setRoom: (id, player, color, status) => set({ 
    roomId: id, 
    playerId: player, 
    playerColor: color, 
    roomStatus: status 
  }),
  
  setStatus: (status) => set({ roomStatus: status }),
  
  resetRoom: () => set({ 
    roomId: null, 
    playerId: null, 
    playerColor: null, 
    roomStatus: 'idle' 
  })
}))