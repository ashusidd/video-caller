import { useEffect, useState } from 'react';
import { db } from '../firebase'; // Aapka firebase config
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

export default function CallLogs({ friend }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Agar friend null ya undefined hai toh return kar jao (White screen fix)
        if (!friend?.uid) return;

        setLoading(true);
        const q = query(
            collection(db, "calls"),
            where("participants", "array-contains", friend.uid),
            orderBy("timestamp", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const callData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLogs(callData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [friend?.uid]);

    if (!friend) return null; // Crash hone se bachane ke liye

    return (
        <div className="space-y-4">
            {loading ? (
                <p className="text-center text-zinc-600 text-[10px] animate-pulse">Fetching Logs...</p>
            ) : logs.length > 0 ? (
                logs.map(log => (
                    <div key={log.id} className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className={log.type === 'missed' ? 'text-red-500' : 'text-green-500'}>
                                {log.type === 'video' ? '📹' : '📞'}
                            </span>
                            <div>
                                <p className="text-sm font-bold text-zinc-200 capitalize">{log.status}</p>
                                <p className="text-[9px] text-zinc-500 font-mono">{new Date(log.timestamp?.toDate()).toLocaleString()}</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-black text-zinc-700 uppercase italic tracking-widest">
                            {log.duration || '0s'}
                        </span>
                    </div>
                ))
            ) : (
                <div className="text-center py-10">
                    <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest opacity-30">No Call History with {friend?.name?.split(' ')[0]}</p>
                </div>
            )}
        </div>
    );
}