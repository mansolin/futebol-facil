'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { updateUserProfile } from '@/lib/firebase/firestore';
import { deleteAccount, signOut } from '@/lib/firebase/auth';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

export default function PerfilPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showDelete, setShowDelete] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    useEffect(() => {
        if (profile) {
            setName(profile.displayName ?? '');
            setPhone(profile.phone ?? '');
        }
    }, [profile]);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return;
        setSaving(true);
        try {
            await updateUserProfile(user.uid, { displayName: name, phone });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    }

    async function handleSignOut() {
        await signOut();
        router.replace('/login');
    }

    async function handleDeleteAccount() {
        try {
            await deleteAccount();
            router.replace('/login');
        } catch (e) {
            console.error(e);
            alert('Erro ao excluir conta. Faça login novamente e tente de novo.');
        }
    }

    if (loading) return <Spinner />;

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
            <Header title="Perfil" />
            <main className="page-container">
                {/* Avatar */}
                <div className="text-center mb-6 fade-in">
                    <div
                        className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-black"
                        style={{ background: 'var(--primary)', color: 'var(--primary-text)' }}
                    >
                        {profile?.displayName?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <h2 className="text-xl font-black mt-3" style={{ color: 'var(--text)' }}>
                        {profile?.displayName}
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
                    <span className={`badge mt-2 ${profile?.role === 'admin' ? 'badge-blue' : 'badge-green'}`}>
                        {profile?.role === 'admin' ? '🛡️ Admin' : '⚽ Jogador'}
                    </span>
                </div>

                {/* Credits summary */}
                <div
                    className="rounded-2xl p-4 mb-5 text-center"
                    style={{ background: 'linear-gradient(135deg, var(--primary), #15803d)' }}
                >
                    <p className="text-white/70 text-sm">Saldo de Créditos</p>
                    <p className="text-3xl font-black text-white mt-1">R$ {(profile?.credits ?? 0).toFixed(2)}</p>
                </div>

                {/* Edit form */}
                <div className="card mb-4 fade-in">
                    <h3 className="font-bold mb-4" style={{ color: 'var(--text)' }}>✏️ Editar Perfil</h3>
                    <form onSubmit={handleSave} className="flex flex-col gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Nome</label>
                            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Telefone</label>
                            <input className="input" type="tel" placeholder="(11) 99999-9999" value={phone}
                                onChange={(e) => setPhone(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>E-mail</label>
                            <input className="input" value={user?.email ?? ''} disabled style={{ opacity: 0.6 }} />
                        </div>
                        {saved && (
                            <div className="rounded-lg p-2 text-sm text-center badge-green">
                                ✅ Perfil salvo com sucesso!
                            </div>
                        )}
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? 'Salvando...' : '💾 Salvar Alterações'}
                        </button>
                    </form>
                </div>

                {/* Account actions */}
                <div className="card mb-4 fade-in">
                    <h3 className="font-bold mb-4" style={{ color: 'var(--text)' }}>⚙️ Conta</h3>
                    <div className="flex flex-col gap-2">
                        <button onClick={handleSignOut} className="btn-secondary">
                            🚪 Sair da Conta
                        </button>
                        <button
                            onClick={() => setShowDelete(true)}
                            className="btn-danger"
                        >
                            🗑️ Excluir Minha Conta
                        </button>
                    </div>
                </div>

                {/* App info */}
                <div className="text-center mt-6" style={{ color: 'var(--text-muted)' }}>
                    <p className="text-xs">⚽ FUTEBOL FÁCIL v1.0.0</p>
                    <p className="text-xs mt-1">Gestão de partidas entre amigos</p>
                </div>
            </main>
            <BottomNav />

            {/* Delete confirmation modal */}
            {showDelete && (
                <div className="modal-backdrop" onClick={() => setShowDelete(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-black mb-2" style={{ color: 'var(--danger)' }}>
                            🗑️ Excluir Conta
                        </h2>
                        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
                            Esta ação é <strong>irreversível</strong>. Todos os seus dados serão permanentemente excluídos.
                        </p>
                        <div className="flex flex-col gap-2">
                            <button onClick={handleDeleteAccount} className="btn-danger">
                                ✅ Confirmar Exclusão
                            </button>
                            <button onClick={() => setShowDelete(false)} className="btn-secondary">
                                ❌ Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
