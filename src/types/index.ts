export interface UserProfile {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string | null;
    phone: string;
    createdAt: Date;
    credits: number;
    role: 'player' | 'admin';
}

export interface MatchParticipant {
    status: 'confirmed' | 'declined';
    paid: boolean;
}

export interface Match {
    id: string;
    title: string;
    date: Date;
    location: string;
    maxPlayers: number;
    pricePerPlayer: number;
    createdBy: string;
    isRecurring: boolean;
    recurringDay?: number; // 0=Sunday, 6=Saturday
    participants: Record<string, MatchParticipant>;
    status: 'upcoming' | 'completed' | 'cancelled';
    description?: string;
}

export interface Payment {
    id: string;
    userId: string;
    matchId?: string;
    amount: number;
    receiptUrl?: string;
    status: 'pending' | 'validated' | 'rejected';
    enteredBy: string;
    enteredByAdmin: boolean;
    visionAnalysis?: {
        amount?: number;
        date?: string;
        description?: string;
        confidence?: number;
    };
    description?: string;
    createdAt: Date;
    validatedAt?: Date;
    validatedBy?: string;
}

export interface CreditTransaction {
    id: string;
    userId: string;
    type: 'credit' | 'debit';
    amount: number;
    ref: string; // paymentId or matchId
    refType: 'payment' | 'match';
    description: string;
    date: Date;
    balance: number;
}

export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'match_reminder' | 'credit_added' | 'credit_deducted' | 'payment_pending' | 'payment_validated';
    read: boolean;
    createdAt: Date;
}
