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
exports.ScoringPlatform = exports.TournamentTypes = void 0;
const models_1 = require("./models");
const transaction_1 = require("./transaction");
require("reflect-metadata");
const class_transformer_1 = require("class-transformer");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const HerbRanker_1 = require("./HerbRanker");
var TournamentTypes;
(function (TournamentTypes) {
    TournamentTypes[TournamentTypes["HERB"] = 0] = "HERB";
    TournamentTypes[TournamentTypes["PAPA"] = 1] = "PAPA";
})(TournamentTypes = exports.TournamentTypes || (exports.TournamentTypes = {}));
class PipelineParams {
}
class RecordScoreParams extends PipelineParams {
}
class ScoringPlatform {
    constructor(dsClient) {
        this.compression = true;
        this.dsClient = dsClient;
    }
    static getMachinePath(tournamentId, machineId) {
        return 'tournaments.' + tournamentId + '.machines.' + machineId;
    }
    static getByteLen(normalVal) {
        normalVal = String(normalVal);
        let byteLen = 0;
        for (let i = 0; i < normalVal.length; i++) {
            const c = normalVal.charCodeAt(i);
            byteLen +=
                c < 1 << 7
                    ? 1
                    : c < 1 << 11
                        ? 2
                        : c < 1 << 16
                            ? 3
                            : c < 1 << 21
                                ? 4
                                : c < 1 << 26
                                    ? 5
                                    : c < 1 << 31
                                        ? 6
                                        : Number.NaN;
        }
        return byteLen;
    }
    static incrementStringId(currentId) {
        return currentId.slice(0, 1) + (parseInt(currentId.slice(1)) + 1);
    }
    createEvent(eventName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (eventName == undefined || eventName.length == 0) {
                throw new Error('event name must not be empty');
            }
            const newEvent = yield this.dsClient.createDoc(class_transformer_1.classToPlain(new models_1.EventModel(eventName)));
            return newEvent.id;
        });
    }
    createTournament(tournamentName, eventId, type, tournamentSettings) {
        return __awaiter(this, void 0, void 0, function* () {
            const resultEventData = class_transformer_1.plainToClass(models_1.EventModel, (yield this.dsClient.getDoc(eventId)).data());
            const nextTournamentId = resultEventData.nextTournamentId;
            for (const tournament of resultEventData.tournaments.values()) {
                if (tournament.tournamentName == tournamentName) {
                    throw new Error('TOURNAMENT ALREADY EXISTS');
                }
            }
            yield this.dsClient.updateDoc(eventId, {
                ['tournaments.' + nextTournamentId]: class_transformer_1.classToPlain(new models_1.TournamentModel(tournamentName, type, tournamentSettings)),
                nextTournamentId: ScoringPlatform.incrementStringId(nextTournamentId),
            });
            return nextTournamentId;
        });
    }
    getEvent(eventId, withoutResults = true, useCached = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const cachedDoc = this.dsClient.getCachedDoc(eventId);
            if (useCached && cachedDoc) {
                return cachedDoc;
            }
            const event = (yield this.dsClient.getDoc(eventId)).data();
            if (!withoutResults) {
                return event;
            }
            Object.keys(event.tournaments).forEach((tournamentId) => {
                delete event.tournaments[tournamentId].results;
            });
            return event;
        });
    }
    updateTournamentSettings(eventId, tournamentId, settings) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.dsClient.updateDoc(eventId, {
                ['tournaments.' + tournamentId + '.settings']: class_transformer_1.classToPlain(settings),
            });
        });
    }
    createMachine(eventId, tournamentId, machineName) {
        return __awaiter(this, void 0, void 0, function* () {
            const resultEventData = class_transformer_1.plainToClass(models_1.EventModel, (yield this.dsClient.getDoc(eventId)).data());
            const nextMachineId = resultEventData.nextMachineId;
            for (const machine of resultEventData.tournaments
                .get(tournamentId)
                .machines.values()) {
                if (machine.machineName == machineName) {
                    throw new Error('MACHINE ALREADY EXISTS');
                }
            }
            const initialValue = '';
            yield this.dsClient.updateDoc(eventId, {
                [ScoringPlatform.getMachinePath(tournamentId, nextMachineId)]: class_transformer_1.classToPlain(new models_1.MachineModel(machineName)),
                nextMachineId: ScoringPlatform.incrementStringId(nextMachineId),
                [ScoringPlatform.getMachinePath(tournamentId, nextMachineId) +
                    '.machineQueue']: [],
            });
            return nextMachineId;
        });
    }
    createPlayer(playerName, eventId) {
        return __awaiter(this, void 0, void 0, function* () {
            const resultEventData = class_transformer_1.plainToClass(models_1.EventModel, (yield this.dsClient.getDoc(eventId)).data());
            const nextPlayerId = resultEventData.nextPlayerId;
            for (const player of resultEventData.listOfPlayers.values()) {
                if (player.playerName == playerName) {
                    throw new Error('PLAYER ALREADY EXISTS');
                }
            }
            yield this.dsClient.updateDoc(eventId, {
                ['listOfPlayers.' + nextPlayerId]: class_transformer_1.classToPlain(new models_1.PlayerSummaryModel(playerName, nextPlayerId)),
                nextPlayerId: ScoringPlatform.incrementStringId(nextPlayerId),
            });
            yield this.dsClient.createDoc(class_transformer_1.classToPlain(new models_1.PlayerModel(playerName, nextPlayerId)), 'player-' + nextPlayerId);
            return nextPlayerId;
        });
    }
    boboPurchaseTicket(eventId, tournamentId, playerId, numTickets) {
        return __awaiter(this, void 0, void 0, function* () {
            const event = class_transformer_1.plainToClass(models_1.EventModel, (yield this.dsClient.getDoc(eventId)).data());
            event.listOfPlayers
                .get(playerId)
                .modifyTicketCount(tournamentId, numTickets);
            yield this.dsClient.updateDoc(eventId, {
                ['listOfPlayers.' + playerId + '.ticketCounts']: event.listOfPlayers.get(playerId).ticketCounts,
            });
        });
    }
    realPurchaseTicket(eventId, tournamentId, playerId, numTickets) {
        return __awaiter(this, void 0, void 0, function* () {
            const event = class_transformer_1.plainToClass(models_1.EventModel, (yield this.dsClient.getDoc(eventId)).data());
            const playerSummary = event.listOfPlayers.get(playerId);
            const ticketCount = playerSummary.getTicketCounts(tournamentId);
            if (ticketCount + numTickets >
                event.tournaments.get(tournamentId).settings.maxTickets) {
                throw new Error('Max tickets for tournament reached');
            }
            else {
                event.listOfPlayers
                    .get(playerId)
                    .modifyTicketCount(tournamentId, numTickets + ticketCount);
                yield this.dsClient.updateDoc(eventId, {
                    ['listOfPlayers.' +
                        playerId +
                        '.ticketCounts']: event.listOfPlayers.get(playerId).ticketCounts,
                });
            }
        });
    }
    boboFinishGame(eventId, tournamentId, machineId, playerId, force) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    startGame(eventId, tournamentId, machineId, playerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const event = class_transformer_1.plainToClass(models_1.EventModel, (yield this.dsClient.getDoc(eventId)).data());
            const startGameParams = {
                event: event,
                tournamentId: tournamentId,
                playerId: playerId,
                machineId: machineId,
            };
            const generator = rxjs_1.of(startGameParams);
            const checkPlayerExists = operators_1.tap((params) => {
                if (!Array.from(params.event.listOfPlayers.keys()).includes(params.playerId)) {
                    throw new Error('Player does not exist');
                }
            });
            const herbCheckTicketsAvailable = operators_1.tap((params) => {
                const tournament = params.event.tournaments.get(params.tournamentId);
                if (!tournament.settings.requireTickets) {
                    return;
                }
                const player = params.event.listOfPlayers.get(params.playerId);
                const ticketCount = player.getTicketCounts(params.tournamentId);
                if (ticketCount == undefined || ticketCount == 0) {
                    throw new Error('No available tickets');
                }
            });
            const herbSetMachineCurrentPlayer = operators_1.tap((params) => {
                const machine = params.event.tournaments
                    .get(params.tournamentId)
                    .machines.get(params.machineId);
                machine.currentPlayer = params.playerId;
                machine.machineQueue = machine.machineQueue.filter((e) => {
                    return e.playerId != params.playerId;
                });
                return event;
            });
            const steps = [checkPlayerExists];
            return new Promise((accpet, reject) => {
                generator
                    .pipe(checkPlayerExists, herbCheckTicketsAvailable, herbSetMachineCurrentPlayer)
                    .subscribe((res) => __awaiter(this, void 0, void 0, function* () {
                    yield this.dsClient.setDoc(eventId, class_transformer_1.classToPlain(startGameParams.event));
                    accpet();
                }), (err) => {
                    reject(err);
                });
            });
        });
    }
    voidScore(eventId, tournamentId, machineId, playerId, ticketId) {
        return __awaiter(this, void 0, void 0, function* () {
            const event = class_transformer_1.plainToClass(models_1.EventModel, (yield this.dsClient.getDoc(eventId)).data());
            if (ticketId) {
            }
            else {
            }
        });
    }
    recordScore(eventId, tournamentId, machineId, score, playerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = {
                eventId: eventId,
                tournamentId: tournamentId,
                machineId: machineId,
                playerId: playerId,
                score: score,
                compression: this.compression,
            };
            const event = class_transformer_1.plainToClass(models_1.EventModel, (yield this.dsClient.getDoc(eventId)).data());
            const recordScoreParams = {
                event: event,
                tournamentId: tournamentId,
                machineId: machineId,
                playerId: playerId,
                score: score,
            };
            const generator = rxjs_1.of(recordScoreParams);
            const checkPlayerExists = operators_1.tap((params) => {
                if (!Array.from(params.event.listOfPlayers.keys()).includes(params.playerId)) {
                    throw new Error('Player does not exist');
                }
            });
            const herbCheckTicketsAvailable = operators_1.tap((params) => {
                const tournament = params.event.tournaments.get(params.tournamentId);
                if (tournament.settings.requireTickets != true ||
                    tournament.type != TournamentTypes.HERB) {
                    return;
                }
                const player = params.event.listOfPlayers.get(params.playerId);
                if (player.getTicketCounts(params.tournamentId) == 0) {
                    throw new Error('Player has no tickets available');
                }
            });
            const herbCheckGameStarted = operators_1.tap((params) => {
                const tournament = params.event.tournaments.get(params.tournamentId);
                if (tournament.type != TournamentTypes.HERB ||
                    tournament.settings.requireGameStart != true) {
                    return;
                }
                const currentPlayer = params.event.tournaments
                    .get(params.tournamentId)
                    .machines.get(params.machineId).currentPlayer;
                if (currentPlayer == null) {
                    throw new Error('Trying to record score on empty machine');
                }
                if (currentPlayer != params.playerId) {
                    throw new Error('Trying to record score for one player, but another player is on the machine');
                }
            });
            const herbResetCurrentPlayer = operators_1.tap((params) => {
                const tournament = params.event.tournaments.get(params.tournamentId);
                if (tournament.type != TournamentTypes.HERB) {
                    return;
                }
                params.event.tournaments
                    .get(params.tournamentId)
                    .machines.get(params.machineId).currentPlayer = null;
            });
            const herbAdjustTickets = operators_1.tap((params) => {
                const tournament = params.event.tournaments.get(params.tournamentId);
                if (tournament.type != TournamentTypes.HERB) {
                    return;
                }
                const player = params.event.listOfPlayers.get(params.playerId);
                player.modifyTicketCount(params.tournamentId, player.getTicketCounts(params.tournamentId) - 1);
                player.incrementLastTicket(params.tournamentId);
                params.score.ticketId = player.lastTicket.get(params.tournamentId);
            });
            const recordScore = operators_1.tap((params) => {
                const tournament = params.event.tournaments.get(params.tournamentId);
                if (tournament.type != TournamentTypes.HERB) {
                    return;
                }
                let ranker;
                if (tournament.type == TournamentTypes.HERB) {
                    ranker = new HerbRanker_1.HerbRanker();
                }
                ranker.deserialize(tournament.results);
                ranker.addResult(params.score);
                tournament.results = ranker.serialize();
            });
            return new Promise((accpet, reject) => {
                generator
                    .pipe(checkPlayerExists, herbCheckTicketsAvailable, herbCheckGameStarted, herbResetCurrentPlayer, herbAdjustTickets, recordScore)
                    .subscribe((res) => __awaiter(this, void 0, void 0, function* () {
                    yield this.dsClient.setDoc(eventId, class_transformer_1.classToPlain(recordScoreParams.event));
                    accpet();
                }), (err) => {
                    reject(err);
                });
            });
        });
    }
    getTournamentResults(eventId, tournamentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const event = class_transformer_1.plainToClass(models_1.EventModel, (yield this.dsClient.getDoc(eventId)).data());
            const machines = event.tournaments.get(tournamentId).machines;
            const tournamentResults = {};
            return new Array();
        });
    }
    getResults(eventId, tournamentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const event = class_transformer_1.plainToClass(models_1.EventModel, (yield this.dsClient.getDoc(eventId)).data());
            const tournament = event.tournaments.get(tournamentId);
            const herbRanker = new HerbRanker_1.HerbRanker();
            herbRanker.deserialize(tournament.results);
            return herbRanker.getResults();
        });
    }
    getIndividualResults(eventId, tournamentId, machineId = undefined) {
        return __awaiter(this, void 0, void 0, function* () {
            const event = class_transformer_1.plainToClass(models_1.EventModel, (yield this.dsClient.getDoc(eventId)).data());
            const tournament = event.tournaments.get(tournamentId);
            const herbRanker = new HerbRanker_1.HerbRanker();
            herbRanker.deserialize(tournament.results);
            const rankedResults = herbRanker.getResults();
            Array.from(rankedResults.individualResults.keys()).forEach((id) => {
                if (machineId != id && machineId != undefined) {
                    rankedResults.individualResults.delete(id);
                }
            });
            rankedResults.cumalativeResults = new Array();
            return rankedResults;
        });
    }
    getCumalativeResults(eventId, tournamentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const event = class_transformer_1.plainToClass(models_1.EventModel, (yield this.dsClient.getDoc(eventId)).data());
            const tournament = event.tournaments.get(tournamentId);
            const herbRanker = new HerbRanker_1.HerbRanker();
            herbRanker.deserialize(tournament.results);
            const rankedResults = herbRanker.getResults();
            rankedResults.individualResults = new Map();
            return rankedResults;
        });
    }
    getPlayers(eventId) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.dsClient.getDoc(eventId)).data().listOfPlayers;
        });
    }
    getQueuesForTournament(eventId, tournamentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const event = class_transformer_1.plainToClass(models_1.EventModel, (yield this.dsClient.getDoc(eventId)).data());
            const queues = new Map();
            for (const [machineId, machineVal] of event.tournaments.get(tournamentId).machines.entries()) {
                queues.set(machineId, machineVal.machineQueue);
            }
            return queues;
        });
    }
    addToQueue(eventId, tournamentId, machineId, playerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const event = class_transformer_1.plainToClass(models_1.EventModel, (yield this.dsClient.getDoc(eventId)).data());
            const machine = event.tournaments.get(tournamentId).machines.get(machineId);
            const queue = machine.machineQueue;
            if (event.listOfPlayers.get(playerId) == undefined) {
                throw new Error("Player does not exist");
            }
            if (machine.currentPlayer == undefined && queue.length == 0) {
                throw new Error("No current player on machine and queue is empty");
            }
            queue.push(new models_1.EventQueueItemModel(playerId));
            yield this.dsClient.updateDoc(eventId, {
                ['tournaments.' + tournamentId + '.machines.' + machineId + '.machineQueue']: class_transformer_1.classToPlain(queue)
            });
        });
    }
    removeFromQueue(eventId, tournamentId, machineId, playerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const event = class_transformer_1.plainToClass(models_1.EventModel, (yield this.dsClient.getDoc(eventId)).data());
            const machine = event.tournaments.get(tournamentId).machines.get(machineId);
            let queue = machine.machineQueue;
            if (event.listOfPlayers.get(playerId) == undefined) {
                throw new Error("Player does not exist");
            }
            queue = queue.filter((i) => {
                return i.playerId != playerId;
            });
            yield this.dsClient.updateDoc(eventId, {
                ['tournaments.' + tournamentId + '.machines.' + machineId + '.machineQueue']: class_transformer_1.classToPlain(queue)
            });
        });
    }
}
__decorate([
    transaction_1.transaction(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ScoringPlatform.prototype, "createEvent", null);
__decorate([
    transaction_1.transaction(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, models_1.TournamentSettings]),
    __metadata("design:returntype", Promise)
], ScoringPlatform.prototype, "createTournament", null);
__decorate([
    transaction_1.transaction(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean, Object]),
    __metadata("design:returntype", Promise)
], ScoringPlatform.prototype, "getEvent", null);
__decorate([
    transaction_1.transaction(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, models_1.TournamentSettings]),
    __metadata("design:returntype", Promise)
], ScoringPlatform.prototype, "updateTournamentSettings", null);
__decorate([
    transaction_1.transaction(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], ScoringPlatform.prototype, "createMachine", null);
__decorate([
    transaction_1.transaction(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ScoringPlatform.prototype, "createPlayer", null);
__decorate([
    transaction_1.transaction(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ScoringPlatform.prototype, "boboPurchaseTicket", null);
__decorate([
    transaction_1.transaction(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ScoringPlatform.prototype, "realPurchaseTicket", null);
__decorate([
    transaction_1.transaction(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ScoringPlatform.prototype, "boboFinishGame", null);
__decorate([
    transaction_1.transaction(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ScoringPlatform.prototype, "startGame", null);
__decorate([
    transaction_1.transaction(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ScoringPlatform.prototype, "voidScore", null);
__decorate([
    transaction_1.transaction(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ScoringPlatform.prototype, "recordScore", null);
__decorate([
    transaction_1.transaction(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ScoringPlatform.prototype, "getTournamentResults", null);
__decorate([
    transaction_1.transaction(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ScoringPlatform.prototype, "getResults", null);
__decorate([
    transaction_1.transaction(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ScoringPlatform.prototype, "getIndividualResults", null);
__decorate([
    transaction_1.transaction(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ScoringPlatform.prototype, "getCumalativeResults", null);
__decorate([
    transaction_1.transaction(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ScoringPlatform.prototype, "addToQueue", null);
__decorate([
    transaction_1.transaction(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ScoringPlatform.prototype, "removeFromQueue", null);
exports.ScoringPlatform = ScoringPlatform;
//# sourceMappingURL=scoring-platform.js.map