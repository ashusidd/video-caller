import { useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

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

// URL Parameter Handler
function CallHandler() {
  const { acceptCall, incomingCall } = useContext(VideoContext);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get('callAction');

    if (action === 'accept' && incomingCall) {
      console.log("🚀 Notification se accept command mili! Call utha rahe hain...");
      acceptCall();
      window.history.replaceState({}, document.title, "/");
    }
  }, [location, incomingCall, acceptCall]);

  return null;
}

function App() {
  const { user } = useContext(AuthContext);
  const { userData, callStatus, isLoading } = useContext(VideoContext);

  // 1. SPLASH SCREEN (Sabse pehla shield)
  // Jab tak isLoading true hai, kuch bhi render nahi hoga sirf Splash dikhega
  if (isLoading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <h1 className="text-white italic font-black animate-pulse tracking-widest text-xl">V-CALL HD</h1>
          <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] mt-2">Secure Connection...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <CallHandler />
      <div className="h-[100dvh] flex flex-col bg-black text-white font-sans overflow-hidden">
        <Routes>
          {/* 2. AUTH ROUTE: Agar logged in ho toh Home jao, warna Auth dikhao */}
          <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />

          {/* 3. ONBOARDING ROUTE: Sirf unke liye jinka profile incomplete hai */}
          <Route
            path="/onboarding"
            element={
              user ? (
                userData?.username ? <Navigate to="/" /> : <Onboarding />
              ) : <Navigate to="/auth" />
            }
          />

          {/* 4. MAIN APP LOGIC: Ekdum strict checking */}
          <Route path="/*" element={
            user ? (
              userData?.username ? (
                // PROFILE COMPLETE: Saara UI dikhao
                <div className="flex flex-col h-full overflow-hidden">
                  <Navbar />
                  <div className="flex flex-1 overflow-hidden relative">
                    <Sidebar />
                    <main className="flex-1 bg-[#0b141a] relative overflow-hidden flex flex-col">
                      {callStatus !== 'idle' && <CallInterface />}
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/chat/:id" element={<Home />} />
                      </Routes>
                    </main>
                  </div>
                </div>
              ) : (
                // PROFILE INCOMPLETE: Seedha onboarding par dhakelo
                <Navigate to="/onboarding" replace />
              )
            ) : (
              // NOT LOGGED IN: Auth par jao
              <Navigate to="/auth" replace />
            )
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;