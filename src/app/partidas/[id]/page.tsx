'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getMatchById, confirmParticipation, declineParticipation, cancelParticipation, togglePaymentStatus, getUsersByIds } from '@/lib/firebase/firestore';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import type { Match } from '@/types';

export default function MatchDetailPage({ params }: { params: { id: string } }) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [match, setMatch] = useState<Match | null>(null);
    const [participantProfiles, setParticipantProfiles] = useState<Record<string, any>>({});
    const [matchLoading, setMatchLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    useEffect(() => {
        const fetchMatchAndUsers = async () => {
            try {
                const m = await getMatchById(params.id);
                setMatch(m);
                if (m && Object.keys(m.participants).length > 0) {
                    const uids = Object.keys(m.participants);
                    const users = await getUsersByIds(uids);

                    const profileMap: Record<string, any> = {};
                    users.forEach(u => { profileMap[u.uid] = u; });
                    setParticipantProfiles(profileMap);
                }
            } catch (error) {
                console.error("Error fetching match:", error);
            } finally {
                setMatchLoading(false);
            }
        };

        fetchMatchAndUsers();
    }, [params.id]);

    if (loading || matchLoading) return <Spinner />;
    if (!match) {
        return (
            <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
                <Header title="Partida" />
                <main className="page-container text-center py-16">
                    <p className="text-4xl mb-3">😕</p>
                    <p style={{ color: 'var(--text-muted)' }}>Partida não encontrada.</p>
                    <button onClick={() => router.push('/partidas')} className="btn-primary mt-4" style={{ maxWidth: 200 }}>
                        Voltar
                    </button>
                </main>
                <BottomNav />
            </div>
        );
    }

    const participantsArray = Object.entries(match.participants).map(([uid, data]) => ({ uid, ...data }));
    const confirmedCount = participantsArray.filter(p => p.status === 'confirmed').length;

    const isParticipating = match.participants[user?.uid ?? '']?.status === 'confirmed';
    const isFull = confirmedCount >= match.maxPlayers;
    const isPast = match.date < new Date() || match.status !== 'upcoming';
    const isOwner = match.createdBy === user?.uid || profile?.role === 'admin';

    const formatDate = (d: Date) =>
        d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    async function handleToggleParticipation(status: 'confirmed' | 'declined' | 'removed') {
        if (!user) return;
        setActionLoading(true);
        try {
            if (status === 'confirmed') {
                await confirmParticipation(match!.id, user.uid);
            } else if (status === 'declined') {
                await declineParticipation(match!.id, user.uid);
            } else {
                await cancelParticipation(match!.id, user.uid);
            }
            // re-fetch match to update UI
            const m = await getMatchById(params.id);
            setMatch(m);
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(false);
        }
    }

    async function handleTogglePayment(uid: string, currentPaidStatus: boolean) {
        if (!isOwner) return;
        try {
            await togglePaymentStatus(match!.id, uid, currentPaidStatus, match!.pricePerPlayer);
            const m = await getMatchById(params.id);
            setMatch(m);
        } catch (e) {
            console.error(e);
            alert("Erro ao alterar status de pagamento.");
        }
    }

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
            <Header title="Detalhes do Jogo" />
            <main className="page-container px-3 pt-6 pb-32">
                {/* Compact Hero Card */}
                <div
                    className="rounded-[1rem] p-4 mb-6 relative overflow-hidden border border-[var(--primary)]/20"
                    style={{
                        background: `linear-gradient(to right, rgba(15, 20, 30, 0.95) 0%, rgba(10, 15, 20, 0.8) 100%), url(${match.imageUrl || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000&auto=format&fit=crop'})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <span className="bg-[var(--primary)] text-black text-[8px] font-black uppercase tracking-widest py-1 px-2.5 rounded-md mb-2 inline-block">
                                Próximo Jogo
                            </span>
                            <h2 className="text-xl font-black text-white italic tracking-wide uppercase mt-1 mb-1" style={{ transform: 'skewX(-5deg)' }}>
                                {match.title}
                            </h2>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[var(--primary)] text-[10px]">📅</span>
                                    <span className="text-[10px] font-bold text-white/80">{formatDate(match.date).replace(/:00$/, '').split(' ').slice(1).join(' ').replace(',', '')}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[var(--primary)] text-[10px]">📍</span>
                                    <span className="text-[10px] font-bold text-white/80">{match.location}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className="border border-[var(--primary)] text-[var(--primary)] text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-[var(--primary)]/10">
                                {confirmedCount}/{match.maxPlayers} Confirmados
                            </span>
                            <button className="border border-white/20 text-white text-[9px] font-black tracking-widest uppercase px-4 py-1.5 rounded-md hover:bg-white/10 transition-colors bg-black/40">
                                Detalhes
                            </button>
                        </div>
                    </div>
                </div>

                {/* Confirmados */}
                {participantsArray.filter(p => p.status === 'confirmed').length > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-[3px] h-4 bg-[var(--primary)]"></div>
                                <h3 className="text-[11px] font-black tracking-widest text-[var(--primary)] uppercase">
                                    Confirmados ({participantsArray.filter(p => p.status === 'confirmed').length})
                                </h3>
                            </div>
                            <div className="flex gap-4 text-[8px] font-black text-white/40 uppercase tracking-widest pr-3">
                                <span>Pago</span>
                            </div>
                        </div>

                        <div className="flex flex-col border border-white/5 rounded-xl overflow-hidden bg-[#0A0D14]">
                            {participantsArray.filter(p => p.status === 'confirmed').map((p, i, arr) => {
                                const pProfile = participantProfiles[p.uid];
                                const displayName = p.uid === user?.uid ? (profile?.displayName ?? 'Você') : (pProfile?.displayName ?? 'Jogador');
                                const isPaid = (pProfile?.credits ?? 0) >= match.pricePerPlayer;

                                return (
                                    <div key={p.uid} className={`flex items-center justify-between p-3.5 ${i < arr.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/5 transition-colors`}>
                                        <div className="flex items-center gap-3">
                                            <img src={pProfile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
                                            <span className="text-[13px] font-bold text-white">{displayName}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div
                                                title={isPaid ? "Pagamento confirmado via créditos" : "Créditos insuficientes"}
                                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isPaid ? 'bg-[var(--primary)] border-[var(--primary)]' : 'bg-transparent border-white/20'}`}
                                            >
                                                {isPaid && <span className="text-black text-sm font-black leading-none">✓</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Pendentes */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-[3px] h-4 bg-yellow-500"></div>
                        <h3 className="text-[11px] font-black tracking-widest text-yellow-500 uppercase">
                            Pendentes
                        </h3>
                    </div>
                    <div className="border border-dashed border-white/10 rounded-xl p-4 text-center text-sm text-white/50 bg-[#0A0D14]/30">
                        <p>Ainda não há jogadores pendentes.</p>
                        <p className="text-xs text-white/30">Jogadores convidados aparecerão aqui.</p>
                    </div>
                </div>

                {/* Recusados */}
                {participantsArray.filter(p => p.status === 'declined').length > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-[3px] h-4 bg-[#EF4444]"></div>
                            <h3 className="text-[11px] font-black tracking-widest text-[#EF4444] uppercase">
                                Recusados ({participantsArray.filter(p => p.status === 'declined').length})
                            </h3>
                        </div>

                        <div className="flex flex-col border border-white/5 rounded-xl overflow-hidden bg-[#0A0D14]/30">
                            {participantsArray.filter(p => p.status === 'declined').map((p, i, arr) => {
                                const pProfile = participantProfiles[p.uid];
                                const displayName = pProfile?.displayName ?? 'Jogador';

                                return (
                                    <div key={p.uid} className={`flex items-center justify-between p-3.5 ${i < arr.length - 1 ? 'border-b border-white/5' : ''} opacity-50 grayscale`}>
                                        <div className="flex items-center gap-3">
                                            <img src={pProfile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
                                            <span className="text-[13px] font-bold text-white line-through">{displayName}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Floating Action Button Bar */}
                {!isPast && (
                    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-[440px] z-30">
                        {isParticipating ? (
                            <button
                                onClick={() => handleToggleParticipation('removed')}
                                disabled={actionLoading}
                                className="w-full bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 text-white rounded-[1rem] py-4 font-bold flex items-center justify-center gap-3 transition-all active:scale-95"
                            >
                                {actionLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (
                                    <>
                                        <span>❌</span>
                                        <span>Cancelar minha presença</span>
                                    </>
                                )}
                            </button>
                        ) : isFull ? (
                            <div className="w-full bg-[var(--danger-muted)] border border-[var(--danger)]/30 rounded-[1rem] py-4 text-center">
                                <p className="font-bold text-[var(--danger)]">⛔ Partida esgotada</p>
                            </div>
                        ) : (
                            <div className="flex gap-2 w-full">
                                <button
                                    onClick={() => handleToggleParticipation('declined')}
                                    disabled={actionLoading}
                                    className="flex-1 bg-white/5 border border-white/10 text-white rounded-[1rem] py-4 font-bold transition-all active:scale-95 flex items-center justify-center"
                                >
                                    {actionLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'NÃO VOU'}
                                </button>
                                <button
                                    onClick={() => handleToggleParticipation('confirmed')}
                                    disabled={actionLoading}
                                    className="flex-[2] bg-[var(--primary)] text-black rounded-[1rem] py-4 font-black transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(0,255,100,0.3)]"
                                >
                                    {actionLoading ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div> : 'EU VOU NESTA!'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </main>
            <div className="h-20"></div> {/* Spacer for floating button */}
            <BottomNav />
        </div>
    );
}

function Spinner() {
    return (
        <div className="flex items-center justify-center h-dvh" style={{ background: 'var(--bg)' }}>
            <div className="w-10 h-10 rounded-full border-4 animate-spin"
                style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        </div>
    );
}
