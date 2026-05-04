import { useState, useContext, useEffect } from 'react';
import { VideoContext } from '../context/VideoContext';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export default function AddFriend() {
    const { searchUsers, userData } = useContext(VideoContext);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        // Debounce logic: User ke type khatam karne ka wait karega
        const delaySearch = setTimeout(async () => {
            const lowerQuery = query.trim().toLowerCase();

            if (lowerQuery.length >= 2) {
                setSearching(true); // Spinner ON
                try {
                    // Firestore se users fetch karega (Self-profile excluded)
                    const users = await searchUsers(lowerQuery);
                    setResults(users);
                } catch (error) {
                    console.error("Search error:", error);
                    setResults([]);
                } finally {
                    // Spinner OFF: Chahe result mile ya error aaye
                    setSearching(false);
                }
            } else {
                setResults([]);
                setSearching(false);
            }
        }, 400); // 400ms delay for stability

        return () => clearTimeout(delaySearch);
    }, [query, searchUsers]);

    const sendRequest = async (targetUser) => {
        try {
            await updateDoc(doc(db, "users", targetUser.uid), {
                incomingRequests: arrayUnion(userData.uid)
            });
            alert(`Friend request sent to ${targetUser.name}!`);
            setQuery(''); // Search bar clear
            setResults([]);
        } catch (err) {
            console.error("Failed to send request:", err);
            alert("Error sending request. Check your internet.");
        }
    };

    return (
        <div className="p-6 bg-zinc-950 border-b border-white/5">
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search @username or phone..."
                    className="w-full bg-zinc-900 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 focus:border-blue-600 transition-all outline-none"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />

                {/* Spinner logic: Sirf searching ke waqt dikhega */}
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
                            onClick={() => sendRequest(u)}
                            className="flex items-center justify-between p-3 bg-zinc-900 rounded-2xl border border-white/5 hover:border-blue-600/50 cursor-pointer transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <img
                                    src={u.photo}
                                    className="w-8 h-8 rounded-full border border-white/10"
                                    alt={u.name}
                                />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase italic tracking-tighter">
                                        {u.name}
                                    </span>
                                    <span className="text-[8px] text-zinc-500 font-bold">
                                        @{u.username.toLowerCase()}
                                    </span>
                                </div>
                            </div>
                            <button className="text-[9px] font-black bg-blue-600 px-3 py-1.5 rounded-xl uppercase transition-transform active:scale-90">
                                Add
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