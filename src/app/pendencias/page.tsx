'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getMatches } from '@/lib/firebase/firestore';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import type { Match } from '@/types';

export default function PendenciasPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [unpaidMatches, setUnpaidMatches] = useState<Match[]>([]);
    const [matchesLoading, setMatchesLoading] = useState(true);

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    const loadPendencias = () => {
        if (!user) return;
        setMatchesLoading(true);
        getMatches().then((allMatches) => {
            const debts = allMatches.filter(m => {
                const userParticipant = m.participants[user.uid];
                return userParticipant?.status === 'confirmed' && !userParticipant?.paid;
            });
            // sort by date descending so newest are first
            setUnpaidMatches(debts.sort((a, b) => b.date.getTime() - a.date.getTime()));
        }).finally(() => setMatchesLoading(false));
    };

    useEffect(() => { loadPendencias(); }, [user]); // eslint-disable-line

    const formatDate = (d: Date) =>
        d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const totalDebt = unpaidMatches.reduce((sum, m) => sum + m.pricePerPlayer, 0);

    return (
        <div style={{ background: '#0A0B10', minHeight: '100dvh' }}>
            <Header title="Pendências" />
            <main className="page-container" style={{ paddingBottom: '100px', paddingTop: 'max(env(safe-area-inset-top), 20px)' }}>
                {/* Summary Card */}
                <div className="bg-[#1A140F] border border-[#332210] rounded-[1.5rem] p-6 mb-6 relative overflow-hidden shadow-[0_10px_30px_rgba(255,138,0,0.1)] fade-in">
                    <div className="absolute top-0 right-[-10%] w-32 h-32 bg-[#FF8A00] opacity-[0.05] rounded-full blur-3xl pointer-events-none"></div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-[#FF8A00]/10 flex items-center justify-center text-[#FF8A00] border border-[#FF8A00]/20 shadow-[0_0_10px_rgba(255,138,0,0.3)]">
                            <span className="text-sm font-black">!</span>
                        </div>
                        <h2 className="text-[12px] font-black tracking-widest text-[#FF8A00] uppercase">Valor em Aberto</h2>
                    </div>
                    <p className="text-4xl font-black mt-2 text-white">
                        R$ {totalDebt.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-white/50 leading-snug mt-2">Corresponde a {unpaidMatches.length} partida(s) não pagas.</p>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black" style={{ color: 'var(--text)' }}>Partidas não pagas</h3>
                </div>

                {matchesLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <div key={i} className="card shimmer h-24 mb-3 rounded-[1.5rem]" />)
                ) : unpaidMatches.length === 0 ? (
                    <div className="card text-center py-10 fade-in border-dashed border-2 rounded-[1.5rem]" style={{ borderColor: 'var(--border)' }}>
                        <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center opacity-30" style={{ background: 'var(--bg-elevated)' }}>
                            <span className="text-2xl">🎉</span>
                        </div>
                        <p className="font-medium" style={{ color: 'var(--text-muted)' }}>Você não tem pendências!</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {unpaidMatches.map((m) => (
                            <Link href={`/partidas/${m.id}`} key={m.id} className="bg-[#0A0D14] border border-[#1A1F2E] rounded-[1rem] p-4 flex flex-col relative overflow-hidden fade-in active:scale-95 transition-transform">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FF8A00] opacity-80"></div>
                                <div className="flex items-start justify-between">
                                    <div className="pl-2">
                                        <h4 className="font-bold text-white uppercase tracking-tight">{m.title}</h4>
                                        <p className="text-xs mt-1 text-white/50 flex items-center gap-1.5">
                                            <span className="text-[10px] opacity-70">📅</span> {formatDate(m.date)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-[#FF8A00] text-lg leading-none">R$ {m.pricePerPlayer.toFixed(2)}</p>
                                        <span className="badge badge-yellow shadow-sm mt-2">Pendente</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
            <BottomNav />
        </div>
    );
}
