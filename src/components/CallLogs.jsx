import { useEffect, useState, useContext } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { AuthContext } from '../context/AuthContext';

export default function CallLogs({ filterId }) {
    const { user } = useContext(AuthContext);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!filterId || !user?.uid) return;

        setLoading(true);
        // Query logic: Wo saari calls nikaalo jisme Current User aur selected Friend dono hon
        const q = query(
            collection(db, "calls"),
            where("participants", "array-contains", user.uid),
            orderBy("timestamp", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const callData = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                // Sirf wahi calls filter karo jo is specific friend ke saath hain
                .filter(log => log.participants.includes(filterId));

            setLogs(callData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [filterId, user?.uid]);

    return (
        <div className="space-y-3">
            {loading ? (
                <p className="text-center text-zinc-600 text-[10px] animate-pulse">Loading Logs...</p>
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
                                    {log.timestamp?.toDate().toLocaleString('en-IN', {
                                        dateStyle: 'medium',
                                        timeStyle: 'short'
                                    })}
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