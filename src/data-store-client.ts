import firebase from 'firebase/app';
//import { doc } from 'prettier';
require('firebase/firestore');
import * as firebaseAdmin from 'firebase-admin';

//import * as firebaseAdmin from "firebase/firestore"
export enum Modes {
  local,
  firebase,
  remoteFirebase,
}

export class DataStoreClient {
  firestoreHandle: firebase.firestore.Firestore;
  //FIXME : need a separate api firestore handle
  //|FirebaseFirestore.Firestore
  //FIXME : re-implement ability to handle admin-sdk calls
  //apiTransactionHandle: FirebaseFirestore.Transaction;
  //transactionHandle: firebase.firestore.Transaction;
  transactionHandle: firebase.firestore.Transaction;

  collectionId: string;
  //FIXME : need ability to make non-local read requests without transactions
  // check if transaction exists - if it does, use it
  // rely on decorator/external source clearing transaction
  //FIXME : need ability to force docId only ( no refs ) when transactions are being used - or find a link from the transaction docref to a real one?
  local = true;
  mode: Modes = Modes.local;
  ArrayUnionType;
  ArrayRemoveType;
  cachedDocments:Map<string,firebase.firestore.DocumentSnapshot>;

  async snapshotPromise(
    ref: firebase.firestore.DocumentReference
  ): Promise<firebase.firestore.DocumentData> {
    return await new Promise((resolve, reject) => {
      const unsubscribe = ref.onSnapshot(
        (doc) => {
          resolve(doc);
          unsubscribe();
        },
        (error) => {
          reject(error);
        }
      );
    });
  }
 
  setTransaction(transaction: firebase.firestore.Transaction): void {
    if (this.mode != Modes.local) {
      this.transactionHandle = transaction;
    }
    // else {
    //   this.apiTransactionHandle = transaction;
    // }
  }

  resetTransaction(): void {
    this.transactionHandle = undefined;
    //this.apiTransactionHandle = undefined;
  }

  setMode(mode: Modes): void {
    this.mode = mode;
  }

  setArrayUnionType(ArrayUnionType): void {
    this.ArrayUnionType = ArrayUnionType;
  }

  setArrayRemoveType(ArrayRemoveType): void {
    this.ArrayRemoveType = ArrayRemoveType;
  }

  constructor(
    handle: firebase.firestore.Firestore, // | FirebaseFirestore.Firestore,
    collectionId: string,
    local = true
  ) {
    this.cachedDocments = new Map<string,firebase.firestore.DocumentSnapshot>();

    this.firestoreHandle = handle;
    this.local = local;
    if (this.local == true) {
      this.mode = Modes.local;
      this.firestoreHandle.disableNetwork();
    } else {
      this.mode = Modes.firebase;
    }
    this.collectionId = collectionId;
  }

  runTransaction(){
    return this.firestoreHandle.runTransaction;
  }
  async initFirebasePersistence(): Promise<void> {
    await firebase.firestore().clearPersistence();
    await firebase
      .firestore()
      .enablePersistence({ synchronizeTabs: true })
      .catch(function (err) {
        if (err.code == 'failed-precondition') {
          // Multiple tabs open, persistence can only be enabled
          // in one tab at a a time.
          // ...
          console.log('ERROR 1');
        } else if (err.code == 'unimplemented') {
          // The current browser does not support all of the
          // features required to enable persistence
          // ...
          console.log('ERROR 2');
        }
      });
  }

  async query(
    queryTerm1: string,
    queryTerm2: firebase.firestore.WhereFilterOp,
    queryTerm3: string
  ): Promise<
    firebase.firestore.QuerySnapshot<firebase.firestore.DocumentData>
  > {
    return await this.firestoreHandle
      .collection(this.collectionId)
      .where(queryTerm1, queryTerm2, queryTerm3)
      .get();
  }

  async createDoc(
    val: any,
    docId: string = undefined
  ): Promise<
    firebase.firestore.DocumentReference<firebase.firestore.DocumentData>
  > {
    let newEvent: firebase.firestore.DocumentReference<firebase.firestore.DocumentData>;
    if (docId == undefined) {
      newEvent = this.firestoreHandle.collection(this.collectionId).doc();
    } else {
      newEvent = this.firestoreHandle.collection(this.collectionId).doc(docId);
    }
    let promise;
    switch (this.mode) {
      case Modes.local:
        promise = this.snapshotPromise(newEvent);
        newEvent.set(val);
        await promise;
        break;
      case Modes.firebase:
        if (this.transactionHandle != undefined) {
        //FIXME : probably don't need this await
          await this.transactionHandle.set(newEvent, val);
        } else {
          await newEvent.set(val);
        }
        break;
      //   case Modes.remoteFirebase:
      //     if (this.apiTransactionHandle != undefined) {
      //       await this.apiTransactionHandle.set(newEvent, val);
      //     } else {
      //       await newEvent.set(val);
      //     }
      //     break;
    }
    return newEvent;
  }

  getCachedDoc(docId:string){
    return this.cachedDocments.get(docId);
  }

  async getDoc(
    docRefOrId: string
  ): Promise<
    firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData>
  > {
    const docRef:
      | FirebaseFirestore.DocumentReference
      | firebase.firestore.DocumentReference = this.firestoreHandle
      .collection(this.collectionId)
      .doc(docRefOrId);
    let ref:firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData>;
    switch (this.mode) {
      case Modes.local:
        //const promise = this.snapshotPromise(docRef);
        // return await docRef.get();
        ref = await docRef.get();
        break;
      //return await promise;
      case Modes.firebase:
        if (this.transactionHandle != undefined) {
          //FIXME : probably don't need this await
          // return await this.transactionHandle.get(
          //   docRef as firebase.firestore.DocumentReference
          // );
          ref = await this.transactionHandle.get(
                  docRef as firebase.firestore.DocumentReference
                ); 
        } else {
          //return await docRef.get();
          ref = await docRef.get();
        }
        break;
      //   case Modes.remoteFirebase:
      //     if (this.apiTransactionHandle != undefined) {
      //       return await this.apiTransactionHandle.get(
      //         docRef as FirebaseFirestore.DocumentReference
      //       );
      //     } else {
      //       return await docRef.get();
      //     }
    }
    this.cachedDocments.set(docRefOrId,ref);
    return ref;
  }

  async deleteDoc(docRefOrId: string): Promise<void> {
    const docRef:
      | FirebaseFirestore.DocumentReference
      | firebase.firestore.DocumentReference = this.firestoreHandle
      .collection(this.collectionId)
      .doc(docRefOrId);
    let promise;
    switch (this.mode) {
      case Modes.local:
        promise = this.snapshotPromise(
          docRef as firebase.firestore.DocumentReference
        );
        docRef.delete();
        await promise;
        break;
      case Modes.firebase:
        if (this.transactionHandle != undefined) {
          //FIXME : probably don't need this await
          await this.transactionHandle.delete(
            docRef as firebase.firestore.DocumentReference
          );
        } else {
          await docRef.delete();
        }
      //   case Modes.remoteFirebase:
      //     if (this.apiTransactionHandle != undefined) {
      //       return await this.apiTransactionHandle.delete(
      //         docRef as FirebaseFirestore.DocumentReference
      //       );
      //     } else {
      //       return await docRef.delete();
      //     }
    }
  }

  async setDoc(docRefOrId: string, val: any): Promise<void> {
    const docRef:
      | FirebaseFirestore.DocumentReference
      | firebase.firestore.DocumentReference = this.firestoreHandle
      .collection(this.collectionId)
      .doc(docRefOrId);
    let promise;
    switch (this.mode) {
      case Modes.local:
        promise = this.snapshotPromise(
          docRef as firebase.firestore.DocumentReference
        );
        docRef.set(val);
        await promise;
        break;
      case Modes.firebase:
        if (this.transactionHandle != undefined) {
          await this.transactionHandle.set(
            docRef as firebase.firestore.DocumentReference,
            val
          );
        } else {
          await docRef.set(val);
        }
      //   case Modes.remoteFirebase:
      //     if (this.apiTransactionHandle != undefined) {
      //       return await this.apiTransactionHandle.set(
      //         docRef as FirebaseFirestore.DocumentReference,
      //         val
      //       );
      //     } else {
      //       return await docRef.set(val);
      //     }
    }
  }

  async updateDoc(docRefOrId: string, updateInfo: any): Promise<void> {
    //FIXME : use updateInfo to update cache
    //        https://stackoverflow.com/questions/4244896/dynamically-access-object-property-using-variable
    const docRef:
      | FirebaseFirestore.DocumentReference
      | firebase.firestore.DocumentReference = this.firestoreHandle
      .collection(this.collectionId)
      .doc(docRefOrId);
    let promise;
    switch (this.mode) {
      case Modes.local:
        promise = this.snapshotPromise(
          docRef as firebase.firestore.DocumentReference
        );
        docRef.update(updateInfo);
        await promise;
        break;
      case Modes.firebase:
        if (this.transactionHandle != undefined) {
          await this.transactionHandle.update(
            docRef as firebase.firestore.DocumentReference,
            updateInfo
          );
        } else {
          await docRef.update(updateInfo);
        }
      //   case Modes.remoteFirebase:
      //     if (this.apiTransactionHandle != undefined) {
      //       return await this.apiTransactionHandle.update(
      //         docRef as FirebaseFirestore.DocumentReference,
      //         updateInfo
      //       );
      //     } else {
      //       return await docRef.update(updateInfo);
      //     }
    }
  }

  async updateDocAddArray(
    docRefOrId: string,
    updateField: any,
    updateValue: any
  ): Promise<void> {
    const docRef:
      | FirebaseFirestore.DocumentReference
      | firebase.firestore.DocumentReference = this.firestoreHandle
      .collection(this.collectionId)
      .doc(docRefOrId);
    //Needed so integration tests don't puke
    const ArrayUnionType =
      this.ArrayUnionType != undefined
        ? this.ArrayUnionType
        : firebase.firestore.FieldValue.arrayUnion;
    const updateInfo = { [updateField]: ArrayUnionType(updateValue) };
    let promise;
    switch (this.mode) {
      case Modes.local:
        promise = this.snapshotPromise(
          docRef as firebase.firestore.DocumentReference
        );
        docRef.update(updateInfo);
        await promise;
        break;
      case Modes.firebase:
        if (this.transactionHandle != undefined) {
          await this.transactionHandle.update(
            docRef as firebase.firestore.DocumentReference,
            updateInfo
          );
        } else {
          await docRef.update(updateInfo);
        }
      //   case Modes.remoteFirebase:
      //     if (this.apiTransactionHandle != undefined) {
      //       return await this.apiTransactionHandle.update(
      //         docRef as FirebaseFirestore.DocumentReference,
      //         updateInfo
      //       );
      //     } else {
      //       return await docRef.update(updateInfo);
      //     }
    }
  }

  async updateDocRemoveArray(
    docRefOrId: string,
    updateField: any,
    updateValue: any
  ): Promise<void> {
    const docRef:
      | FirebaseFirestore.DocumentReference
      | firebase.firestore.DocumentReference = this.firestoreHandle
      .collection(this.collectionId)
      .doc(docRefOrId);
    //Needed so integration tests don't puke
    const ArrayRemoveType =
      this.ArrayRemoveType != undefined
        ? this.ArrayRemoveType
        : firebase.firestore.FieldValue.arrayRemove;
    const updateInfo = { [updateField]: ArrayRemoveType(updateValue) };
    let promise;
    switch (this.mode) {
      case Modes.local:
        promise = this.snapshotPromise(
          docRef as firebase.firestore.DocumentReference
        );
        docRef.update(updateInfo);
        await promise;
        break;
      case Modes.firebase:
        if (this.transactionHandle != undefined) {
          await this.transactionHandle.update(
            docRef as firebase.firestore.DocumentReference,
            updateInfo
          );
        } else {
          await docRef.update(updateInfo);
        }
      //   case Modes.remoteFirebase:
      //     if (this.apiTransactionHandle != undefined) {
      //       return await this.apiTransactionHandle.update(
      //         docRef as FirebaseFirestore.DocumentReference,
      //         updateInfo
      //       );
      //     } else {
      //       return await docRef.update(updateInfo);
      //     }
    }
  }
}
