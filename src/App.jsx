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
import { ref, onValue } from 'firebase/database'

export default function App() {
  const { 
    currentView, 
    roomId, 
    playerId, 
    setOpponentNickname, 
    setView 
  } = useStore()

  // Handle URL share parameters (e.g. ?room=HS5Q1)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const roomParam = params.get('room')
      if (roomParam && currentView === 'home') {
        setView('join')
      }
    } catch {}
  }, [currentView, setView])

  // Global room presence & opponent listener
  useEffect(() => {
    if (!roomId) return

    const roomRef = ref(db, `rooms/${roomId}`)
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        // Track opponent nickname
        if (playerId === 1 && data.guestNickname) {
          setOpponentNickname(data.guestNickname)
        } else if (playerId === 2 && data.hostNickname) {
          setOpponentNickname(data.hostNickname)
        }
      }
    })

    return () => unsubscribe()
  }, [roomId, playerId, setOpponentNickname])

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
