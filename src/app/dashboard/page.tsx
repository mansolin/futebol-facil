'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getMatches } from '@/lib/firebase/firestore';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import type { Match } from '@/types';

export default function DashboardPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [nextMatch, setNextMatch] = useState<Match | null>(null);
    const [myMatches, setMyMatches] = useState<Match[]>([]);
    const [matchesLoading, setMatchesLoading] = useState(true);

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    useEffect(() => {
        if (!user) return;
        getMatches().then((matches) => {
            const now = new Date();
            const upcoming = matches.filter(
                (m) => m.status === 'upcoming' && m.date >= now
            );
            const mine = upcoming.filter((m) => m.participants.includes(user.uid));
            setNextMatch(upcoming[0] ?? null);
            setMyMatches(mine.slice(0, 3));
            setMatchesLoading(false);
        }).catch(() => setMatchesLoading(false));
    }, [user]);

    if (loading) return <Spinner />;
    if (!user || !profile) return null;

    const formatDate = (d: Date) =>
        d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

    const isParticipating = nextMatch?.participants.includes(user.uid);

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
            <Header />
            <main className="page-container">
                {/* Greeting */}
                <div className="mb-6 fade-in">
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Olá,</p>
                    <h2 className="text-2xl font-black" style={{ color: 'var(--text)' }}>
                        {profile.displayName?.split(' ')[0]} 👋
                    </h2>
                </div>

                {/* Credits card */}
                <div
                    className="rounded-2xl p-5 mb-4 fade-in"
                    style={{
                        background: 'linear-gradient(135deg, var(--primary), #15803d)',
                        color: 'white',
                    }}
                >
                    <p className="text-sm opacity-80 font-medium">Créditos disponíveis</p>
                    <p className="text-4xl font-black mt-1">
                        R$ {(profile.credits ?? 0).toFixed(2)}
                    </p>
                    <div className="flex gap-2 mt-3">
                        <Link
                            href="/pagamentos"
                            className="text-xs font-semibold py-1.5 px-3 rounded-full"
                            style={{ background: 'rgba(255,255,255,0.2)' }}
                        >
                            💳 Adicionar
                        </Link>
                        <Link
                            href="/pagamentos"
                            className="text-xs font-semibold py-1.5 px-3 rounded-full"
                            style={{ background: 'rgba(255,255,255,0.2)' }}
                        >
                            📊 Histórico
                        </Link>
                    </div>
                </div>

                {/* Next match */}
                <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text)' }}>
                    Próximo Jogo
                </h3>
                {matchesLoading ? (
                    <div className="card shimmer h-32" />
                ) : nextMatch ? (
                    <Link href={`/partidas/${nextMatch.id}`}>
                        <div className="card mb-4 fade-in cursor-pointer">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h4 className="font-bold text-base" style={{ color: 'var(--text)' }}>
                                        ⚽ {nextMatch.title}
                                    </h4>
                                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                                        📅 {formatDate(nextMatch.date)}
                                    </p>
                                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                        📍 {nextMatch.location}
                                    </p>
                                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                        👥 {nextMatch.participants.length}/{nextMatch.maxPlayers} jogadores
                                    </p>
                                </div>
                                <span className={`badge ${isParticipating ? 'badge-green' : 'badge-yellow'}`}>
                                    {isParticipating ? '✅ Confirmado' : '⏳ Pendente'}
                                </span>
                            </div>
                            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                                <p className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                                    💰 R$ {nextMatch.pricePerPlayer.toFixed(2)}/jogador — Toque para ver detalhes →
                                </p>
                            </div>
                        </div>
                    </Link>
                ) : (
                    <div className="card mb-4 text-center py-8 fade-in">
                        <p className="text-4xl mb-2">🏟️</p>
                        <p style={{ color: 'var(--text-muted)' }}>Nenhum jogo agendado.</p>
                        <Link href="/partidas" className="text-sm font-semibold mt-2 inline-block"
                            style={{ color: 'var(--primary)' }}>
                            Criar uma partida →
                        </Link>
                    </div>
                )}

                {/* My confirmed matches */}
                {myMatches.length > 0 && (
                    <>
                        <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text)' }}>
                            Meus Jogos
                        </h3>
                        <div className="flex flex-col gap-2 mb-4">
                            {myMatches.map((m) => (
                                <Link key={m.id} href={`/partidas/${m.id}`}>
                                    <div className="card flex items-center justify-between fade-in">
                                        <div>
                                            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                                                ⚽ {m.title}
                                            </p>
                                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                                {formatDate(m.date)}
                                            </p>
                                        </div>
                                        <span className="badge badge-green">✅</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </>
                )}

                {/* Quick actions */}
                <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text)' }}>
                    Ações Rápidas
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { href: '/partidas', emoji: '📅', label: 'Ver Partidas' },
                        { href: '/pagamentos', emoji: '💳', label: 'Pagamentos' },
                        { href: '/perfil', emoji: '👤', label: 'Meu Perfil' },
                        ...(profile.role === 'admin' ? [{ href: '/admin', emoji: '🛡️', label: 'Admin' }] : []),
                    ].map(({ href, emoji, label }) => (
                        <Link
                            key={href}
                            href={href}
                            className="card flex flex-col items-center justify-center gap-2 py-5 cursor-pointer"
                        >
                            <span className="text-3xl">{emoji}</span>
                            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{label}</span>
                        </Link>
                    ))}
                </div>
            </main>
            <BottomNav />
        </div>
    );
}

function Spinner() {
    return (
        <div className="flex items-center justify-center h-dvh" style={{ background: 'var(--bg)' }}>
            <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        </div>
    );
}
