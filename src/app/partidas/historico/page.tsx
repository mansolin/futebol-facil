'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getPastMatchesByUser } from '@/lib/firebase/firestore';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import type { Match } from '@/types';

export default function MatchHistoryPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [history, setHistory] = useState<Match[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    useEffect(() => {
        if (!user) return;
        getPastMatchesByUser(user.uid).then((matches) => {
            setHistory(matches);
            setHistoryLoading(false);
        }).catch(() => setHistoryLoading(false));
    }, [user]);

    if (loading) return <Spinner />;
    if (!user || !profile) return null;

    const formatDate = (d: Date) =>
        d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
            <Header title="Histórico de Jogos" />
            <main className="page-container">
                <div className="mb-6 fade-in flex items-center gap-3">
                    <Link href="/dashboard" className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors">
                        ←
                    </Link>
                    <div>
                        <h2 className="text-2xl font-black" style={{ color: 'var(--text)' }}>
                            Minhas Partidas
                        </h2>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                            Seu histórico de participação
                        </p>
                    </div>
                </div>

                {historyLoading ? (
                    <div className="flex flex-col gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="card shimmer h-24" />
                        ))}
                    </div>
                ) : history.length > 0 ? (
                    <div className="flex flex-col gap-4 mb-8">
                        {history.map((m) => (
                            <Link key={m.id} href={`/partidas/${m.id}`}>
                                <div
                                    className="card p-5 relative overflow-hidden group hover:border-[var(--primary)] transition-all"
                                    style={{ background: 'var(--bg-elevated)' }}
                                >
                                    <div className="flex justify-between items-start relative z-10">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-bold py-0.5 px-2 rounded bg-[var(--success-muted)] text-[var(--success)] uppercase tracking-widest">
                                                    Concluída
                                                </span>
                                                <span className="text-[10px] font-bold py-0.5 px-2 rounded bg-white/5 text-white/50 uppercase tracking-widest">
                                                    {m.isRecurring ? 'Mensal' : 'Avulsa'}
                                                </span>
                                            </div>
                                            <h4 className="text-lg font-black text-white uppercase tracking-tight">
                                                {m.title}
                                            </h4>
                                            <div className="flex items-center gap-3 mt-2 text-white/60">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs">📅</span>
                                                    <span className="text-xs font-medium">{formatDate(m.date).replace(/:00$/, '')}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs">📍</span>
                                                    <span className="text-xs font-medium truncate max-w-[120px]">{m.location}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 text-white opacity-40 group-hover:bg-[var(--primary)] group-hover:text-[var(--primary-text)] group-hover:opacity-100 transition-all">
                                            →
                                        </div>
                                    </div>

                                    {/* Decorator */}
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--success)] opacity-[0.02] rounded-full blur-2xl transform translate-x-12 -translate-y-12"></div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="card text-center py-16 px-6 fade-in">
                        <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-white/5 opacity-40">
                            <span className="text-4xl grayscale">🏃‍♂️</span>
                        </div>
                        <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Nenhuma partida encontrada</h3>
                        <p className="text-sm px-4" style={{ color: 'var(--text-muted)' }}>
                            Você ainda não participou de nenhuma partida concluída no Futebol Fácil.
                        </p>
                        <Link href="/partidas" className="btn-primary mt-8 inline-flex items-center justify-center gap-2">
                            Explorar Partidas ⚽
                        </Link>
                    </div>
                )}
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
