'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getPaymentsByUser, createPayment } from '@/lib/firebase/firestore';
import { storage } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import type { Payment } from '@/types';

export default function PagamentosPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [paymentsLoading, setPaymentsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    const loadPayments = () => {
        if (!user) return;
        setPaymentsLoading(true);
        getPaymentsByUser(user.uid)
            .then(setPayments)
            .finally(() => setPaymentsLoading(false));
    };

    useEffect(() => { loadPayments(); }, [user]); // eslint-disable-line

    const formatDate = (d: Date) =>
        d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const statusInfo = (status: Payment['status']) => ({
        pending: { label: 'Pendente', badge: 'badge-yellow', emoji: '⏳' },
        validated: { label: 'Validado', badge: 'badge-green', emoji: '✅' },
        rejected: { label: 'Rejeitado', badge: 'badge-red', emoji: '❌' },
    }[status]);

    const totalCredits = payments
        .filter((p) => p.status === 'validated')
        .reduce((sum, p) => sum + p.amount, 0);

    const pendingAmount = payments
        .filter((p) => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0);

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
            <Header title="Pagamentos" />
            <main className="page-container">
                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="card text-center fade-in">
                        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Créditos</p>
                        <p className="text-2xl font-black mt-1" style={{ color: 'var(--primary)' }}>
                            R$ {(profile?.credits ?? 0).toFixed(2)}
                        </p>
                    </div>
                    <div className="card text-center fade-in">
                        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Pendente</p>
                        <p className="text-2xl font-black mt-1" style={{ color: 'var(--warning)' }}>
                            R$ {pendingAmount.toFixed(2)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Meus Pagamentos</h3>
                    <button
                        onClick={() => setShowModal(true)}
                        className="btn-primary"
                        style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    >
                        + Adicionar
                    </button>
                </div>

                {paymentsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <div key={i} className="card shimmer h-20 mb-3" />)
                ) : payments.length === 0 ? (
                    <div className="card text-center py-10 fade-in">
                        <p className="text-3xl mb-2">💳</p>
                        <p style={{ color: 'var(--text-muted)' }}>Nenhum pagamento registrado.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {payments.map((p) => {
                            const info = statusInfo(p.status);
                            return (
                                <div key={p.id} className="card fade-in">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold" style={{ color: 'var(--text)' }}>
                                                R$ {p.amount.toFixed(2)}
                                            </p>
                                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                                {formatDate(p.createdAt)} · {p.description || 'Pagamento'}
                                            </p>
                                            {p.enteredByAdmin && (
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                                    🛡️ Lançado pelo admin
                                                </p>
                                            )}
                                        </div>
                                        <span className={`badge ${info?.badge}`}>
                                            {info?.emoji} {info?.label}
                                        </span>
                                    </div>
                                    {p.receiptUrl && (
                                        <a
                                            href={p.receiptUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs mt-2 inline-block font-medium"
                                            style={{ color: 'var(--primary)' }}
                                        >
                                            📎 Ver comprovante
                                        </a>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
            <BottomNav />
            {showModal && user && (
                <UploadPaymentModal
                    userId={user.uid}
                    onClose={() => setShowModal(false)}
                    onCreated={() => { setShowModal(false); loadPayments(); }}
                />
            )}
        </div>
    );
}

function UploadPaymentModal({ userId, onClose, onCreated }: {
    userId: string; onClose: () => void; onCreated: () => void;
}) {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        setPreview(URL.createObjectURL(f));
    }

    async function analyzeWithVision(imageUrl: string) {
        try {
            const res = await fetch('/api/vision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.amount) setAmount(data.amount.toString());
                setAnalysisResult(`✅ IA detectou: R$ ${data.amount?.toFixed(2) ?? '?'} em ${data.date ?? '?'}`);
            }
        } catch {
            // Vision AI optional
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!amount || parseFloat(amount) <= 0) { setError('Informe um valor válido.'); return; }
        setLoading(true);
        setError('');
        try {
            let receiptUrl: string | undefined;
            if (file) {
                const storageRef = ref(storage, `receipts/${userId}/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                receiptUrl = await getDownloadURL(storageRef);
                // Try Vision AI analysis
                await analyzeWithVision(receiptUrl);
            }
            await createPayment({
                userId,
                amount: parseFloat(amount),
                receiptUrl,
                status: 'pending',
                enteredBy: userId,
                enteredByAdmin: false,
                description: description || 'Comprovante de pagamento',
            });
            onCreated();
        } catch {
            setError('Erro ao registrar pagamento. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>Adicionar Pagamento</h2>
                    <button onClick={onClose} className="text-2xl" style={{ color: 'var(--text-muted)' }}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    {/* File upload */}
                    <div
                        className="rounded-xl border-2 border-dashed p-6 text-center cursor-pointer"
                        style={{ borderColor: 'var(--primary)', background: 'var(--bg-elevated)' }}
                        onClick={() => fileRef.current?.click()}
                    >
                        {preview ? (
                            <img src={preview} alt="Comprovante" className="max-h-40 mx-auto rounded-lg object-contain" />
                        ) : (
                            <>
                                <p className="text-3xl mb-2">📸</p>
                                <p className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                                    Toque para foto/PDF
                                </p>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                    IA analisa automaticamente o valor
                                </p>
                            </>
                        )}
                        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
                    </div>

                    {analysisResult && (
                        <div className="rounded-lg p-2 text-sm badge-green">{analysisResult}</div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                            Valor (R$)
                        </label>
                        <input type="number" step="0.01" className="input" placeholder="0,00" value={amount}
                            onChange={(e) => setAmount(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                            Descrição (opcional)
                        </label>
                        <input className="input" placeholder="Ex: PIX jogo de sábado" value={description}
                            onChange={(e) => setDescription(e.target.value)} />
                    </div>

                    <div className="rounded-lg p-3 text-xs" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                        ⚠️ Pagamentos ficam pendentes até validação do administrador.
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Enviando...' : '💳 Registrar Pagamento'}
                    </button>
                </form>
            </div>
        </div>
    );
}
