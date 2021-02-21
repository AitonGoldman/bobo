"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerModel = exports.EventModel = exports.PlayerSummaryModel = exports.TournamentModel = exports.TournamentSettings = exports.MachineModel = exports.EventQueueItemModel = void 0;
require("reflect-metadata");
const class_transformer_1 = require("class-transformer");
function convertStringKeyMapToNumberKeyMap(value) {
    return new Map(Array.from(value.keys()).map((v) => {
        return [parseInt(v), value.get(v)];
    }));
}
class EventQueueItemModel {
    constructor(playerId, gameStarted = false) {
        this.gameStarted = false;
        this.playerId = playerId;
        this.gameStarted = gameStarted;
    }
}
exports.EventQueueItemModel = EventQueueItemModel;
class MachineModel {
    constructor(machineName) {
        this.currentPlayer = null;
        this.machineName = machineName;
    }
}
__decorate([
    class_transformer_1.Type(() => EventQueueItemModel),
    __metadata("design:type", Array)
], MachineModel.prototype, "machineQueue", void 0);
exports.MachineModel = MachineModel;
class TournamentSettings {
    constructor() {
        this.requireTickets = false;
        this.requireGameStart = false;
        this.papaStyle = true;
        this.numberOfPlaysOnTicket = 5;
        this.maxTickets = 5;
    }
}
exports.TournamentSettings = TournamentSettings;
class TournamentModel {
    constructor(tournamentName, type, tournamentSettings) {
        this.tournamentName = tournamentName;
        this.machines = new Map();
        this.type = type;
        this.results =
            '{"tournamentRankings":[],"machineRankings":{"dataType":"Map","value":[]}}';
        this.settings =
            tournamentSettings == undefined
                ? new TournamentSettings()
                : tournamentSettings;
    }
}
__decorate([
    class_transformer_1.Type(() => MachineModel),
    __metadata("design:type", Map)
], TournamentModel.prototype, "machines", void 0);
__decorate([
    class_transformer_1.Type(() => TournamentSettings),
    __metadata("design:type", TournamentSettings)
], TournamentModel.prototype, "settings", void 0);
exports.TournamentModel = TournamentModel;
class PlayerSummaryModel {
    constructor(playerName, playerId) {
        this.ticketCounts = {};
        this.currentTickets = {};
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
            this.lastTicket.set(tournamentId, this.lastTicket.get(tournamentId).valueOf() + 1);
        }
        else {
            this.lastTicket.set(tournamentId, 0);
        }
    }
}
__decorate([
    class_transformer_1.Type(() => Number),
    __metadata("design:type", Map)
], PlayerSummaryModel.prototype, "lastTicket", void 0);
exports.PlayerSummaryModel = PlayerSummaryModel;
class EventModel {
    constructor(eventName) {
        this.eventName = eventName;
        this.nextMachineId = 'M0';
        this.nextTournamentId = 'T0';
        this.nextPlayerId = 'P100';
        this.tournaments = new Map();
        this.listOfPlayers = new Map();
    }
}
__decorate([
    class_transformer_1.Type(() => TournamentModel),
    __metadata("design:type", Map)
], EventModel.prototype, "tournaments", void 0);
__decorate([
    class_transformer_1.Type(() => PlayerSummaryModel),
    __metadata("design:type", Map)
], EventModel.prototype, "listOfPlayers", void 0);
exports.EventModel = EventModel;
class PlayerModel {
    constructor(playerName, playerId) {
        this.playerName = playerName;
        this.playerId = playerId;
    }
}
exports.PlayerModel = PlayerModel;
//# sourceMappingURL=models.js.map