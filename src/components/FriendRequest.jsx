import { useContext, useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { AuthContext } from '../context/AuthContext';
// 🔥 FIX 1: VideoContext ko import kiya taaki hum apne asli functions use kar sakein
import { VideoContext } from '../context/VideoContext';

export default function FriendRequest() {
    const { user } = useContext(AuthContext);
    // 🔥 FIX 2: VideoContext se Accept aur Reject function nikal liye
    const { acceptFriendRequest, rejectFriendRequest } = useContext(VideoContext);

    const [incoming, setIncoming] = useState([]);

    useEffect(() => {
        if (!user) return;

        // Hum users profile nahi, direct friendRequests collection sunenge
        const q = query(
            collection(db, "friendRequests"),
            where("receiverId", "==", user.uid),
            where("status", "==", "pending")
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const requests = [];
            snapshot.forEach((docSnap) => {
                requests.push({ id: docSnap.id, ...docSnap.data() });
            });
            setIncoming(requests);
        });

        return () => unsub();
    }, [user]);

    // 🔥 FIX 3: Local accept function hata diya kyunki ab hum Context wala use karenge

    if (incoming.length === 0) return null;

    return (
        <div className="p-5 bg-blue-600/5 border-b border-blue-500/10 animate-in fade-in slide-in-from-top duration-500">
            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4 italic text-center">
                New Connection Requests ({incoming.length})
            </h3>

            <div className="space-y-3">
                {incoming.map(req => (
                    <div key={req.id} className="flex items-center justify-between bg-zinc-900/80 p-3 rounded-2xl border border-white/5 shadow-xl">
                        <div className="flex items-center gap-3">
                            <img
                                src={req.senderPhoto || `https://ui-avatars.com/api/?name=${req.senderName || 'U'}&background=random&color=fff&bold=true&length=1&uppercase=true`}

                                className="w-8 h-8 rounded-full border border-white/10 object-cover"
                                alt={req.senderName || "Sender"}

                                onError={(e) => {
                                    e.target.src = `https://ui-avatars.com/api/?name=${req.senderName || 'U'}&background=random&color=fff&bold=true&length=1&uppercase=true`;
                                }}
                            />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase italic tracking-tighter text-white">
                                    {req.senderName}
                                </span>
                                <span className="text-[8px] text-zinc-500 font-bold uppercase">
                                    @{req.senderName.replace(/\s+/g, '').toLowerCase()}
                                </span>
                            </div>
                        </div>

                        {/* 🔥 FIX 4: Accept aur Reject dono buttons ek sath lagaye */}
                        <div className="flex items-center gap-2">
                            <button
                                // Context wale function ko Request ID aur Sender ID pass kar do
                                onClick={() => acceptFriendRequest(req.id, req.senderId)}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all active:scale-90 shadow-lg shadow-blue-600/20"
                            >
                                Accept
                            </button>
                            <button
                                // Reject function sirf Request ID mangta hai delete karne ke liye
                                onClick={() => rejectFriendRequest(req.id)}
                                className="bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all active:scale-90"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}