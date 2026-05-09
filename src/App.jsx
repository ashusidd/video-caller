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
// 📞 CALL HANDLER: Sirf Route Manage Karega
// ==============================================================
function CallHandler() {
  const { callStatus, isLoading: videoLoading, friends, setSelectedFriend } = useContext(VideoContext);
  const { user, loading: authLoading } = useContext(AuthContext);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || videoLoading || !user) return;

    const params = new URLSearchParams(location.search);
    const isIncoming = params.get('incomingCall');
    const callerId = params.get('callerId');

    // ⚠️ Agar simple Notification Tap hui hai
    if (isIncoming === 'true' && callerId) {
      const timer = setTimeout(() => {
        // Agar Firebase se koi zinda call nahi aayi (matlab missed ho gayi thi)
        if (callStatus === 'idle') {
          console.log("Call missed/cut! Redirecting to chat...");

          // Dost ka data select karke Dashboard pe bhej do
          const friendToSelect = friends.find(f => f.uid === callerId);
          if (friendToSelect) {
            setSelectedFriend(friendToSelect);
          }

          navigate(`/chat/${callerId}`, { replace: true });
        } else {
          // Agar call sach mein baj rahi hai toh URL clean kar do. 
          // CallInterface khud hi screen par aa jayega aur tum manually Accept karoge!
          navigate(location.pathname, { replace: true });
        }
      }, 1500);

      return () => clearTimeout(timer);
    }

  }, [location.search, callStatus, videoLoading, authLoading, user, navigate, friends, setSelectedFriend]);

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