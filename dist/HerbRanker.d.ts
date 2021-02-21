import AVLTree from 'avl';
import { PinballResult, PinballRankedResults, PinballCumlativeRankedScore } from './PinballResult';
import { PinballScoreRanker } from './Ranker';
export interface HerbTreeNode {
    score: number;
    playerId: string;
    machineId: string;
    ticketId: number;
}
export interface HerbDeserializedString {
    machineRankings?: Map<string, Array<HerbTreeNode>>;
    tournamentRankings?: Array<PinballCumlativeRankedScore>;
}
export declare function replacer(key: any, value: any): any;
export declare function reviver(key: any, value: any): any;
export declare class HerbRanker implements PinballScoreRanker {
    machineRankings: Map<string, AVLTree<number, HerbTreeNode>>;
    tournamentRankings: AVLTree<number, any>;
    constructor();
    deserialize(rawString: string): void;
    serialize(): string;
    addResult(pinballResult: PinballResult): void;
    getResults(): PinballRankedResults;
}
