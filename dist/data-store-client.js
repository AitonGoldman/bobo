"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStoreClient = exports.Modes = void 0;
const app_1 = require("firebase/app");
require('firebase/firestore');
var Modes;
(function (Modes) {
    Modes[Modes["local"] = 0] = "local";
    Modes[Modes["firebase"] = 1] = "firebase";
    Modes[Modes["remoteFirebase"] = 2] = "remoteFirebase";
})(Modes = exports.Modes || (exports.Modes = {}));
class DataStoreClient {
    constructor(handle, collectionId, local = true) {
        this.local = true;
        this.mode = Modes.local;
        this.cachedDocments = new Map();
        this.firestoreHandle = handle;
        this.local = local;
        if (this.local == true) {
            this.mode = Modes.local;
            this.firestoreHandle.disableNetwork();
        }
        else {
            this.mode = Modes.firebase;
        }
        this.collectionId = collectionId;
    }
    snapshotPromise(ref) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield new Promise((resolve, reject) => {
                const unsubscribe = ref.onSnapshot((doc) => {
                    resolve(doc);
                    unsubscribe();
                }, (error) => {
                    reject(error);
                });
            });
        });
    }
    setTransaction(transaction) {
        if (this.mode != Modes.local) {
            this.transactionHandle = transaction;
        }
    }
    resetTransaction() {
        this.transactionHandle = undefined;
    }
    setMode(mode) {
        this.mode = mode;
    }
    setArrayUnionType(ArrayUnionType) {
        this.ArrayUnionType = ArrayUnionType;
    }
    setArrayRemoveType(ArrayRemoveType) {
        this.ArrayRemoveType = ArrayRemoveType;
    }
    runTransaction() {
        return this.firestoreHandle.runTransaction;
    }
    initFirebasePersistence() {
        return __awaiter(this, void 0, void 0, function* () {
            yield app_1.default.firestore().clearPersistence();
            yield app_1.default
                .firestore()
                .enablePersistence({ synchronizeTabs: true })
                .catch(function (err) {
                if (err.code == 'failed-precondition') {
                    console.log('ERROR 1');
                }
                else if (err.code == 'unimplemented') {
                    console.log('ERROR 2');
                }
            });
        });
    }
    query(queryTerm1, queryTerm2, queryTerm3) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.firestoreHandle
                .collection(this.collectionId)
                .where(queryTerm1, queryTerm2, queryTerm3)
                .get();
        });
    }
    createDoc(val, docId = undefined) {
        return __awaiter(this, void 0, void 0, function* () {
            let newEvent;
            if (docId == undefined) {
                newEvent = this.firestoreHandle.collection(this.collectionId).doc();
            }
            else {
                newEvent = this.firestoreHandle.collection(this.collectionId).doc(docId);
            }
            let promise;
            switch (this.mode) {
                case Modes.local:
                    promise = this.snapshotPromise(newEvent);
                    newEvent.set(val);
                    yield promise;
                    break;
                case Modes.firebase:
                    if (this.transactionHandle != undefined) {
                        yield this.transactionHandle.set(newEvent, val);
                    }
                    else {
                        yield newEvent.set(val);
                    }
                    break;
            }
            return newEvent;
        });
    }
    getCachedDoc(docId) {
        return this.cachedDocments.get(docId);
    }
    getDoc(docRefOrId) {
        return __awaiter(this, void 0, void 0, function* () {
            const docRef = this.firestoreHandle
                .collection(this.collectionId)
                .doc(docRefOrId);
            let ref;
            switch (this.mode) {
                case Modes.local:
                    ref = yield docRef.get();
                    break;
                case Modes.firebase:
                    if (this.transactionHandle != undefined) {
                        ref = yield this.transactionHandle.get(docRef);
                    }
                    else {
                        ref = yield docRef.get();
                    }
                    break;
            }
            this.cachedDocments.set(docRefOrId, ref);
            return ref;
        });
    }
    deleteDoc(docRefOrId) {
        return __awaiter(this, void 0, void 0, function* () {
            const docRef = this.firestoreHandle
                .collection(this.collectionId)
                .doc(docRefOrId);
            let promise;
            switch (this.mode) {
                case Modes.local:
                    promise = this.snapshotPromise(docRef);
                    docRef.delete();
                    yield promise;
                    break;
                case Modes.firebase:
                    if (this.transactionHandle != undefined) {
                        yield this.transactionHandle.delete(docRef);
                    }
                    else {
                        yield docRef.delete();
                    }
            }
        });
    }
    setDoc(docRefOrId, val) {
        return __awaiter(this, void 0, void 0, function* () {
            const docRef = this.firestoreHandle
                .collection(this.collectionId)
                .doc(docRefOrId);
            let promise;
            switch (this.mode) {
                case Modes.local:
                    promise = this.snapshotPromise(docRef);
                    docRef.set(val);
                    yield promise;
                    break;
                case Modes.firebase:
                    if (this.transactionHandle != undefined) {
                        yield this.transactionHandle.set(docRef, val);
                    }
                    else {
                        yield docRef.set(val);
                    }
            }
        });
    }
    updateDoc(docRefOrId, updateInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            const docRef = this.firestoreHandle
                .collection(this.collectionId)
                .doc(docRefOrId);
            let promise;
            switch (this.mode) {
                case Modes.local:
                    promise = this.snapshotPromise(docRef);
                    docRef.update(updateInfo);
                    yield promise;
                    break;
                case Modes.firebase:
                    if (this.transactionHandle != undefined) {
                        yield this.transactionHandle.update(docRef, updateInfo);
                    }
                    else {
                        yield docRef.update(updateInfo);
                    }
            }
        });
    }
    updateDocAddArray(docRefOrId, updateField, updateValue) {
        return __awaiter(this, void 0, void 0, function* () {
            const docRef = this.firestoreHandle
                .collection(this.collectionId)
                .doc(docRefOrId);
            const ArrayUnionType = this.ArrayUnionType != undefined
                ? this.ArrayUnionType
                : app_1.default.firestore.FieldValue.arrayUnion;
            const updateInfo = { [updateField]: ArrayUnionType(updateValue) };
            let promise;
            switch (this.mode) {
                case Modes.local:
                    promise = this.snapshotPromise(docRef);
                    docRef.update(updateInfo);
                    yield promise;
                    break;
                case Modes.firebase:
                    if (this.transactionHandle != undefined) {
                        yield this.transactionHandle.update(docRef, updateInfo);
                    }
                    else {
                        yield docRef.update(updateInfo);
                    }
            }
        });
    }
    updateDocRemoveArray(docRefOrId, updateField, updateValue) {
        return __awaiter(this, void 0, void 0, function* () {
            const docRef = this.firestoreHandle
                .collection(this.collectionId)
                .doc(docRefOrId);
            const ArrayRemoveType = this.ArrayRemoveType != undefined
                ? this.ArrayRemoveType
                : app_1.default.firestore.FieldValue.arrayRemove;
            const updateInfo = { [updateField]: ArrayRemoveType(updateValue) };
            let promise;
            switch (this.mode) {
                case Modes.local:
                    promise = this.snapshotPromise(docRef);
                    docRef.update(updateInfo);
                    yield promise;
                    break;
                case Modes.firebase:
                    if (this.transactionHandle != undefined) {
                        yield this.transactionHandle.update(docRef, updateInfo);
                    }
                    else {
                        yield docRef.update(updateInfo);
                    }
            }
        });
    }
}
exports.DataStoreClient = DataStoreClient;
//# sourceMappingURL=data-store-client.js.map