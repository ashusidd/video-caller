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
// 📞 CALL HANDLER: Notification Tap & Deep Linking logic
// ==============================================================
function CallHandler() {
  const { callStatus, isLoading: videoLoading, friends, setSelectedFriend } = useContext(VideoContext);
  const { user, loading: authLoading } = useContext(AuthContext);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Jab tak sab load na ho jaye, intezar karo
    if (authLoading || videoLoading || !user || friends.length === 0) return;

    const params = new URLSearchParams(location.search);
    const isIncoming = params.get('incomingCall');
    const callerId = params.get('callerId');

    // 🎯 FIX: Missed call ya Notification tap handle karna
    if (callerId) {
      console.log("Detecting callerId from notification:", callerId);

      // 1. Pehle friends list mein wo user dhoondo
      const targetFriend = friends.find(f => f.uid === callerId);

      if (targetFriend) {
        // 2. State update karo taaki dashboard uski chat dikhaye
        setSelectedFriend(targetFriend);

        // 3. Agar call status idle hai (missed call case), toh redirect karo
        if (callStatus === 'idle') {
          navigate(`/chat/${callerId}`, { replace: true });
        } else {
          // Agar call chal rahi hai, toh sirf URL saaf karo, CallInterface khud dikhega
          navigate(location.pathname, { replace: true });
        }
      }
    }
  }, [location.search, callStatus, videoLoading, authLoading, user, friends, navigate, setSelectedFriend]);

  return null;
}

function App() {
  const { user, loading: authloading } = useContext(AuthContext);
  const { userData, callStatus, isLoading: videoLoading } = useContext(VideoContext);

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

  if (!user) return <Auth />;
  if (user && !userData?.username) return <Onboarding />;

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