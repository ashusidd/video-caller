import { useContext, useEffect, useRef } from 'react';
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
// 📞 CALL HANDLER: Dashboard Deep-Linking Master
// ==============================================================
function CallHandler() {
  const { callStatus, isLoading: videoLoading, friends, setSelectedFriend } = useContext(VideoContext);
  const { user, loading: authLoading } = useContext(AuthContext);

  const location = useLocation();
  const navigate = useNavigate();
  const redirectDone = useRef(false);

  useEffect(() => {
    // Agar auth ya video load ho raha hai toh ruk jao
    if (authLoading || videoLoading || !user || redirectDone.current) return;

    const params = new URLSearchParams(location.search);
    const callerId = params.get('callerId');
    const missedCallId = params.get('missedCall'); // 🔥 Missed Call Notification Parameter

    // 1. 🎯 Agar Missed Call notification se aaye hain
    if (missedCallId) {
      if (friends && friends.length > 0) {
        const targetFriend = friends.find(f => f.uid === missedCallId);
        if (targetFriend) {
          setSelectedFriend(targetFriend);
          redirectDone.current = true;

          setTimeout(() => {
            // 🔥 BINA "replace: true" ke navigate kiya hai!
            // Isse pehle '/' (Home) history mein save hoga, fir '/chat' khulega.
            navigate(`/chat/${missedCallId}`);
          }, 100);
        }
      }
    }
    // 2. 🎯 Agar Incoming Call notification se aaye hain
    else if (callerId) {
      if (friends && friends.length > 0) {
        const targetFriend = friends.find(f => f.uid === callerId);
        if (targetFriend) {
          setSelectedFriend(targetFriend);
          redirectDone.current = true;

          setTimeout(() => {
            if (callStatus === 'idle') {
              navigate(`/chat/${callerId}`, { replace: true });
            } else {
              navigate('/', { replace: true });
            }
          }, 100);
        }
      }
    }
  }, [location.search, friends, authLoading, videoLoading, user, callStatus, navigate, setSelectedFriend]);

  return null;
}

// ==============================================================
// 🖥️ MAIN APP COMPONENT
// ==============================================================
function App() {
  const { user, loading: authloading } = useContext(AuthContext);
  const { userData, callStatus, isLoading: videoLoading } = useContext(VideoContext);

  // Syncing state check
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

  // Auth Protection
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