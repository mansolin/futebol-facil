import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { UserProfile, Match } from '../src/types';

// Hardcoded config for seed script to bypass env issues
const firebaseConfig = {
    apiKey: "AIzaSyBPwXogRCLiL49pc69TpNgK6x8UTCPF_Zk",
    authDomain: "futebol-facil.firebaseapp.com",
    projectId: "futebol-facil",
    storageBucket: "futebol-facil.firebasestorage.app",
    messagingSenderId: "539498748295",
    appId: "1:539498748295:web:fc6ba0dfa841890bd99b22",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Mock data names
const names = [
    'Marcus Rashford', 'Bukayo Saka', 'Jack Grealish', 'Declan Rice', 'Jude Bellingham',
    'John Stones', 'Jordan Pickford', 'Phil Foden', 'Kyle Walker', 'Harry Kane',
    'Gabriel Jesus', 'Vinicius Jr', 'Rodrygo Goês', 'Neymar Jr', 'Alisson Becker',
    'Ederson Moraes', 'Casemiro', 'Marquinhos', 'Richarlison', 'Lucas Paquetá'
];

async function seed() {
    console.log('🌱 Starting seed...');

    const usersCollection = collection(db, 'users');
    const userProfiles: UserProfile[] = [];

    // Create 20 players
    for (const name of names) {
        const uid = `mock_user_${name.toLowerCase().replace(/\s/g, '_')}`;
        const userProfile: UserProfile = {
            uid,
            displayName: name,
            email: `${uid}@example.com`,
            photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`,
            phone: '(11) 99999-9999',
            createdAt: new Date(),
            credits: Math.floor(Math.random() * 500),
            role: 'player'
        };

        await setDoc(doc(db, 'users', uid), {
            ...userProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        userProfiles.push(userProfile);
        console.log(`✅ Created user: ${name}`);
    }

    // Create a match
    const matchData: Omit<Match, 'id'> = {
        title: 'Futebol de Terça',
        date: new Date(Date.now() + 86400000 * 2), // 2 days from now
        location: 'Arena Central',
        maxPlayers: 12,
        pricePerPlayer: 25.0,
        createdBy: userProfiles[0].uid,
        isRecurring: true,
        recurringDay: 2, // Tuesday
        participants: {},
        status: 'upcoming',
        description: 'Pelada semanal dos amigos na Arena Central.',
        imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000&auto=format&fit=crop'
    };

    // Add participants
    userProfiles.forEach((user, index) => {
        if (index < 12) {
            matchData.participants[user.uid] = { status: 'confirmed', paid: Math.random() > 0.5 };
        } else if (index < 15) {
            // Not in participants yet (Aguardando resposta)
        } else if (index < 16) {
            matchData.participants[user.uid] = { status: 'declined', paid: false };
        }
    });

    const matchRef = await addDoc(collection(db, 'matches'), {
        ...matchData,
        date: Timestamp.fromDate(matchData.date),
        createdAt: serverTimestamp()
    });

    console.log(`✅ Created match: ${matchData.title} (ID: ${matchRef.id})`);
    console.log('✨ Seed completed!');
    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
