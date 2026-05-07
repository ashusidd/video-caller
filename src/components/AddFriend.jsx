import { useState, useContext, useEffect } from 'react';
import { VideoContext } from '../context/VideoContext';
// 🔥 FIX 1: Firebase imports wapas laaye kyunki request alag collection me jayegi
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function AddFriend() {
    const { searchUsers, userData } = useContext(VideoContext);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        // Debounce logic (taaki har ek letter type hone par API call na ho)
        const delaySearch = setTimeout(async () => {
            const lowerQuery = query.trim().toLowerCase();

            if (lowerQuery.length >= 2) {
                setSearching(true);
                try {
                    const users = await searchUsers(lowerQuery);
                    setResults(users);
                } catch (error) {
                    console.error("Search error:", error);
                    setResults([]);
                } finally {
                    setSearching(false);
                }
            } else {
                setResults([]);
                setSearching(false);
            }
        }, 400);

        return () => clearTimeout(delaySearch);
    }, [query, searchUsers]);

    // 🔥 FIX 2: Direct Add ko hatakar wapas Request wala logic lagaya
    const sendRequest = async (targetUser) => {
        try {
            // Check: Khud ko request toh nahi bhej rahe?
            if (targetUser.uid === userData.uid) {
                alert("Bhai, khud ko friend request nahi bhej sakte! 😂");
                return;
            }

            // Firebase me 'friendRequests' me entry bhejo
            await addDoc(collection(db, "friendRequests"), {
                senderId: userData.uid,
                senderName: userData.name,
                senderPhoto: userData.photo || "",
                receiverId: targetUser.uid,
                status: "pending",
                timestamp: serverTimestamp()
            });

            alert(`Friend request sent to ${targetUser.name}! 🚀`);
            setQuery('');
            setResults([]); // Request bhejne ke baad search list khali kar do
        } catch (err) {
            console.error("Failed to send request:", err);
            alert(`Error: ${err.message}`);
        }
    };

    return (
        <div className="p-6 bg-zinc-950 border-b border-white/5">
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search @username or phone..."
                    className="w-full bg-zinc-900 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 focus:border-blue-600 transition-all outline-none text-white"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />

                {/* Spinner */}
                {searching && (
                    <div className="absolute right-4 top-4">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>

            {/* Results Display */}
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {query.length >= 2 && results.length > 0 ? (
                    results.map(u => (
                        <div
                            key={u.uid}
                            className="flex items-center justify-between p-3 bg-zinc-900 rounded-2xl border border-white/5 hover:border-blue-600/50 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <img
                                    src={u.photo || u.photoURL || `https://ui-avatars.com/api/?name=${u.name}&background=random&color=fff`}
                                    className="w-8 h-8 rounded-full object-cover border border-white/10"
                                    alt={u.name}
                                    onError={(e) => {
                                        e.target.src = `https://ui-avatars.com/api/?name=${u.name}&background=random&color=fff`;
                                    }}
                                />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase italic tracking-tighter text-white">
                                        {u.name}
                                    </span>
                                    <span className="text-[8px] text-zinc-500 font-bold">
                                        @{u.username?.toLowerCase()}
                                    </span>
                                </div>
                            </div>
                            <button
                                // 🔥 FIX 3: Wapas sendRequest function laga diya
                                onClick={() => sendRequest(u)}
                                className="text-[9px] font-black bg-blue-600 text-white px-3 py-1.5 rounded-xl uppercase transition-transform active:scale-90 hover:bg-blue-500"
                            >
                                Request
                            </button>
                        </div>
                    ))
                ) : query.length >= 2 && !searching ? (
                    /* User Not Found Logic */
                    <div className="p-4 bg-red-600/5 border border-red-600/10 rounded-2xl text-center animate-in fade-in duration-300">
                        <p className="text-[9px] font-black text-red-500 uppercase tracking-widest italic">
                            ⚠️ No user found on V-CALL
                        </p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}