import firebase from 'firebase/app';
export declare enum Modes {
    local = 0,
    firebase = 1,
    remoteFirebase = 2
}
export declare class DataStoreClient {
    firestoreHandle: firebase.firestore.Firestore;
    transactionHandle: firebase.firestore.Transaction;
    collectionId: string;
    local: boolean;
    mode: Modes;
    ArrayUnionType: any;
    ArrayRemoveType: any;
    cachedDocments: Map<string, firebase.firestore.DocumentSnapshot>;
    snapshotPromise(ref: firebase.firestore.DocumentReference): Promise<firebase.firestore.DocumentData>;
    setTransaction(transaction: firebase.firestore.Transaction): void;
    resetTransaction(): void;
    setMode(mode: Modes): void;
    setArrayUnionType(ArrayUnionType: any): void;
    setArrayRemoveType(ArrayRemoveType: any): void;
    constructor(handle: firebase.firestore.Firestore, collectionId: string, local?: boolean);
    runTransaction(): <T>(updateFunction: (transaction: firebase.firestore.Transaction) => Promise<T>) => Promise<T>;
    initFirebasePersistence(): Promise<void>;
    query(queryTerm1: string, queryTerm2: firebase.firestore.WhereFilterOp, queryTerm3: string): Promise<firebase.firestore.QuerySnapshot<firebase.firestore.DocumentData>>;
    createDoc(val: any, docId?: string): Promise<firebase.firestore.DocumentReference<firebase.firestore.DocumentData>>;
    getCachedDoc(docId: string): firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData>;
    getDoc(docRefOrId: string): Promise<firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData>>;
    deleteDoc(docRefOrId: string): Promise<void>;
    setDoc(docRefOrId: string, val: any): Promise<void>;
    updateDoc(docRefOrId: string, updateInfo: any): Promise<void>;
    updateDocAddArray(docRefOrId: string, updateField: any, updateValue: any): Promise<void>;
    updateDocRemoveArray(docRefOrId: string, updateField: any, updateValue: any): Promise<void>;
}
