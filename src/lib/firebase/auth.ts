import {
    signInWithPopup,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    deleteUser,
    updateProfile,
    User,
} from 'firebase/auth';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<User> {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    // Create/update user document in Firestore on every Google login
    await setDoc(
        doc(db, 'users', user.uid),
        {
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
    return user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
}

export async function signUpWithEmail(
    name: string,
    email: string,
    password: string
): Promise<User> {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;
    await updateProfile(user, { displayName: name });
    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
        displayName: name,
        email,
        photoURL: null,
        phone: '',
        createdAt: serverTimestamp(),
        credits: 0,
        role: 'player',
    });
    return user;
}

export async function signOut(): Promise<void> {
    await firebaseSignOut(auth);
}

export async function deleteAccount(): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Nenhum usuário autenticado');
    await deleteDoc(doc(db, 'users', user.uid));
    await deleteUser(user);
}
