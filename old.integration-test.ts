import * as firebaseTesting from "@firebase/rules-unit-testing";
import firebase from 'firebase/app';
import * as fs from "fs";
import { DataStoreClient } from "../src/data-store-client";
const assert = require("assert");
import admin from "firebase-admin";
import { suite, test, skip } from "@testdeck/mocha";
import { transaction } from "../src/transaction";
import { firestore } from "firebase-admin";
import { ScoringPlatform } from "../src/scoring-platform";
// scenario : 
// - get doc
// - create doc
// - update doc
// - array operations
// - delete doc
// - query
// transaction
// - local
// - emulator
// non-transaction
// - local
// - emulator

const projectId = "firestore-emulator-example";
const coverageUrl = `http://localhost:8080/emulator/v1/projects/${projectId}:ruleCoverage.html`;

const rules = fs.readFileSync("firestore.rules.unit-test", "utf8");

/**
 * Creates a new app with authentication data matching the input.
 *
 * @param {object} auth the object to use for authentication (typically {uid: some-uid})
 * @return {object} the app.
 */
function authedApp(auth) {
    return firebaseTesting
        .initializeTestApp({ projectId, auth })
        .firestore();
}

/*
 * ============
 *  Test Cases
 * ============
 */

before(async () => {
    await firebaseTesting.loadFirestoreRules({ projectId, rules });
});

beforeEach(async () => {
    // Clear the database between tests
    await firebaseTesting.clearFirestoreData({ projectId });
});

after(async () => {
    await Promise.all(firebaseTesting.apps().map(app => app.delete()));
    //console.log(`View rule coverage information at ${coverageUrl}\n`);
});

function randomNumber(min, max) {  
    return Math.random() * (max - min) + min; 
}  

@suite
class MyApp {     
    // @transaction()
    // async testTransaction(){
    //     console.log((await this.dsClient.getDoc("1")).data());        
    //     const docHandle = await this.dsClient.createDoc({poop:"onr"},"2");
    //     console.log(docHandle.id);
    // }
    // dsClient: DataStoreClient;     
    // @test
    // @skip
    // async "add player to queue and start game"(){
    //     //const db = authedApp({ uid: "alice" });
    //     firebase.initializeApp({projectId:"test"});
    //     const db = firebase.firestore();        
    //     //db.useEmulator("localhost",8080);
    //     const dsClient = new DataStoreClient(db, "rooms", false);
    //     dsClient.setArrayUnionType(firebaseTesting.firestore.FieldValue.arrayUnion);
    //     dsClient.setArrayRemoveType(firebaseTesting.firestore.FieldValue.arrayRemove);
    //     const docHandle = await dsClient.createDoc({poop:"one"},"1");
    //     this.dsClient = dsClient;
    //     await this.testTransaction();   
    //     //const db2 = authedApp({ uid: "alice" });
    //     //const dsClient2 = new DataStoreClient(db2, "rooms", true);
    // }
    
    // @test
    // @skip
    // async "add player to queue and start game 2"(){
    //     //const db = authedApp({ uid: "alice" });
    //     //firebase.default.initializeApp({projectId:"test"});
    //     let app = firebase.initializeApp({projectId:"test"});
    //     //let normalInstance = app.firestore();
    //     //app.firestore().disableNetwork();
    //     const db = firebase.firestore();        
    //     db.useEmulator("localhost",8080);
    //     const dsClient = new DataStoreClient(db, "rooms", false);
    //     // dsClient.initFirebasePersistence();       
    //     const docHandle = await dsClient.createDoc({poop:"one"},"1");
    //     this.dsClient = dsClient;
    //     await this.testTransaction();   
    //     console.log((await this.dsClient.getDoc("2")).data());        
    //     //const db2 = authedApp({ uid: "alice" });
    //     //const dsClient2 = new DataStoreClient(db2, "rooms", true);
    //     //admin.initializeApp({projectId:"test"});
    //     //let adminInstance = admin.firestore();
    //     //adminInstance = normalInstance;
    // }    
    @test
    async "test platform"(){       
        const app = firebase.initializeApp({projectId:"test"});
        //const db = authedApp({ uid: "alice" });

        const db = firebase.firestore();        
        db.useEmulator("localhost",8080);
        const dsClient = new DataStoreClient(db, "rooms", false);
        const platform = new ScoringPlatform(dsClient);
        const eventId = await platform.createEvent("testEvent");
        // //console.log(eventId);
        const tournamentId = await platform.createTournament("testTournament",eventId, "HERB",
        {requireTickets: true,
        requireGameStart: false,
        papaStyle: false,
        numberOfPlaysOnTicket:5,
        maxTickets:5}
        );
        const machineId = await platform.createMachine(eventId,tournamentId,"Metallica");
        const playerId = await platform.createPlayer("Aiton Goldman",eventId);
        //await platform.boboPurchaseTicket(eventId,tournamentId,playerId,1,1);
        await platform.realPurchaseTicket(eventId,tournamentId,playerId,1,1);
        //console.log((await dsClient.getDoc(eventId)).data().listOfPlayers);        
        await platform.recordScore(eventId,tournamentId,machineId,{pinballScores: [{machineId:machineId,scoringPlayers: [{playerId:playerId,score:123}]}]},playerId);
        await platform.realPurchaseTicket(eventId,tournamentId,playerId,1,1);
        await platform.recordScore(eventId,tournamentId,machineId,{pinballScores: [{machineId:machineId,scoringPlayers: [{playerId:playerId,score:123}]}]},playerId);

        console.log((await dsClient.getDoc(eventId)).data().listOfPlayers);        
        
        app.delete();
    }    
}
