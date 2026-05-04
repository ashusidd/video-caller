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
import AddFriend from './components/AddFriend';
import FriendRequest from './components/FriendRequest';
import ProfileModal from './components/ProfileModal';
import CallLogs from './components/CallLogs';
import CallInterface from './components/CallInterface';

function App() {
  const { user } = useContext(AuthContext);
  const { userData, selectedFriend, remoteStream, startCall } = useContext(VideoContext);

  // Loading state check: Jab tak user data fetch ho raha ho
  if (user && userData === undefined) {
    return (
      <div className="h-screen bg-black flex items-center justify-center text-white italic font-black animate-pulse">
        V-CALL...
      </div>
    );
  }

  return (
    <Router>
      <div className="h-screen flex flex-col bg-black text-white font-sans overflow-hidden">
        {/* Profile Sidebar Drawer (Hidden by default) */}
        <ProfileModal />

        <Routes>
          {/* 1. Login Route */}
          <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />

          {/* 2. Onboarding Route: Naye user ke liye hamesha compulsory rahega */}
          <Route path="/onboarding" element={user && !userData?.username ? <Onboarding /> : <Navigate to="/" />} />

          {/* 3. Main Dashboard Route */}
          <Route path="/" element={
            user ? (
              userData?.username ? (
                <>
                  <Navbar />
                  <div className="flex flex-1 overflow-hidden">
                    {/* Left Sidebar: Search + Requests + Friends */}
                    <div className="w-80 flex flex-col border-r border-white/5 bg-zinc-950">
                      <AddFriend />

                      <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <FriendRequest />
                        <Sidebar />
                      </div>
                    </div>

                    {/* Main Content Area */}
                    <main className="flex-1 bg-zinc-900/30 relative overflow-hidden">
                      {/* Full Screen Call Interface: Jab stream active ho */}
                      {remoteStream && <CallInterface />}

                      {selectedFriend ? (
                        <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
                          {/* Selected Friend Header with PeerJS Call Buttons */}
                          <div className="p-8 border-b border-white/5 flex justify-between items-center bg-zinc-950/50 backdrop-blur-md">
                            <div className="flex items-center gap-5">
                              <div className="relative">
                                <img
                                  src={selectedFriend.photo}
                                  className="w-14 h-14 rounded-full border-2 border-white/10 object-cover"
                                  alt={selectedFriend.name}
                                />
                                {selectedFriend.status === "online" && (
                                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-red-600 rounded-full border-2 border-zinc-950"></div>
                                )}
                              </div>
                              <div>
                                <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
                                  {selectedFriend.name}
                                </h2>
                                <p className="text-[10px] text-zinc-500 font-bold tracking-[0.2em] mt-1">
                                  @{selectedFriend.username}
                                </p>
                              </div>
                            </div>

                            {/* Action Buttons: Calling logic connected here */}
                            <div className="flex gap-4">
                              <button
                                onClick={() => startCall(selectedFriend.uid)}
                                className="w-14 h-14 bg-zinc-800 hover:bg-zinc-700 rounded-2xl flex items-center justify-center border border-white/5 transition-all active:scale-90"
                                title="Audio Call"
                              >
                                📞
                              </button>
                              <button
                                onClick={() => startCall(selectedFriend.uid)}
                                className="w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 transition-all active:scale-90"
                                title="Video Call"
                              >
                                📹
                              </button>
                            </div>
                          </div>

                          {/* Interaction History: No chat, only logs */}
                          <div className="flex-1 overflow-y-auto">
                            <CallLogs friend={selectedFriend} />
                          </div>
                        </div>
                      ) : (
                        <Home />
                      )}
                    </main>
                  </div>
                </>
              ) : <Navigate to="/onboarding" />
            ) : <Navigate to="/auth" />
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;