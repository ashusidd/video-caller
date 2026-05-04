import { useState, useContext } from 'react';
import { VideoContext } from '../context/VideoContext';

export default function Onboarding() {
    const { setupProfile } = useContext(VideoContext);
    const [form, setForm] = useState({ name: '', username: '', phone: '' });

    return (
        <div className="h-screen bg-black flex items-center justify-center p-6 text-white">
            <form onSubmit={(e) => { e.preventDefault(); setupProfile(form.name, form.username, form.phone); }} className="w-full max-w-sm space-y-6">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter">Setup Profile</h2>
                <input type="text" placeholder="Full Name *" className="w-full bg-zinc-900 p-5 rounded-2xl border border-white/5 outline-none" onChange={e => setForm({ ...form, name: e.target.value })} required />
                <input type="text" placeholder="Unique Username *" className="w-full bg-zinc-900 p-5 rounded-2xl border border-white/5 outline-none" onChange={e => setForm({ ...form, username: e.target.value })} required />
                <input type="text" placeholder="Phone (Optional)" className="w-full bg-zinc-900 p-5 rounded-2xl border border-white/5 outline-none" onChange={e => setForm({ ...form, phone: e.target.value })} />
                <button className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl">Create Account</button>
            </form>
        </div>
    );
}