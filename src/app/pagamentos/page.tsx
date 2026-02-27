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
        <div style={{ background: '#0A0B10', minHeight: '100dvh' }}>
            <Header title="Pagamentos" />
            <main className="page-container" style={{ paddingBottom: '100px', paddingTop: 'max(env(safe-area-inset-top), 20px)' }}>
                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-3 mb-6 mt-2">
                    <div className="bg-[#0F141A] border border-[#102233] rounded-[1.5rem] p-4 text-center fade-in relative overflow-hidden shadow-[0_5px_15px_rgba(59,130,246,0.1)]">
                        <div className="absolute top-0 right-[-10%] w-20 h-20 bg-[#3B82F6] opacity-[0.05] rounded-full blur-xl pointer-events-none"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#3B82F6] mb-1">Meus Créditos</p>
                        <p className="text-2xl font-black text-white">
                            R$ {(profile?.credits ?? 0).toFixed(2)}
                        </p>
                    </div>
                    <div className="bg-[#1A140F] border border-[#332210] rounded-[1.5rem] p-4 text-center fade-in relative overflow-hidden shadow-[0_5px_15px_rgba(255,138,0,0.1)]">
                        <div className="absolute top-0 right-[-10%] w-20 h-20 bg-[#FF8A00] opacity-[0.05] rounded-full blur-xl pointer-events-none"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#FF8A00] mb-1">Pendente</p>
                        <p className="text-2xl font-black text-white">
                            R$ {pendingAmount.toFixed(2)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-white">Meus Pagamentos</h3>
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-white/10 text-white border border-white/20 rounded-full font-bold transition-all active:scale-95"
                        style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.75rem' }}
                    >
                        + Adicionar
                    </button>
                </div>

                {paymentsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <div key={i} className="card shimmer h-20 mb-3 rounded-[1.5rem]" />)
                ) : payments.length === 0 ? (
                    <div className="card text-center py-10 fade-in border-dashed border-2 rounded-[1.5rem]" style={{ borderColor: 'var(--border)' }}>
                        <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center opacity-30" style={{ background: 'var(--bg-elevated)' }}>
                            <p className="text-3xl">💳</p>
                        </div>
                        <p className="font-medium" style={{ color: 'var(--text-muted)' }}>Nenhum pagamento registrado.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {payments.map((p) => {
                            const info = statusInfo(p.status);

                            // Determine accent color
                            let borderColor = 'border-[#1A1F2E]';
                            let accentClass = '';
                            if (p.status === 'validated') {
                                borderColor = 'border-[var(--primary)]/30';
                                accentClass = 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20';
                            } else if (p.status === 'pending') {
                                borderColor = 'border-yellow-500/30';
                                accentClass = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
                            } else {
                                borderColor = 'border-red-500/30';
                                accentClass = 'bg-red-500/10 text-red-500 border-red-500/20';
                            }

                            return (
                                <div key={p.id} className={`bg-[#0A0D14] border ${borderColor} rounded-[1rem] p-4 flex flex-col relative overflow-hidden fade-in`}>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-black text-white text-lg leading-none mb-1">
                                                R$ {p.amount.toFixed(2)}
                                            </p>
                                            <p className="text-[10px] text-white/50 mb-0.5">
                                                <span className="opacity-70">📅</span> {formatDate(p.createdAt)}
                                            </p>
                                            <p className="text-[11px] font-bold text-white/70">
                                                {p.description || 'Pagamento'}
                                            </p>
                                            {p.enteredByAdmin && (
                                                <p className="text-[9px] mt-1 text-[var(--primary)] opacity-80 uppercase tracking-widest font-black flex items-center gap-1">
                                                    <span>🛡️</span> Lançado pelo admin
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${accentClass}`}>
                                                {info?.emoji} {info?.label}
                                            </span>
                                            {p.receiptUrl && (
                                                <a
                                                    href={p.receiptUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] uppercase font-black tracking-widest border border-white/20 text-white bg-white/5 px-2.5 py-1 rounded-md mt-1 hover:bg-white/10 transition-colors"
                                                >
                                                    Comprovante
                                                </a>
                                            )}
                                        </div>
                                    </div>
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
