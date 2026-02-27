'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getMatchById, getAllUsers, inviteUserToMatch, cancelParticipation } from '@/lib/firebase/firestore';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import type { Match, UserProfile } from '@/types';

export default function MembrosPage({ params }: { params: { id: string } }) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    const [match, setMatch] = useState<Match | null>(null);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);

    const [matchLoading, setMatchLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    const fetchData = async () => {
        try {
            setMatchLoading(true);
            const m = await getMatchById(params.id);
            setMatch(m);
            if (m) {
                const users = await getAllUsers();
                setAllUsers(users);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setMatchLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [params.id]);

    if (loading || matchLoading) return <Spinner />;
    if (!match) {
        return (
            <div style={{ background: '#0A0B10', minHeight: '100dvh' }}>
                <Header title="Membros" />
                <main className="page-container text-center py-16">
                    <p className="text-4xl mb-3">😕</p>
                    <p className="text-white/50">Partida não encontrada.</p>
                    <button onClick={() => router.push('/dashboard')} className="btn-primary mt-4" style={{ maxWidth: 200 }}>
                        Voltar
                    </button>
                </main>
                <BottomNav />
            </div>
        );
    }

    const isOwner = match.createdBy === user?.uid || profile?.role === 'admin';

    // Current members
    const participantsArray = Object.entries(match.participants).map(([uid, data]) => ({ uid, ...data }));

    // Sort logic to group them or list them beautifully
    const currentMembers = participantsArray.map(p => {
        const u = allUsers.find(au => au.uid === p.uid);
        return { ...p, displayName: u?.displayName || 'Jogador', phone: u?.phone || '' };
    });

    const handleInvite = async (uid: string) => {
        if (!isOwner) return;
        setActionLoading(true);
        try {
            await inviteUserToMatch(match.id, uid);
            await fetchData();
        } catch (e) {
            console.error(e);
            alert("Erro ao convidar.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemove = async (uid: string) => {
        if (!isOwner) return;
        if (!window.confirm("Remover este membro da partida?")) return;

        setActionLoading(true);
        try {
            await cancelParticipation(match.id, uid);
            await fetchData();
        } catch (e) {
            console.error(e);
            alert("Erro ao remover.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleShareLink = () => {
        const inviteLink = `${window.location.origin}/partidas/${match.id}`;
        const message = `Venha jogar com a gente! Acesse o App Futebol Fácil e confirme sua presença: ${inviteLink}`;

        if (navigator.share) {
            navigator.share({
                title: 'Convite para o Jogo',
                text: 'Venha jogar com a gente!',
                url: inviteLink
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(message);
            alert("Link de convite copiado para a área de transferência!");
        }
    };

    // Users to invite (filter by name and not already in match)
    const availableToInvite = allUsers.filter(u => {
        if (match.participants[u.uid]) return false;
        if (!searchTerm) return true;
        return u.displayName.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div style={{ background: '#0A0B10', minHeight: '100dvh' }}>
            <Header title="Gestão de Membros" />

            <main className="page-container px-3 flex flex-col pt-6 pb-32">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-black text-white italic tracking-wide uppercase" style={{ transform: 'skewX(-5deg)' }}>
                            Membros ({currentMembers.length})
                        </h2>
                        <p className="text-[10px] text-[var(--primary)] uppercase tracking-widest font-bold">
                            {match.title}
                        </p>
                    </div>
                    {isOwner && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-[var(--primary)] text-black font-black text-[10px] uppercase tracking-widest py-2 px-4 rounded-full active:scale-95 transition-transform flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,255,100,0.3)]"
                        >
                            <span>+</span> Adicionar
                        </button>
                    )}
                </div>

                {/* List of current members */}
                {currentMembers.length === 0 ? (
                    <div className="card text-center py-10 fade-in border-dashed border-white/10 rounded-[1.5rem] bg-[#0A0D14]">
                        <p className="text-3xl mb-2 opacity-30">👥</p>
                        <p className="font-medium text-white/50 text-sm">Nenhum membro cadastrado.</p>
                    </div>
                ) : (
                    <div className="flex flex-col border border-white/5 rounded-xl overflow-hidden bg-[#0F141A]">
                        {currentMembers.map((m, i, arr) => (
                            <div key={m.uid} className={`flex items-center justify-between p-4 ${i < arr.length - 1 ? 'border-b border-white/5' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white font-bold">
                                        {m.displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="text-[13px] font-bold text-white">{m.displayName}</h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm border ${m.status === 'confirmed' ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20' :
                                                    m.status === 'declined' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                        'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                }`}>
                                                {m.status === 'confirmed' ? 'Confirmado' : m.status === 'declined' ? 'Recusado' : 'Convidado'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {isOwner && m.uid !== user?.uid && (
                                    <button
                                        onClick={() => handleRemove(m.uid)}
                                        disabled={actionLoading}
                                        className="text-white/30 hover:text-red-500 transition-colors bg-white/5 hover:bg-red-500/10 w-8 h-8 rounded-full flex items-center justify-center border border-white/5 hover:border-red-500/30"
                                    >
                                        <span className="text-[10px]">✕</span>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal de Convidar */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 fade-in">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="bg-[#111] border border-[#222] w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl relative flex flex-col max-h-[90vh]">
                        {/* Handle bar for bottom sheet feel */}
                        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-4 sm:hidden"></div>

                        <div className="p-6 pb-4 border-b border-[#222]">
                            <h3 className="text-xl font-black text-white italic tracking-wide uppercase">Adicionar Membros</h3>
                            <p className="text-[10px] text-white/50 uppercase tracking-widest mt-1">Pesquise para convidar</p>
                        </div>

                        <div className="p-4 flex-1 overflow-y-auto">
                            <input
                                type="text"
                                placeholder="Buscar por nome..."
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 mb-4 focus:outline-none focus:border-[var(--primary)]/50 transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />

                            {availableToInvite.length === 0 ? (
                                <p className="text-center text-white/40 text-xs py-6">Nenhum jogador encontrado com esse nome.</p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {availableToInvite.slice(0, 10).map(u => (
                                        <div key={u.uid} className="flex flex-row items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center font-bold text-xs border border-[var(--primary)]/20">
                                                    {u.displayName.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white leading-tight">{u.displayName}</span>
                                                    <span className="text-[9px] text-white/40">{u.phone || 'Sem telefone'}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleInvite(u.uid)}
                                                disabled={actionLoading}
                                                className="bg-[var(--primary)] text-black text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                                            >
                                                {actionLoading ? '...' : 'Convidar'}
                                            </button>
                                        </div>
                                    ))}
                                    {availableToInvite.length > 10 && (
                                        <p className="text-center text-[10px] text-white/30 uppercase tracking-widest mt-2 block">
                                            +{availableToInvite.length - 10} jogadores encontrados.
                                        </p>
                                    )}
                                </div>
                            )}

                        </div>

                        <div className="p-6 border-t border-[#222] bg-white/5">
                            <button
                                onClick={handleShareLink}
                                className="w-full bg-[#25B5D6] text-black font-black text-xs uppercase tracking-widest py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-[#209DBA] active:scale-95"
                            >
                                <span>🔗</span> Convidar via Link
                            </button>
                            <p className="text-center text-[9px] text-white/40 mt-3">Envie pelo WhatsApp para quem ainda não tem o aplicativo.</p>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}

function Spinner() {
    return (
        <div className="flex items-center justify-center h-dvh" style={{ background: '#0A0B10' }}>
            <div className="w-10 h-10 rounded-full border-4 animate-spin"
                style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        </div>
    );
}
