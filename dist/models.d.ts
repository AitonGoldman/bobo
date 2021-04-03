import 'reflect-metadata';
import { TournamentTypes } from './scoring-platform';
export declare class EventQueueItemModel {
    playerId: string;
    gameStarted: boolean;
    constructor(playerId: any, gameStarted?: boolean);
}
export declare class MachineModel {
    machineName: string;
    currentPlayer: string;
    machineResults: string;
    machineQueue: EventQueueItemModel[];
    constructor(machineName: any);
}
export declare class TournamentSettings {
    requireTickets?: boolean;
    requireGameStart?: boolean;
    papaStyle?: boolean;
    numberOfPlaysOnTicket?: number;
    maxTickets: number;
}
export declare class TournamentModel {
    tournamentName: string;
    machines: Map<string, MachineModel>;
    settings: TournamentSettings;
    type: TournamentTypes;
    results: string;
    constructor(tournamentName: any, type: TournamentTypes, tournamentSettings?: TournamentSettings);
}
export declare class PlayerSummaryModel {
    playerName: string;
    playerId: number;
    ticketCounts: any;
    currentTickets: any;
    tickets: string;
    lastTicket: Map<string, number>;
    constructor(playerName: any, playerId: any);
    getCurrentTicket(tournamentId: any): any;
    getTicketCounts(tournamentId: any): any;
    resetCurrentTicket(tournamentId: any): void;
    modifyCurrentTicket(tournamentId: any, ticketId: any, numPlaysOnTicket: any): void;
    modifyTicketCount(tournamentId: any, ticketCount: any): void;
    incrementLastTicket(tournamentId: any): void;
}
export declare class EventModel {
    eventName: string;
    nextTournamentId: string;
    nextMachineId: string;
    nextPlayerId: string;
    tournaments: Map<string, TournamentModel>;
    listOfPlayers: Map<string, PlayerSummaryModel>;
    constructor(eventName: string);
}
export declare class PlayerModel {
    playerName: string;
    playerId: string;
    constructor(playerName: string, playerId: string);
}
