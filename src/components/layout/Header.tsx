'use client';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Image from 'next/image';

export default function Header({ title }: { title?: string }) {
    const { profile } = useAuth();
    const { theme, toggleTheme } = useTheme();

    return (
        <header
            className="sticky top-0 z-30 flex items-center justify-between px-4 py-3"
            style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}
        >
            <div className="flex items-center gap-2">
                <span className="text-2xl">⚽</span>
                <span
                    className="font-black tracking-tight text-lg"
                    style={{ color: 'var(--primary)' }}
                >
                    {title ?? 'FUTEBOL FÁCIL'}
                </span>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={toggleTheme}
                    className="rounded-full p-2 transition-colors"
                    style={{ background: 'var(--bg-elevated)' }}
                    aria-label="Alternar tema"
                >
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                {profile?.photoURL && (
                    <Image
                        src={profile.photoURL}
                        alt={profile.displayName}
                        width={32}
                        height={32}
                        className="rounded-full ring-2"
                        style={{ ringColor: 'var(--primary)' }}
                    />
                )}
                {!profile?.photoURL && profile && (
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ background: 'var(--primary)', color: 'var(--primary-text)' }}
                    >
                        {profile.displayName?.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>
        </header>
    );
}
