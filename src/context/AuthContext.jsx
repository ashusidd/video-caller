import { createContext, useEffect, useState } from "react";
import { auth, googleProvider } from "../firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const login = () => signInWithPopup(auth, googleProvider);
    const logout = () => signOut(auth);

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};