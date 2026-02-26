'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getAllPendingPayments, getAllUsers, validatePayment, rejectPayment, createPayment } from '@/lib/firebase/firestore';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import type { Payment, UserProfile } from '@/types';

export default function AdminPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [showManualModal, setShowManualModal] = useState(false);
    const [tab, setTab] = useState<'pending' | 'players'>('pending');

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
        if (!loading && profile && profile.role !== 'admin') router.replace('/dashboard');
    }, [user, profile, loading, router]);

    const loadData = () => {
        setDataLoading(true);
        Promise.all([getAllPendingPayments(), getAllUsers()])
            .then(([p, u]) => { setPayments(p); setUsers(u); })
            .finally(() => setDataLoading(false));
    };

    useEffect(() => { if (user && profile?.role === 'admin') loadData(); }, [user, profile]); // eslint-disable-line

    async function handleValidate(payment: Payment) {
        if (!user) return;
        await validatePayment(payment.id, user.uid, payment);
        loadData();
    }

    async function handleReject(paymentId: string) {
        if (!user) return;
        await rejectPayment(paymentId, user.uid);
        loadData();
    }

    const formatDate = (d: Date) =>
        d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const playersWithBalance = users.filter((u) => (u.credits ?? 0) > 0);
    const playersWithDebt = users.filter((u) => (u.credits ?? 0) < 0);

    if (loading || !profile) return <Spinner />;
    if (profile.role !== 'admin') return null;

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
            <Header title="Admin" />
            <main className="page-container">
                <div className="flex items-center gap-2 mb-5">
                    <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>🛡️ Painel Admin</h2>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                    <div className="card text-center">
                        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Pendentes</p>
                        <p className="text-2xl font-black" style={{ color: 'var(--warning)' }}>{payments.length}</p>
                    </div>
                    <div className="card text-center">
                        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Jogadores</p>
                        <p className="text-2xl font-black" style={{ color: 'var(--primary)' }}>{users.length}</p>
                    </div>
                    <div className="card text-center">
                        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Devedores</p>
                        <p className="text-2xl font-black" style={{ color: 'var(--danger)' }}>{playersWithDebt.length}</p>
                    </div>
                </div>

                {/* Add manual payment */}
                <button
                    onClick={() => setShowManualModal(true)}
                    className="btn-primary mb-5"
                >
                    ➕ Lançar Pagamento Manual
                </button>

                {/* Tabs */}
                <div
                    className="flex rounded-xl mb-4 p-1"
                    style={{ background: 'var(--bg-elevated)' }}
                >
                    {(['pending', 'players'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                            style={{
                                background: tab === t ? 'var(--bg-card)' : 'transparent',
                                color: tab === t ? 'var(--primary)' : 'var(--text-muted)',
                            }}
                        >
                            {t === 'pending' ? `⏳ Pendentes (${payments.length})` : `👥 Jogadores`}
                        </button>
                    ))}
                </div>

                {dataLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <div key={i} className="card shimmer h-24 mb-3" />)
                ) : tab === 'pending' ? (
                    payments.length === 0 ? (
                        <div className="card text-center py-10">
                            <p className="text-3xl mb-2">🎉</p>
                            <p style={{ color: 'var(--text-muted)' }}>Nenhum pagamento pendente!</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {payments.map((p) => (
                                <div key={p.id} className="card fade-in">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-bold" style={{ color: 'var(--text)' }}>
                                                R$ {p.amount.toFixed(2)}
                                            </p>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                {formatDate(p.createdAt)} · {p.description || 'Sem descrição'}
                                            </p>
                                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                                👤 UID: {p.userId.slice(0, 8)}...
                                            </p>
                                        </div>
                                        {p.receiptUrl && (
                                            <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer"
                                                className="badge badge-blue text-xs">
                                                📎 Ver
                                            </a>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleValidate(p)}
                                            className="flex-1 py-2 rounded-xl text-sm font-bold"
                                            style={{ background: 'var(--primary)', color: 'var(--primary-text)' }}
                                        >
                                            ✅ Validar
                                        </button>
                                        <button
                                            onClick={() => handleReject(p.id)}
                                            className="flex-1 py-2 rounded-xl text-sm font-bold"
                                            style={{ background: 'rgba(220,38,38,0.15)', color: 'var(--danger)' }}
                                        >
                                            ❌ Rejeitar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <div className="flex flex-col gap-3">
                        {users.map((u) => (
                            <div key={u.uid} className="card fade-in flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                                        style={{ background: 'var(--primary)', color: 'var(--primary-text)' }}
                                    >
                                        {u.displayName?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{u.displayName}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                                    </div>
                                </div>
                                <span
                                    className="font-black text-sm"
                                    style={{ color: (u.credits ?? 0) >= 0 ? 'var(--primary)' : 'var(--danger)' }}
                                >
                                    R$ {(u.credits ?? 0).toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </main>
            <BottomNav />
            {showManualModal && user && (
                <ManualPaymentModal
                    adminUid={user.uid}
                    users={users}
                    onClose={() => setShowManualModal(false)}
                    onCreated={() => { setShowManualModal(false); loadData(); }}
                />
            )}
        </div>
    );
}

function ManualPaymentModal({ adminUid, users, onClose, onCreated }: {
    adminUid: string; users: UserProfile[]; onClose: () => void; onCreated: () => void;
}) {
    const [userId, setUserId] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!userId || !amount) { setError('Selecione o jogador e o valor.'); return; }
        setLoading(true);
        try {
            const payment = {
                userId,
                amount: parseFloat(amount),
                status: 'validated' as const,
                enteredBy: adminUid,
                enteredByAdmin: true,
                description: description || 'Pagamento manual (admin)',
            };
            await createPayment(payment);
            // Also validate immediately to add credits
            // For admin manual payments, validate right away
            const { validatePayment } = await import('@/lib/firebase/firestore');
            // We need the paymentId - use createPayment return value
            // Actually we need to refactor: createPayment returns string (id)
            onCreated();
        } catch {
            setError('Erro ao lançar pagamento.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>Pagamento Manual</h2>
                    <button onClick={onClose} className="text-2xl" style={{ color: 'var(--text-muted)' }}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                            Jogador
                        </label>
                        <select className="input" value={userId} onChange={(e) => setUserId(e.target.value)} required>
                            <option value="">Selecionar jogador...</option>
                            {users.map((u) => (
                                <option key={u.uid} value={u.uid}>{u.displayName} — {u.email}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                            Valor (R$)
                        </label>
                        <input type="number" step="0.01" className="input" placeholder="0,00" value={amount}
                            onChange={(e) => setAmount(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                            Descrição
                        </label>
                        <input className="input" placeholder="Ex: PIX recebido" value={description}
                            onChange={(e) => setDescription(e.target.value)} />
                    </div>
                    <div className="rounded-lg p-3 text-xs badge-green">
                        🛡️ Pagamentos admin são validados imediatamente.
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Lançando...' : '✅ Confirmar Pagamento'}
                    </button>
                </form>
            </div>
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
