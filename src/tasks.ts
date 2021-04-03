import { of, Observable, OperatorFunction } from 'rxjs';
import { map, tap, switchMap } from 'rxjs/operators';
import { EventModel, MachineModel } from './models';
import { DataStoreClient, Modes } from './data-store-client';
import { ScoringPlatform, TournamentTypes } from './scoring-platform';
import { PinballResult } from './PinballResult';
import { PinballScoreRanker } from './Ranker';
import { HerbRanker } from './HerbRanker';
import { buildRanker } from './RankerFactory';


export class PipelineParams {
  event: EventModel;
  tournamentId: string;
  machineId: string;
  playerId: string;
}

export class RecordScoreParams extends PipelineParams {
  score: PinballResult;
}

export const checkPlayerExists = tap(
  (params: PipelineParams) => {
    if (
      !Array.from(params.event.listOfPlayers.keys()).includes(
        params.playerId
      )
    ) {
      throw new Error('Player does not exist');
    }
  }
);


export const setMachineCurrentPlayer = tap(
  (params: PipelineParams) => {
    //FIXME : need something to check that currentPlayer is empty - might need to happen
    //        outside the pipeline
    const machine: MachineModel = params.event.tournaments
      .get(params.tournamentId)
      .machines.get(params.machineId);
    machine.currentPlayer = params.playerId;
    machine.machineQueue = machine.machineQueue.filter((e) => {
      return e.playerId != params.playerId;
    });
    //return event;
  })

export const checkGameStarted = tap(
  (params: RecordScoreParams) => {
    const tournament = params.event.tournaments.get(params.tournamentId);
    if (
      //tournament.type != TournamentTypes.HERB ||
      tournament.settings.requireGameStart != true
    ) {
      return;
    }
    const currentPlayer = params.event.tournaments
      .get(params.tournamentId)
      .machines.get(params.machineId).currentPlayer;
    if (currentPlayer == null) {
      throw new Error('Trying to record score on empty machine');
    }
    if (currentPlayer != params.playerId) {
      throw new Error(
        'Trying to record score for one player, but another player is on the machine'
      );
    }
  }
);


export const resetCurrentPlayer = tap(
  (params: RecordScoreParams) => {
    const tournament = params.event.tournaments.get(params.tournamentId);
    // if (tournament.type != TournamentTypes.HERB) {
    //   return;
    // }
    params.event.tournaments
      .get(params.tournamentId)
      .machines.get(params.machineId).currentPlayer = null;
  }
);


export const recordScore = tap((params: RecordScoreParams) => {
  const tournament = params.event.tournaments.get(params.tournamentId);
  // if (tournament.type != TournamentTypes.HERB) {
  //   return;
  // }
  const ranker: PinballScoreRanker = buildRanker(tournament.type);
  // if (tournament.type == TournamentTypes.HERB) {
  //   ranker = new HerbRanker();
  // }
  ranker.deserialize(tournament.results);
  ranker.addResult(params.score);
  tournament.results = ranker.serialize();
});

export const herbCheckTicketsAvailable = tap(
  (params: PipelineParams) => {
    const tournament = params.event.tournaments.get(params.tournamentId);
    if (!tournament.settings.requireTickets) {
      return;
    }
    const player = params.event.listOfPlayers.get(params.playerId);
    const ticketCount = player.getTicketCounts(params.tournamentId);
    if (ticketCount == undefined || ticketCount == 0) {
      throw new Error('No available tickets');
    }
  }
);


export const herbAdjustTickets = tap(
  (params: RecordScoreParams) => {
    const tournament = params.event.tournaments.get(params.tournamentId);
    if (tournament.type != TournamentTypes.HERB) {
      return;
    }
    const player = params.event.listOfPlayers.get(params.playerId);
    player.modifyTicketCount(
      params.tournamentId,
      player.getTicketCounts(params.tournamentId) - 1
    );
    player.incrementLastTicket(params.tournamentId);
    params.score.ticketId = player.lastTicket.get(params.tournamentId);
  }
);
