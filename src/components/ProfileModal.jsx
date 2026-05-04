import { useContext, useState } from 'react';
import { VideoContext } from '../context/VideoContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function ProfileModal() {
    const { userData, logout } = useContext(VideoContext);
    const [editingField, setEditingField] = useState(null);
    const [tempValue, setTempValue] = useState('');

    const startEditing = (field, value) => {
        setEditingField(field);
        setTempValue(value || '');
    };

    const handleSave = async (field) => {
        if (!tempValue && field !== 'phone') return;
        try {
            await updateDoc(doc(db, "users", userData.uid), {
                [field]: field === 'username' ? tempValue.toLowerCase() : tempValue
            });
            setEditingField(null);
        } catch (error) { console.error(error); }
    };

    if (!userData) return null;

    return (
        <dialog id="profile_modal" className="modal p-0 m-0 h-screen max-h-none w-screen max-w-none bg-black/60 backdrop-blur-sm transition-all duration-300">
            {/* Main Sidebar Container */}
            <div className="absolute right-0 top-0 h-full w-full max-w-md bg-zinc-950 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-white/5">

                {/* Header Section */}
                <div className="p-8 flex items-center justify-between border-b border-white/5">
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">My Account</h2>
                    <form method="dialog">
                        <button className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors">✕</button>
                    </form>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Profile Banner */}
                    <div className="p-10 flex flex-col items-center text-center bg-gradient-to-b from-blue-600/10 to-transparent">
                        <div className="relative mb-6">
                            <img
                                src={userData.photo}
                                className="w-32 h-32 rounded-[2.5rem] border-4 border-zinc-900 shadow-2xl object-cover"
                                alt="profile"
                            />
                            <div className="absolute -bottom-2 -right-2 bg-blue-600 p-2 rounded-xl text-xs">✓</div>
                        </div>
                        <h3 className="text-3xl font-black italic uppercase tracking-tighter">{userData.name}</h3>
                        <p className="text-zinc-500 font-mono text-[10px] mt-1 tracking-[0.3em]">@{userData.username}</p>
                    </div>

                    {/* Edit Fields */}
                    <div className="px-8 space-y-4">
                        {[
                            { label: 'Full Name', key: 'name', value: userData.name },
                            { label: 'Unique Username', key: 'username', value: userData.username },
                            { label: 'Phone Number', key: 'phone', value: userData.phone }
                        ].map((item) => (
                            <div key={item.key} className="bg-zinc-900/50 p-6 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{item.label}</span>
                                    {editingField === item.key ? (
                                        <div className="flex gap-3">
                                            <button onClick={() => setEditingField(null)} className="text-[10px] font-bold text-red-500 uppercase">Cancel</button>
                                            <button onClick={() => handleSave(item.key)} className="text-[10px] font-bold text-green-500 uppercase">Save</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => startEditing(item.key, item.value)} className="text-[9px] font-black text-blue-500 uppercase underline">Change</button>
                                    )}
                                </div>

                                {editingField === item.key ? (
                                    <input
                                        className="bg-transparent w-full text-white font-bold outline-none border-b border-blue-600 pb-1"
                                        value={tempValue}
                                        onChange={(e) => setTempValue(e.target.value)}
                                        autoFocus
                                    />
                                ) : (
                                    <p className="font-bold text-lg italic tracking-tight">{item.value || '---'}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Section */}
                <div className="p-8 border-t border-white/5 space-y-4 bg-zinc-950">
                    <button
                        onClick={logout}
                        className="w-full py-5 rounded-[2rem] bg-zinc-900 hover:bg-red-600/10 hover:text-red-500 border border-white/5 transition-all font-black uppercase text-[10px] tracking-widest"
                    >
                        Log Out Account
                    </button>
                    <p className="text-center text-[9px] text-zinc-700 font-bold uppercase tracking-widest">V-CALL v1.0 • Ashraf Ali Edition</p>
                </div>
            </div>
        </dialog>
    );
}