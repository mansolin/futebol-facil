'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getMatchById, confirmParticipation, cancelParticipation } from '@/lib/firebase/firestore';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import type { Match } from '@/types';

export default function MatchDetailPage({ params }: { params: { id: string } }) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [match, setMatch] = useState<Match | null>(null);
    const [matchLoading, setMatchLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    useEffect(() => {
        getMatchById(params.id)
            .then(setMatch)
            .finally(() => setMatchLoading(false));
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

    const isParticipating = match.participants.includes(user?.uid ?? '');
    const isFull = match.participants.length >= match.maxPlayers;
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
            setMatch(await getMatchById(params.id));
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(false);
        }
    }

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
            <Header title="Detalhes" />
            <main className="page-container">
                {/* Match hero */}
                <div
                    className="rounded-2xl p-6 mb-4 fade-in"
                    style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
                >
                    <h2 className="text-2xl font-black text-white">⚽ {match.title}</h2>
                    <p className="text-white/80 text-sm mt-1">
                        {match.isRecurring ? '🔁 Partida semanal' : '🗓️ Partida avulsa'}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-white text-sm">
                        <div><span className="opacity-60 block text-xs">DATA</span>{formatDate(match.date)}</div>
                        <div><span className="opacity-60 block text-xs">LOCAL</span>{match.location}</div>
                        <div><span className="opacity-60 block text-xs">VALOR</span>R$ {match.pricePerPlayer.toFixed(2)}</div>
                        <div><span className="opacity-60 block text-xs">JOGADORES</span>{match.participants.length}/{match.maxPlayers}</div>
                    </div>
                </div>

                {/* Action button */}
                {!isPast && (
                    <div className="mb-4">
                        {isParticipating ? (
                            <button
                                onClick={handleToggleParticipation}
                                disabled={actionLoading}
                                className="btn-danger"
                            >
                                {actionLoading ? 'Aguarde...' : '❌ Cancelar Presença'}
                            </button>
                        ) : isFull ? (
                            <div className="card text-center py-4">
                                <p style={{ color: 'var(--text-muted)' }}>⛔ Partida lotada</p>
                            </div>
                        ) : (
                            <button
                                onClick={handleToggleParticipation}
                                disabled={actionLoading}
                                className="btn-primary"
                            >
                                {actionLoading ? 'Aguarde...' : '✅ Confirmar Presença'}
                            </button>
                        )}
                    </div>
                )}

                {/* Status badge */}
                <div className="flex gap-2 mb-4">
                    <span className={`badge ${isParticipating ? 'badge-green' : 'badge-yellow'}`}>
                        {isParticipating ? '✅ Confirmado' : '⏳ Não confirmado'}
                    </span>
                    {isPast && <span className="badge badge-blue">✓ Encerrada</span>}
                    {isFull && !isPast && <span className="badge badge-red">⛔ Lotado</span>}
                    {isOwner && <span className="badge badge-blue">🛡️ Admin</span>}
                </div>

                {/* Participants */}
                <div className="card mb-4">
                    <h3 className="font-bold mb-3" style={{ color: 'var(--text)' }}>
                        👥 Participantes ({match.participants.length}/{match.maxPlayers})
                    </h3>
                    {match.participants.length === 0 ? (
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum jogador confirmado ainda.</p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {match.participants.map((uid) => (
                                <div key={uid} className="flex items-center gap-2">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                                        style={{ background: 'var(--primary)', color: 'var(--primary-text)' }}
                                    >
                                        {uid === user?.uid ? profile?.displayName?.charAt(0) ?? '?' : '?'}
                                    </div>
                                    <span className="text-sm" style={{ color: 'var(--text)' }}>
                                        {uid === user?.uid ? profile?.displayName ?? 'Você' : `Jogador`}
                                    </span>
                                    {uid === user?.uid && <span className="badge badge-green text-xs">Você</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Financial info */}
                <div className="card">
                    <h3 className="font-bold mb-2" style={{ color: 'var(--text)' }}>💰 Financeiro</h3>
                    <div className="flex justify-between text-sm">
                        <span style={{ color: 'var(--text-muted)' }}>Valor por jogador</span>
                        <span className="font-bold" style={{ color: 'var(--text)' }}>R$ {match.pricePerPlayer.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span style={{ color: 'var(--text-muted)' }}>Total arrecadado (estimado)</span>
                        <span className="font-bold" style={{ color: 'var(--primary)' }}>
                            R$ {(match.participants.length * match.pricePerPlayer).toFixed(2)}
                        </span>
                    </div>
                </div>
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
