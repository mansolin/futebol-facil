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
            const mine = upcoming.filter((m) => m.participants[user.uid]?.status === 'confirmed');
            setNextMatch(upcoming[0] ?? null);
            setMyMatches(mine.slice(0, 3));
            setMatchesLoading(false);
        }).catch(() => setMatchesLoading(false));
    }, [user]);

    if (loading) return <Spinner />;
    if (!user || !profile) return null;

    const formatDate = (d: Date) =>
        d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

    const isParticipating = nextMatch?.participants[user.uid]?.status === 'confirmed';

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
            <Header />
            <main className="page-container">
                {/* Greeting */}
                <div className="mb-6 fade-in">
                    <p className="text-sm font-medium tracking-wide" style={{ color: 'var(--text-muted)' }}>Membro desde hoje</p>
                    <h2 className="text-3xl font-black mt-1" style={{ color: 'var(--text)' }}>
                        Olá, {profile.displayName?.split(' ')[0]} 👋
                    </h2>
                </div>

                {/* Credits card - Fintech Redesign */}
                <div
                    className="rounded-3xl p-6 mb-6 fade-in relative overflow-hidden"
                    style={{
                        background: 'linear-gradient(145deg, #1A1D27 0%, #15171E 100%)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}
                >
                    {/* Abstract shapes inside the credit card */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)] opacity-[0.08] rounded-full blur-3xl transform translate-x-10 -translate-y-10 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500 opacity-[0.05] rounded-full blur-2xl transform -translate-x-5 translate-y-5 pointer-events-none"></div>

                    <p className="text-sm opacity-60 font-medium tracking-wider uppercase">Saldo Atual</p>
                    <p className="text-5xl font-black mt-2 mb-4 tracking-tight">
                        <span className="text-2xl mr-1 opacity-80 font-semibold" style={{ color: 'var(--primary)' }}>R$</span>
                        {(profile.credits ?? 0).toFixed(2)}
                    </p>
                    <div className="flex gap-3 mt-4">
                        <Link
                            href="/pagamentos"
                            className="text-sm flex-1 text-center font-bold py-3 px-4 rounded-xl transition-all"
                            style={{ background: 'var(--primary)', color: 'var(--primary-text)' }}
                        >
                            + Adicionar
                        </Link>
                        <Link
                            href="/pagamentos"
                            className="text-sm flex-1 text-center font-bold py-3 px-4 rounded-xl transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                            📊 Histórico
                        </Link>
                    </div>
                </div>

                {/* Next match */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black tracking-tight" style={{ color: 'var(--text)' }}>
                        Próximo Jogo
                    </h3>
                </div>
                {matchesLoading ? (
                    <div className="card shimmer h-32" />
                ) : nextMatch ? (
                    <Link href={`/partidas/${nextMatch.id}`}>
                        <div className="card mb-6 fade-in cursor-pointer relative overflow-hidden group">
                            {/* Add subtle side border accent to cards */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[var(--primary)] to-transparent opacity-50"></div>

                            <div className="flex items-start justify-between">
                                <div className="flex-1 pl-2">
                                    <h4 className="font-bold text-lg" style={{ color: 'var(--text)' }}>
                                        {nextMatch.title}
                                    </h4>
                                    <p className="text-sm mt-1.5 font-medium flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                                        <span className="opacity-70">📅</span> {formatDate(nextMatch.date)}
                                    </p>
                                    <p className="text-sm mt-1 font-medium flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                                        <span className="opacity-70">📍</span> {nextMatch.location}
                                    </p>
                                    <p className="text-sm mt-1 font-medium flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                                        <span className="opacity-70">👥</span> {Object.keys(nextMatch.participants).length}/{nextMatch.maxPlayers} jogadores
                                    </p>
                                </div>
                                <span className={`badge ${isParticipating ? 'badge-green' : 'badge-yellow'} shadow-sm`}>
                                    {isParticipating ? 'Confirmado' : 'Pendente'}
                                </span>
                            </div>
                            <div className="mt-4 pt-4 ml-2 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
                                <p className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
                                    R$ {nextMatch.pricePerPlayer.toFixed(2)}/jogador
                                </p>
                                <span className="text-xs font-bold uppercase tracking-wider opacity-50 group-hover:opacity-100 transition-opacity">Detalhes →</span>
                            </div>
                        </div>
                    </Link>
                ) : (
                    <div className="card mb-6 text-center py-10 fade-in border-dashed border-2" style={{ borderColor: 'var(--border)' }}>
                        <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center opacity-30" style={{ background: 'var(--bg-elevated)' }}>
                            <span className="text-2xl">🏟️</span>
                        </div>
                        <p className="font-medium" style={{ color: 'var(--text-muted)' }}>Nenhum jogo agendado.</p>
                        <Link href="/partidas" className="text-sm font-bold mt-4 inline-block btn-secondary" style={{ width: 'auto' }}>
                            Criar uma partida →
                        </Link>
                    </div>
                )}

                {/* My confirmed matches */}
                {myMatches.length > 0 && (
                    <>
                        <h3 className="text-lg font-black tracking-tight mb-4" style={{ color: 'var(--text)' }}>
                            Meus Jogos
                        </h3>
                        <div className="flex flex-col gap-3 mb-6">
                            {myMatches.map((m) => (
                                <Link key={m.id} href={`/partidas/${m.id}`}>
                                    <div className="card flex items-center justify-between fade-in py-4 px-5">
                                        <div>
                                            <p className="font-bold text-base" style={{ color: 'var(--text)' }}>
                                                {m.title}
                                            </p>
                                            <p className="text-sm mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>
                                                {formatDate(m.date)}
                                            </p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--success-muted)', color: 'var(--success)' }}>
                                            ✓
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </>
                )}

                {/* Quick actions */}
                <h3 className="text-lg font-black tracking-tight mb-4" style={{ color: 'var(--text)' }}>
                    Ações Rápidas
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { href: '/partidas', emoji: '📅', label: 'Ver Partidas' },
                        { href: '/pagamentos', emoji: '💳', label: 'Pagamentos' },
                        { href: '/perfil', emoji: '👤', label: 'Meu Perfil' },
                        ...(profile.role === 'admin' ? [{ href: '/admin', emoji: '🛡️', label: 'Admin' }] : []),
                    ].map(({ href, emoji, label }) => (
                        <Link
                            key={href}
                            href={href}
                            className="card flex flex-col items-center justify-center gap-3 py-6 cursor-pointer hover:-translate-y-1 transition-transform"
                        >
                            <span className="text-3xl opacity-80">{emoji}</span>
                            <span className="text-sm font-bold tracking-wide" style={{ color: 'var(--text)' }}>{label}</span>
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
