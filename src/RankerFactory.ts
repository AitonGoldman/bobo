import { HerbRanker } from "./HerbRanker";
import { PinballScoreRanker } from "./Ranker";
import { TournamentTypes } from "./scoring-platform";

export function buildRanker(tournamentType:TournamentTypes):PinballScoreRanker{
    if (tournamentType == TournamentTypes.HERB) {
        return new HerbRanker();
    }
}
