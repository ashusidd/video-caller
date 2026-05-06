import { useEffect, useState, useContext } from 'react';
import { db } from '../firebase';
// 🔥 IMPORT MEIN 'deleteDoc' AUR 'doc' ADD KIYA HAI
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
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

        // Query logic
        const q = query(
            collection(db, "calls"),
            where("participants", "array-contains", user.uid),
            orderBy("timestamp", "desc")
        );

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                // 🔥 THE 24-HOUR FIX: Aaj se theek 24 ghante pehle ka time
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const validLogs = [];

                snapshot.docs.forEach(docSnap => {
                    const data = docSnap.data();

                    // Agar timestamp fetch nahi hua toh current time maan lo (error se bachne ke liye)
                    const logTime = data.timestamp?.toDate ? data.timestamp.toDate() : new Date();

                    // Agar log 24 ghante se purana hai -> Usko DATABASE SE UDA DO! 🗑️
                    if (logTime < twentyFourHoursAgo) {
                        deleteDoc(doc(db, "calls", docSnap.id)).catch(err => console.error("Purana log delete nahi hua:", err));
                    }
                    // Agar naya log hai -> Usko UI mein dikhane ke liye array mein daal do
                    else {
                        if (data.participants && data.participants.includes(filterId)) {
                            validLogs.push({ id: docSnap.id, ...data });
                        }
                    }
                });

                setLogs(validLogs);
                setLoading(false);
            },
            (err) => {
                console.error("🔥 Firestore Query Error:", err);
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [filterId, user?.uid]);

    // 1. Agar koi error aaye (Index missing error yahan dikhega)
    if (error) {
        return (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                <p className="text-red-500 text-[10px] font-bold uppercase mb-2">Query Failed</p>
                <p className="text-zinc-500 text-[9px] mb-2">{error}</p>
                <p className="text-zinc-400 text-[9px]">Console (F12) check karo aur blue link par click karke index banao!</p>
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
                                    }) : 'Syncing...'}
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