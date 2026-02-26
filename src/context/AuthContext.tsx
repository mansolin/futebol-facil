'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserProfile } from '@/lib/firebase/firestore';
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
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                try {
                    const userProfile = await getUserProfile(firebaseUser.uid);
                    setProfile(userProfile);
                } catch {
                    setProfile(null);
                }
            } else {
                setProfile(null);
            }
            setLoading(false);
        });
        return unsubscribe;
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
