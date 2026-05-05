import { useContext, useEffect } from 'react'; // useEffect add kiya
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'; // useLocation add kiya

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

// Ek chota helper component jo URL parameters ko check karega
function CallHandler() {
  const { acceptCall, incomingCall } = useContext(VideoContext);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get('callAction');

    // Agar URL mein 'accept' hai aur call aa rahi hai, toh auto-accept karlo
    if (action === 'accept' && incomingCall) {
      console.log("🚀 Notification se accept command mili! Call utha rahe hain...");
      acceptCall();

      // Clean up: URL se 'callAction' hata do taaki refresh pe baar-baar na chale
      window.history.replaceState({}, document.title, "/");
    }
  }, [location, incomingCall, acceptCall]);

  return null;
}

function App() {
  const { user } = useContext(AuthContext);
  const { userData, callStatus, isLoading } = useContext(VideoContext);

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
      <CallHandler /> {/* Yahan handler ko call kiya */}
      <div className="h-[100dvh] flex flex-col bg-black text-white font-sans overflow-hidden">
        <Routes>
          <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
          <Route path="/onboarding" element={user && !userData?.username ? <Onboarding /> : <Navigate to="/" />} />

          <Route path="/*" element={
            user ? (
              userData?.username ? (
                <div className="flex flex-col h-full overflow-hidden">
                  <Navbar />
                  <div className="flex flex-1 overflow-hidden relative">
                    <Sidebar />
                    <main className="flex-1 bg-[#0b141a] relative overflow-hidden flex flex-col">

                      {/* CallInterface pop-up */}
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