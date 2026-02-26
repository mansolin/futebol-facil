'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getMatches, createMatch } from '@/lib/firebase/firestore';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import type { Match } from '@/types';

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function PartidasPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [matches, setMatches] = useState<Match[]>([]);
    const [matchesLoading, setMatchesLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    const loadMatches = () => {
        if (!user) return;
        setMatchesLoading(true);
        getMatches().then(setMatches).finally(() => setMatchesLoading(false));
    };

    useEffect(() => { loadMatches(); }, [user]); // eslint-disable-line

    const now = new Date();
    const upcoming = matches.filter((m) => m.status === 'upcoming' && m.date >= now);
    const past = matches.filter((m) => m.status === 'completed' || m.date < now);

    const formatDate = (d: Date) =>
        d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
            <Header title="Partidas" />
            <main className="page-container">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>Partidas</h2>
                    <button
                        onClick={() => setShowModal(true)}
                        className="btn-primary"
                        style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    >
                        + Criar
                    </button>
                </div>

                <h3 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Próximas
                </h3>
                {matchesLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="card shimmer h-24 mb-3" />
                    ))
                ) : upcoming.length === 0 ? (
                    <div className="card text-center py-8 mb-4">
                        <p className="text-3xl mb-2">🏟️</p>
                        <p style={{ color: 'var(--text-muted)' }}>Nenhuma partida agendada</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 mb-6">
                        {upcoming.map((m) => (
                            <MatchCard key={m.id} match={m} userId={user?.uid ?? ''} formatDate={formatDate} DAYS_PT={DAYS_PT} />
                        ))}
                    </div>
                )}

                {past.length > 0 && (
                    <>
                        <h3 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            Passadas
                        </h3>
                        <div className="flex flex-col gap-3">
                            {past.slice(0, 10).map((m) => (
                                <MatchCard key={m.id} match={m} userId={user?.uid ?? ''} formatDate={formatDate} DAYS_PT={DAYS_PT} past />
                            ))}
                        </div>
                    </>
                )}
            </main>
            <BottomNav />
            {showModal && (
                <CreateMatchModal
                    userId={user?.uid ?? ''}
                    onClose={() => setShowModal(false)}
                    onCreated={() => { setShowModal(false); loadMatches(); }}
                />
            )}
        </div>
    );
}

function MatchCard({ match, userId, formatDate, past }: {
    match: Match; userId: string; formatDate: (d: Date) => string; DAYS_PT: string[]; past?: boolean;
}) {
    const router = useRouter();
    const isParticipating = match.participants.includes(userId);

    return (
        <div
            className="card fade-in cursor-pointer"
            onClick={() => router.push(`/partidas/${match.id}`)}
            style={{ opacity: past ? 0.7 : 1 }}
        >
            <div className="flex items-start justify-between">
                <div>
                    <h4 className="font-bold" style={{ color: 'var(--text)' }}>⚽ {match.title}</h4>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>📅 {formatDate(match.date)}</p>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>📍 {match.location}</p>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        👥 {match.participants.length}/{match.maxPlayers} · 💰 R$ {match.pricePerPlayer.toFixed(2)}
                        {match.isRecurring && ' · 🔁 Recorrente'}
                    </p>
                </div>
                <span className={`badge ${past ? 'badge-blue' : isParticipating ? 'badge-green' : 'badge-yellow'}`}>
                    {past ? '✓ Concluída' : isParticipating ? '✅ Você' : '⏳ Aberto'}
                </span>
            </div>
        </div>
    );
}

function CreateMatchModal({ userId, onClose, onCreated }: {
    userId: string; onClose: () => void; onCreated: () => void;
}) {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [location, setLocation] = useState('');
    const [maxPlayers, setMaxPlayers] = useState('10');
    const [price, setPrice] = useState('');
    const [recurring, setRecurring] = useState(false);
    const [recurringDay, setRecurringDay] = useState(6);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!date || !time) { setError('Preencha data e horário.'); return; }
        setLoading(true);
        setError('');
        try {
            const matchDate = new Date(`${date}T${time}`);
            await createMatch({
                title,
                date: matchDate,
                location,
                maxPlayers: parseInt(maxPlayers),
                pricePerPlayer: parseFloat(price) || 0,
                createdBy: userId,
                isRecurring: recurring,
                recurringDay: recurring ? recurringDay : undefined,
                description: '',
            });
            onCreated();
        } catch {
            setError('Erro ao criar partida. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>Nova Partida</h2>
                    <button onClick={onClose} className="text-2xl" style={{ color: 'var(--text-muted)' }}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <input className="input" placeholder="Nome da partida" value={title}
                        onChange={(e) => setTitle(e.target.value)} required />
                    <div className="grid grid-cols-2 gap-2">
                        <input className="input" type="date" value={date}
                            onChange={(e) => setDate(e.target.value)} required />
                        <input className="input" type="time" value={time}
                            onChange={(e) => setTime(e.target.value)} required />
                    </div>
                    <input className="input" placeholder="📍 Local" value={location}
                        onChange={(e) => setLocation(e.target.value)} required />
                    <div className="grid grid-cols-2 gap-2">
                        <input className="input" type="number" placeholder="Max jogadores" value={maxPlayers}
                            onChange={(e) => setMaxPlayers(e.target.value)} min={2} max={50} />
                        <input className="input" type="number" step="0.01" placeholder="R$ por jogador" value={price}
                            onChange={(e) => setPrice(e.target.value)} min={0} />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)}
                            className="w-5 h-5 rounded" style={{ accentColor: 'var(--primary)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>🔁 Partida semanal recorrente</span>
                    </label>
                    {recurring && (
                        <select className="input" value={recurringDay} onChange={(e) => setRecurringDay(parseInt(e.target.value))}>
                            {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((d, i) => (
                                <option key={i} value={i}>{d}</option>
                            ))}
                        </select>
                    )}
                    {error && (
                        <p className="text-sm text-red-500">{error}</p>
                    )}
                    <button type="submit" className="btn-primary mt-2" disabled={loading}>
                        {loading ? 'Criando...' : '✅ Criar Partida'}
                    </button>
                </form>
            </div>
        </div>
    );
}

function useState<T>(init: T): [T, (v: T) => void] {
    return require('react').useState(init);
}
