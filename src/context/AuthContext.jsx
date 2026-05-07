import { createContext, useEffect, useState } from "react";
import { auth, googleProvider, db, rtdb } from "../firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { ref, set, serverTimestamp } from "firebase/database";

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

    const login = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const u = result.user;

            await setDoc(doc(db, "users", u.uid), {
                uid: u.uid,
                email: u.email,
                displayName: u.displayName,
                photo: u.photoURL,
                photoURL: u.photoURL,
                lastLogin: new Date()
            }, { merge: true });

        } catch (error) {
            console.error("Login Error:", error);
        }
    };

    // Logout function
    const logout = async () => {
        try {
            if (auth.currentUser) {
                const userStatusRef = ref(rtdb, `/status/${auth.currentUser.uid}`);
                await set(userStatusRef, {
                    state: 'offline',
                    last_changed: serverTimestamp(),
                });
            }

            await signOut(auth);

        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};