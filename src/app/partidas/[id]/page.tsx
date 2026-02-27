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

    async function handleToggleParticipation() {
        if (!user) return;
        setActionLoading(true);
        try {
            if (isParticipating) {
                await cancelParticipation(match!.id, user.uid);
            } else {
                await confirmParticipation(match!.id, user.uid);
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

    const renderParticipantList = (statusFilter: 'confirmed' | 'declined' | 'pending') => {
        let title = '';
        let list = participantsArray.filter(p => p.status === statusFilter);

        // Hacky pending logic: users who are not confirmed and not declined.
        // In a real app, you might have invited users stored somewhere else or just default all app users.
        // For simplicity from previous versions, we will only show those explicitly confirming or declining.
        // We will adapt pending to just be empty for now since we don't have an invite list yet.

        if (statusFilter === 'confirmed') title = '✅ Confirmados';
        if (statusFilter === 'declined') title = '❌ Recusados';
        if (statusFilter === 'pending') title = '⏳ Pendentes';

        if (list.length === 0 && statusFilter !== 'confirmed') return null;

        return (
            <div className="mb-4">
                <h4 className="font-bold text-sm mb-2" style={{ color: 'var(--text-muted)' }}>{title} ({list.length})</h4>
                {list.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum jogador.</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {list.map((p) => {
                            const pProfile = participantProfiles[p.uid];
                            const displayName = p.uid === user?.uid ? (profile?.displayName ?? 'Você') : (pProfile?.displayName ?? 'Jogador');
                            const initial = displayName.charAt(0).toUpperCase();

                            return (
                                <div key={p.uid} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--card-bg)' }}>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm"
                                            style={{ background: 'var(--primary)', color: 'var(--primary-text)' }}
                                        >
                                            {pProfile?.photoURL ? (
                                                <img src={pProfile.photoURL} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
                                            ) : initial}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                                                {displayName}
                                                {p.uid === user?.uid && <span className="badge badge-green text-[10px] ml-2 px-1">Você</span>}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {statusFilter === 'confirmed' && (
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={p.paid}
                                                    onChange={() => handleTogglePayment(p.uid, p.paid)}
                                                    disabled={!isOwner}
                                                    className="w-4 h-4 rounded"
                                                    style={{ accentColor: 'var(--primary)', pointerEvents: isOwner ? 'auto' : 'none', opacity: isOwner ? 1 : 0.6 }}
                                                />
                                                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                                                    {p.paid ? 'Pago' : 'Pagar'}
                                                </span>
                                            </label>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

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
                                <span>Comprovante</span>
                                <span>Pago</span>
                            </div>
                        </div>

                        <div className="flex flex-col border border-white/5 rounded-xl overflow-hidden bg-[#0A0D14]">
                            {participantsArray.filter(p => p.status === 'confirmed').map((p, i, arr) => {
                                const pProfile = participantProfiles[p.uid];
                                const displayName = p.uid === user?.uid ? (profile?.displayName ?? 'Você') : (pProfile?.displayName ?? 'Jogador');

                                return (
                                    <div key={p.uid} className={`flex items-center justify-between p-3.5 ${i < arr.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/5 transition-colors`}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-full bg-[var(--primary)] text-black flex items-center justify-center text-[10px] shadow-[0_0_8px_rgba(0,255,100,0.4)]">✓</div>
                                            <span className="text-[13px] font-bold text-white">{displayName}</span>
                                        </div>
                                        <div className="flex items-center gap-7 pr-3">
                                            <span className="text-[var(--primary)] text-base opacity-80 cursor-pointer hover:opacity-100 transition-opacity">🧾</span>
                                            <div
                                                onClick={() => handleTogglePayment(p.uid, p.paid)}
                                                className={`w-[18px] h-[18px] rounded-[4px] border border-white/20 flex items-center justify-center cursor-pointer transition-all ${p.paid ? 'bg-[var(--primary)] border-[var(--primary)]' : 'bg-transparent hover:border-white/40'} ${isOwner ? '' : 'pointer-events-none opacity-80'}`}
                                            >
                                                {p.paid && <span className="text-black text-[12px] font-black leading-none pt-0.5">✓</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Aguardando Resposta */}
                {participantsArray.filter(p => p.status === 'pending').length > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-[3px] h-4 bg-[#8A93A6]"></div>
                            <h3 className="text-[11px] font-black tracking-widest text-[#8A93A6] uppercase">
                                Aguardando Resposta ({participantsArray.filter(p => p.status === 'pending').length})
                            </h3>
                        </div>

                        <div className="flex flex-col border border-white/5 rounded-xl overflow-hidden bg-[#0A0D14]/50">
                            {participantsArray.filter(p => p.status === 'pending').map((p, i, arr) => {
                                const pProfile = participantProfiles[p.uid];
                                const displayName = pProfile?.displayName ?? 'Jogador';

                                return (
                                    <div key={p.uid} className={`flex items-center justify-between p-3.5 ${i < arr.length - 1 ? 'border-b border-white/5' : ''} opacity-60`}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-full bg-[#8A93A6]/20 text-[#8A93A6] flex items-center justify-center text-[10px]">🕒</div>
                                            <span className="text-[13px] font-bold text-white">{displayName}</span>
                                        </div>
                                        <div className="flex items-center gap-7 pr-3">
                                            <span className="text-[#8A93A6] text-base opacity-40">🧾</span>
                                            <div className="w-[18px] h-[18px] rounded-[4px] border border-white/10 bg-transparent opacity-40"></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

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
                                            <div className="w-4 h-4 rounded-full bg-[#EF4444] text-white flex items-center justify-center text-[8px] font-black">X</div>
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
                                onClick={handleToggleParticipation}
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
                            <button
                                onClick={handleToggleParticipation}
                                disabled={actionLoading}
                                className="w-full bg-[var(--primary)] text-black rounded-[1rem] py-4 font-black transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(0,255,100,0.3)]"
                            >
                                {actionLoading ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div> : 'EU VOU NESTA!'}
                            </button>
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
