import { useContext, useState } from 'react';
import { VideoContext } from '../context/VideoContext';
import { AuthContext } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function ProfileModal({ onClose }) {
    const { userData, setUserData } = useContext(VideoContext);
    const { logout } = useContext(AuthContext);

    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(userData?.name || '');

    // 🔥 Naya state: Button loading effect ke liye
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!newName.trim()) return;

        setIsSaving(true); // Button disable aur loading shuru

        try {
            const userRef = doc(db, 'users', userData.uid);
            await updateDoc(userRef, { name: newName });
            setUserData({ ...userData, name: newName });
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating profile", error);
            // Agar internet band ho jaye toh UI crash nahi hoga, balki ye error aayega
            alert("Name is not update, check internet connection!");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col bg-[#111b21] animate-in fade-in zoom-in duration-300">
            {/* Header: Photo and ID */}
            <div className="bg-[#202c33] p-6 flex flex-col items-center justify-center border-b border-white/5">
                <img
                    src={userData?.photo || userData?.photoURL || `https://ui-avatars.com/api/?name=${userData?.name || 'U'}&background=random&color=fff&bold=true&length=1&uppercase=true`}

                    className="w-20 h-20 rounded-full object-cover border-4 border-[#111b21] shadow-lg mb-3"
                    alt={userData?.name || "User"}

                    onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${userData?.name || 'U'}&background=random&color=fff&bold=true&length=1&uppercase=true`;
                    }}
                />
                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase tracking-widest font-mono">
                    ID: {userData?.uid?.slice(0, 6)}...
                </span>
            </div>

            {/* Content Area: Edit Name & Username */}
            <div className="p-6 space-y-5">
                <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1 block">Username</label>
                    <div className="text-sm font-mono text-zinc-400 px-3 py-2 bg-zinc-900/50 rounded-lg border border-white/5 cursor-not-allowed">
                        @{userData?.username}
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-end mb-1">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Display Name</label>
                        {!isEditing && (
                            <button onClick={() => setIsEditing(true)} className="text-[10px] text-blue-500 hover:text-blue-400 uppercase font-black tracking-wider">Edit</button>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="flex-1 bg-zinc-900 border border-blue-500/50 outline-none text-white text-sm px-3 py-2 rounded-lg"
                                autoFocus
                            />
                            {/* 🔥 Button ab disabled state handle karega */}
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className={`text-white text-xs px-3 rounded-lg font-bold transition-all ${isSaving ? 'bg-zinc-700 cursor-wait' : 'bg-blue-600 hover:bg-blue-500'}`}
                            >
                                {isSaving ? '...' : 'SAVE'}
                            </button>
                        </div>
                    ) : (
                        <div className="text-sm font-medium text-white px-3 py-2 bg-zinc-900/50 rounded-lg border border-white/5">
                            {userData?.name}
                        </div>
                    )}
                </div>

                <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1 block">Phone No.</label>
                    <div className="text-sm font-mono text-zinc-400 px-3 py-2 bg-zinc-900/50 rounded-lg border border-white/5 cursor-not-allowed">
                        {userData?.phone || "Not Linked"}
                    </div>
                </div>
            </div>

            {/* Footer Area: Logout & COPYRIGHT */}
            <div className="p-4 border-t border-white/5 bg-zinc-950/50 flex flex-col items-center gap-4">
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all font-bold text-sm tracking-wide"
                >
                    <span>🚪</span> Logout
                </button>

                {/* --- PROFESSIONAL BRANDING --- */}
                <span className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.4em] italic opacity-50">
                    Ashu 2026 version 1.0
                </span>
            </div>
        </div>
    );
}