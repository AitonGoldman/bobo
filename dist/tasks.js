"use strict";
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
exports.UpdateMachineScoresTask = exports.CommitTicketChangesTask = exports.UpdatePlayerTicketsTask = exports.ResetCurrentPlayerTask = exports.CheckPlayerExistsTask = exports.CheckGameStartedTask = void 0;
const operators_1 = require("rxjs/operators");
const scoring_platform_1 = require("./scoring-platform");
class BaseTask {
    constructor(dsClient, params) {
        this.dsClient = dsClient;
        this.params = params;
    }
}
class CheckGameStartedTask extends BaseTask {
    constructor() {
        super(...arguments);
        this.task = operators_1.map((event) => {
            const currentPlayer = event.tournaments
                .get(this.params.tournamentId)
                .machines.get(this.params.machineId).currentPlayer;
            if (currentPlayer == null) {
                throw new Error('Trying to record score on empty machine');
            }
            if (currentPlayer != this.params.playerId) {
                throw new Error('Trying to record score for one player, but another player is on the machine');
            }
            return event;
        });
    }
}
exports.CheckGameStartedTask = CheckGameStartedTask;
class CheckPlayerExistsTask extends BaseTask {
    constructor() {
        super(...arguments);
        this.task = operators_1.map((event) => {
            if (event.listOfPlayers.get(this.params.playerId) == undefined) {
                throw new Error('Trying to record score with player that does not exist');
            }
            return event;
        });
    }
}
exports.CheckPlayerExistsTask = CheckPlayerExistsTask;
class ResetCurrentPlayerTask extends BaseTask {
    constructor() {
        super(...arguments);
        this.task = operators_1.switchMap((event) => __awaiter(this, void 0, void 0, function* () {
            yield this.dsClient.updateDoc(this.params.eventId, {
                [scoring_platform_1.ScoringPlatform.getMachinePath(this.params.tournamentId, this.params.machineId) + '.currentPlayer']: null,
            });
            return event;
        }));
    }
}
exports.ResetCurrentPlayerTask = ResetCurrentPlayerTask;
class UpdatePlayerTicketsTask extends BaseTask {
    constructor() {
        super(...arguments);
        this.task = operators_1.switchMap((event) => __awaiter(this, void 0, void 0, function* () {
            const decompressed = event.tournaments
                .get(this.params.tournamentId)
                .machines.get(this.params.machineId).machineResults;
            const nextTicketId = '1';
            const player = event.listOfPlayers.get(this.params.playerId);
            const ticketCount = player.getTicketCounts(this.params.tournamentId);
            const currentTicket = player.getCurrentTicket(this.params.tournamentId);
            if (currentTicket == undefined) {
                player.modifyCurrentTicket(this.params.tournamentId, 1, event.tournaments.get(this.params.tournamentId).settings
                    .numberOfPlaysOnTicket - 1);
            }
            else {
                player.modifyCurrentTicket(this.params.tournamentId, currentTicket[0], currentTicket[1] - 1);
            }
            return event;
        }));
    }
}
exports.UpdatePlayerTicketsTask = UpdatePlayerTicketsTask;
class CommitTicketChangesTask extends BaseTask {
    constructor() {
        super(...arguments);
        this.task = operators_1.switchMap((event) => __awaiter(this, void 0, void 0, function* () {
            const player = event.listOfPlayers.get(this.params.playerId);
            const ticketCount = player.getTicketCounts(this.params.tournamentId);
            const currentTicket = player.getCurrentTicket(this.params.tournamentId);
            if (currentTicket) {
                if (currentTicket[1] == 0) {
                    player.resetCurrentTicket(this.params.tournamentId);
                    player.modifyTicketCount(this.params.tournamentId, ticketCount - 1);
                }
                yield this.dsClient.updateDoc(this.params.eventId, {
                    ['listOfPlayers.' +
                        this.params.playerId +
                        '.currentTickets']: player.currentTickets,
                    ['listOfPlayers.' +
                        this.params.playerId +
                        '.ticketCounts']: player.ticketCounts,
                });
            }
            return event;
        }));
    }
}
exports.CommitTicketChangesTask = CommitTicketChangesTask;
class UpdateMachineScoresTask extends BaseTask {
    constructor() {
        super(...arguments);
        this.task = operators_1.switchMap((event) => __awaiter(this, void 0, void 0, function* () {
            return event;
        }));
    }
}
exports.UpdateMachineScoresTask = UpdateMachineScoresTask;
//# sourceMappingURL=tasks.js.map