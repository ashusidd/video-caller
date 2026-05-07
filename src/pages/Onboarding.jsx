import { useState, useContext } from 'react';
import { VideoContext } from '../context/VideoContext';
// 🔥 NAYA IMPORT: Firebase check karne ke liye
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function Onboarding() {
    const { setupProfile } = useContext(VideoContext);
    const [form, setForm] = useState({ name: '', username: '', phone: '' });

    // 🔥 NAYI STATE: Error dikhane aur Loading ke liye
    const [error, setError] = useState('');
    const [isChecking, setIsChecking] = useState(false);

    // Ye function ab async hai kyunki database mein check karne mein milliseconds lagenge
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Purana error clear kar do
        setIsChecking(true); // Button ko 'Checking...' state mein daal do

        try {
            // 1. USERNAME CHECK: Firestore se pucho kya ye username pehle se hai?
            // Note: Agar tumhare collection ka naam 'users' nahi hai, toh isko change karlena
            const usernameQuery = query(collection(db, "users"), where("username", "==", form.username));
            const usernameSnapshot = await getDocs(usernameQuery);

            if (!usernameSnapshot.empty) {
                // Agar result mila, matlab kisi ne le rakha hai
                setError('Bhai, ye Username pehle se kisi ne le liya hai! Koi naya try karo.');
                setIsChecking(false);
                return; // Code yahin ruk jayega, aage nahi badhega
            }

            // 2. PHONE NUMBER CHECK (Agar phone daala hai tabhi check karo)
            if (form.phone) {
                const phoneQuery = query(collection(db, "users"), where("phone", "==", form.phone));
                const phoneSnapshot = await getDocs(phoneQuery);

                if (!phoneSnapshot.empty) {
                    setError('Ye Phone Number pehle se registered hai! Apna asli number daalo.');
                    setIsChecking(false);
                    return; // Code yahin ruk jayega
                }
            }

            // 3. SAB KUCH THEEK HAI! (Naya user hai, profile bana do)
            await setupProfile(form.name, form.username, form.phone);

        } catch (err) {
            console.error("Validation error:", err);
            setError("Server se connect nahi ho paaya. Phir se try karo.");
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

                {/* 🔥 ERROR MESSAGE BOX: Agar error aayega tabhi dikhega */}
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

                {/* Phone Input */}
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

            </form>
        </div>
    );
}