import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useContext, useState } from 'react';
import { VideoContext } from '../context/VideoContext';
import CallLogs from '../components/CallLogs';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../firebase';

export default function Home() {
    const { id } = useParams();
    const navigate = useNavigate();

    const {
        friends,
        setSelectedFriend,
        selectedFriend,
        startCall,
        deleteFriend
    } = useContext(VideoContext);

    const [status, setStatus] = useState('offline');

    useEffect(() => {
        if (id && friends && friends.length > 0) {
            const foundFriend = friends.find(f => f.uid === id);

            if (foundFriend) {
                setSelectedFriend(foundFriend);
            } else {
                console.log("Dost nahi mila (Shayad delete ho gaya). Redirecting...");
                setSelectedFriend(null);
                navigate('/');
            }
        } else if (!id) {
            setSelectedFriend(null);
        }
    }, [id, friends, setSelectedFriend, navigate]);

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

                {/* 👈 LEFT SIDE (Profile Info + Delete Button) */}
                <div className="flex items-center gap-4 min-w-0">
                    <button onClick={() => navigate('/')} className="md:hidden text-white text-2xl pr-2">←</button>

                    <div className="relative">
                        <img
                            src={selectedFriend?.photo || selectedFriend?.photoURL || `https://ui-avatars.com/api/?name=${selectedFriend?.name || 'User'}&background=random&color=fff`}
                            className="w-10 h-10 rounded-full object-cover border border-white/10"
                            alt={selectedFriend?.name || "Friend"}
                            onError={(e) => {
                                e.target.src = `https://ui-avatars.com/api/?name=${selectedFriend?.name || 'User'}&background=random&color=fff`;
                            }}
                        />
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#202c33] transition-all duration-500 ${status === 'online' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-zinc-500'}`}></div>
                    </div>

                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white truncate">
                            {selectedFriend?.name || "Loading..."}
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${status === 'online' ? 'text-green-500 animate-pulse' : 'text-zinc-500'}`}>
                            {status}
                        </span>
                    </div>

                    {/* 🔥 DELETE BUTTON SHIFTED HERE (Left Side) */}
                    <button
                        onClick={() => {
                            if (window.confirm(`Kya tum sach mein ${selectedFriend?.name} ko delete karna chahte ho?`)) {
                                deleteFriend(selectedFriend?.uid);
                                navigate('/');
                            }
                        }}
                        disabled={!selectedFriend}
                        className={`ml-2 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 border ${selectedFriend ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20' : 'hidden'}`}
                        title="Delete Friend"
                    >
                        <span className="text-sm">🗑️</span>
                    </button>
                </div>

                {/* 👉 RIGHT SIDE (Call Action Buttons) */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => startCall(selectedFriend?.uid, false)}
                        disabled={!selectedFriend}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all shadow-lg border border-white/5 ${selectedFriend ? 'bg-[#2a3942] hover:bg-[#374954] active:scale-90' : 'bg-zinc-800 opacity-50 cursor-not-allowed'}`}
                        title="Audio Call"
                    >
                        <span className="text-lg">📞</span>
                    </button>

                    <button
                        onClick={() => startCall(selectedFriend?.uid, true)}
                        disabled={!selectedFriend}
                        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${selectedFriend ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 active:scale-90' : 'bg-zinc-800 opacity-50 cursor-not-allowed'}`}
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

                    {id && <CallLogs filterId={id} />}
                </div>
            </div>
        </div>
    );
}