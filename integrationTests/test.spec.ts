import firebase from 'firebase/app';
import * as firebaseTesting from "@firebase/rules-unit-testing";
import { DataStoreClient } from '../src/data-store-client';
import { ScoringPlatform } from '../src/scoring-platform';
//import { expect } from 'chai';

function AuthedApp(projectId, auth) {
    return firebaseTesting
        .initializeTestApp({ projectId, auth })
        .firestore();
}

describe("A datastore client", function() {
    it("is a test",async function(){
        const projectId = "firestore-emulator-example";
        //const db = AuthedApp(projectId, { uid: "alice" });
        const app = firebase.initializeApp({projectId:"test-project"})
        const db = app.firestore();        
        db.useEmulator("localhost",8080);
        const dsClient = new DataStoreClient(db, "rooms", false);
        dsClient.setArrayUnionType(firebase.firestore.FieldValue.arrayUnion);
        dsClient.setArrayRemoveType(firebase.firestore.FieldValue.arrayRemove);
        const platform = new ScoringPlatform(dsClient);
        const eventId = await platform.createEvent("Test Event");
        expect("hi").toEqual("aiton");
    })
})