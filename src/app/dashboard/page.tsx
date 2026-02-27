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

                {/* Next match section header - Renamed to Meus Jogos */}
                <div className="flex items-center justify-between mb-4 mt-2">
                    <h3 className="text-lg font-black tracking-tight" style={{ color: 'var(--text)' }}>
                        Meus Jogos
                    </h3>
                    <Link href="/partidas/historico" className="text-xs font-bold text-[var(--primary)] uppercase tracking-widest hover:opacity-80 transition-opacity">
                        Ver todos →
                    </Link>
                </div>

                {matchesLoading ? (
                    <div className="card shimmer h-48 mb-6" />
                ) : nextMatch ? (
                    <div className="relative group fade-in mb-6">
                        <Link href={`/partidas/${nextMatch.id}`} className="block">
                            <div
                                className="card h-52 flex flex-col justify-end p-6 relative overflow-hidden transition-transform active:scale-[0.98]"
                                style={{
                                    background: `linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.8) 100%), url(${nextMatch.imageUrl || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000&auto=format&fit=crop'})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}
                            >
                                {/* Badges Row */}
                                <div className="absolute top-4 left-4 flex gap-2">
                                    <span className="badge badge-green !bg-[var(--primary)] !text-[var(--primary-text)] shadow-lg shadow-[var(--primary)]/20">
                                        Próximo Jogo
                                    </span>
                                </div>

                                <div className="absolute top-4 right-4">
                                    <span className={`badge ${isParticipating ? 'badge-green' : 'badge-yellow'}`}>
                                        <span className={`w-2 h-2 rounded-full transform scale-110 mr-1 ${isParticipating ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'}`}></span>
                                        {isParticipating ? 'Confirmado' : 'Pendente'}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="relative z-10">
                                    <div className="flex gap-2 mb-2">
                                        <span className="text-[10px] font-bold py-0.5 px-2 rounded bg-white/10 text-white/70 uppercase tracking-widest backdrop-blur-md">
                                            {nextMatch.isRecurring ? 'Mensal' : 'Avulsa'}
                                        </span>
                                    </div>
                                    <h4 className="text-2xl font-black text-white leading-none tracking-tight mb-4 uppercase">
                                        {nextMatch.title}
                                    </h4>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white/5 backdrop-blur-md rounded-xl p-2.5 border border-white/5">
                                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1">Data e Hora</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">📅</span>
                                                <span className="text-xs font-bold text-white">{formatDate(nextMatch.date).replace(/:00$/, '')}</span>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 backdrop-blur-md rounded-xl p-2.5 border border-white/5">
                                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1">Local</p>
                                            <div className="flex items-center gap-2 text-white">
                                                <span className="text-sm">📍</span>
                                                <span className="text-xs font-bold truncate">{nextMatch.location}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>

                        {/* Change Photo Button - Admin Only */}
                        {profile.role === 'admin' && (
                            <label className="absolute bottom-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer transition-all border border-white/10 group-hover:scale-110 z-20">
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file && nextMatch) {
                                            try {
                                                const { uploadMatchPhoto } = await import('@/lib/firebase/firestore');
                                                await uploadMatchPhoto(nextMatch.id, file);
                                                window.location.reload();
                                            } catch (err) {
                                                alert('Erro ao trocar foto.');
                                            }
                                        }
                                    }}
                                />
                                <span className="text-lg">📷</span>
                            </label>
                        )}
                    </div>
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

                {/* Credits card - Fintech Redesign - Moved below games */}
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
