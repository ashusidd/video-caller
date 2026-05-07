import { useContext, useEffect, useState } from 'react';
import { db } from '../firebase';
// 🔥 FIX 1: Naye imports add kiye (collection, query, where, deleteDoc)
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { AuthContext } from '../context/AuthContext';

export default function FriendRequest() {
    const { user } = useContext(AuthContext);
    const [incoming, setIncoming] = useState([]);

    useEffect(() => {
        if (!user) return;

        // 🔥 FIX 2: Ab hum users profile nahi, direct friendRequests collection sunenge
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

    const accept = async (request) => {
        try {
            // 1. Apni profile ki friend list mein usko add karo
            const myRef = doc(db, "users", user.uid);
            await updateDoc(myRef, {
                friends: arrayUnion(request.senderId)
            });

            // 2. Dusre ki profile hum update nahi kar sakte (Security Rules block kar denge)
            // Isliye hum seedha is Request ko DataBase se Delete (Accept) kar denge taaki UI clean ho jaye
            await deleteDoc(doc(db, "friendRequests", request.id));

        } catch (error) {
            console.error("Accept failed:", error);
            alert("Bhai internet issue lag raha hai, accept nahi hua!");
        }
    };

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
                                src={req.senderPhoto || 'https://via.placeholder.com/150'}
                                className="w-8 h-8 rounded-full border border-white/10 object-cover"
                                alt={req.senderName}
                            />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase italic tracking-tighter text-white">
                                    {req.senderName}
                                </span>
                                <span className="text-[8px] text-zinc-500 font-bold uppercase">
                                    {/* Agar username save nahi hua tha request mein, toh naam se fallback banayenge */}
                                    @{req.senderName.replace(/\s+/g, '').toLowerCase()}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => accept(req)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all active:scale-90 shadow-lg shadow-blue-600/20"
                        >
                            Accept
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}