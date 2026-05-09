import { useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

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
  // 🔥 FIX: endCall add kiya aur useNavigate import kiya
  const { acceptCall, endCall, incomingCall, callStatus, isLoading } = useContext(VideoContext);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get('callAction');
    const isIncoming = params.get('incomingCall');
    const callerId = params.get('callerId');

    // 1. ✅ ACCEPT CALL LOGIC
    if (action === 'accept' && incomingCall) {
      console.log("🚀 Notification Accepted: Connecting...");
      acceptCall();
      window.history.replaceState({}, document.title, "/");
    }

    // 2. ❌ DECLINE CALL LOGIC
    if (action === 'decline') {
      console.log("❌ Notification Declined: Ending call...");
      endCall(); // Decline dabane par app open hoke turant phone kaat dega
      window.history.replaceState({}, document.title, "/");
    }

    // 3. ⚠️ MISSED CALL REDIRECT LOGIC
    // Agar call aa rahi thi, par user ne na accept dabaya na decline, 
    // aur 1.5 seconds baad status 'idle' hai (matlab call cut chuki hai)
    if (isIncoming === 'true' && callerId && !isLoading && action !== 'accept' && action !== 'decline') {
      const timer = setTimeout(() => {
        if (callStatus === 'idle') {
          console.log("Call was missed or cut! Redirecting to chat...");
          navigate(`/chat/${callerId}`, { replace: true });
          window.history.replaceState({}, document.title, `/chat/${callerId}`);
        }
      }, 1500);

      return () => clearTimeout(timer);
    }

  }, [location, incomingCall, acceptCall, endCall, callStatus, isLoading, navigate]);

  return null;
}

function App() {
  const { user, loading: authloading } = useContext(AuthContext);
  const { userData, callStatus, isLoading: videoLoading } = useContext(VideoContext);

  // ==============================================================
  // THE ZERO-BLINK SHIELD 
  const isSyncing = authloading || videoLoading || (user && userData === null);

  if (isSyncing) {
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
          <p className="text-zinc-600 text-[9px] uppercase tracking-[0.4em] mt-4 font-bold">Ashu 2026 version 1.0</p>
        </div>
      </div>
    );
  }

  // ==============================================================
  // 🛡️ CONDITIONAL RENDERING (No Redirect = No Blink)
  // ==============================================================

  // 1. Agar login nahi hai toh seedha Auth Page
  if (!user) return <Auth />;

  // 2. Agar login hai par profile setup nahi hai toh seedha Onboarding
  if (user && !userData?.username) return <Onboarding />;

  // 3. Sab sahi hai toh Router aur Main App render karo
  return (
    <Router>
      <CallHandler />
      <div className="h-[100dvh] flex flex-col bg-black text-white font-sans overflow-hidden">

        {/* Call UI humesha top pe */}
        {callStatus !== 'idle' && <CallInterface />}

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
      </div>
    </Router>
  );
}

export default App;