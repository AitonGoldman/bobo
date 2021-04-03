//import * as jasmine from 'jasmine';

import { DataStoreClient } from "../src/data-store-client";
import * as firebaseTesting from "@firebase/rules-unit-testing";
import { Mock } from 'ts-mockery';
import firebase from 'firebase/app';

interface TestWithMockProperties {
    //localDatastoreClient: DataStoreClient;
    mockFirebaseContainer?: MockFirebaseContainer;
    datastoreClient: DataStoreClient;
}

interface MockFirebaseContainer {
    mockFirebase?;
    mockFirebaseDocData?;
    mockFirebaseDoc?;
    mockFirebaseCollection?;
    mockFirebaseTransactionHandle?;
    mockFirebaseTransactionDocData?;
}

function buildMockFirebase(projectId, auth) {
    const mockFirebaseContainer: MockFirebaseContainer = {};
    const mockHandle = Mock.from<firebase.firestore.Firestore>(firebaseTesting.initializeTestApp({ projectId, auth }).firestore());
    const mockCollectionHandle = Mock.of<firebase.firestore.CollectionReference<firebase.firestore.DocumentData>>();
    const mockDocHandle = Mock.of<firebase.firestore.DocumentReference<firebase.firestore.DocumentData>>();
    const mockLocalDocData = Mock.of<firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData>>();
    const mockDocData = Mock.of<firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData>>();
    const mockTransactionDocData = Mock.of<firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData>>();

    const mockTransactionHandle = Mock.of<firebase.firestore.Transaction>();
    const mockTransaction = Mock.of<firebase.firestore.Transaction>();
    Mock.extend(mockDocHandle).with({
        set: (data) => { return new Promise<void>((acc, rej) => { acc() }) },
        delete: (data) => { return new Promise<void>((acc, rej) => { acc() }) },
        update: (data) => { return new Promise<void>((acc, rej) => { acc() }) },
        onSnapshot: (...a) => {
            (a[0] as Function)();
            return new Promise<void>((acc, rej) => { acc() })
        },
        get: () => { return new Promise<firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData>>((acc, rej) => { acc(mockDocData) }) }
    });
    Mock.extend(mockCollectionHandle).with({ doc: (docid: string) => { return mockDocHandle } });
    Mock.extend(mockHandle).with({ collection: (...a: string[]) => { return mockCollectionHandle } })
    Mock.extend(mockTransactionHandle).with({
        set: (...a) => { return mockTransaction },
        delete: (...a) => { return mockTransaction },
        update: (...a) => { return mockTransaction },
        get: (...a) => { return new Promise<firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData>>((acc, rej) => { acc(mockTransactionDocData) }) }
    })
    mockFirebaseContainer.mockFirebase = mockHandle;
    mockFirebaseContainer.mockFirebaseDocData = mockDocData;
    mockFirebaseContainer.mockFirebaseDoc = mockDocHandle;
    mockFirebaseContainer.mockFirebaseCollection = mockCollectionHandle;
    mockFirebaseContainer.mockFirebaseTransactionDocData = mockTransactionDocData;
    mockFirebaseContainer.mockFirebaseTransactionHandle = mockTransactionHandle;
    return mockFirebaseContainer;
}
function changeDocReturned(mockDoc, newData) {
    Mock.extend(mockDoc).with({
        data: () => {
            return { mockData: newData };
        }
    })
}
["local", "remoteTransaction"].forEach(dsClientType => {
    describe("A "+dsClientType+" datastore client", function () {

        beforeEach(function (this: TestWithMockProperties) {
            Mock.configure("jasmine");
            const projectId = "firestore-emulator-example";
            const auth = { uid: "alics" };
            this.mockFirebaseContainer = buildMockFirebase(projectId, auth) as MockFirebaseContainer;
            const enableLocalDsClient = dsClientType == "local"?true:false;
            this.datastoreClient = new DataStoreClient(this.mockFirebaseContainer.mockFirebase, "testCollection", enableLocalDsClient) as DataStoreClient;
            //this.localDatastoreClient =  new DataStoreClient(this.mockFirebaseContainer.mockFirebase,"testCollection",true) as DataStoreClient;
            changeDocReturned(this.mockFirebaseContainer.mockFirebaseDocData, "POOP");
            changeDocReturned(this.mockFirebaseContainer.mockFirebaseTransactionDocData, "TRANSACTION POOP");

            if (dsClientType == "remoteTransaction") {
                this.datastoreClient.setTransaction(this.mockFirebaseContainer.mockFirebaseTransactionHandle);
            }
        });
        it("can create a document with a document id ", async function (this: TestWithMockProperties) {
            const createDocResult = await this.datastoreClient.createDoc({ test: 'data' }, 'testIdOne');
            expect(this.mockFirebaseContainer.mockFirebaseCollection.doc).toHaveBeenCalledWith('testIdOne');
            if (dsClientType == "local") {
                //FIXME : onSnapshot gets functions passed in - is there any way to check functions as args?
                expect(this.mockFirebaseContainer.mockFirebaseDoc.onSnapshot).toHaveBeenCalledTimes(1);
            }
            if (dsClientType == "remoteTransaction") {
                expect(this.mockFirebaseContainer.mockFirebaseTransactionHandle.set).toHaveBeenCalledOnceWith(this.mockFirebaseContainer.mockFirebaseDoc, { test: 'data' });
            } else {
                expect(this.mockFirebaseContainer.mockFirebaseDoc.set).toHaveBeenCalledOnceWith({ test: 'data' });
            }
            expect(createDocResult).toEqual(this.mockFirebaseContainer.mockFirebaseDoc);
        })
        it("can create a document without a document id ", async function (this: TestWithMockProperties) {
            const createDocResult = await this.datastoreClient.createDoc({ test: 'data' });
            expect(this.mockFirebaseContainer.mockFirebaseCollection.doc).toHaveBeenCalledWith();
            if (dsClientType == "local") {
                expect(this.mockFirebaseContainer.mockFirebaseDoc.onSnapshot).toHaveBeenCalledTimes(1);
            }
            if (dsClientType == "remoteTransaction") {
                expect(this.mockFirebaseContainer.mockFirebaseTransactionHandle.set).toHaveBeenCalledOnceWith(this.mockFirebaseContainer.mockFirebaseDoc, { test: 'data' });
            } else {
                expect(this.mockFirebaseContainer.mockFirebaseDoc.set).toHaveBeenCalledOnceWith({ test: 'data' });
            }
            expect(createDocResult).toEqual(this.mockFirebaseContainer.mockFirebaseDoc);
        });
        it("can get a document", async function (this: TestWithMockProperties) {
            const getDocResult = await this.datastoreClient.getDoc("testDoc");
            if (dsClientType == "local" || dsClientType == "remote") {
                expect(getDocResult.data()).toEqual({ mockData: "POOP" })
            } else {
                expect(getDocResult.data()).toEqual({ mockData: 'TRANSACTION POOP' })
            }
        });
        it("can delete a document", async function (this: TestWithMockProperties) {
            const createDocResult = await this.datastoreClient.deleteDoc('testIdOne');
            expect(this.mockFirebaseContainer.mockFirebaseCollection.doc).toHaveBeenCalledWith('testIdOne');
            if (dsClientType == "local") {
                expect(this.mockFirebaseContainer.mockFirebaseDoc.onSnapshot).toHaveBeenCalledTimes(1);
            }
            if (dsClientType == "remoteTransaction") {
                expect(this.mockFirebaseContainer.mockFirebaseTransactionHandle.delete).toHaveBeenCalledTimes(1);
            } else {
                expect(this.mockFirebaseContainer.mockFirebaseDoc.delete).toHaveBeenCalledTimes(1);
            }
        });

        it("can set a document", async function (this: TestWithMockProperties) {
            const createDocResult = await this.datastoreClient.setDoc('testIdOne', { test: 'data' });
            expect(this.mockFirebaseContainer.mockFirebaseCollection.doc).toHaveBeenCalledWith('testIdOne');
            if (dsClientType == "local") {
                expect(this.mockFirebaseContainer.mockFirebaseDoc.onSnapshot).toHaveBeenCalledTimes(1);
            }
            if (dsClientType == "remoteTransaction") {
                expect(this.mockFirebaseContainer.mockFirebaseTransactionHandle.set).toHaveBeenCalledOnceWith(this.mockFirebaseContainer.mockFirebaseDoc, { test: 'data' });
            } else {
                expect(this.mockFirebaseContainer.mockFirebaseDoc.set).toHaveBeenCalledOnceWith({ test: 'data' });
            }
        });

        it("can update a document by adding to an array", async function (this: TestWithMockProperties) {
            const createDocResult = await this.datastoreClient.updateDocAddArray('testIdOne', "dummyField", "dummyValue");
            expect(this.mockFirebaseContainer.mockFirebaseCollection.doc).toHaveBeenCalledWith('testIdOne');
            if (dsClientType == "local") {
                expect(this.mockFirebaseContainer.mockFirebaseDoc.onSnapshot).toHaveBeenCalledTimes(1);
            }
            if (dsClientType == "remoteTransaction") {
                expect(this.mockFirebaseContainer.mockFirebaseTransactionHandle.update).toHaveBeenCalledOnceWith(
                    this.mockFirebaseContainer.mockFirebaseDoc,
                    { dummyField: firebase.firestore.FieldValue.arrayUnion("dummyValue") }
                );
            } else {
                expect(this.mockFirebaseContainer.mockFirebaseDoc.update).toHaveBeenCalledOnceWith(
                    { dummyField: firebase.firestore.FieldValue.arrayUnion("dummyValue") }
                );
            }
        });

        it("can update a document by removing from any array", async function (this: TestWithMockProperties) {
            const createDocResult = await this.datastoreClient.updateDocRemoveArray('testIdOne', "dummyField", "dummyValue");
            expect(this.mockFirebaseContainer.mockFirebaseCollection.doc).toHaveBeenCalledWith('testIdOne');
            if (dsClientType == "local") {
                expect(this.mockFirebaseContainer.mockFirebaseDoc.onSnapshot).toHaveBeenCalledTimes(1);
            }
            if (dsClientType == "remoteTransaction") {
                expect(this.mockFirebaseContainer.mockFirebaseTransactionHandle.update).toHaveBeenCalledOnceWith(
                    this.mockFirebaseContainer.mockFirebaseDoc,
                    { dummyField: firebase.firestore.FieldValue.arrayRemove("dummyValue") }
                );
            } else {
                expect(this.mockFirebaseContainer.mockFirebaseDoc.update).toHaveBeenCalledOnceWith(
                    { dummyField: firebase.firestore.FieldValue.arrayRemove("dummyValue") }
                );
            }
        });
        it("can update a document", async function (this: TestWithMockProperties) {
            const createDocResult = await this.datastoreClient.updateDoc('testIdOne', { dummyField: "dummyValue" });
            expect(this.mockFirebaseContainer.mockFirebaseCollection.doc).toHaveBeenCalledWith('testIdOne');
            if (dsClientType == "local") {
                expect(this.mockFirebaseContainer.mockFirebaseDoc.onSnapshot).toHaveBeenCalledTimes(1);
            }
            if (dsClientType == "remoteTransaction") {
                expect(this.mockFirebaseContainer.mockFirebaseTransactionHandle.update).toHaveBeenCalledOnceWith(
                    this.mockFirebaseContainer.mockFirebaseDoc,
                    { dummyField: "dummyValue" }
                );
            } else {
                expect(this.mockFirebaseContainer.mockFirebaseDoc.update).toHaveBeenCalledOnceWith({ dummyField: "dummyValue" });
            }
        });
        it("can cache a document after getting a document", async function (this: TestWithMockProperties) {
            const getDocResult = await this.datastoreClient.getDoc("testDoc");
            expect(getDocResult.data()).toEqual(this.datastoreClient.cachedDocments.get("testDoc").data());
        })
        it("can gracefully handle an error while getting, deleting, updating, creating, or setting", async function(this: TestWithMockProperties) {

        });
        it("can gracefully handle updating a document that doesn't exist", async function(this: TestWithMockProperties) {

        });
        it("can gracefully handle getting a document that doesn't exist", async function(this: TestWithMockProperties) {

        });
        it("can gracefully handle deleting a document that doesn't exist", async function(this: TestWithMockProperties) {

        });
        it("can query for documents", function(){

        })
    });
});
