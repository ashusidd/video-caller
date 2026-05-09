import { useNavigate, useLocation } from 'react-router-dom';
import { useContext, useState, useEffect } from 'react';
import { VideoContext } from '../context/VideoContext';
import { ref, onValue } from 'firebase/database'; // RTDB methods
import { rtdb } from '../firebase'; // RTDB instance

// --- ALAG COMPONENT: Har friend ka status check karne ke liye ---
function FriendItem({ friend, isSelected, onClick, unreadCount }) { // 🔥 ADDED: unreadCount prop
    const [status, setStatus] = useState('offline');

    useEffect(() => {
        // 櫨 FIX 1: Safety Check - Agar dost ki ID hi nahi hai toh wapas jao
        if (!friend?.uid) return;

        // RTDB se is friend ka status path pakdo
        const statusRef = ref(rtdb, `/status/${friend.uid}`);

        // Real-time listener lagao
        const unsub = onValue(statusRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setStatus(data.state);
            }
        });

        return () => unsub();
    }, [friend?.uid]);

    // 櫨 FIX 2: UI mein har jagah '?.' (Optional Chaining) lagaya taaki crash na ho
    const displayName = friend?.name || "Unknown User";
    const displayUsername = friend?.username || "unknown";

    return (
        <div onClick={onClick}
            className={`flex items-center gap-4 px-4 py-3 rounded-2xl cursor-pointer transition-all mb-1 relative
            ${isSelected ? 'bg-[#2a3942] shadow-md' : 'hover:bg-[#202c33]'}`}>

            <div className="relative shrink-0">
                <img
                    src={friend?.photo || friend?.photoURL || `https://ui-avatars.com/api/?name=${friend?.name || 'U'}&background=random&color=fff&length=1`}
                    className="w-12 h-12 rounded-full object-cover border border-white/5"
                    alt={friend?.name || "User"}
                    onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${friend?.name || 'U'}&background=random&color=fff&length=1`;
                    }}
                />

                {/* Indicator Dot with Neon Glow */}
                <div className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 border-2 border-[#111b21] rounded-full transition-colors duration-500 ${status === 'online'
                    ? 'bg-green-500 shadow-[0_0_8px_#22c55e]'
                    : 'bg-zinc-600'
                    }`}></div>
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-zinc-100 truncate">{displayName}</p>
                <div className="flex items-center gap-1.5">
                    <p className="text-[11px] text-zinc-500 truncate italic font-mono">@{displayUsername}</p>
                    <span className={`text-[9px] font-black uppercase tracking-tighter ${status === 'online' ? 'text-green-500 animate-pulse' : 'text-zinc-600'}`}>
                        • {status}
                    </span>
                </div>
            </div>

            {/* 🔥 ADDED: Missed Call Badge */}
            {unreadCount > 0 && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 bg-blue-600 rounded-full shadow-lg shadow-blue-500/20 animate-pulse">
                    <span className="text-[10px] font-black text-white">{unreadCount}</span>
                </div>
            )}
        </div>
    );
}

export default function Sidebar() {
    // 🔥 ADDED: Context se unreadCounts nikaala
    const { friends, setSelectedFriend, callStatus, unreadCounts } = useContext(VideoContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [searchQuery, setSearchQuery] = useState('');

    const isChatOpen = location.pathname.startsWith('/chat/');

    const handleFriendClick = (friend) => {
        if (!friend?.uid) return;
        setSelectedFriend(friend);
        navigate(`/chat/${friend.uid}`);
    };

    // 櫨 FIX 3: THE CRASH KILLER - Search filter ko safe banaya
    const filteredFriends = friends?.filter(friend => {
        // Agar friend null hai toh hata do
        if (!friend) return false;

        // Safety Fallback (Agar name/username missing ho DB mein toh crash na ho)
        const safeName = friend?.name || "";
        const safeUsername = friend?.username || "";
        const query = searchQuery.toLowerCase();

        return safeName.toLowerCase().includes(query) ||
            safeUsername.toLowerCase().includes(query);
    }) || [];

    return (
        <div className={`
            absolute inset-y-0 left-0 z-40 bg-[#111b21] border-r border-white/5 transition-all duration-300 w-full md:relative md:w-[400px]
            ${isChatOpen || callStatus !== 'idle'
                ? 'max-md:-translate-x-full max-md:opacity-0 max-md:pointer-events-none'
                : 'max-md:translate-x-0 max-md:opacity-100'}
        `}>

            <div className="flex flex-col h-full bg-[#111b21]">

                {/* --- 1. SEARCH BAR --- */}
                <div className="p-4 shrink-0 border-b border-white/5 bg-[#111b21]">
                    <div className="bg-[#202c33] rounded-xl flex items-center px-4 py-2 border border-white/5">
                        <span className="text-zinc-500 text-sm">🔍</span>
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm px-3 w-full text-white placeholder:text-zinc-500 font-medium"
                        />
                    </div>
                </div>

                {/* --- 2. CHAT LIST --- */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="px-6 py-4">
                        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] italic">
                            YOUR FRIENDS
                        </h3>
                    </div>

                    <div className="px-2 pb-10">
                        {filteredFriends.length > 0 ? (
                            filteredFriends.map(friend => (
                                <FriendItem
                                    key={friend?.uid || Math.random()} // Saftey for missing UID
                                    friend={friend}
                                    isSelected={location.pathname === `/chat/${friend?.uid}`}
                                    onClick={() => handleFriendClick(friend)}
                                    unreadCount={unreadCounts?.[friend?.uid] || 0} // 🔥 ADDED: Pass unread count
                                />
                            ))
                        ) : (
                            <div className="text-center p-10 text-zinc-600 text-[10px] font-black uppercase tracking-widest italic opacity-50">
                                {searchQuery ? "No matches found" : "No Friends Yet"}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}