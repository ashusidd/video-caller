import { useEffect, useState, useContext } from 'react';
import { db } from '../firebase';
// 🔥 FIX 1: 'or' import kiya hai, 'orderBy' ki zaroorat nahi hai
import { collection, query, where, onSnapshot, deleteDoc, doc, or } from 'firebase/firestore';
import { AuthContext } from '../context/AuthContext';

export default function CallLogs({ filterId }) {
    const { user } = useContext(AuthContext);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!filterId || !user?.uid) return;

        setLoading(true);
        setError(null);

        // 🔥 FIX 2: Query se 'orderBy' hata diya taaki Index error na aaye
        const q = query(
            collection(db, "calls"),
            or(
                where("callerId", "==", user.uid),
                where("receiverId", "==", user.uid)
            )
        );

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                let validLogs = [];

                snapshot.docs.forEach(docSnap => {
                    const data = docSnap.data();
                    const logTime = data.timestamp?.toDate ? data.timestamp.toDate() : new Date();

                    // 🔥 THE 24-HOUR AUTO-DELETE: Purane logs database se uda do
                    if (logTime < twentyFourHoursAgo) {
                        deleteDoc(doc(db, "calls", docSnap.id)).catch(err => console.error("Old log delete failed:", err));
                    }
                    else {
                        // Sirf wahi dikhao jo dost (filterId) ke sath calls hui hain
                        if (data.callerId === filterId || data.receiverId === filterId) {
                            validLogs.push({ id: docSnap.id, ...data });
                        }
                    }
                });

                // 🔥 FIX 3: JavaScript Sorting (Manual)
                // Taaki naye logs upar dikhein bina Firebase Index ke
                validLogs.sort((a, b) => {
                    const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date();
                    const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date();
                    return timeB - timeA;
                });

                setLogs(validLogs);
                setLoading(false);
            },
            (err) => {
                console.error("🔥 Firestore Query Error:", err);
                // Agar index missing hai toh ab ye error nahi aayega!
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [filterId, user?.uid]);

    // Agar fir bhi koi permission error aaye toh ye clean UI dikhayega
    if (error) {
        return (
            <div className="text-center py-10 opacity-20">
                <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.2em]">
                    Logs Syncing...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {loading ? (
                <div className="flex flex-col items-center py-10">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-zinc-600 text-[9px] font-black uppercase tracking-widest">Accessing Logs...</p>
                </div>
            ) : logs.length > 0 ? (
                logs.map(log => (
                    <div key={log.id} className="bg-zinc-900/30 p-3 rounded-xl border border-white/5 flex justify-between items-center group hover:bg-zinc-900/50 transition-all">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${log.status === 'missed' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                {log.status === 'missed' ? '📞' : '📹'}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-zinc-200 capitalize">
                                    {log.callerId === user.uid ? 'Outgoing' : 'Incoming'} {log.status}
                                </p>
                                <p className="text-[9px] text-zinc-500 font-mono">
                                    {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('en-IN', {
                                        dateStyle: 'medium',
                                        timeStyle: 'short'
                                    }) : 'Recently'}
                                </p>
                            </div>
                        </div>
                        <span className="text-[10px] font-black text-zinc-700 group-hover:text-zinc-500 transition-colors uppercase italic tracking-widest">
                            {log.status === 'completed' ? 'Connected' : 'No Answer'}
                        </span>
                    </div>
                ))
            ) : (
                <div className="text-center py-10 opacity-30">
                    <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.2em]">History Empty</p>
                </div>
            )}
        </div>
    );
}