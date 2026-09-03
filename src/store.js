import { create } from 'zustand'

// Retrieve or generate default nickname
const getStoredNickname = () => {
  try {
    return localStorage.getItem('arcade_nickname') || 'CyberKnight'
  } catch {
    return 'CyberKnight'
  }
}

export const useStore = create((set) => ({
  // Navigation & View: 'home' | 'host_waiting' | 'join' | 'lobby' | 'game'
  currentView: 'home',
  
  // Room state
  roomId: null,
  playerId: null, // 1 (Host / Cyan) or 2 (Guest / Magenta)
  playerColor: 'text-primary-container',
  roomStatus: 'idle', // 'idle' | 'waiting' | 'connected'
  
  // Players metadata
  nickname: getStoredNickname(),
  opponentNickname: 'Rival Player',
  
  // Game state
  selectedGame: null,
  activeGame: null, // 'tictactoe' etc.
  scores: { p1: 0, p2: 0 },
  
  // Actions
  setView: (view) => set({ currentView: view }),
  
  setNickname: (name) => {
    const clean = name.trim().slice(0, 16) || 'Player'
    try {
      localStorage.setItem('arcade_nickname', clean)
    } catch {}
    set({ nickname: clean })
  },
  
  setOpponentNickname: (name) => set({ opponentNickname: name }),
  
  setSelectedGame: (game) => set({ selectedGame: game }),
  
  setActiveGame: (gameId) => set({ activeGame: gameId }),
  
  setScores: (scores) => set({ scores }),
  
  setRoom: (id, player, color, status, view = 'lobby') => set({ 
    roomId: id, 
    playerId: player, 
    playerColor: color, 
    roomStatus: status,
    currentView: view
  }),
  
  setStatus: (status) => set({ roomStatus: status }),
  
  resetRoom: () => set({ 
    currentView: 'home',
    roomId: null, 
    playerId: null, 
    playerColor: 'text-primary-container', 
    roomStatus: 'idle',
    selectedGame: null,
    activeGame: null,
    scores: { p1: 0, p2: 0 }
  })
}))
