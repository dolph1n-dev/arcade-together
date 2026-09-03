import { create } from 'zustand'
import { getStablePlayerId, clearActiveSession, saveActiveSession } from './lib/session'

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
  
  // Stable identity (Rule 2)
  userPlayerId: getStablePlayerId(),
  
  // Session & Slot state (Rule 1 & 2)
  sessionId: null,
  roomId: null, // Aliased with sessionId for compatibility
  playerSlot: null, // 'playerA' | 'playerB'
  playerId: null, // 1 (P1/Host/Cyan) or 2 (P2/Guest/Magenta) for UI polarity
  playerColor: 'text-primary-container',
  sessionStatus: 'idle', // 'idle' | 'waiting' | 'active' | 'finished' | 'abandoned' | 'closed'
  roomStatus: 'idle', // Aliased
  
  // Players metadata
  nickname: getStoredNickname(),
  opponentNickname: 'Rival Player',
  opponentPresence: { connected: true, lastSeen: null },
  
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
  setOpponentPresence: (presence) => set({ opponentPresence: presence }),
  
  setSelectedGame: (game) => set({ selectedGame: game }),
  setActiveGame: (gameId) => set({ activeGame: gameId }),
  setScores: (scores) => set({ scores }),
  
  setRoom: (id, player, color, status, view = 'lobby') => {
    const slot = player === 1 ? 'playerA' : 'playerB'
    saveActiveSession(id, slot)
    set({ 
      sessionId: id,
      roomId: id, 
      playerId: player,
      playerSlot: slot,
      playerColor: color, 
      roomStatus: status,
      sessionStatus: status === 'connected' ? 'active' : status,
      currentView: view
    })
  },
  
  setSession: ({ id, slot, status, view = 'lobby' }) => {
    const numericPlayer = slot === 'playerA' ? 1 : 2
    const color = numericPlayer === 1 ? 'text-primary-container' : 'text-secondary'
    saveActiveSession(id, slot)
    set({
      sessionId: id,
      roomId: id,
      playerSlot: slot,
      playerId: numericPlayer,
      playerColor: color,
      sessionStatus: status,
      roomStatus: status === 'active' ? 'connected' : status,
      currentView: view
    })
  },
  
  setStatus: (status) => set({ 
    roomStatus: status,
    sessionStatus: status === 'connected' ? 'active' : status 
  }),
  
  resetRoom: () => {
    clearActiveSession()
    set({ 
      currentView: 'home',
      sessionId: null,
      roomId: null, 
      playerSlot: null,
      playerId: null, 
      playerColor: 'text-primary-container', 
      sessionStatus: 'idle',
      roomStatus: 'idle',
      selectedGame: null,
      activeGame: null,
      scores: { p1: 0, p2: 0 },
      opponentPresence: { connected: true, lastSeen: null }
    })
  }
}))
