import { DataStoreClient } from './data-store-client';
import { EventQueueItemModel, TournamentSettings } from './models';
import 'reflect-metadata';
import { PinballRankedResults, PinballResult } from './PinballResult';
export declare enum TournamentTypes {
    HERB = 0,
    PAPA = 1
}
export declare class ScoringPlatform {
    dsClient: DataStoreClient;
    compression: boolean;
    constructor(dsClient: DataStoreClient);
    static getMachinePath(tournamentId: any, machineId: any): string;
    static getByteLen(normalVal: any): number;
    static incrementStringId(currentId: string): string;
    createEvent(eventName: string): Promise<string>;
    createTournament(tournamentName: string, eventId: string, type: TournamentTypes, tournamentSettings?: TournamentSettings): Promise<string>;
    getEvent(eventId: string, withoutResults?: boolean, useCached?: boolean): Promise<import("firebase").default.firestore.DocumentData>;
    updateTournamentSettings(eventId: any, tournamentId: any, settings: TournamentSettings): Promise<void>;
    createMachine(eventId: string, tournamentId: any, machineName: string): Promise<string>;
    createPlayer(playerName: any, eventId: any): Promise<string>;
    boboPurchaseTicket(eventId: any, tournamentId: any, playerId: any, numTickets: any): Promise<void>;
    realPurchaseTicket(eventId: any, tournamentId: any, playerId: any, numTickets: any): Promise<void>;
    boboFinishGame(eventId: any, tournamentId: any, machineId: any, playerId: any, force: any): Promise<void>;
    startGame(eventId: any, tournamentId: any, machineId: any, playerId: any): Promise<void>;
    voidScore(eventId: any, tournamentId: any, machineId: any, playerId: any, ticketId?: any): Promise<void>;
    recordScore(eventId: any, tournamentId: any, machineId: any, score: PinballResult, playerId: any): Promise<void>;
    getTournamentResults(eventId: any, tournamentId: any): Promise<any[]>;
    getResults(eventId: any, tournamentId: any): Promise<PinballRankedResults>;
    getIndividualResults(eventId: any, tournamentId: any, machineId?: any): Promise<PinballRankedResults>;
    getCumalativeResults(eventId: any, tournamentId: any): Promise<PinballRankedResults>;
    getPlayers(eventId: any): Promise<any>;
    getQueuesForTournament(eventId: any, tournamentId: any): Promise<Map<string, EventQueueItemModel[]>>;
    addToQueue(eventId: any, tournamentId: any, machineId: any, playerId: any): Promise<void>;
    removeFromQueue(eventId: any, tournamentId: any, machineId: any, playerId: any): Promise<void>;
}
