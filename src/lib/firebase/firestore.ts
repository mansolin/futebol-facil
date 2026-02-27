import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
    arrayUnion,
    arrayRemove,
    increment,
    writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { db, storage } from './config';
import type { UserProfile, Match, Payment, CreditTransaction } from '@/types';

// =================== USERS ===================

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
        uid: snap.id,
        ...data,
        createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    } as UserProfile;
}

export async function updateUserProfile(
    uid: string,
    data: Partial<Pick<UserProfile, 'displayName' | 'phone' | 'photoURL'>>
): Promise<void> {
    await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
}

export async function getAllUsers(): Promise<UserProfile[]> {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => {
        const data = d.data();
        return {
            uid: d.id,
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
        } as UserProfile;
    });
}

// =================== MATCHES ===================

export async function getMatches(): Promise<Match[]> {
    const q = query(collection(db, 'matches'), orderBy('date', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
        const data = d.data();
        return {
            id: d.id,
            ...data,
            date: (data.date as Timestamp)?.toDate() ?? new Date(),
        } as Match;
    });
}

export async function getMatchById(matchId: string): Promise<Match | null> {
    const snap = await getDoc(doc(db, 'matches', matchId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return { id: snap.id, ...data, date: (data.date as Timestamp)?.toDate() } as Match;
}

export async function createMatch(
    data: Omit<Match, 'id' | 'participants' | 'status'>
): Promise<string> {
    const ref = await addDoc(collection(db, 'matches'), {
        ...data,
        participants: {},
        status: 'upcoming',
        createdAt: serverTimestamp(),
    });
    return ref.id;
}

export async function updateMatch(matchId: string, data: Partial<Match>): Promise<void> {
    await updateDoc(doc(db, 'matches', matchId), { ...data, updatedAt: serverTimestamp() });
}

export async function confirmParticipation(matchId: string, userId: string): Promise<void> {
    await updateDoc(doc(db, 'matches', matchId), {
        [`participants.${userId}`]: { status: 'confirmed', paid: false },
    });
}

export async function declineParticipation(matchId: string, userId: string): Promise<void> {
    await updateDoc(doc(db, 'matches', matchId), {
        [`participants.${userId}`]: { status: 'declined', paid: false },
    });
}

export async function cancelParticipation(matchId: string, userId: string): Promise<void> {
    const matchRef = doc(db, 'matches', matchId);

    // To remove a key from a map in Firestore, you use deleteField()
    // but importing deleteField is needed. We'll do it via updateDoc.
    const { deleteField } = await import('firebase/firestore');
    await updateDoc(matchRef, {
        [`participants.${userId}`]: deleteField(),
    });
}

export async function togglePaymentStatus(
    matchId: string,
    userId: string,
    currentPaidStatus: boolean,
    amountToDeduct: number
): Promise<void> {
    const batch = writeBatch(db);

    // 1. Update the participant's paid status in the match
    batch.update(doc(db, 'matches', matchId), {
        [`participants.${userId}.paid`]: !currentPaidStatus,
    });

    // 2. Adjust user credits based on the action
    // If currently NOT paid (!currentPaidStatus === true), we are deducting credits to pay.
    // If currently paid (!currentPaidStatus === false), we are refunding credits.
    const creditModifier = !currentPaidStatus ? -amountToDeduct : amountToDeduct;

    batch.update(doc(db, 'users', userId), {
        credits: increment(creditModifier)
    });

    // 3. Log the transaction
    const txRef = doc(collection(db, 'credits', userId, 'transactions'));
    batch.set(txRef, {
        userId,
        type: !currentPaidStatus ? 'debit' : 'credit',
        amount: amountToDeduct,
        ref: matchId,
        refType: 'match',
        description: !currentPaidStatus ? `Pagamento de partida via admin` : `Reembolso de partida cancelada`,
        date: serverTimestamp(),
    });

    await batch.commit();
}

// =================== PAYMENTS ===================

export async function getPaymentsByUser(userId: string): Promise<Payment[]> {
    const q = query(
        collection(db, 'payments'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
        const data = d.data();
        return {
            id: d.id,
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
            validatedAt: data.validatedAt ? (data.validatedAt as Timestamp)?.toDate() : undefined,
        } as Payment;
    });
}

export async function getAllPendingPayments(): Promise<Payment[]> {
    const q = query(
        collection(db, 'payments'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
        const data = d.data();
        return {
            id: d.id,
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
        } as Payment;
    });
}

export async function createPayment(
    data: Omit<Payment, 'id' | 'createdAt' | 'validatedAt' | 'validatedBy'>
): Promise<string> {
    const ref = await addDoc(collection(db, 'payments'), {
        ...data,
        createdAt: serverTimestamp(),
    });
    return ref.id;
}

export async function validatePayment(
    paymentId: string,
    validatedBy: string,
    payment: Payment
): Promise<void> {
    const batch = writeBatch(db);

    // Update payment status
    batch.update(doc(db, 'payments', paymentId), {
        status: 'validated',
        validatedAt: serverTimestamp(),
        validatedBy,
    });

    // Add credit transaction
    const txRef = doc(collection(db, 'credits', payment.userId, 'transactions'));
    batch.set(txRef, {
        userId: payment.userId,
        type: 'credit',
        amount: payment.amount,
        ref: paymentId,
        refType: 'payment',
        description: `Pagamento validado: R$ ${payment.amount.toFixed(2)}`,
        date: serverTimestamp(),
    });

    // Increment user credits
    batch.update(doc(db, 'users', payment.userId), {
        credits: increment(payment.amount),
    });

    await batch.commit();
}

export async function rejectPayment(paymentId: string, rejectedBy: string): Promise<void> {
    await updateDoc(doc(db, 'payments', paymentId), {
        status: 'rejected',
        validatedAt: serverTimestamp(),
        validatedBy: rejectedBy,
    });
}

// =================== CREDITS ===================

export async function getCreditTransactions(userId: string): Promise<CreditTransaction[]> {
    const q = query(
        collection(db, 'credits', userId, 'transactions'),
        orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
        const data = d.data();
        return {
            id: d.id,
            ...data,
            date: (data.date as Timestamp)?.toDate() ?? new Date(),
        } as CreditTransaction;
    });
}

export async function deductCreditForMatch(
    userId: string,
    matchId: string,
    amount: number
): Promise<void> {
    const batch = writeBatch(db);
    const txRef = doc(collection(db, 'credits', userId, 'transactions'));
    batch.set(txRef, {
        userId,
        type: 'debit',
        amount,
        ref: matchId,
        refType: 'match',
        description: `Participação em partida`,
        date: serverTimestamp(),
    });
    batch.update(doc(db, 'users', userId), { credits: increment(-amount) });
    await batch.commit();
}

// =================== STORAGE ===================

export async function uploadProfilePhoto(userId: string, file: File): Promise<string> {
    const fileExtension = file.name.split('.').pop();
    // Assuming you have 'storage' exported from config.ts
    const { storage } = await import('./config');
    const storageRef = ref(storage, `profiles/${userId}.${fileExtension}`);

    // Upload file
    await uploadBytes(storageRef, file);

    // Get URL
    const photoURL = await getDownloadURL(storageRef);

    // Update user doc
    await updateUserProfile(userId, { photoURL });

    // Update auth profile
    const auth = getAuth();
    if (auth.currentUser) {
        const { updateProfile } = await import('firebase/auth');
        await updateProfile(auth.currentUser, { photoURL });
    }

    return photoURL;
}
