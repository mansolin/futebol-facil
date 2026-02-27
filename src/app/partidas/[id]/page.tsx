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
            <main className="page-container !pt-0">
                {/* Hero Section with Image */}
                <div className="relative h-64 -mx-5 mb-8">
                    <div
                        className="absolute inset-0 z-0 bg-cover bg-center"
                        style={{
                            backgroundImage: `url(${match.imageUrl || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000&auto=format&fit=crop'})`,
                        }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-transparent opacity-90"></div>
                    </div>

                    <div className="relative z-10 h-full flex flex-col justify-end px-5 pb-4">
                        <div className="flex gap-2 mb-3">
                            <span className="badge badge-green !bg-[var(--primary)] !text-[var(--primary-text)] uppercase text-[10px]">Próximo Jogo</span>
                            <span className="badge bg-white/10 backdrop-blur-md text-white/80 uppercase text-[10px]">
                                {match.isRecurring ? 'Semanal' : 'Evento Único'}
                            </span>
                        </div>
                        <h2 className="text-4xl font-black text-white leading-tight uppercase tracking-tighter">
                            {match.title}
                        </h2>
                    </div>
                </div>

                {/* Info Grid - Modern Glassmorphism Cells */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Data</span>
                        <div className="flex items-center gap-2">
                            <span className="text-base">📅</span>
                            <span className="text-sm font-bold">{formatDate(match.date).split(',')[0]}</span>
                        </div>
                    </div>
                    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Horário</span>
                        <div className="flex items-center gap-2">
                            <span className="text-base">🕒</span>
                            <span className="text-sm font-bold">{match.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Investimento</span>
                        <div className="flex items-center gap-2 text-[var(--primary)]">
                            <span className="text-base">💰</span>
                            <span className="text-sm font-black">R$ {match.pricePerPlayer.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Vagas</span>
                        <div className="flex items-center gap-2">
                            <span className="text-base">👥</span>
                            <span className="text-sm font-bold">{confirmedCount} / {match.maxPlayers}</span>
                        </div>
                    </div>
                </div>

                {/* Location Card */}
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 mb-8 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 block">Onde vai ser</span>
                        <p className="font-bold text-base">{match.location}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-xl">📍</div>
                </div>

                {/* Participant List Header */}
                <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-xl font-black uppercase tracking-tight">Escalação</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--text-muted)]">{confirmedCount} confirmados</span>
                    </div>
                </div>

                {/* Styled Participant List */}
                <div className="space-y-3 mb-24">
                    {participantsArray.filter(p => p.status === 'confirmed').map((p) => {
                        const pProfile = participantProfiles[p.uid];
                        const displayName = p.uid === user?.uid ? (profile?.displayName ?? 'Você') : (pProfile?.displayName ?? 'Jogador');

                        return (
                            <div key={p.uid} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-3 flex items-center justify-between group transition-all hover:border-[var(--primary)]/30">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[var(--bg-elevated)] bg-[var(--bg-elevated)] flex items-center justify-center font-bold text-lg text-[var(--primary)]">
                                            {pProfile?.photoURL ? (
                                                <img src={pProfile.photoURL} alt={displayName} className="w-full h-full object-cover" />
                                            ) : displayName.charAt(0).toUpperCase()}
                                        </div>
                                        {p.paid && (
                                            <div className="absolute -bottom-1 -right-1 bg-[var(--primary)] text-[var(--primary-text)] w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm border-2 border-[var(--bg-card)]">
                                                ✓
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm">{displayName}</span>
                                            {p.uid === user?.uid && (
                                                <span className="text-[8px] bg-white/5 py-0.5 px-1.5 rounded-full text-[var(--text-muted)] font-bold uppercase">Você</span>
                                            )}
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${p.paid ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
                                            {p.paid ? 'Pagamento Confirmado' : 'Aguardando Pagamento'}
                                        </span>
                                    </div>
                                </div>

                                {isOwner && (
                                    <button
                                        onClick={() => handleTogglePayment(p.uid, p.paid)}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${p.paid ? 'bg-[var(--success-muted)] text-[var(--success)] shadow-inner' : 'bg-white/5 text-[var(--text-muted)]'}`}
                                    >
                                        <span className="text-xl">💳</span>
                                    </button>
                                )}
                            </div>
                        );
                    })}

                    {/* Declined Section Header */}
                    {participantsArray.some(p => p.status === 'declined') && (
                        <>
                            <div className="pt-6 mb-4 px-2">
                                <h3 className="text-lg font-black text-[var(--text-muted)] uppercase tracking-tight">Não vai poder ir</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {participantsArray.filter(p => p.status === 'declined').map((p) => {
                                    const pProfile = participantProfiles[p.uid];
                                    const displayName = pProfile?.displayName?.split(' ')[0] ?? 'Jogador';
                                    return (
                                        <div key={p.uid} className="bg-white/5 border border-[var(--border)] rounded-full px-3 py-1.5 flex items-center gap-2 grayscale blur-[0.5px]">
                                            <div className="w-6 h-6 rounded-full overflow-hidden bg-[var(--bg-elevated)] text-[10px] flex items-center justify-center font-bold">
                                                {pProfile?.photoURL ? <img src={pProfile.photoURL} alt={displayName} /> : displayName.charAt(0)}
                                            </div>
                                            <span className="text-xs font-medium text-[var(--text-muted)]">{displayName}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Floating Action Button Bar */}
                {!isPast && (
                    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-[440px] z-30">
                        {isParticipating ? (
                            <button
                                onClick={handleToggleParticipation}
                                disabled={actionLoading}
                                className="w-full bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-3 transition-all active:scale-95"
                            >
                                {actionLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (
                                    <>
                                        <span>❌</span>
                                        <span>Cancelar minha presença</span>
                                    </>
                                )}
                            </button>
                        ) : isFull ? (
                            <div className="w-full bg-[var(--danger-muted)] border border-[var(--danger)]/30 rounded-2xl py-4 text-center">
                                <p className="font-bold text-[var(--danger)]">⛔ Partida esgotada</p>
                            </div>
                        ) : (
                            <button
                                onClick={handleToggleParticipation}
                                disabled={actionLoading}
                                className="w-full bg-[var(--primary)] text-[var(--primary-text)] rounded-2xl py-4 font-black text-lg flex items-center justify-center gap-3 shadow-[0_10px_40px_rgba(0,208,156,0.4)] transition-all hover:scale-[1.02] active:scale-95"
                            >
                                {actionLoading ? <div className="w-5 h-5 border-2 border-[var(--primary-text)]/30 border-t-[var(--primary-text)] rounded-full animate-spin"></div> : (
                                    <>
                                        <span>⚽</span>
                                        <span>EU VOU NESTA!</span>
                                    </>
                                )}
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
