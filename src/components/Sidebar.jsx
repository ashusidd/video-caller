import { useNavigate, useLocation } from 'react-router-dom';
import { useContext, useState, useEffect } from 'react';
import { VideoContext } from '../context/VideoContext';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../firebase';

function FriendItem({ friend, isSelected, onClick, unreadCount }) {
    const [status, setStatus] = useState('offline');

    useEffect(() => {
        if (!friend?.uid) return;
        const statusRef = ref(rtdb, `/status/${friend.uid}`);
        const unsub = onValue(statusRef, (snapshot) => {
            const data = snapshot.val();
            if (data) setStatus(data.state);
        });
        return () => unsub();
    }, [friend?.uid]);

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
                    onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${friend?.name || 'U'}&background=random&color=fff&length=1`; }}
                />
                <div className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 border-2 border-[#111b21] rounded-full transition-colors duration-500 ${status === 'online' ? 'bg-green-500' : 'bg-zinc-600'}`}></div>
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-zinc-100 truncate">{displayName}</p>
                <p className="text-[11px] text-zinc-500 truncate italic font-mono">@{displayUsername}</p>
            </div>

            {/* 🔵 NEW: Missed Call Badge */}
            {unreadCount > 0 && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 bg-blue-600 rounded-full shadow-lg animate-pulse">
                    <span className="text-[10px] font-black text-white">{unreadCount}</span>
                </div>
            )}
        </div>
    );
}

export default function Sidebar() {
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

    const filteredFriends = friends?.filter(friend => {
        if (!friend) return false;
        const name = (friend?.name || "").toLowerCase();
        const username = (friend?.username || "").toLowerCase();
        const query = searchQuery.toLowerCase();
        return name.includes(query) || username.includes(query);
    }) || [];

    return (
        <div className={`absolute inset-y-0 left-0 z-40 bg-[#111b21] border-r border-white/5 transition-all duration-300 w-full md:relative md:w-[400px] ${isChatOpen || callStatus !== 'idle' ? 'max-md:-translate-x-full' : ''}`}>
            <div className="flex flex-col h-full bg-[#111b21]">
                <div className="p-4 shrink-0 border-b border-white/5 bg-[#111b21]">
                    <div className="bg-[#202c33] rounded-xl flex items-center px-4 py-2 border border-white/5">
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm px-3 w-full text-white placeholder:text-zinc-500 font-medium"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="px-6 py-4"><h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">YOUR FRIENDS</h3></div>
                    <div className="px-2 pb-10">
                        {filteredFriends.map(friend => (
                            <FriendItem
                                key={friend.uid}
                                friend={friend}
                                isSelected={location.pathname === `/chat/${friend.uid}`}
                                onClick={() => handleFriendClick(friend)}
                                unreadCount={unreadCounts[friend.uid] || 0}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}