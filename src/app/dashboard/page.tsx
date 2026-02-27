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
        <div style={{ background: '#0A0B10', minHeight: '100dvh' }}>
            <main className="page-container" style={{ paddingBottom: '100px', paddingTop: 'env(safe-area-inset-top, 20px)' }}>
                {/* Custom Header */}
                <div className="flex items-center justify-between mb-8 mt-4 fade-in">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary)] to-green-600 flex items-center justify-center shadow-[0_0_15px_rgba(0,255,100,0.3)] border-2 border-[var(--primary)]">
                                {profile.photoURL ? (
                                    <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <span className="text-2xl">📷</span>
                                )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-[var(--primary)] text-black w-5 h-5 rounded-full flex items-center justify-center text-xs font-black border border-black shadow-sm">+</div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-0.5">Atleta</p>
                            <h2 className="text-xl font-black text-white leading-none">{profile.displayName?.split(' ')[0]} {profile.displayName?.split(' ')[1] || ''}</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 cursor-pointer group active:scale-95 transition-all">
                        <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-wider group-hover:opacity-80">Novo Avulso</span>
                        <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-black flex items-center justify-center font-black text-sm shadow-[0_0_10px_rgba(0,255,100,0.3)]">
                            +
                        </div>
                    </div>
                </div>

                {/* Section Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-black italic tracking-wider text-white uppercase" style={{ transform: 'skewX(-5deg)' }}>
                        Meus Jogos
                    </h3>
                    <Link href="/partidas/historico" className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest hover:opacity-80 transition-opacity flex items-center gap-1">
                        Ver Todos <span className="text-sm">→</span>
                    </Link>
                </div>

                {matchesLoading ? (
                    <div className="card shimmer h-48 mb-6 rounded-[1.5rem]" />
                ) : nextMatch ? (
                    <div className="relative group fade-in mb-6">
                        <Link href={`/partidas/${nextMatch.id}`} className="block">
                            <div
                                className="rounded-[1.5rem] flex flex-col justify-between p-5 relative overflow-hidden transition-transform active:scale-[0.98] border border-[var(--primary)]/30"
                                style={{
                                    background: `linear-gradient(to right, rgba(20, 40, 20, 0.95) 0%, rgba(10, 20, 10, 0.8) 100%), url(${nextMatch.imageUrl || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000&auto=format&fit=crop'})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    minHeight: '200px',
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0, 255, 100, 0.2)'
                                }}
                            >
                                {/* Glowing Top Tag */}
                                <div className="self-start mb-auto z-10">
                                    <span className="bg-[var(--primary)] text-black text-[10px] font-black uppercase tracking-widest py-1.5 px-3 rounded-full shadow-[0_0_15px_rgba(0,255,100,0.5)]">
                                        Próximo Jogo
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="relative z-10 mt-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[9px] font-black py-0.5 px-2 rounded-md bg-white/10 text-white/50 uppercase tracking-widest">
                                            {nextMatch.isRecurring ? 'Mensal' : 'Avulso'}
                                        </span>
                                        <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${isParticipating ? 'text-[var(--primary)]' : 'text-[var(--warning)]'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${isParticipating ? 'bg-[var(--success)] shadow-[0_0_8px_rgba(0,255,100,0.8)]' : 'bg-[var(--warning)]'}`}></span>
                                            {isParticipating ? 'Confirmado' : 'Pendente'}
                                        </span>
                                    </div>
                                    <h4 className="text-[22px] font-black text-white leading-none tracking-tight mb-4 uppercase">
                                        {nextMatch.title}
                                    </h4>

                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-black/40 backdrop-blur-md rounded-[0.8rem] p-2.5 border border-white/5">
                                            <p className="text-[7px] font-black text-white/40 uppercase tracking-widest mb-0.5">Data e Hora</p>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] text-[var(--primary)] opacity-80">📅</span>
                                                <span className="text-[11px] font-bold text-white tracking-wide">{formatDate(nextMatch.date).replace(/:00$/, '').split(' ').slice(1).join(' ').replace(',',' •')}</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 bg-black/40 backdrop-blur-md rounded-[0.8rem] p-2.5 border border-white/5">
                                            <p className="text-[7px] font-black text-white/40 uppercase tracking-widest mb-0.5">Local</p>
                                            <div className="flex items-center gap-1.5 text-white">
                                                <span className="text-[10px] text-[var(--primary)] opacity-80">📍</span>
                                                <span className="text-[11px] font-bold truncate tracking-wide">{nextMatch.location}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </div>
                ) : (
                    <div className="card mb-6 text-center py-10 fade-in border-dashed border-2 rounded-[1.5rem]" style={{ borderColor: 'var(--border)' }}>
                        <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center opacity-30" style={{ background: 'var(--bg-elevated)' }}>
                            <span className="text-2xl">🏟️</span>
                        </div>
                        <p className="font-medium" style={{ color: 'var(--text-muted)' }}>Nenhum jogo agendado.</p>
                        <Link href="/partidas" className="text-sm font-bold mt-4 inline-block btn-secondary" style={{ width: 'auto' }}>
                            Criar uma partida →
                        </Link>
                    </div>
                )}

                {/* Smart Payment Card */}
                <div className="bg-[#0A0D14] border border-[#1A1F2E] rounded-[1.5rem] p-5 mb-4 shadow-[0_10px_30px_rgba(0,0,0,0.6)] relative overflow-hidden">
                    {/* Background glow effects */}
                    <div className="absolute top-0 right-[-10%] w-32 h-32 bg-[var(--primary)] opacity-[0.05] rounded-full blur-3xl pointer-events-none"></div>

                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-[var(--primary)] text-base">✨</span>
                        <h3 className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.15em]">Pagamento Inteligente</h3>
                    </div>
                    
                    <p className="text-[10px] font-medium text-[#8A93A6] leading-relaxed mb-5 pr-4">
                        Nossa IA identifica o comprovante, confirma o destinatário e credita seu saldo instantaneamente.
                    </p>

                    <button className="w-full bg-gradient-to-r from-[var(--primary)] to-[#25B5D6] text-black font-black text-[10px] uppercase tracking-widest py-3.5 px-4 rounded-[1rem] flex items-center justify-between transition-all active:scale-[0.98] shadow-[0_8px_20px_rgba(0,255,100,0.2)]">
                        <div className="flex items-center gap-2">
                            <span className="text-base">📷</span>
                            <span>Lançar Comprovante (IA)</span>
                        </div>
                        <div className="flex items-center opacity-60">
                            <span className="text-[10px] font-black tracking-tighter">♦_♦RK</span>
                        </div>
                    </button>
                </div>

                {/* Bottom 2 Cards Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    {/* Pendencias Card */}
                    <Link href="/pendencias" className="bg-[#1A140F] border border-[#332210] rounded-[1.5rem] p-4 flex flex-col justify-between relative overflow-hidden active:scale-95 transition-transform h-28">
                        <div className="absolute -top-2 -right-2 text-[#FF8A00] opacity-10 text-5xl font-black">!</div>
                        <div className="w-7 h-7 rounded-full bg-[#FF8A00]/10 flex items-center justify-center text-[#FF8A00] mb-2 border border-[#FF8A00]/20">
                            <span className="text-sm font-black">!</span>
                        </div>
                        <div>
                            <h4 className="text-[9px] font-black text-[#FF8A00] uppercase tracking-widest mb-1">Pendências</h4>
                            <p className="text-[9px] text-white/50 leading-snug">Você possui pendências em aberto</p>
                        </div>
                    </Link>

                    {/* Creditos Card */}
                    <Link href="/pagamentos" className="bg-[#0F141A] border border-[#102233] rounded-[1.5rem] p-4 flex flex-col justify-between relative overflow-hidden active:scale-95 transition-transform h-28">
                        <div className="absolute -top-2 -right-0 text-[#3B82F6] opacity-10 text-5xl">💰</div>
                        <div className="w-7 h-7 rounded-full bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6] mb-2 border border-[#3B82F6]/20">
                            <span className="text-sm">💳</span>
                        </div>
                        <div>
                            <h4 className="text-[9px] font-black text-[#3B82F6] uppercase tracking-widest mb-1">Créditos</h4>
                            <p className="text-[9px] text-white/50 leading-snug">
                                R$ <span className="text-white font-bold text-sm">{(profile.credits ?? 0).toFixed(2)}</span> disponíveis
                            </p>
                        </div>
                    </Link>
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
