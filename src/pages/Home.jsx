import { useContext } from 'react';
import { VideoContext } from '../context/VideoContext';

export default function Home() {
    const { callStatus, myVideo, remoteVideo, selectedFriend, startCall, endCall } = useContext(VideoContext);

    // 1. IDLE STATE: Dashboard par Welcome ya Friend Selection
    if (callStatus === 'idle') {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 select-none">
                {selectedFriend ? (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                        <img src={selectedFriend.photo} className="w-32 h-32 rounded-[3rem] object-cover mb-8 shadow-2xl border border-white/10" alt="" />
                        <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-2">{selectedFriend.name}</h1>
                        <p className="text-zinc-500 font-mono italic mb-10 text-xs">@{selectedFriend.username}</p>
                        <button onClick={() => startCall(selectedFriend)} className="group flex items-center gap-6 px-12 py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-[2.5rem] transition-all hover:scale-105 shadow-xl shadow-blue-600/20">
                            <span className="text-2xl group-hover:rotate-12 transition-transform">📞</span>
                            <span className="font-black uppercase tracking-[0.2em] text-sm">Start Interaction</span>
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="w-32 h-32 bg-zinc-900 rounded-[3rem] flex items-center justify-center text-5xl mb-8 animate-pulse">📞</div>
                        <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-4">V-CALL HD.</h1>
                        <p className="text-zinc-600 text-sm max-w-xs font-bold uppercase tracking-widest italic">Only High-Quality Video and Audio interactions.</p>
                    </>
                )}
            </div>
        );
    }

    // 2. ACTIVE CALL STATE: Ringing/Connected UI
    return (
        <div className="relative w-full h-full bg-black overflow-hidden flex transition-all duration-700">
            <div className={`relative transition-all duration-700 ease-in-out bg-zinc-900 ${callStatus === 'connected' ? 'w-1/2' : 'w-full'} h-full`}>
                <video ref={myVideo} autoPlay muted playsInline className="w-full h-full object-cover mirror" />
                {(callStatus === 'ringing' || callStatus === 'receiving') && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-sm z-10">
                        <div className="w-20 h-20 rounded-full border-4 border-white/10 border-t-blue-600 animate-spin mb-8"></div>
                        <h2 className="text-4xl font-black italic uppercase tracking-tighter">
                            {callStatus === 'ringing' ? `Calling ${selectedFriend?.name}` : 'Incoming Interaction...'}
                        </h2>
                    </div>
                )}
            </div>

            {callStatus === 'connected' && (
                <div className="w-1/2 h-full bg-zinc-800 border-l border-white/5">
                    <video ref={remoteVideo} autoPlay playsInline className="w-full h-full object-cover" />
                </div>
            )}

            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50">
                <button onClick={endCall} className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 hover:scale-110 transition-all shadow-2xl">
                    <span className="text-3xl">📞</span>
                </button>
            </div>
        </div>
    );
}