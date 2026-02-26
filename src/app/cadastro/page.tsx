'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUpWithEmail } from '@/lib/firebase/auth';

export default function CadastroPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (password !== confirm) { setError('As senhas não coincidem.'); return; }
        if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
        setLoading(true);
        setError('');
        try {
            await signUpWithEmail(name, email, password);
            router.replace('/dashboard');
        } catch (e: unknown) {
            const msg = (e as Error).message;
            if (msg.includes('email-already-in-use')) setError('Este e-mail já está cadastrado.');
            else setError('Erro ao criar conta. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            className="min-h-dvh flex flex-col items-center justify-center px-4 py-8"
            style={{ background: 'var(--bg)' }}
        >
            <div className="w-full max-w-sm fade-in">
                <div className="text-center mb-8">
                    <div className="text-6xl mb-2">⚽</div>
                    <h1
                        className="text-2xl font-black"
                        style={{ color: 'var(--primary)' }}
                    >
                        Criar Conta
                    </h1>
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                        Junte-se ao Futebol Fácil
                    </p>
                </div>

                <div className="card" style={{ borderRadius: '1.5rem' }}>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                                Nome completo
                            </label>
                            <input className="input" placeholder="João Silva" value={name}
                                onChange={(e) => setName(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                                E-mail
                            </label>
                            <input type="email" className="input" placeholder="seu@email.com" value={email}
                                onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                                Senha
                            </label>
                            <input type="password" className="input" placeholder="Mínimo 6 caracteres" value={password}
                                onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                                Confirmar senha
                            </label>
                            <input type="password" className="input" placeholder="Repita a senha" value={confirm}
                                onChange={(e) => setConfirm(e.target.value)} required />
                        </div>

                        {error && (
                            <div className="rounded-lg p-3 text-sm"
                                style={{ background: 'rgba(220,38,38,0.1)', color: 'var(--danger)' }}>
                                {error}
                            </div>
                        )}

                        <button type="submit" className="btn-primary mt-2" disabled={loading}>
                            {loading ? 'Criando conta...' : 'Criar Conta'}
                        </button>
                    </form>

                    <p className="text-center mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                        Já tem conta?{' '}
                        <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                            Entrar
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
