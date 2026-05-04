import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { VideoContext } from '../context/VideoContext';

export default function Navbar() {
    const { logout } = useContext(AuthContext);
    const { userData } = useContext(VideoContext);
    return (
        <nav className="h-20 bg-zinc-950 border-b border-white/5 flex items-center justify-between px-8">
            <div className="text-2xl font-black italic uppercase tracking-tighter">V-CALL.</div>
            <div className="flex items-center gap-4">
                <button onClick={() => document.getElementById('profile_modal').showModal()} className="w-10 h-10 rounded-full overflow-hidden border border-white/10">
                    <img src={userData?.photo} alt="" />
                </button>
                <button onClick={logout} className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Logout</button>
            </div>
        </nav>
    );
}