import { useContext, useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { AuthContext } from '../context/AuthContext';

export default function FriendRequest() {
    const { user } = useContext(AuthContext);
    const [incoming, setIncoming] = useState([]);

    useEffect(() => {
        if (!user) return;

        // Real-time listener aapke profile document par
        const unsub = onSnapshot(doc(db, "users", user.uid), async (d) => {
            const reqIds = d.data()?.incomingRequests || [];

            // Sirf tabhi fetch karein jab IDs list mein hon
            if (reqIds.length > 0) {
                const reqDocs = await Promise.all(
                    reqIds.map(async (id) => {
                        const u = await getDoc(doc(db, "users", id));
                        return u.exists() ? { ...u.data(), uid: id } : null;
                    })
                );
                // null values ko filter karke state update
                setIncoming(reqDocs.filter(u => u !== null));
            } else {
                setIncoming([]);
            }
        });

        return () => unsub();
    }, [user]);

    const accept = async (senderId) => {
        try {
            const myRef = doc(db, "users", user.uid);
            const senderRef = doc(db, "users", senderId);

            // 1. Apni list se request hatao aur friend add karo
            await updateDoc(myRef, {
                friends: arrayUnion(senderId),
                incomingRequests: arrayRemove(senderId)
            });

            // 2. Samne wale ki list mein humein add karo
            await updateDoc(senderRef, {
                friends: arrayUnion(user.uid)
            });

        } catch (error) {
            console.error("Accept failed:", error);
        }
    };

    // Agar koi request nahi hai toh ye pura component hi hide ho jayega
    if (incoming.length === 0) return null;

    return (
        <div className="p-5 bg-blue-600/5 border-b border-blue-500/10 animate-in fade-in slide-in-from-top duration-500">
            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4 italic text-center">
                New Connection Requests ({incoming.length})
            </h3>

            <div className="space-y-3">
                {incoming.map(u => (
                    <div key={u.uid} className="flex items-center justify-between bg-zinc-900/80 p-3 rounded-2xl border border-white/5 shadow-xl">
                        <div className="flex items-center gap-3">
                            {/* Profile Picture bhi dikhayenge IMO style mein */}
                            <img
                                src={u.photo || 'https://via.placeholder.com/150'}
                                className="w-8 h-8 rounded-full border border-white/10"
                                alt=""
                            />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase italic tracking-tighter">
                                    {u.name}
                                </span>
                                <span className="text-[8px] text-zinc-500 font-bold uppercase">
                                    @{u.username}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => accept(u.uid)}
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