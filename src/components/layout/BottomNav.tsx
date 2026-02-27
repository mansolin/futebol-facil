'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [];

function HomeIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
    );
}

function MatchIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="1.5" />
            <path d="M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        </svg>
    );
}

function PayIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V10h16v8zm0-10H4V6h16v2z" />
        </svg>
    );
}

function UserIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
        </svg>
    );
}

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around"
            style={{
                background: 'var(--bg-card)',
                borderTop: '1px solid var(--border)',
                paddingBottom: 'env(safe-area-inset-bottom)',
                height: '4rem',
            }}
        >
            {navItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                    <Link
                        key={href}
                        href={href}
                        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all"
                        style={{
                            color: active ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: active ? 700 : 400,
                            fontSize: '0.65rem',
                        }}
                    >
                        <Icon />
                        <span>{label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
