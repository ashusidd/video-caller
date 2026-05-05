import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useContext } from 'react';
import { VideoContext } from '../context/VideoContext';
import CallLogs from '../components/CallLogs';

export default function Home() {
    const { id } = useParams(); // URL se friend ki ID lega
    const navigate = useNavigate();
    const {
        friends,
        setSelectedFriend,
        selectedFriend,
        startCall
    } = useContext(VideoContext);

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

    // 2. AGAR KOI FRIEND SELECTED NAHI HAI (Default State)
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

    // 3. CHAT/HISTORY VIEW (Jab Friend select ho)
    return (
        <div className="h-full w-full flex flex-col bg-[#0b141a] animate-in fade-in duration-500">
            {/* Header */}
            <div className="h-[60px] bg-[#202c33] px-4 flex items-center justify-between border-l border-white/5 shrink-0">
                <div className="flex items-center gap-4 min-w-0">
                    <button onClick={() => navigate('/')} className="md:hidden text-white text-2xl pr-2">←</button>
                    <img
                        src={selectedFriend?.photo || 'https://via.placeholder.com/150'}
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                        alt=""
                    />
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white truncate">
                            {selectedFriend?.name || "Loading..."}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono italic truncate">
                            {selectedFriend?.username ? `@${selectedFriend.username}` : "fetching..."}
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => startCall(selectedFriend?.uid)}
                    className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/20 active:scale-90 transition-all"
                >
                    <span className="text-lg">📞</span>
                </button>
            </div>

            {/* Logs Area */}
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
                            Encrypted Interaction Logs
                        </span>
                    </div>

                    {/* Sirf tabhi render hoga jab ID available ho */}
                    {id && <CallLogs filterId={id} />}
                </div>
            </div>
        </div>
    );
}