import { useContext } from 'react';
import { VideoContext } from '../context/VideoContext';

export default function Home() {
    const {
        callStatus,
        myVideo,
        remoteVideo,
        selectedFriend,
        startCall, // StartCall function context se liya
        endCall
    } = useContext(VideoContext);

    // 1. IDLE STATE: Welcome Screen ya Friend Profile
    if (callStatus === 'idle') {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 select-none">
                {selectedFriend ? (
                    // Jab koi friend sidebar se select ho
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                        <div className="relative mb-8">
                            <img
                                src={selectedFriend.photo}
                                className="w-32 h-32 rounded-[3rem] object-cover border border-white/10 shadow-2xl"
                                alt=""
                            />
                            <div className="absolute -bottom-2 -right-2 bg-blue-600 w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg">
                                ✨
                            </div>
                        </div>
                        <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-2">
                            {selectedFriend.name}
                        </h1>
                        <p className="text-zinc-500 font-mono italic mb-10 text-xs tracking-widest uppercase">
                            @{selectedFriend.username}
                        </p>

                        {/* ASLI CALL BUTTON */}
                        <button
                            onClick={() => startCall(selectedFriend)}
                            className="group flex items-center gap-6 px-12 py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-[2.5rem] transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-600/20"
                        >
                            <span className="text-2xl group-hover:rotate-12 transition-transform">📞</span>
                            <span className="font-black uppercase tracking-[0.2em] text-sm">Start Interaction</span>
                        </button>
                    </div>
                ) : (
                    // Default Welcome Screen
                    <>
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
                    </>
                )}
            </div>
        );
    }

    // 2. ACTIVE CALL STATE: Ringing & Connected UI
    return (
        <div className="relative w-full h-full bg-black overflow-hidden flex transition-all duration-700">
            {/* MY VIDEO */}
            <div className={`relative transition-all duration-700 ease-in-out bg-zinc-900 
                ${callStatus === 'connected' ? 'w-1/2' : 'w-full'} h-full`}>

                <video ref={myVideo} autoPlay muted playsInline className="w-full h-full object-cover mirror" />

                {(callStatus === 'ringing' || callStatus === 'receiving') && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                        <div className="w-20 h-20 rounded-full border-4 border-white/10 border-t-blue-600 animate-spin mb-8"></div>
                        <h2 className="text-4xl font-black italic uppercase tracking-tighter">
                            {callStatus === 'ringing' ? `Calling ${selectedFriend?.name}` : 'Incoming Interaction...'}
                        </h2>
                        <p className="mt-2 text-zinc-400 font-bold uppercase tracking-widest text-xs animate-pulse">
                            Wait for secure connection
                        </p>
                    </div>
                )}
            </div>

            {/* REMOTE VIDEO */}
            {callStatus === 'connected' && (
                <div className="w-1/2 h-full bg-zinc-800 border-l border-white/5">
                    <video ref={remoteVideo} autoPlay playsInline className="w-full h-full object-cover" />
                </div>
            )}

            {/* END CALL BUTTON */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50">
                <button
                    onClick={endCall}
                    className="group w-20 h-20 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 hover:scale-110 transition-all shadow-2xl shadow-red-600/40"
                >
                    <span className="text-3xl">📞</span>
                    <span className="absolute -top-12 scale-0 group-hover:scale-100 transition-all bg-zinc-900 text-white text-[10px] px-4 py-2 rounded-xl font-black uppercase">Terminate</span>
                </button>
            </div>
        </div>
    );
}