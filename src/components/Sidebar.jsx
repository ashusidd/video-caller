import { useContext } from 'react';
import { VideoContext } from '../context/VideoContext';

export default function Sidebar() {
    // callStatus ko context se extract kiya
    const { friends, setSelectedFriend, selectedFriend, callStatus } = useContext(VideoContext);

    return (
        /* Dynamic Class: Agar call ho rahi hai toh width 0 karke hide kar do */
        <div className={`bg-zinc-950 border-r border-white/5 flex flex-col h-full transition-all duration-500 ease-in-out 
            ${callStatus !== 'idle' ? 'w-0 opacity-0 pointer-events-none' : 'w-80 opacity-100'}`}>

            <div className="p-6 overflow-y-auto min-w-[320px]">
                <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-6 italic">
                    Friends Online
                </h3>

                <div className="space-y-2">
                    {friends.map(friend => (
                        <div
                            key={friend.uid}
                            onClick={() => setSelectedFriend(friend)}
                            className={`flex items-center gap-4 p-4 rounded-3xl cursor-pointer transition-all 
                                ${selectedFriend?.uid === friend.uid ? 'bg-blue-600' : 'bg-zinc-900/40 hover:bg-zinc-900'}`}
                        >
                            <div className="relative">
                                <img src={friend.photo} className="w-10 h-10 rounded-full object-cover" alt="" />
                                {friend.status === "online" && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-red-600 rounded-full border-2 border-zinc-950"></div>
                                )}
                            </div>

                            <div className="flex flex-col">
                                <span className="text-sm font-bold truncate w-32">{friend.name}</span>
                                <span className="text-[10px] opacity-50 font-mono italic">@{friend.username}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}