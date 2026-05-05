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
  // isLoading ko yahan extract kiya flicker rokne ke liye
  const { userData, callStatus, isLoading } = useContext(VideoContext);

  // 1. SPLASH SCREEN: Jab tak Firebase se data load ho raha hai
  if (isLoading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center">
          {/* Ek stylish spinner */}
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <h1 className="text-white italic font-black animate-pulse tracking-widest text-xl">V-CALL HD</h1>
          <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] mt-2">Secure Connection...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="h-[100dvh] flex flex-col bg-black text-white font-sans overflow-hidden">

        <Routes>
          {/* 2. AUTH & ONBOARDING: Flicker-free logic */}
          <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />

          {/* Agar user logged in hai par profile setup nahi hai toh onboarding dikhao */}
          <Route path="/onboarding" element={user && !userData?.username ? <Onboarding /> : <Navigate to="/" />} />

          {/* 3. MAIN DASHBOARD LAYOUT */}
          <Route path="/*" element={
            user ? (
              userData?.username ? (
                <div className="flex flex-col h-full overflow-hidden">

                  {/* Navbar handles Friends, Requests & Profile */}
                  <Navbar />

                  <div className="flex flex-1 overflow-hidden relative">

                    {/* Sidebar handles Contact List */}
                    <Sidebar />

                    {/* Main Chat/Video Area */}
                    <main className="flex-1 bg-[#0b141a] relative overflow-hidden flex flex-col">

                      {/* CallInterface pop-up: Ringing, Receiving ya Connected state mein khulega */}
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