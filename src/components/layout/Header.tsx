'use client';

import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';

export default function Header({ title }: { title?: string }) {
    const { profile } = useAuth();
    return (
        <header
            className="sticky top-0 z-30 flex items-center justify-between px-5 py-4 transition-all duration-300"
            style={{
                background: 'rgba(10, 11, 16, 0.65)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.03)'
            }}
        >
            <div className="flex items-center gap-2">
                <span className="text-xl">⚽</span>
                <span
                    className="font-bold tracking-tight text-lg"
                    style={{ color: 'var(--text)' }}
                >
                    {title ?? 'Futebol Fácil'}
                </span>
            </div>
            <div className="flex items-center gap-3">
                {profile?.photoURL && (
                    <Image
                        src={profile.photoURL}
                        alt={profile.displayName}
                        width={36}
                        height={36}
                        className="rounded-full ring-2 ring-offset-2 ring-offset-[#0A0B10] shadow-md cursor-pointer transition-transform hover:scale-105"
                        style={{ '--tw-ring-color': 'var(--primary)' } as React.CSSProperties}
                        onClick={() => window.location.href = '/perfil'}
                    />
                )}
                {!profile?.photoURL && profile && (
                    <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-md cursor-pointer transition-transform hover:scale-105"
                        style={{ background: 'var(--primary)', color: 'var(--primary-text)' }}
                        onClick={() => window.location.href = '/perfil'}
                    >
                        {profile.displayName?.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>
        </header>
    );
}
