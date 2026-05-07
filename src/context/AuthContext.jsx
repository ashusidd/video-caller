import { createContext, useEffect, useState } from "react";
import { auth, googleProvider, db } from "../firebase"; // 'db' import karein
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore"; // Firestore functions import karein

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

    // Login logic ko update karein
    const login = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const u = result.user;

            // Yeh hai woh "A" wala logic:
            // Naye user ka document banayega agar exist nahi karta
            await setDoc(doc(db, "users", u.uid), {
                uid: u.uid,
                email: u.email,
                displayName: u.displayName,
                photo: u.photoURL,
                photoURL: u.photoURL,
                lastLogin: new Date()
            }, { merge: true }); // { merge: true } zaroori hai

        } catch (error) {
            console.error("Login Error:", error);
        }
    };

    const logout = () => signOut(auth);

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};