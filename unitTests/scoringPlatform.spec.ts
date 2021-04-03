import { Mock } from 'ts-mockery';
import { DataStoreClient, Modes } from '../src/data-store-client';
import { ScoringPlatform, TournamentTypes } from '../src/scoring-platform';
import firebase from 'firebase/app';
import { EventModel, EventQueueItemModel, TournamentModel, TournamentSettings } from '../src/models';
import { plainToClass } from 'class-transformer';
import { HerbDeserializedString, reviver } from '../src/HerbRanker';
import { queue } from 'rxjs';

interface scoringPlatformTestWithProperties {
    datastoreClient: DataStoreClient;
    scoringPlatform: ScoringPlatform;
    mockTransaction: firebase.firestore.Transaction;
    mockTransactionHandle: firebase.firestore.Transaction;
    mockDoc: firebase.firestore.DocumentReference<firebase.firestore.DocumentData>;
}

function setMockMethodResponsePromise(target: any, method: string, returnValue: any) {
    Mock.extend(target).with({
        [method]: (data) => { return new Promise((acc, rej) => { acc(returnValue) }) }
    })
}

function setMockMethodResponse(target: any, method: string, returnValue: any) {
    Mock.extend(target).with({
        [method]: (data) => { return returnValue }
    })
}

function createFakeEvent(nextTournamentId="T1",nextMachineId="M1",nextPlayerId="P101"){
    return {
        nextMachineId:nextMachineId,
        nextTournamentId:nextTournamentId,
        nextPlayerId:nextPlayerId,
        tournaments:{},
        listOfPlayers:{}
    };
}

function createFakePlayer(fakeEvent,playerId="P101",playerName="Test Player"){
    fakeEvent.listOfPlayers[playerId]={ playerName: "Test Player", ticketCounts: {}}
}

function createFakeTicketCounts(fakeEvent,playerId="P101",fakeTournament="T1",ticketCount=0){
    fakeEvent.listOfPlayers[playerId].ticketCounts[fakeTournament]=ticketCount;
}

function createFakeTournament(fakeEvent,tournamentId="T1",tournamentName="Test Tournament",type=TournamentTypes.HERB){
    fakeEvent.tournaments[tournamentId]={
        type:type,
        tournamentName:tournamentName,
        machines:{},
        results:'{"tournamentRankings":[],"machineRankings":{"dataType":"Map","value":[]}}'
    }
}

function createFakeTournamentSettings(fakeEvent,settings,tournamentId="T1"){
    fakeEvent.tournaments[tournamentId].settings=settings;
}

function createFakeMachine(fakeEvent,fakeTournamentId="T1",machineId="M1",currentPlayer=undefined,machineName="Test Machine"){
    fakeEvent.tournaments[fakeTournamentId].machines[machineId]={
        machineName:machineName,
        machineQueue: [],
        currentPlayer: currentPlayer
    }
}

["local", "remoteTransaction"].forEach(dsClientType => {
    describe("A " + dsClientType + " scoring platform", function () {

        beforeEach(function (this: scoringPlatformTestWithProperties) {
            Mock.configure("jasmine");
            this.datastoreClient = Mock.of<DataStoreClient>();
            setMockMethodResponsePromise(this.datastoreClient, 'updateDoc', null);
            setMockMethodResponsePromise(this.datastoreClient, 'setDoc', null);
            setMockMethodResponsePromise(this.datastoreClient, 'createDoc', null);
            setMockMethodResponsePromise(this.datastoreClient, 'getCachedDoc', undefined);

            this.scoringPlatform = new ScoringPlatform(this.datastoreClient);
            this.mockTransactionHandle = Mock.of<firebase.firestore.Transaction>();
            this.mockDoc = Mock.of<firebase.firestore.DocumentReference<firebase.firestore.DocumentData>>();

            if (dsClientType != "local") {
                this.datastoreClient.transactionHandle = this.mockTransactionHandle;
                this.datastoreClient.local = false;
                this.datastoreClient.mode = Modes.firebase;
            } else {
                this.datastoreClient.local = true;
                this.datastoreClient.mode = Modes.local;
            }
        })
        it('can create a event', async function (this: scoringPlatformTestWithProperties) {
            setMockMethodResponsePromise(this.datastoreClient, 'createDoc', { id: "UniqueId" });
            const eventId = await this.scoringPlatform.createEvent('Test Event')
            expect(eventId).toEqual("UniqueId");
        })
        it('can create a tournament', async function (this: scoringPlatformTestWithProperties) {
            const fakeEvent = createFakeEvent();
            setMockMethodResponse(this.mockDoc, "data", fakeEvent /*{ nextTournamentId: "T1" }*/);
            setMockMethodResponsePromise(this.datastoreClient, 'getDoc', this.mockDoc);
            const tournamentId = await this.scoringPlatform.createTournament('Test Tournament', 'EventId', TournamentTypes.HERB, { maxTickets: 1 });
            const argsForUpdate = (this.datastoreClient.updateDoc as any).calls.argsFor(0);
            expect(argsForUpdate[1].nextTournamentId).toEqual("T2");
            expect(argsForUpdate[1]['tournaments.T1'].tournamentName).toEqual("Test Tournament");
            expect(argsForUpdate[1]['tournaments.T1'].settings.maxTickets).toEqual(1);
            expect(argsForUpdate[1]['tournaments.T1'].type).toEqual(TournamentTypes.HERB);
            expect(tournamentId).toEqual("T1");
        })
        it('cant create a tournament if the tournament already exists ', async function (this: scoringPlatformTestWithProperties) {
            const fakeEvent = createFakeEvent();
            createFakeTournament(fakeEvent);
            setMockMethodResponse(this.mockDoc, "data", fakeEvent );
            setMockMethodResponsePromise(this.datastoreClient, 'getDoc', this.mockDoc);
            let exceptionString: Error;
            try {
                await this.scoringPlatform.createTournament('Test Tournament', 'EventId', TournamentTypes.HERB, { maxTickets: 1 });
            } catch (E) {
                exceptionString = E;
            }
            expect(exceptionString.message).toEqual("TOURNAMENT ALREADY EXISTS")
        })
        it('can create a machine', async function (this: scoringPlatformTestWithProperties) {
            const fakeEvent = createFakeEvent();
            createFakeTournament(fakeEvent);
            setMockMethodResponse(this.mockDoc, "data", fakeEvent);
            setMockMethodResponsePromise(this.datastoreClient, 'getDoc', this.mockDoc);
            const machineId = await this.scoringPlatform.createMachine('EventId', "T1", "Test Machine");
            const argsForUpdate = (this.datastoreClient.updateDoc as any).calls.argsFor(0);
            expect(argsForUpdate[1].nextMachineId).toEqual("M2");
            expect(argsForUpdate[1]['tournaments.T1.machines.M1'].machineName).toEqual("Test Machine");
            expect(argsForUpdate[1]['tournaments.T1.machines.M1.machineQueue']).toEqual([]);
            expect(machineId).toEqual("M1");
        })
        it('cant create a machine if the machine already exists ', async function (this: scoringPlatformTestWithProperties) {
            const fakeEvent = createFakeEvent();
            createFakeTournament(fakeEvent);
            createFakeMachine(fakeEvent);
            setMockMethodResponse(this.mockDoc, "data", fakeEvent );
            setMockMethodResponsePromise(this.datastoreClient, 'getDoc', this.mockDoc);
            let exceptionString: Error;
            try {
                const machineId = await this.scoringPlatform.createMachine('EventId', "T1", "Test Machine");
            } catch (E) {
                exceptionString = E;
            }
            expect(exceptionString.message).toEqual("MACHINE ALREADY EXISTS")
        })
        it('can create a player', async function (this: scoringPlatformTestWithProperties) {
            const fakeEvent = createFakeEvent();
            setMockMethodResponse(this.mockDoc, "data", fakeEvent);
            setMockMethodResponsePromise(this.datastoreClient, 'getDoc', this.mockDoc);
            const playerId = await this.scoringPlatform.createPlayer("Test Player", 'EventId');
            const argsForUpdate = (this.datastoreClient.updateDoc as any).calls.argsFor(0);
            expect(argsForUpdate[1]['listOfPlayers.P101'].playerId).toEqual("P101");
            expect(argsForUpdate[1]['listOfPlayers.P101'].playerName).toEqual("Test Player");
            expect(argsForUpdate[1]['nextPlayerId']).toEqual("P102");
            expect(playerId).toEqual("P101");
        })
        it('cant create a player that already exists', async function (this: scoringPlatformTestWithProperties) {
            const fakeEvent = createFakeEvent();
            createFakePlayer(fakeEvent);
            setMockMethodResponse(this.mockDoc, "data", fakeEvent );
            setMockMethodResponsePromise(this.datastoreClient, 'getDoc', this.mockDoc);
            let exceptionString: Error;
            try {
                await this.scoringPlatform.createPlayer("Test Player", 'EventId');
            } catch (E) {
                exceptionString = E;
            }
            expect(exceptionString.message).toEqual("PLAYER ALREADY EXISTS")

        })
        it('can manage tickets for a player', async function (this: scoringPlatformTestWithProperties) {
            const fakeEvent = createFakeEvent();
            createFakePlayer(fakeEvent);
            createFakeTicketCounts(fakeEvent);
            setMockMethodResponse(this.mockDoc, "data", fakeEvent );
            setMockMethodResponsePromise(this.datastoreClient, 'getDoc', this.mockDoc);
            await this.scoringPlatform.boboPurchaseTicket("EventId", "T1", "P101", 1)
            const argsForUpdate = (this.datastoreClient.updateDoc as any).calls.argsFor(0);
            expect(argsForUpdate[1]['listOfPlayers.P101.ticketCounts'].T1).toEqual(1);
        })
        it('can purchase tickets for a player', async function (this: scoringPlatformTestWithProperties) {
            const fakeEvent = createFakeEvent();
            createFakeTournament(fakeEvent);
            createFakePlayer(fakeEvent);
            createFakeTicketCounts(fakeEvent);
            createFakeTournamentSettings(fakeEvent,{maxTickets:1})
            setMockMethodResponse(this.mockDoc, "data", fakeEvent );
            setMockMethodResponsePromise(this.datastoreClient, 'getDoc', this.mockDoc);
            await this.scoringPlatform.realPurchaseTicket("EventId", "T1", "P101", 1)
            const argsForUpdate = (this.datastoreClient.updateDoc as any).calls.argsFor(0);
            expect(argsForUpdate[1]['listOfPlayers.P101.ticketCounts'].T1).toEqual(1);
        })
        it('cant purchase more than max tickets for a player', async function (this: scoringPlatformTestWithProperties) {
            const fakeEvent = createFakeEvent();
            createFakeTournament(fakeEvent);
            createFakePlayer(fakeEvent);
            createFakeTicketCounts(fakeEvent,"P101","T1",1);
            createFakeTournamentSettings(fakeEvent,{maxTickets:1});
            setMockMethodResponse(this.mockDoc, "data", fakeEvent);
            setMockMethodResponsePromise(this.datastoreClient, 'getDoc', this.mockDoc);
            let exceptionString: Error;
            try {
                await this.scoringPlatform.realPurchaseTicket("EventId", "T1", "P101", 1)
            } catch (E) {
                exceptionString = E;
            }
            expect(exceptionString.message).toEqual("Max tickets for tournament reached")
        })

        it('can start a game for a player', async function (this: scoringPlatformTestWithProperties) {
            const fakeEvent = createFakeEvent();
            createFakeTournament(fakeEvent);
            createFakeMachine(fakeEvent);
            createFakePlayer(fakeEvent);
            createFakeTicketCounts(fakeEvent,"P101","T1",1);
            createFakeTournamentSettings(fakeEvent, { maxTickets: 1, requireGameStart: true, requireTickets: true })

            setMockMethodResponse(this.mockDoc, "data", fakeEvent)
            setMockMethodResponsePromise(this.datastoreClient, 'getDoc', this.mockDoc);
            await this.scoringPlatform.startGame("EventId", "T1", "M1", "P101");
            const argsForUpdate = (this.datastoreClient.setDoc as any).calls.argsFor(0);
            expect(argsForUpdate[1].tournaments.T1.machines.M1.currentPlayer).toEqual("P101");
            expect(argsForUpdate[1].tournaments.T1.machines.M1.machineQueue).toEqual([]);
        })
        it('can start a game for a player with no tickets when tickets are not required', async function (this: scoringPlatformTestWithProperties) {
            const fakeEvent = createFakeEvent();
            createFakeTournament(fakeEvent);
            createFakeMachine(fakeEvent);
            createFakePlayer(fakeEvent);
            createFakeTicketCounts(fakeEvent);
            createFakeTournamentSettings(fakeEvent, { maxTickets: 1, requireGameStart: true, requireTickets: false })

            setMockMethodResponse(this.mockDoc, "data", fakeEvent);
            setMockMethodResponsePromise(this.datastoreClient, 'getDoc', this.mockDoc);
            await this.scoringPlatform.startGame("EventId", "T1", "M1", "P101");
            const argsForUpdate = (this.datastoreClient.setDoc as any).calls.argsFor(0);
            expect(argsForUpdate[1].tournaments.T1.machines.M1.currentPlayer).toEqual("P101");
            expect(argsForUpdate[1].tournaments.T1.machines.M1.machineQueue).toEqual([]);
        })
        it('cant start a game for a player without tickets when tickets are required ', async function (this: scoringPlatformTestWithProperties) {
            const fakeEvent = createFakeEvent();
            createFakeTournament(fakeEvent);
            createFakeMachine(fakeEvent);
            createFakePlayer(fakeEvent);
            createFakeTicketCounts(fakeEvent,"P101","T1",0);
            createFakeTournamentSettings(fakeEvent, { maxTickets: 1, requireGameStart: true, requireTickets: true })
            setMockMethodResponse(this.mockDoc, "data", fakeEvent);
            setMockMethodResponsePromise(this.datastoreClient, 'getDoc', this.mockDoc);
            let error:Error = new Error();
            try {
                await this.scoringPlatform.startGame("EventId", "T1", "M1", "P101");
            } catch (E) {
                error = E;
            }
            expect(error.message).toEqual("No available tickets")

        })
        it('can record a score for a player', async function (this: scoringPlatformTestWithProperties) {
            const fakeEvent = createFakeEvent();
            createFakeTournament(fakeEvent);
            createFakeTournamentSettings(fakeEvent, { maxTickets: 1, requireGameStart: true, requireTickets: true });
            createFakeMachine(fakeEvent,"T1","M1","P101");
            createFakePlayer(fakeEvent);
            createFakeTicketCounts(fakeEvent,"P101","T1",1);
            setMockMethodResponse(this.mockDoc, "data", fakeEvent);
            setMockMethodResponsePromise(this.datastoreClient, 'getDoc', this.mockDoc);
            await this.scoringPlatform.recordScore("EventId", "T1", "M1", {
                pinballScores: [{
                    machineId: "M1",
                    scoringPlayers: [
                        {
                            playerId: "P101",
                            score: 123
                        }
                    ]
                }]
            }, "P101");
            const argsForUpdate = (this.datastoreClient.setDoc as any).calls.argsFor(0);
            const rawString = argsForUpdate[1].tournaments.T1.results;
            const rawParsedTree: HerbDeserializedString = JSON.parse(
                rawString,
                reviver
            ) as HerbDeserializedString;
            expect(argsForUpdate[1].tournaments.T1.machines.M1.currentPlayer).toEqual(null);
            expect(argsForUpdate[1].listOfPlayers.P101.ticketCounts.T1).toEqual(0);
            expect(argsForUpdate[1].listOfPlayers.P101.lastTicket.T1).toEqual(0);
            expect(rawParsedTree.machineRankings.get("M1")[0]).toEqual({ score: 123, playerId: 'P101', machineId: 'M1', ticketId: 0 });

        })
        it('can get results for tournament', async function (this: scoringPlatformTestWithProperties) {
            const fakeEvent = createFakeEvent();
            createFakeTournament(fakeEvent);
            fakeEvent.tournaments["T1"].results='{"tournamentRankings":[],"machineRankings":{"dataType":"Map","value":[["M1",[{"score":123,"playerId":"P101","machineId":"M1","ticketId":0}]]]},"rankerOptions":{"maxScoresPerTicket":{"available":false,"enabled":false},"allowOnlyOneScorePerMachine":{"available":false,"enabled":false}}}';
            setMockMethodResponsePromise(this.datastoreClient, 'getDoc', this.mockDoc);
            setMockMethodResponse(this.mockDoc, "data", fakeEvent);
            const results = await this.scoringPlatform.getResults("eventId", "T1");
            expect(results.individualResults.get("M1")[0]).toEqual({
                playerId: "P101", machineId: "M1", score: 123, points: 100, rank: 1
            })
        })
        it('can get individual results for tournament', async function (this: scoringPlatformTestWithProperties) {
            const fakeEvent = createFakeEvent();
            createFakeTournament(fakeEvent);
            fakeEvent.tournaments["T1"].results='{"tournamentRankings":[],"machineRankings":{"dataType":"Map","value":[["M2",[{"score":113,"playerId":"P102","machineId":"M2","ticketId":0}]],["M1",[{"score":123,"playerId":"P101","machineId":"M1","ticketId":0}]]]},"rankerOptions":{"maxScoresPerTicket":{"available":false,"enabled":false},"allowOnlyOneScorePerMachine":{"available":false,"enabled":false}}}';
            setMockMethodResponsePromise(this.datastoreClient, 'getDoc', this.mockDoc);
            setMockMethodResponse(this.mockDoc, "data", fakeEvent)
            let results = await this.scoringPlatform.getIndividualResults("eventId", "T1", "M1");
            expect(results.individualResults.get("M1")[0]).toEqual({
                playerId: "P101", machineId: "M1", score: 123, points: 100, rank: 1
            })
            results = await this.scoringPlatform.getIndividualResults("eventId", "T1");
            expect(results.individualResults.get("M1")[0]).toEqual({
                playerId: "P101", machineId: "M1", score: 123, points: 100, rank: 1
            })
            expect(results.individualResults.get("M2")[0]).toEqual({
                playerId: "P102", machineId: "M2", score: 113, points: 100, rank: 1
            })
        })
        it('can add player to a queue', async function (this: scoringPlatformTestWithProperties) {
            const fakeEvent = createFakeEvent();
            createFakeTournament(fakeEvent);
            createFakeTournamentSettings(fakeEvent, { maxTickets: 1, requireGameStart: true, requireTickets: true });
            createFakeMachine(fakeEvent,"T1","M1","P101");
            createFakePlayer(fakeEvent);
            createFakeTicketCounts(fakeEvent,"P101","T1",1);
            const mockDoc = fakeEvent;
            setMockMethodResponse(this.mockDoc, "data", mockDoc);
            setMockMethodResponsePromise(this.datastoreClient, 'getDoc', this.mockDoc);
            await this.scoringPlatform.addToQueue("EventId", "T1", "M1", "P101")
            const argsForUpdate = (this.datastoreClient.updateDoc as any).calls.argsFor(0);
            expect(argsForUpdate[1]['tournaments.T1.machines.M1.machineQueue']).toEqual([{ gameStarted: false, playerId: 'P101' }]);
        })
        it('can remove a player from a queue', async function (this: scoringPlatformTestWithProperties) {
            const fakeEvent = createFakeEvent();
            createFakeTournament(fakeEvent);
            createFakeTournamentSettings(fakeEvent, { maxTickets: 1, requireGameStart: true, requireTickets: true });
            createFakeMachine(fakeEvent,"T1","M1","P101");
            createFakePlayer(fakeEvent);

            const mockDoc = fakeEvent;
            mockDoc.tournaments["T1"].machines.M1.machineQueue.push({ gameStarted: false, playerId: 'P102' });
            mockDoc.tournaments["T1"].machines.M1.machineQueue.push({ gameStarted: false, playerId: 'P101' });
            mockDoc.tournaments["T1"].machines.M1.machineQueue.push({ gameStarted: false, playerId: 'P103' });
            setMockMethodResponse(this.mockDoc, "data", mockDoc);
            setMockMethodResponsePromise(this.datastoreClient, 'getDoc', this.mockDoc);
            await this.scoringPlatform.removeFromQueue("EventId", "T1", "M1", "P101");
            const argsForUpdate = (this.datastoreClient.updateDoc as any).calls.argsFor(0);
            expect(argsForUpdate[1]['tournaments.T1.machines.M1.machineQueue']).toEqual([{ gameStarted: false, playerId: 'P102' }, { gameStarted: false, playerId: 'P103' }]);
        })
        it('can get queues', async function (this: scoringPlatformTestWithProperties) {
            const fakeEvent = createFakeEvent();
            createFakeTournament(fakeEvent);
            createFakeTournamentSettings(fakeEvent, { maxTickets: 1, requireGameStart: true, requireTickets: true });
            createFakeMachine(fakeEvent,"T1","M1","P101");
            const mockDoc = fakeEvent;
            mockDoc.tournaments["T1"].machines.M1.machineQueue.push({ gameStarted: false, playerId: 'P102' });
            mockDoc.tournaments["T1"].machines.M1.machineQueue.push({ gameStarted: false, playerId: 'P101' });
            mockDoc.tournaments["T1"].machines.M1.machineQueue.push({ gameStarted: false, playerId: 'P103' });
            setMockMethodResponse(this.mockDoc, "data", mockDoc);
            setMockMethodResponsePromise(this.datastoreClient, 'getDoc', this.mockDoc);
            const queues = await this.scoringPlatform.getQueuesForTournament("EventId", "T1");
            expect(Array.from(queues.keys())).toEqual(["M1"]);
            expect(queues.get("M1")).toHaveSize(3);
            expect(queues.get("M1")[0]).toEqual(new EventQueueItemModel("P102"));
            expect(queues.get("M1")[1]).toEqual(new EventQueueItemModel("P101"));
            expect(queues.get("M1")[2]).toEqual(new EventQueueItemModel("P103"));

        })
        it('can get a tournament without results', async function (this: scoringPlatformTestWithProperties) {
            const fakeEvent = createFakeEvent();
            createFakeTournament(fakeEvent);
            setMockMethodResponse(this.mockDoc, "data", fakeEvent );
            setMockMethodResponsePromise(this.datastoreClient, 'getDoc', this.mockDoc);
            const event = await this.scoringPlatform.getEvent("eventId");
            expect(event.tournaments.T1.results).toEqual(undefined);

        })
    })
})
