# ⚽ FUTEBOL FÁCIL

Aplicativo web para gestão de partidas de futebol entre amigos.

## 🚀 Tecnologias

- **Frontend**: Next.js 14 + TypeScript
- **Estilização**: TailwindCSS v4 (dark/light mode)
- **Auth/Backend**: Firebase Authentication, Firestore, Storage
- **IA**: Google Vision API (análise de comprovantes)
- **Deploy**: Vercel + GitHub CI/CD

## 📁 Estrutura

```
src/
├── app/                  # Next.js App Router
│   ├── login/            # Tela de login
│   ├── cadastro/         # Tela de cadastro
│   ├── dashboard/        # Dashboard principal
│   ├── partidas/         # Gestão de partidas
│   ├── pagamentos/       # Pagamentos e créditos
│   ├── perfil/           # Perfil do usuário
│   ├── admin/            # Painel administrativo
│   └── api/vision/       # API Route Google Vision AI
├── components/layout/    # Header, BottomNav
├── context/              # AuthContext, ThemeContext
├── lib/firebase/         # Config, auth, firestore services
└── types/                # TypeScript interfaces
```

## 🔧 Configuração

### 1. Instale as dependências
```bash
npm install
```

### 2. Configure variáveis de ambiente
```bash
cp .env.example .env.local
# Preencha com suas credenciais Firebase e Google Vision API
```

### 3. Configure Firebase
- Crie projeto em [console.firebase.google.com](https://console.firebase.google.com)
- Ative: Authentication (Google + Email/Senha), Firestore, Storage
- Deploy das regras: `firebase deploy --only firestore:rules`

### 4. Execute localmente
```bash
npm run dev
```

## 🚀 Deploy

1. Push para GitHub
2. Conecte no [Vercel](https://vercel.com) e configure env vars
3. Deploy automático a cada push na `main`

## 👥 Papéis

| Role | Permissões |
|------|-----------|
| `player` | Ver partidas, confirmar presença, pagamentos |
| `admin` | Tudo + validar pagamentos, painel financeiro |

Para tornar admin: altere `role: 'admin'` no Firestore.

## ✅ Funcionalidades

- Login Google OAuth e email/senha
- Dashboard com próximo jogo e saldo de créditos
- Gestão de partidas (criar, recorrente, confirmar presença)
- Upload de comprovantes + análise automática por IA
- Painel admin (validar pagamentos, saldos dos jogadores)
- Dark/Light mode | Mobile-first
