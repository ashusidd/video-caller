import { useContext } from 'react';
import { VideoContext } from '../context/VideoContext';

export default function CallInterface() {
    const {
        myVideo,
        remoteVideo,
        endCall,
        callStatus,
        callerInfo,
        acceptCall,
        selectedFriend
    } = useContext(VideoContext);

    // 1. Agar koi call nahi chal rahi, toh kuch mat dikhao
    if (callStatus === 'idle') return null;

    // ==============================================================
    // 2. RECEIVER SCREEN (Jab Phone Baje - Sirf ye dikhega)
    // ==============================================================
    if (callStatus === 'receiving') {
        return (
            <div className="absolute inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center animate-in zoom-in duration-300">
                <img
                    src={callerInfo?.photo || 'https://via.placeholder.com/150'}
                    className="w-32 h-32 rounded-full border-4 border-blue-500 shadow-2xl shadow-blue-500/20 mb-6 animate-pulse object-cover"
                    alt="Caller"
                />
                <h2 className="text-4xl font-black text-white italic">{callerInfo?.name || 'Someone'}</h2>
                <p className="text-zinc-400 font-mono tracking-widest mt-2 uppercase text-sm mb-12">is calling you...</p>

                <div className="flex gap-10">
                    <button onClick={endCall} className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-all text-3xl">
                        ❌
                    </button>
                    <button onClick={acceptCall} className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-xl shadow-green-500/30 active:scale-90 transition-all text-3xl animate-bounce">
                        📹
                    </button>
                </div>
            </div>
        );
    }

    // ==============================================================
    // 3. CALLER & CONNECTED SCREEN (Video Grid)
    // ==============================================================
    return (
        <div className="absolute inset-0 bg-black z-50 flex flex-col p-6 animate-in zoom-in duration-300">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 relative">

                {/* Dost ki video wala box */}
                <div className="bg-zinc-900 rounded-[3rem] overflow-hidden border border-white/10 relative flex items-center justify-center">
                    <video ref={remoteVideo} autoPlay className="w-full h-full object-cover absolute inset-0 z-0" />

                    {/* Jab aap call lagate ho (Ringing) */}
                    {callStatus === 'ringing' && (
                        <div className="z-10 flex flex-col items-center animate-pulse">
                            <img
                                src={selectedFriend?.photo || 'https://via.placeholder.com/150'}
                                className="w-24 h-24 rounded-full border-2 border-white/20 mb-4 object-cover shadow-lg"
                                alt=""
                            />
                            <h3 className="text-2xl text-white font-bold mb-2 italic tracking-wide">{selectedFriend?.name || 'Friend'}</h3>
                            <p className="text-zinc-400 font-mono tracking-widest uppercase bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm text-xs">
                                Ringing...
                            </p>
                        </div>
                    )}
                </div>

                {/* Aapki video wala box */}
                <div className="bg-zinc-900 rounded-[3rem] overflow-hidden border border-white/10 relative shadow-2xl">
                    <video ref={myVideo} autoPlay muted className="w-full h-full object-cover scale-x-[-1]" />
                </div>
            </div>

            {/* Disconnect Button */}
            <div className="h-32 flex items-center justify-center">
                <button
                    onClick={endCall}
                    className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center text-3xl shadow-xl shadow-red-600/30 active:scale-90 transition-all"
                >
                    📵
                </button>
            </div>
        </div>
    );
}