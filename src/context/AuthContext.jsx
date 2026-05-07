import { createContext, useEffect, useState } from "react";
import { auth, googleProvider, db, rtdb } from "../firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp as firestoreTimestamp } from "firebase/firestore"; // 🔥 serverTimestamp import kiya
import { ref, set, serverTimestamp as rtdbTimestamp } from "firebase/database";

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

            // 🔥 FIX: Login ke waqt hi basic data save kar lo taaki app crash na ho
            await setDoc(doc(db, "users", u.uid), {
                uid: u.uid,
                email: u.email,
                name: u.displayName, // 👈 'displayName' ko 'name' mein save kiya taaki Sidebar mein dikhe
                photo: u.photoURL,   // 👈 Gmail ki asli photo
                photoURL: u.photoURL,
                lastLogin: firestoreTimestamp() // 👈 'new Date()' ki jagah Firebase ka timestamp use karna behtar hai
            }, { merge: true });

        } catch (error) {
            console.error("Login Error:", error);
        }
    };

    // Logout function
    const logout = async () => {
        try {
            if (auth.currentUser) {
                // Logout hote hi status ko offline karo
                const userStatusRef = ref(rtdb, `/status/${auth.currentUser.uid}`);
                await set(userStatusRef, {
                    state: 'offline',
                    last_changed: rtdbTimestamp(),
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