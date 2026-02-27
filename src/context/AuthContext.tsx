'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import type { UserProfile } from '@/types';

interface AuthContextValue {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    profile: null,
    loading: true,
    isAdmin: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let profileUnsubscribe: () => void;

        const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            
            if (profileUnsubscribe) {
                profileUnsubscribe();
            }

            if (firebaseUser) {
                const profileRef = doc(db, 'users', firebaseUser.uid);
                profileUnsubscribe = onSnapshot(profileRef, (snap) => {
                    if (snap.exists()) {
                        const data = snap.data();
                        setProfile({
                            uid: snap.id,
                            ...data,
                            createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
                        } as UserProfile);
                    } else {
                        setProfile(null);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error listening to profile changes:", error);
                    setProfile(null);
                    setLoading(false);
                });
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => {
            authUnsubscribe();
            if (profileUnsubscribe) {
                profileUnsubscribe();
            }
        };
    }, []);

    const isAdmin = profile?.role === 'admin';

    return (
        <AuthContext.Provider value={{ user, profile, loading, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
