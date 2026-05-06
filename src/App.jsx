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

// ==============================================================
// 📞 CALL HANDLER: Notification Actions Handle Karega
// ==============================================================
function CallHandler() {
  const { acceptCall, incomingCall } = useContext(VideoContext);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get('callAction');

    if (action === 'accept' && incomingCall) {
      console.log("🚀 Notification Accepted: Connecting...");
      acceptCall();
      // URL saaf karo taaki refresh pe baar-baar trigger na ho
      window.history.replaceState({}, document.title, "/");
    }
  }, [location, incomingCall, acceptCall]);

  return null;
}

function App() {
  const { user } = useContext(AuthContext);
  const { userData, callStatus, isLoading } = useContext(VideoContext);

  // ==============================================================
  // 🛡️ SHIELD 1: SPLASH SCREEN (Anti-Blink Layer)
  // ==============================================================
  // Jab tak Firestore se data nahi milta, tab tak Onboarding ya Home 
  // render hi nahi honge. Sirf Splash dikhega.
  if (isLoading) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-600/20 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <h1 className="text-white italic font-black animate-pulse tracking-[0.2em] text-2xl mt-6">V-CALL HD</h1>
          <div className="mt-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
          </div>
          <p className="text-zinc-600 text-[9px] uppercase tracking-[0.4em] mt-4 font-bold">Secure Protocol 2.0</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <CallHandler />
      <div className="h-[100dvh] flex flex-col bg-black text-white font-sans overflow-hidden">

        {/* Call UI humesha top pe rahegi jab call status connected/receiving ho */}
        {callStatus !== 'idle' && <CallInterface />}

        <Routes>
          {/* 🚪 AUTH: Agar logged in ho toh Home jao, warna Auth dikhao */}
          <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" replace />} />

          {/* 📝 ONBOARDING: Strict check taaki koi bypass na kar sake */}
          <Route
            path="/onboarding"
            element={
              user ? (
                userData?.username ? <Navigate to="/" replace /> : <Onboarding />
              ) : <Navigate to="/auth" replace />
            }
          />

          {/* 🏠 MAIN APP: Dashboard Check */}
          <Route
            path="/*"
            element={
              user ? (
                userData?.username ? (
                  // Sab theek hai toh Layout dikhao
                  <div className="flex flex-col h-full overflow-hidden">
                    <Navbar />
                    <div className="flex flex-1 overflow-hidden relative">
                      <Sidebar />
                      <main className="flex-1 bg-[#0b141a] relative overflow-hidden">
                        <Routes>
                          <Route path="/" element={<Home />} />
                          <Route path="/chat/:id" element={<Home />} />
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </main>
                    </div>
                  </div>
                ) : (
                  // Profile pending hai
                  <Navigate to="/onboarding" replace />
                )
              ) : (
                // Login nahi hai
                <Navigate to="/auth" replace />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;