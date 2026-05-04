import { useContext } from 'react';
import { VideoContext } from '../context/VideoContext';

export default function CallInterface() {
    const { myVideo, remoteVideo, endCall } = useContext(VideoContext);

    return (
        <div className="absolute inset-0 bg-black z-50 flex flex-col p-6 animate-in zoom-in duration-300">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                {/* Remote User Video */}
                <div className="bg-zinc-900 rounded-[3rem] overflow-hidden border border-white/10 relative">
                    <video ref={remoteVideo} autoPlay className="w-full h-full object-cover" />
                </div>
                {/* Your Video */}
                <div className="bg-zinc-900 rounded-[3rem] overflow-hidden border border-white/10 relative shadow-2xl">
                    <video ref={myVideo} autoPlay muted className="w-full h-full object-cover scale-x-[-1]" />
                </div>
            </div>

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