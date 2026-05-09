import { createContext, useEffect, useState } from "react";
import { auth, googleProvider, db, rtdb } from "../firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
// 🔥 FIX: getDoc aur updateDoc import kiya
import { doc, setDoc, getDoc, updateDoc, serverTimestamp as firestoreTimestamp } from "firebase/firestore";
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

            const userRef = doc(db, "users", u.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                // 🆕 NAYA USER: Sirf pehli baar database mein entry banegi
                await setDoc(userRef, {
                    uid: u.uid,
                    email: u.email,
                    name: u.displayName, // First time fallback (Onboarding ise change kar dega)
                    photo: u.photoURL,
                    photoURL: u.photoURL,
                    lastLogin: firestoreTimestamp()
                });
            } else {
                // 🔄 PURANA USER: Naam bilkul touch nahi hoga, sirf login time change hoga
                await updateDoc(userRef, {
                    lastLogin: firestoreTimestamp()
                });
            }

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