import { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Contexts
import { AuthContext } from './context/AuthContext';
import { VideoContext } from './context/VideoContext';

// Pages & Components
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import CallInterface from './components/CallInterface';

function App() {
  const { user } = useContext(AuthContext);
  // FIX: remoteStream hata kar callStatus nikal liya
  const { userData, callStatus } = useContext(VideoContext);

  // Loading state
  if (user && userData === undefined) {
    return (
      <div className="h-screen bg-black flex items-center justify-center text-white italic font-black animate-pulse">
        V-CALL...
      </div>
    );
  }

  return (
    <Router>
      <div className="h-[100dvh] flex flex-col bg-black text-white font-sans overflow-hidden">

        <Routes>
          {/* 1. Auth & Onboarding */}
          <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
          <Route path="/onboarding" element={user && !userData?.username ? <Onboarding /> : <Navigate to="/" />} />

          {/* 2. Main Layout (Dashboard) */}
          <Route path="/*" element={
            user ? (
              userData?.username ? (
                <div className="flex flex-col h-full overflow-hidden">

                  {/* Navbar ab AddFriend, Request aur Profile handle kar raha hai */}
                  <Navbar />

                  <div className="flex flex-1 overflow-hidden relative">

                    {/* --- SIDEBAR AREA --- */}
                    <Sidebar />

                    {/* --- MAIN CONTENT AREA --- */}
                    <main className="flex-1 bg-[#0b141a] relative overflow-hidden flex flex-col">

                      {/* THE REAL FIX: Ab CallInterface tab khulega jab bhi call active, ringing ya receiving ho */}
                      {callStatus !== 'idle' && <CallInterface />}

                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/chat/:id" element={<Home />} />
                      </Routes>
                    </main>

                  </div>
                </div>
              ) : <Navigate to="/onboarding" />
            ) : <Navigate to="/auth" />
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;