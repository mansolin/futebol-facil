'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithGoogle, signInWithEmail } from '@/lib/firebase/auth';
import { useTheme } from '@/context/ThemeContext';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();

    async function handleGoogleLogin() {
        setLoading(true);
        setError('');
        try {
            await signInWithGoogle();
            router.replace('/dashboard');
        } catch (e: unknown) {
            setError('Erro ao conectar com Google. Tente novamente.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function handleEmailLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await signInWithEmail(email, password);
            router.replace('/dashboard');
        } catch (e: unknown) {
            setError('E-mail ou senha inválidos.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            className="min-h-dvh flex flex-col items-center justify-center px-4 py-8"
            style={{ background: 'var(--bg)' }}
        >
            {/* Theme toggle */}
            <button
                onClick={toggleTheme}
                className="absolute top-4 right-4 rounded-full p-2"
                style={{ background: 'var(--bg-card)' }}
            >
                {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            <div className="w-full max-w-sm fade-in">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="text-7xl mb-3 animate-bounce inline-block">⚽</div>
                    <h1
                        className="text-3xl font-black tracking-tight"
                        style={{ color: 'var(--primary)' }}
                    >
                        FUTEBOL FÁCIL
                    </h1>
                    <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
                        Gestão de partidas entre amigos
                    </p>
                </div>

                <div className="card" style={{ borderRadius: '1.5rem' }}>
                    <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--text)' }}>
                        Entrar
                    </h2>

                    {/* Google Button */}
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="btn-secondary mb-4 gap-2"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        {loading ? 'Aguarde...' : 'Entrar com Google'}
                    </button>

                    <div className="flex items-center gap-3 my-4">
                        <hr className="flex-1" style={{ borderColor: 'var(--border)' }} />
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>ou</span>
                        <hr className="flex-1" style={{ borderColor: 'var(--border)' }} />
                    </div>

                    {/* Email Form */}
                    <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                                E-mail
                            </label>
                            <input
                                type="email"
                                className="input"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                                Senha
                            </label>
                            <input
                                type="password"
                                className="input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <div
                                className="rounded-lg p-3 text-sm"
                                style={{ background: 'rgba(220,38,38,0.1)', color: 'var(--danger)' }}
                            >
                                {error}
                            </div>
                        )}

                        <button type="submit" className="btn-primary mt-2" disabled={loading}>
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>
                    </form>

                    <p className="text-center mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                        Não tem conta?{' '}
                        <Link href="/cadastro" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                            Cadastre-se
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
