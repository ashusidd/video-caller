import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Auth() {
    const { login } = useContext(AuthContext);
    return (
        <div className="h-screen bg-black flex flex-col items-center justify-center text-white">
            <h1 className="text-7xl font-black italic uppercase tracking-tighter mb-8">V-CALL.</h1>
            <button onClick={login} className="bg-white text-black px-10 py-4 rounded-2xl font-bold uppercase tracking-widest hover:scale-105 transition-transform">
                Login with Google
            </button>
        </div>
    );
}