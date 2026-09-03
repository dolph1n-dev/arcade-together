import { useEffect } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import HomeView from './components/HomeView'
import HostWaitingView from './components/HostWaitingView'
import JoinRoomView from './components/JoinRoomView'
import LobbyView from './components/LobbyView'
import TicTacToeGame from './components/TicTacToeGame'
import { useStore } from './store'
import { db } from './lib/firebase'
import { ref, onValue, get } from 'firebase/database'
import { getSavedSession, clearActiveSession } from './lib/session'

export default function App() {
  const { 
    currentView, 
    roomId, 
    playerSlot, 
    userPlayerId,
    setOpponentNickname, 
    setSession,
    setActiveGame,
    setView 
  } = useStore()

  // 1. Session Reconnection on Load / Refresh (Rule 7)
  useEffect(() => {
    const saved = getSavedSession()
    if (!saved || !saved.sessionId) return

    const verifyAndRestoreSession = async () => {
      try {
        const sessionRef = ref(db, `sessions/${saved.sessionId}`)
        const snap = await get(sessionRef)

        if (!snap.exists()) {
          clearActiveSession()
          return
        }

        const session = snap.val()
        if (session.status === 'closed' || session.status === 'abandoned') {
          clearActiveSession()
          return
        }

        // Verify player identity matches stored session slot (Rule 2 & 7)
        const mySlot = saved.slot || (session.players?.playerA?.playerId === userPlayerId ? 'playerA' : 'playerB')
        const myRecord = session.players?.[mySlot]

        if (!myRecord) {
          clearActiveSession()
          return
        }

        // Restore opponent nickname
        const oppSlot = mySlot === 'playerA' ? 'playerB' : 'playerA'
        if (session.players?.[oppSlot]?.nickname) {
          setOpponentNickname(session.players[oppSlot].nickname)
        }

        // Determine target view based on session lifecycle (Rule 1 & 11)
        let targetView = 'lobby'
        if (session.status === 'waiting') {
          targetView = 'host_waiting'
        } else if (session.activeGame === 'tictactoe' || session.game?.status === 'active') {
          targetView = 'game'
          setActiveGame('tictactoe')
        }

        setSession({
          id: saved.sessionId,
          slot: mySlot,
          status: session.status,
          view: targetView
        })
      } catch (err) {
        console.warn('Session reconnection check error:', err)
      }
    }

    verifyAndRestoreSession()
  }, [userPlayerId, setSession, setOpponentNickname, setActiveGame])

  // 2. Handle URL share parameters (e.g. ?room=HS5Q1)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const roomParam = params.get('room')
      if (roomParam && currentView === 'home') {
        setView('join')
      }
    } catch {}
  }, [currentView, setView])

  // 3. Global session & opponent listener (Rule 1, 8, 9)
  useEffect(() => {
    if (!roomId) return

    const sessionRef = ref(db, `sessions/${roomId}`)
    const unsubscribe = onValue(sessionRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        // Track opponent nickname based on slot
        const mySlot = playerSlot || 'playerA'
        const oppSlot = mySlot === 'playerA' ? 'playerB' : 'playerA'
        if (data.players?.[oppSlot]?.nickname) {
          setOpponentNickname(data.players[oppSlot].nickname)
        }
      }
    })

    return () => unsubscribe()
  }, [roomId, playerSlot, setOpponentNickname])

  return (
    <div className="min-h-screen bg-[#12131c] text-[#e3e1ef] flex flex-col font-['Hanken_Grotesk'] selection:bg-[#00f5d4] selection:text-[#00201a] relative overflow-x-hidden">
      {/* Top Navigation Bar */}
      <Header />

      {/* Dynamic View Router */}
      <div className="flex-1 flex flex-col">
        {currentView === 'home' && <HomeView />}
        {currentView === 'host_waiting' && <HostWaitingView />}
        {currentView === 'join' && <JoinRoomView />}
        {currentView === 'lobby' && <LobbyView />}
        {currentView === 'game' && <TicTacToeGame />}
      </div>

      {/* Shared Web Footer */}
      <Footer />
    </div>
  )
}
