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
            <Header title="Detalhes" />
            <main className="page-container">
                {/* Match hero */}
                <div
                    className="rounded-3xl p-8 mb-6 fade-in relative overflow-hidden"
                    style={{
                        background: 'linear-gradient(145deg, #1A1D27 0%, #15171E 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}
                >
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--primary)] opacity-[0.06] rounded-full blur-3xl transform translate-x-10 -translate-y-10 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500 opacity-[0.04] rounded-full blur-2xl transform -translate-x-10 translate-y-10 pointer-events-none"></div>

                    <h2 className="text-3xl font-black text-white drop-shadow-md tracking-tight mb-2">⚽ {match.title}</h2>
                    <p className="font-semibold text-sm mb-6 flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }}></span>
                        {match.isRecurring ? 'Partida de rotina (Semanal)' : 'Partida avulsa'}
                    </p>

                    <div className="grid grid-cols-2 gap-y-5 gap-x-4 text-white text-sm">
                        <div className="flex flex-col">
                            <span className="opacity-50 text-[10px] font-bold tracking-widest uppercase mb-1">Data & Hora</span>
                            <span className="font-medium text-base">{formatDate(match.date)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="opacity-50 text-[10px] font-bold tracking-widest uppercase mb-1">Local</span>
                            <span className="font-medium text-base">{match.location}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="opacity-50 text-[10px] font-bold tracking-widest uppercase mb-1">Custo por Jogador</span>
                            <span className="font-black text-lg" style={{ color: 'var(--primary)' }}>R$ {match.pricePerPlayer.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="opacity-50 text-[10px] font-bold tracking-widest uppercase mb-1">Ocupação</span>
                            <span className="font-medium text-base">{confirmedCount} <span className="opacity-50">/ {match.maxPlayers}</span></span>
                        </div>
                    </div>
                </div>

                {/* Action button */}
                {!isPast && (
                    <div className="mb-6">
                        {isParticipating ? (
                            <button
                                onClick={handleToggleParticipation}
                                disabled={actionLoading}
                                className="btn-danger w-full py-4 text-lg"
                            >
                                {actionLoading ? 'Aguarde...' : '❌ Cancelar Presença'}
                            </button>
                        ) : isFull ? (
                            <div className="card text-center py-5 border-dashed" style={{ borderColor: 'var(--danger-muted)', background: 'rgba(255, 79, 79, 0.05)' }}>
                                <p className="font-bold text-lg" style={{ color: 'var(--danger)' }}>⛔ Partida lotada</p>
                            </div>
                        ) : (
                            <button
                                onClick={handleToggleParticipation}
                                disabled={actionLoading}
                                className="btn-primary w-full py-4 text-lg shadow-lg shadow-[var(--primary)]/20"
                            >
                                {actionLoading ? 'Aguarde...' : '✅ Confirmar Presença'}
                            </button>
                        )}
                    </div>
                )}

                {/* Status badge */}
                <div className="flex flex-wrap gap-2 mb-6">
                    <span className={`badge px-4 py-2 text-sm ${isParticipating ? 'badge-green' : 'badge-yellow'}`}>
                        {isParticipating ? 'Confirmado para o jogo' : 'Pendente de Confirmação'}
                    </span>
                    {isPast && <span className="badge px-4 py-2 text-sm badge-blue">✓ Encerrada</span>}
                    {isFull && !isPast && <span className="badge px-4 py-2 text-sm badge-red">⛔ Esgotada</span>}
                    {isOwner && <span className="badge px-4 py-2 text-sm" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>🛡️ Administrador</span>}
                </div>

                {/* Participants */}
                <div className="card mb-6 shadow-xl relative overflow-hidden">
                    {/* Decorative top border */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-30"></div>

                    <h3 className="font-black mb-6 text-xl tracking-tight" style={{ color: 'var(--text)' }}>
                        👥 Participantes da Partida
                    </h3>

                    {renderParticipantList('confirmed')}
                    {renderParticipantList('declined')}
                </div>

                {/* Financial info */}
                {isOwner && (
                    <div className="card border-[var(--primary)]/30 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)] opacity-[0.05] rounded-full blur-3xl transform translate-x-10 -translate-y-10 pointer-events-none"></div>
                        <h3 className="font-black mb-5 text-xl tracking-tight flex items-center gap-2" style={{ color: 'var(--text)' }}>
                            <span>💰</span> Controle Financeiro
                        </h3>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-base p-3 rounded-xl bg-[var(--bg-elevated)]">
                                <span className="font-medium" style={{ color: 'var(--text-muted)' }}>Valor por jogador</span>
                                <span className="font-bold text-lg" style={{ color: 'var(--text)' }}>R$ {match.pricePerPlayer.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center text-base p-3 rounded-xl bg-[var(--bg-elevated)]">
                                <span className="font-medium" style={{ color: 'var(--text-muted)' }}>Arrecadação Esperada</span>
                                <span className="font-bold text-lg" style={{ color: 'var(--text)' }}>
                                    R$ {(confirmedCount * match.pricePerPlayer).toFixed(2)}
                                </span>
                            </div>

                            <div className="flex justify-between items-center text-base p-4 rounded-xl mt-2 border border-[var(--success-muted)]" style={{ background: 'rgba(0, 208, 156, 0.05)' }}>
                                <span className="font-bold text-[var(--success)] uppercase tracking-wide text-sm">Arrecadação Real (Paga)</span>
                                <span className="font-black text-2xl" style={{ color: 'var(--success)' }}>
                                    R$ {(participantsArray.filter(p => p.status === 'confirmed' && p.paid).length * match.pricePerPlayer).toFixed(2)}
                                </span>
                            </div>
                        </div>
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
            <div className="w-10 h-10 rounded-full border-4 animate-spin"
                style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        </div>
    );
}
