export interface ScoringPlayer {
  playerId: string;
  score: number;
  order?: number;
}

export interface PinballScore {
  machineId: string;
  scoringPlayers: Array<ScoringPlayer>;
}

export interface PinballResult {
  ticketId?: number;
  pinballScores: Array<PinballScore>;
}

export interface PinballRankedScoreBase {
  playerId?: string;
  machineId?: string;
  score?: number;
  rank?: number;
}


export interface PinballIndividualRankedScore extends PinballRankedScoreBase{
  points?: number;
}

export interface PinballCumlativeRankedScore extends PinballRankedScoreBase{
  totalPoints?: number;
  machineResults?: Array<PinballIndividualRankedScore>
}

export interface PinballRankedResults {
  tournamentType?: string;
  individualResults?: Map<string, Array<PinballIndividualRankedScore>>;
  cumalativeResults?: Array<PinballCumlativeRankedScore>;
}
