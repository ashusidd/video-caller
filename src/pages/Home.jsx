export default function Home() {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center p-10 select-none">
            <div className="w-32 h-32 bg-zinc-900 rounded-[3rem] flex items-center justify-center text-5xl mb-8 border border-white/5 animate-pulse">
                📞
            </div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-4">V-CALL HD.</h1>
            <p className="text-zinc-600 text-sm max-w-xs font-bold uppercase tracking-widest italic">
                No messaging. Only High-Quality Video and Audio interactions.
            </p>
            <div className="mt-12 flex gap-4">
                <div className="px-6 py-2 bg-zinc-900 rounded-full text-[10px] font-black text-zinc-500 uppercase border border-white/5">Red Dot Status</div>
                <div className="px-6 py-2 bg-zinc-900 rounded-full text-[10px] font-black text-zinc-500 uppercase border border-white/5">Search by Phone</div>
            </div>
        </div>
    );
}