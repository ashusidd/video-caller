import { useNavigate, useLocation } from 'react-router-dom';
import { useContext, useState } from 'react';
import { VideoContext } from '../context/VideoContext';

export default function Sidebar() {
    const { friends, setSelectedFriend, callStatus } = useContext(VideoContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [searchQuery, setSearchQuery] = useState('');

    const isChatOpen = location.pathname.startsWith('/chat/');

    const handleFriendClick = (friend) => {
        setSelectedFriend(friend);
        navigate(`/chat/${friend.uid}`);
    };

    const filteredFriends = friends?.filter(friend =>
        friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        friend.username.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
        <div className={`
            /* FIXED FIX: Yahan 'fixed' ko hatakar 'absolute' kar diya hai */
            absolute inset-y-0 left-0 z-40 bg-[#111b21] border-r border-white/5 transition-all duration-300 w-full md:relative md:w-[400px]
            
            /* Mobile Hide Logic */
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
                            Direct Messages
                        </h3>
                    </div>

                    <div className="px-2 pb-10">
                        {filteredFriends.length > 0 ? (
                            filteredFriends.map(friend => (
                                <div key={friend.uid} onClick={() => handleFriendClick(friend)}
                                    className={`flex items-center gap-4 px-4 py-3 rounded-2xl cursor-pointer transition-all mb-1 
                                    ${location.pathname === `/chat/${friend.uid}` ? 'bg-[#2a3942] shadow-md' : 'hover:bg-[#202c33]'}`}>

                                    <div className="relative shrink-0">
                                        <img
                                            src={friend.photo || 'https://via.placeholder.com/150'}
                                            className="w-12 h-12 rounded-full object-cover border border-white/5"
                                            alt=""
                                        />
                                        <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-2 border-[#111b21] rounded-full"></div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-zinc-100 truncate">{friend.name}</p>
                                        <p className="text-[11px] text-zinc-500 truncate italic font-mono">@{friend.username}</p>
                                    </div>
                                </div>
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