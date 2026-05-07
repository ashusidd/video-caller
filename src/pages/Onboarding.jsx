import { useState, useContext } from 'react';
import { VideoContext } from '../context/VideoContext';
import { AuthContext } from '../context/AuthContext'; // 🔥 NAYA IMPORT: Logout logic ke liye

// 🔥 Firebase imports
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function Onboarding() {
    const { setupProfile } = useContext(VideoContext);
    const { logout } = useContext(AuthContext); // 🔥 LOGOUT FUNCTION NIKALA

    const [form, setForm] = useState({ name: '', username: '', phone: '' });

    // UI states manage karne ke liye
    const [error, setError] = useState('');
    const [isChecking, setIsChecking] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsChecking(true);

        try {
            // 1. Check if Username exists
            const usernameQuery = query(collection(db, "users"), where("username", "==", form.username));
            const usernameSnapshot = await getDocs(usernameQuery);

            if (!usernameSnapshot.empty) {
                setError('Username already exist, try others.');
                setIsChecking(false);
                return;
            }

            // 2. Check if Phone exists (Sirf tabhi jab phone daala ho)
            if (form.phone) {
                const phoneQuery = query(collection(db, "users"), where("phone", "==", form.phone));
                const phoneSnapshot = await getDocs(phoneQuery);

                if (!phoneSnapshot.empty) {
                    setError('This phone No. already exist');
                    setIsChecking(false);
                    return;
                }
            }

            // 3. Agar sab sahi hai toh profile bana do
            await setupProfile(form.name, form.username, form.phone);

        } catch (err) {
            console.error("Asli Error:", err);
            // 🔥 Ab server se connect nahi ho paaya wala fake message nahi aayega.
            // Jo actual Firebase ka error hoga, wo seedha screen par print hoga.
            setError(`Firebase Error: ${err.message}`);
            setIsChecking(false);
        }
    };

    // Username se space hatane aur small letter karne ka logic
    const handleUsernameChange = (e) => {
        const cleanUsername = e.target.value.toLowerCase().replace(/\s+/g, '');
        setForm({ ...form, username: cleanUsername });
    };

    return (
        <div className="h-screen bg-black flex items-center justify-center p-6 text-white animate-in fade-in duration-500">
            <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">

                <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-4">Setup Profile</h2>

                {/* 🔥 ERROR MESSAGE BOX */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 text-xs font-bold p-3 rounded-xl uppercase tracking-wider animate-in slide-in-from-top-2">
                        ⚠️ {error}
                    </div>
                )}

                {/* Full Name Input */}
                <input
                    type="text"
                    placeholder="Full Name *"
                    value={form.name}
                    className="w-full bg-zinc-900/50 p-5 rounded-2xl border border-white/5 outline-none focus:border-blue-500 focus:bg-zinc-900 transition-all placeholder:text-zinc-600 font-medium"
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                />

                {/* Unique Username Input */}
                <input
                    type="text"
                    placeholder="Unique Username *"
                    value={form.username}
                    className="w-full bg-zinc-900/50 p-5 rounded-2xl border border-white/5 outline-none focus:border-blue-500 focus:bg-zinc-900 transition-all placeholder:text-zinc-600 font-mono text-sm"
                    onChange={handleUsernameChange}
                    required
                />

                {/* Phone Input (Optional) */}
                <input
                    type="tel"
                    placeholder="Phone (Optional)"
                    value={form.phone}
                    className="w-full bg-zinc-900/50 p-5 rounded-2xl border border-white/5 outline-none focus:border-blue-500 focus:bg-zinc-900 transition-all placeholder:text-zinc-600 font-mono text-sm"
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                />

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isChecking}
                    className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all ${isChecking ? 'bg-zinc-800 text-zinc-500 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 active:scale-95'
                        }`}
                >
                    {isChecking ? 'Checking...' : 'Create Account'}
                </button>

                {/* 🔥 NAYA ESCAPE ROUTE (LOGOUT BUTTON) */}
                <button
                    type="button" // Type 'button' zaroori hai warna form submit ho jayega
                    onClick={logout}
                    className="w-full py-3 text-[10px] text-zinc-500 hover:text-red-500 font-black uppercase tracking-[0.2em] transition-colors"
                >
                    Cancel & Logout
                </button>

            </form>
        </div>
    );
}