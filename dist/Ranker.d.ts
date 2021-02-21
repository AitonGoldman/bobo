import { PinballRankedResults, PinballResult } from './PinballResult';
export interface PinballScoreRanker {
    deserialize(rawString: string): void;
    serialize(): string;
    addResult(pinballResult: PinballResult): any;
    getResults(): PinballRankedResults;
}
