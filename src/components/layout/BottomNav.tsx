'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function HomeIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
    );
}

const navItems = [
    { href: '/dashboard', label: 'Início', icon: HomeIcon },
];

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
