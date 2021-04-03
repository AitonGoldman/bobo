import 'reflect-metadata';
import { Transform, Type } from 'class-transformer';
import { ScoringPlatform, TournamentTypes } from './scoring-platform';
import { HerbRanker } from './HerbRanker';
import { buildRanker } from './RankerFactory';

function convertStringKeyMapToNumberKeyMap<T>(value: Map<string, T>) {
  return new Map<number, T>(
    Array.from(value.keys()).map((v) => {
      return [parseInt(v), value.get(v)];
    })
  );
}

export class RankerOption {
  available : boolean;
  enabled: boolean;
  value: any;
  constructor(){
    this.available = false;
    this.enabled = false;
    this.value=undefined;
  }
}
export class RankerOptions {
  maxScoresPerTicket: RankerOption;
  allowOnlyOneScorePerMachine: RankerOption;

  constructor(){
    this.maxScoresPerTicket = new RankerOption();
    this.allowOnlyOneScorePerMachine = new RankerOption();
  }
}

export class EventQueueItemModel {
  playerId: string;
  gameStarted = false;

  constructor(playerId, gameStarted = false) {
    this.playerId = playerId;
    this.gameStarted = gameStarted;
  }
}

export class MachineModel {
  machineName: string;
  currentPlayer: string = null;
  machineResults: string;
  @Type(() => EventQueueItemModel)
  machineQueue: EventQueueItemModel[];
  constructor(machineName) {
    this.machineName = machineName;
  }
}

export class TournamentSettings {
  requireTickets?: boolean = false;
  requireGameStart?: boolean = false;
  //papaStyle?: boolean = true;
  numberOfPlaysOnTicket?: number = 5;
  maxTickets = 5;
}


export class TournamentModel {
  tournamentName: string;
  @Type(() => MachineModel)
  machines: Map<string, MachineModel>;
  @Type(() => TournamentSettings)
  settings: TournamentSettings;
  type: TournamentTypes;
  results: string;
  constructor(tournamentName, type:TournamentTypes, tournamentSettings?: TournamentSettings) {
    this.tournamentName = tournamentName;
    this.machines = new Map();
    this.type = type;
    this.results = type!=undefined?buildRanker(type).serialize(): JSON.stringify({});
    //'{"tournamentRankings":[],"machineRankings":{"dataType":"Map","value":[]}}';

    //export interface HerbDeserializedString {
    // machineRankings?: Map<number, Array<HerbTreeNode>>;
    //tournamentRankings?: Array<any>;
    //}
    this.settings =
      tournamentSettings == undefined
        ? new TournamentSettings()
        : tournamentSettings;
  }
}

export class PlayerSummaryModel {
  playerName: string;
  playerId: number;
  ticketCounts: any = {};
  currentTickets: any = {};
  tickets: string;
  @Type(() => Number)
  lastTicket: Map<string, number>;

  constructor(playerName, playerId) {
    this.playerId = playerId;
    this.playerName = playerName;
    this.currentTickets = {};
    this.ticketCounts = {};
    this.lastTicket = new Map();
    String.fromCodePoint(0) + String.fromCodePoint(0);
  }

  getCurrentTicket(tournamentId) {
    return this.currentTickets[tournamentId];
  }

  getTicketCounts(tournamentId) {
    return this.ticketCounts[tournamentId] != undefined
      ? this.ticketCounts[tournamentId]
      : 0;
  }

  resetCurrentTicket(tournamentId) {
    delete this.currentTickets[tournamentId];
  }

  modifyCurrentTicket(tournamentId, ticketId, numPlaysOnTicket) {
    this.currentTickets[tournamentId] = [ticketId, numPlaysOnTicket];
  }

  modifyTicketCount(tournamentId, ticketCount) {
    this.ticketCounts[tournamentId] = ticketCount;
  }

  incrementLastTicket(tournamentId) {
    if (this.lastTicket.get(tournamentId) != undefined) {
      this.lastTicket.set(
        tournamentId,
        this.lastTicket.get(tournamentId).valueOf() + 1
      );
    } else {
      this.lastTicket.set(tournamentId, 0);
    }
  }
}

export class EventModel {
  eventName: string;
  nextTournamentId: string;
  nextMachineId: string;
  nextPlayerId: string;
  //nextTicketId: number;
  @Type(() => TournamentModel)
  tournaments: Map<string, TournamentModel>;
  @Type(() => PlayerSummaryModel)
  listOfPlayers: Map<string, PlayerSummaryModel>;

  constructor(eventName: string) {
    this.eventName = eventName;
    this.nextMachineId = 'M0';
    this.nextTournamentId = 'T0';
    this.nextPlayerId = 'P100';
    //this.nextTicketId = 1;
    this.tournaments = new Map();
    this.listOfPlayers = new Map();
  }
}

export class PlayerModel {
  playerName: string;
  playerId: string;
  constructor(playerName: string, playerId: string) {
    this.playerName = playerName;
    this.playerId = playerId;
  }
}
