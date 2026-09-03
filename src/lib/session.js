import { db } from './firebase'
import { ref, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database'

// Stable Player ID generation & persistence (Rule 2)
export function getStablePlayerId() {
  try {
    let id = localStorage.getItem('arcade_player_id')
    if (!id) {
      id = 'p_' + (typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
        : Math.random().toString(36).substring(2, 12) + Date.now().toString(36))
      localStorage.setItem('arcade_player_id', id)
    }
    return id
  } catch {
    return 'p_' + Math.random().toString(36).substring(2, 12)
  }
}

// Session persistence for seamless reconnection (Rule 7)
export function getSavedSession() {
  try {
    const raw = localStorage.getItem('arcade_active_session')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveActiveSession(sessionId, slot) {
  try {
    localStorage.setItem('arcade_active_session', JSON.stringify({
      sessionId,
      slot,
      playerId: getStablePlayerId(),
      savedAt: Date.now()
    }))
  } catch {}
}

export function clearActiveSession() {
  try {
    localStorage.removeItem('arcade_active_session')
  } catch {}
}

// Generate unique idempotent action ID (Rule 6)
export function generateActionId(prefix = 'act') {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`
}

// Setup real-time presence with graceful disconnect handling (Rule 8 & 9)
export function setupPresenceTracker(sessionId, playerSlot, onPresenceChange) {
  if (!sessionId || !playerSlot) return () => {}

  const connectedRef = ref(db, '.info/connected')
  const presenceRef = ref(db, `presence/${sessionId}/${playerSlot}`)

  const unsubConnected = onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      // When connected, set onDisconnect hook
      onDisconnect(presenceRef).set({
        connected: false,
        lastSeen: serverTimestamp()
      }).catch(() => {})

      // Set online state
      set(presenceRef, {
        connected: true,
        lastSeen: serverTimestamp()
      }).catch(() => {})
    }
  })

  // Listen to opponent's presence if requested
  let unsubOpponent = () => {}
  if (onPresenceChange) {
    const opponentSlot = playerSlot === 'playerA' ? 'playerB' : 'playerA'
    const opponentPresenceRef = ref(db, `presence/${sessionId}/${opponentSlot}`)
    unsubOpponent = onValue(opponentPresenceRef, (snap) => {
      const data = snap.val()
      onPresenceChange(data || { connected: false, lastSeen: null })
    })
  }

  return () => {
    unsubConnected()
    unsubOpponent()
  }
}

// Clean Winning Combos for TicTacToe
export const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]            // Diagonals
]

export function checkTicTacToeWin(board) {
  if (!Array.isArray(board) || board.length < 9) return null

  for (const combo of WINNING_COMBOS) {
    const [a, b, c] = combo
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return {
        winner: board[a] === 'X' ? 'playerA' : 'playerB',
        line: combo
      }
    }
  }

  // Draw check: every cell has a symbol (not empty string)
  const isFull = board.every((cell) => cell === 'X' || cell === 'O')
  if (isFull) {
    return {
      winner: 'draw',
      line: null
    }
  }

  return null
}
