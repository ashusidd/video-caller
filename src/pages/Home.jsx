import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useContext, useState } from 'react';
import { VideoContext } from '../context/VideoContext';
import CallLogs from '../components/CallLogs';
import { ref, onValue } from 'firebase/database'; // RTDB imports
import { rtdb } from '../firebase'; // RTDB instance

export default function Home() {
    const { id } = useParams();
    const navigate = useNavigate();
    const {
        friends,
        setSelectedFriend,
        selectedFriend,
        startCall
    } = useContext(VideoContext);

    // Friend ka live online/offline status handle karne ke liye state
    const [status, setStatus] = useState('offline');

    // 1. URL change hote hi friend ki details load karo
    useEffect(() => {
        if (id && friends && friends.length > 0) {
            const foundFriend = friends.find(f => f.uid === id);
            if (foundFriend) {
                setSelectedFriend(foundFriend);
            }
        } else if (!id) {
            setSelectedFriend(null);
        }
    }, [id, friends, setSelectedFriend]);

    // 2. RTDB Listener: Friend ka online status check karne ke liye
    useEffect(() => {
        if (!id) return;

        const statusRef = ref(rtdb, `/status/${id}`);
        const unsub = onValue(statusRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setStatus(data.state);
            } else {
                setStatus('offline');
            }
        });

        return () => unsub();
    }, [id]);

    // 3. Default State (Jab koi contact select na ho)
    if (!id) {
        return (
            <div className="h-full w-full hidden md:flex flex-col items-center justify-center bg-[#0b141a] text-zinc-600">
                <div className="w-20 h-20 bg-zinc-900/50 rounded-full flex items-center justify-center text-3xl mb-6 opacity-20 border border-white/5">
                    📞
                </div>
                <h1 className="text-xl font-black uppercase tracking-tighter italic">V-CALL HD</h1>
                <p className="text-[10px] uppercase tracking-[0.2em] mt-2 font-bold opacity-50">Select a contact to start</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col bg-[#0b141a] animate-in fade-in duration-500">

            {/* --- HEADER SECTION --- */}
            <div className="h-[60px] bg-[#202c33] px-4 flex items-center justify-between border-l border-white/5 shrink-0">
                <div className="flex items-center gap-4 min-w-0">
                    <button onClick={() => navigate('/')} className="md:hidden text-white text-2xl pr-2">←</button>

                    <div className="relative">
                        <img
                            src={selectedFriend?.photo || 'https://via.placeholder.com/150'}
                            className="w-10 h-10 rounded-full object-cover border border-white/10"
                            alt=""
                        />
                        {/* Status Dot with Neon Glow */}
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#202c33] transition-all duration-500 ${status === 'online' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-zinc-500'
                            }`}></div>
                    </div>

                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white truncate">
                            {selectedFriend?.name || "Loading..."}
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${status === 'online' ? 'text-green-500 animate-pulse' : 'text-zinc-500'
                            }`}>
                            {status}
                        </span>
                    </div>
                </div>

                {/* Call Action Buttons */}
                <div className="flex items-center gap-3">
                    {/* Audio Call Button */}
                    <button
                        onClick={() => startCall(selectedFriend?.uid, false)} // isVideo = false
                        className="w-10 h-10 rounded-full bg-[#2a3942] hover:bg-[#374954] flex items-center justify-center text-white transition-all active:scale-90 shadow-lg border border-white/5"
                        title="Audio Call"
                    >
                        <span className="text-lg">📞</span>
                    </button>

                    {/* Video Call Button */}
                    <button
                        onClick={() => startCall(selectedFriend?.uid, true)} // isVideo = true
                        className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/20 active:scale-90 transition-all"
                        title="Video Call"
                    >
                        <span className="text-lg">📹</span>
                    </button>
                </div>
            </div>

            {/* --- LOGS / HISTORY AREA --- */}
            <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar relative"
                style={{
                    backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                    backgroundSize: '400px',
                    backgroundRepeat: 'repeat',
                    backgroundBlendMode: 'overlay'
                }}>
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex justify-center">
                        <span className="bg-[#182229] text-zinc-500 text-[9px] px-3 py-1 rounded-md uppercase font-black tracking-[0.3em] italic border border-white/5">
                            Encrypted call Logs
                        </span>
                    </div>

                    {/* Component to render specific logs */}
                    {id && <CallLogs filterId={id} />}
                </div>
            </div>
        </div>
    );
}