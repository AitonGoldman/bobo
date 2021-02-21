import { of, Observable, OperatorFunction } from 'rxjs';
import { map, tap, switchMap } from 'rxjs/operators';
import { EventModel } from './models';
import { DataStoreClient, Modes } from './data-store-client';
import { ScoringPlatform } from './scoring-platform';

interface PipelineTask {
  task: OperatorFunction<any, any>;
}

class BaseTask {
  dsClient: DataStoreClient;
  params: any;
  task: OperatorFunction<any, any>;
  constructor(dsClient: DataStoreClient, params: any) {
    this.dsClient = dsClient;
    this.params = params;
  }
}
export class CheckGameStartedTask extends BaseTask implements PipelineTask {
  task = map((event: EventModel) => {
    const currentPlayer = event.tournaments
      .get(this.params.tournamentId)
      .machines.get(this.params.machineId).currentPlayer;
    if (currentPlayer == null) {
      throw new Error('Trying to record score on empty machine');
    }
    if (currentPlayer != this.params.playerId) {
      throw new Error(
        'Trying to record score for one player, but another player is on the machine'
      );
    }
    return event;
  });
}
export class CheckPlayerExistsTask extends BaseTask implements PipelineTask {
  task = map((event: EventModel) => {
    if (event.listOfPlayers.get(this.params.playerId) == undefined) {
      throw new Error('Trying to record score with player that does not exist');
    }
    return event;
  });
}
export class ResetCurrentPlayerTask extends BaseTask implements PipelineTask {
  task = switchMap(async (event: EventModel) => {
    await this.dsClient.updateDoc(this.params.eventId, {
      [ScoringPlatform.getMachinePath(
        this.params.tournamentId,
        this.params.machineId
      ) + '.currentPlayer']: null,
    });
    return event;
  });
}

export class UpdatePlayerTicketsTask extends BaseTask implements PipelineTask {
  task = switchMap(async (event: EventModel) => {
    const decompressed = event.tournaments
      .get(this.params.tournamentId)
      .machines.get(this.params.machineId).machineResults;

    const nextTicketId = '1'; //ScoringPlatform.extractNextTicketIdFromResults(decompressed, this.params.playerId)
    const player = event.listOfPlayers.get(this.params.playerId);
    const ticketCount = player.getTicketCounts(this.params.tournamentId);
    const currentTicket = player.getCurrentTicket(this.params.tournamentId);
    if (currentTicket == undefined) {
      player.modifyCurrentTicket(
        this.params.tournamentId,
        1,
        event.tournaments.get(this.params.tournamentId).settings
          .numberOfPlaysOnTicket - 1
      );
    } else {
      //FIXME : need an option to be passed saying tickets should be paid attention to?
      player.modifyCurrentTicket(
        this.params.tournamentId,
        currentTicket[0],
        currentTicket[1] - 1
      );
    }
    return event;
  });
}
export class CommitTicketChangesTask extends BaseTask implements PipelineTask {
  task = switchMap(async (event: EventModel) => {
    const player = event.listOfPlayers.get(this.params.playerId);
    const ticketCount = player.getTicketCounts(this.params.tournamentId);
    const currentTicket = player.getCurrentTicket(this.params.tournamentId);
    //FIXME : need an option to be passed saying tickets should be paid attention to
    if (currentTicket) {
      if (currentTicket[1] == 0) {
        player.resetCurrentTicket(this.params.tournamentId);
        player.modifyTicketCount(this.params.tournamentId, ticketCount - 1);
      }
      await this.dsClient.updateDoc(this.params.eventId, {
        ['listOfPlayers.' +
        this.params.playerId +
        '.currentTickets']: player.currentTickets,
        ['listOfPlayers.' +
        this.params.playerId +
        '.ticketCounts']: player.ticketCounts,
      });
    }
    return event;
  });
}

export class UpdateMachineScoresTask extends BaseTask implements PipelineTask {
  task = switchMap(async (event: EventModel) => {
    // let decompressed = event.tournaments.get(this.params.tournamentId).machines.get(this.params.machineId).machineResults;
    // // if (this.params.compression == true) {
    // //     decompressed = LZString.decompressFromUTF16(decompressed);
    // // }
    // const scratchTree = new ScoringResultsTree()
    // scratchTree.loadScoringResultsTreeFromEncodedString(decompressed);
    // const currentTicket = event.listOfPlayers.get(this.params.playerId).getCurrentTicket(this.params.tournamentId)
    // const ticketId = currentTicket[0]
    // const encodedScore = PinballScore.buildEncodedScore(this.params.score, this.params.playerId, ticketId).encodedScore;
    // scratchTree.insert(encodedScore);
    // const keys = scratchTree.keys();
    // let newScores = keys.join("");
    // if (this.params.compression == true) {
    //     newScores = LZString.compressToUTF16(newScores);
    // }
    // await this.dsClient.updateDoc(this.params.eventId, { [ScoringPlatform.getMachinePath(this.params.tournamentId,this.params.machineId)+'.machineResults']: newScores ,
    //                                           nextTicketId: event.nextTicketId + 1});
    return event;
  });
}
