export default function CallLogs({ friend }) {
    return (
        <div className="p-8">
            <div className="max-w-2xl mx-auto text-center space-y-4">
                <div className="w-20 h-20 bg-zinc-900 rounded-full mx-auto flex items-center justify-center text-3xl grayscale opacity-50">📞</div>
                <h3 className="text-zinc-600 font-black uppercase text-[10px] tracking-[0.5em]">No Call History</h3>
                <p className="text-zinc-700 text-xs font-medium uppercase italic">Tap the buttons above to start a conversation with {friend.name}</p>
            </div>
        </div>
    );
}