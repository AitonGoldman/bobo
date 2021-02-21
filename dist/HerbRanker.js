"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HerbRanker = exports.reviver = exports.replacer = void 0;
const avl_1 = require("avl");
function replacer(key, value) {
    const originalObject = this[key];
    if (originalObject instanceof Map) {
        return {
            dataType: 'Map',
            value: Array.from(originalObject.entries()),
        };
    }
    else {
        return value;
    }
}
exports.replacer = replacer;
function reviver(key, value) {
    if (typeof value === 'object' && value !== null) {
        if (value.dataType === 'Map') {
            return new Map(value.value);
        }
    }
    return value;
}
exports.reviver = reviver;
class HerbRanker {
    constructor() {
        this.machineRankings = new Map();
        this.tournamentRankings = new avl_1.default();
    }
    deserialize(rawString) {
        const rawParsedTree = JSON.parse(rawString, reviver);
        rawParsedTree.machineRankings.forEach((scores, machineKey) => {
            const keys = scores.map((x) => x.score);
            if (!this.machineRankings.get(machineKey)) {
                this.machineRankings.set(machineKey, new avl_1.default());
            }
            this.machineRankings.get(machineKey).load(keys, scores);
        });
    }
    serialize() {
        const serializeObject = {
            tournamentRankings: Array(),
            machineRankings: new Map(),
        };
        this.machineRankings.forEach((scoresVal, machineKey) => {
            if (!serializeObject.machineRankings.get(machineKey)) {
                serializeObject.machineRankings.set(machineKey, new Array());
            }
            scoresVal.forEach((score) => {
                serializeObject.machineRankings.get(machineKey).push(score.data);
            });
        });
        return JSON.stringify(serializeObject, replacer);
    }
    addResult(pinballResult) {
        pinballResult.pinballScores.forEach((scoreVal) => {
            scoreVal.scoringPlayers.forEach((playerVal) => {
                if (!this.machineRankings.get(scoreVal.machineId)) {
                    this.machineRankings.set(scoreVal.machineId, new avl_1.default((a, b) => b - a));
                }
                this.machineRankings.get(scoreVal.machineId).insert(playerVal.score, {
                    score: playerVal.score,
                    playerId: playerVal.playerId,
                    machineId: scoreVal.machineId,
                    ticketId: pinballResult.ticketId,
                });
            });
        });
    }
    getResults() {
        const pinballRankedResults = {};
        pinballRankedResults.individualResults = new Map();
        const playerRankedHash = new Map();
        const playerRankedArray = new Array();
        pinballRankedResults.cumalativeResults = new Array();
        this.machineRankings.forEach((val, machineKey) => {
            pinballRankedResults.tournamentType = 'HERB';
            pinballRankedResults.individualResults.set(machineKey, new Array());
            let rank = 1;
            let prevScore = -1;
            val.values().forEach((val, machineScoreIndex) => {
                if (prevScore != val.score) {
                    rank = machineScoreIndex + 1;
                }
                let points = 100 - machineScoreIndex;
                prevScore = val.score;
                pinballRankedResults.individualResults.get(machineKey).push({
                    playerId: val.playerId,
                    machineId: val.machineId,
                    score: val.score,
                    points: points,
                    rank: rank,
                });
                if (!playerRankedHash.get(val.playerId)) {
                    playerRankedHash.set(val.playerId, { machineResults: new Array(), totalPoints: 0, playerId: val.playerId });
                    playerRankedArray.push(playerRankedHash.get(val.playerId));
                }
                playerRankedHash.get(val.playerId).machineResults.push({ machineId: val.machineId, rank: rank, points: points });
            });
        });
        playerRankedHash.forEach((v, k) => {
            v.machineResults.sort((a, b) => {
                if (a.points > b.points) {
                    return -1;
                }
                if (b.points > a.points) {
                    return 1;
                }
                return 0;
            });
            v.machineResults = v.machineResults.slice(0, 3);
            const reducer = (a, b) => a + (b.points || 0);
            v.totalPoints = v.machineResults.reduce(reducer, 0);
        });
        pinballRankedResults.cumalativeResults = playerRankedArray.sort((a, b) => {
            if (a.totalPoints < b.totalPoints) {
                return 1;
            }
            if (a.totalPoints > b.totalPoints) {
                return -1;
            }
            return 0;
        });
        pinballRankedResults.cumalativeResults.map((v, i, arr) => {
            let prevScore;
            if (i == 0) {
                prevScore = undefined;
            }
            else {
                prevScore = arr[i - 1].totalPoints;
            }
            if (prevScore != v.totalPoints) {
                v.rank = i + 1;
                return;
            }
            let prevIndex = i - 1;
            while (prevIndex >= 0 && arr[prevIndex].totalPoints == v.totalPoints) {
                prevIndex = prevIndex - 1;
            }
            v.rank = prevIndex;
        });
        return pinballRankedResults;
    }
}
exports.HerbRanker = HerbRanker;
//# sourceMappingURL=HerbRanker.js.map