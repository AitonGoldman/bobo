import { DataStoreClient, Modes } from './data-store-client';
import * as punycode from 'punycode';

import {
  EventModel,
  TournamentModel,
  MachineModel,
  PlayerSummaryModel,
  PlayerModel,
  EventQueueItemModel,
  TournamentSettings,
  RankerOption,
  RankerOptions,
} from './models';
import { transaction } from './transaction';
import 'reflect-metadata';
import { classToPlain, plainToClass } from 'class-transformer';

import { of, Observable } from 'rxjs';

import {
  PinballRankedResults,
  PinballIndividualRankedScore,
  PinballResult,
  PinballCumlativeRankedScore,
} from './PinballResult';
import { checkGameStarted, checkPlayerExists, herbAdjustTickets, herbCheckTicketsAvailable, setMachineCurrentPlayer, PipelineParams, recordScore, RecordScoreParams, resetCurrentPlayer } from './tasks';
import { buildRanker } from './RankerFactory';

//import { CheckGameStartedTask, CheckPlayerExistsTask, CommitTicketChangesTask, ResetCurrentPlayerTask, UpdateMachineScoresTask, UpdatePlayerTicketsTask }  from './tasks'

export enum TournamentTypes {
  HERB,
  PAPA
}

export class ScoringPlatform {
  dsClient: DataStoreClient;
  compression = true;
  constructor(dsClient: DataStoreClient) {
    this.dsClient = dsClient;
  }

  static getMachinePath(tournamentId, machineId) {
    return 'tournaments.' + tournamentId + '.machines.' + machineId;
  }

  static getByteLen(normalVal) {
    // Force string type
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

  static incrementStringId(currentId: string): string {
    return currentId.slice(0, 1) + (parseInt(currentId.slice(1)) + 1);
  }


  @transaction()
  async createEvent(eventName: string): Promise<string> {
    //Can't check for an existing event because 'where' queries can't happen
    //inside a transaction ( boooooo! ).  Need to add a new annotation that does
    //this for us ( outside the transaction )
    if (eventName == undefined || eventName.length == 0) {
      throw new Error('event name must not be empty');
    }
    const newEvent = await this.dsClient.createDoc(
      classToPlain(new EventModel(eventName))
    );
    return newEvent.id;
  }

  @transaction()
  async createTournament(
    tournamentName:string,
    eventId:string,
    //FIXME : type should be an ENUM
    type:TournamentTypes,
    tournamentSettings?: TournamentSettings
  ): Promise<string> {
    const resultEventData: EventModel = plainToClass(
      EventModel,
      (await this.dsClient.getDoc(eventId)).data()
    );
    const nextTournamentId = resultEventData.nextTournamentId;
    for (const tournament of resultEventData.tournaments.values()) {
      if (tournament.tournamentName == tournamentName) {
        throw new Error('TOURNAMENT ALREADY EXISTS');
      }
    }
    await this.dsClient.updateDoc(eventId, {
      ['tournaments.' + nextTournamentId]: classToPlain(
        new TournamentModel(tournamentName, type, tournamentSettings)
      ),
      nextTournamentId: ScoringPlatform.incrementStringId(nextTournamentId),
    });
    return nextTournamentId;
  }

  @transaction()
  async getEvent(eventId:string,withoutResults:boolean=true,useCached=false){
    const cachedDoc = this.dsClient.getCachedDoc(eventId);
    if(useCached && cachedDoc){
      return cachedDoc;
    }
    const event =  (await this.dsClient.getDoc(eventId)).data();
    if(!withoutResults){
      return event;
    }
    Object.keys(event.tournaments).forEach((tournamentId)=>{
        delete event.tournaments[tournamentId].results;
    })
    return event;
  }

  @transaction()
  async updateTournamentSettings(
    eventId,
    tournamentId,
    settings: TournamentSettings
  ): Promise<void> {
    await this.dsClient.updateDoc(eventId, {
      ['tournaments.' + tournamentId + '.settings']: classToPlain(settings),
    });
  }

  @transaction()
  async createMachine(
    eventId: string,
    tournamentId,
    machineName: string
  ): Promise<string> {
    const resultEventData: EventModel = plainToClass(
      EventModel,
      (await this.dsClient.getDoc(eventId)).data()
    );
    const nextMachineId = resultEventData.nextMachineId;
    for (const machine of resultEventData.tournaments
      .get(tournamentId)
      .machines.values()) {
      if (machine.machineName == machineName) {
        throw new Error('MACHINE ALREADY EXISTS');
      }
    }
    const initialValue = '';
    await this.dsClient.updateDoc(eventId, {
      [ScoringPlatform.getMachinePath(
        tournamentId,
        nextMachineId
      )]: classToPlain(new MachineModel(machineName)),
      nextMachineId: ScoringPlatform.incrementStringId(nextMachineId),
      //[ScoringPlatform.getMachinePath(tournamentId,nextMachineId)+'.machineResults']: initialValue,
      [ScoringPlatform.getMachinePath(tournamentId, nextMachineId) +
      '.machineQueue']: [],
    });
    return nextMachineId;
  }

  @transaction()
  async createPlayer(playerName, eventId): Promise<string> {
    const resultEventData: EventModel = plainToClass(
      EventModel,
      (await this.dsClient.getDoc(eventId)).data()
    );
    const nextPlayerId = resultEventData.nextPlayerId;
    for (const player of resultEventData.listOfPlayers.values()) {
      if (player.playerName == playerName) {
        throw new Error('PLAYER ALREADY EXISTS');
      }
    }

    await this.dsClient.updateDoc(eventId, {
      ['listOfPlayers.' + nextPlayerId]: classToPlain(
        new PlayerSummaryModel(playerName, nextPlayerId)
      ),
      nextPlayerId: ScoringPlatform.incrementStringId(nextPlayerId),
    });
    await this.dsClient.createDoc(
      classToPlain(new PlayerModel(playerName, nextPlayerId)),
      'player-' + nextPlayerId
    );
    return nextPlayerId;
  }

  //FIXME : rename to manageTickets
  @transaction()
  async boboPurchaseTicket(
    eventId,
    tournamentId,
    playerId,
    numTickets
  ) {
    const event: EventModel = plainToClass(
      EventModel,
      (await this.dsClient.getDoc(eventId)).data()
    );
    event.listOfPlayers
      .get(playerId)
      .modifyTicketCount(tournamentId, numTickets);
    await this.dsClient.updateDoc(eventId, {
      ['listOfPlayers.' + playerId + '.ticketCounts']: event.listOfPlayers.get(
        playerId
      ).ticketCounts,
    });
  }

  //FIXME : write tests for this
  @transaction()
  async realPurchaseTicket(
    eventId,
    tournamentId,
    playerId,
    numTickets
  ) {
    const event: EventModel = plainToClass(
      EventModel,
      (await this.dsClient.getDoc(eventId)).data()
    );
    const playerSummary = event.listOfPlayers.get(playerId);
    const ticketCount = playerSummary.getTicketCounts(tournamentId);
    if (
      ticketCount + numTickets >
      event.tournaments.get(tournamentId).settings.maxTickets
    ) {
      throw new Error('Max tickets for tournament reached');
    } else {
      event.listOfPlayers
        .get(playerId)
        .modifyTicketCount(tournamentId, numTickets + ticketCount);
      await this.dsClient.updateDoc(eventId, {
        ['listOfPlayers.' +
        playerId +
        '.ticketCounts']: event.listOfPlayers.get(playerId).ticketCounts,
      });
    }
  }

  @transaction()
  async boboFinishGame(eventId, tournamentId, machineId, playerId, force) {
    // temp function to remove players from queues once done playing
  }

  @transaction()
  async startGame(eventId, tournamentId, machineId, playerId): Promise<void> {
    const event = plainToClass(
      EventModel,
      (await this.dsClient.getDoc(eventId)).data()
    );
    const startGameParams: PipelineParams = {
      event: event,
      tournamentId: tournamentId,
      playerId: playerId,
      machineId: machineId,
    };
    const generator: Observable<any>= of(
      startGameParams
    );

    return new Promise((accpet, reject) => {
      generator
        .pipe(
          checkPlayerExists,
          herbCheckTicketsAvailable,
          setMachineCurrentPlayer
        )
        .subscribe(
          async (res) => {
            await this.dsClient.setDoc(
              eventId,
              classToPlain(startGameParams.event)
            );
            accpet();
          },
          (err) => {
            reject(err);
          }
        );
    });
  }

  @transaction()
  async voidScore(
    eventId,
    tournamentId,
    machineId,
    playerId,
    ticketId?
  ): Promise<void> {
    const event = plainToClass(
      EventModel,
      (await this.dsClient.getDoc(eventId)).data()
    );
    if (ticketId) {
      //void specific ticket
    } else {
      //void current ticket
      //-reset current ticket
      //-find scores recorded for current ticket, and void them ( need scores to have a void field)
      //-decrement total tickets
      //
    }
  }

  @transaction()
  async recordScore(
    eventId,
    tournamentId,
    machineId,
    score: PinballResult,
    playerId
  ): Promise<void> {
    const params: any = {
      eventId: eventId,
      tournamentId: tournamentId,
      machineId: machineId,
      playerId: playerId,
      score: score,
      compression: this.compression,
    };
    const event = plainToClass(
      EventModel,
      (await this.dsClient.getDoc(eventId)).data()
    );
    const recordScoreParams: RecordScoreParams = {
      event: event,
      tournamentId: tournamentId,
      machineId: machineId,
      playerId: playerId,
      score: score,
    };
    const generator: Observable<any> = of(
      recordScoreParams
    );

    return new Promise((accpet, reject) => {
      generator
        .pipe(
          checkPlayerExists,
          herbCheckTicketsAvailable,
          checkGameStarted,
          resetCurrentPlayer,
          herbAdjustTickets,
          recordScore
        )
        .subscribe(
          async (res) => {
            await this.dsClient.setDoc(
              eventId,
              classToPlain(recordScoreParams.event)
            );
            accpet();
          },
          (err) => {
            reject(err);
          }
        );
    });
  }

  @transaction()
  async getResults(eventId, tournamentId): Promise<PinballRankedResults> {
    const event = plainToClass(
      EventModel,
      (await this.dsClient.getDoc(eventId)).data()
    );
    const tournament = event.tournaments.get(tournamentId);
    const ranker = buildRanker(tournament.type);//new HerbRanker();
    ranker.deserialize(tournament.results);
    return ranker.getResults();
  }

  @transaction()
  async getIndividualResults(
    eventId,
    tournamentId,
    machineId=undefined
  ): Promise<PinballRankedResults> {
    const event = plainToClass(
      EventModel,
      (await this.dsClient.getDoc(eventId)).data()
    );
    const tournament = event.tournaments.get(tournamentId);
    const ranker = buildRanker(tournament.type);// new HerbRanker();
    ranker.deserialize(tournament.results);
    const rankedResults = ranker.getResults();
    Array.from(rankedResults.individualResults.keys()).forEach((id) => {
      if (machineId != id && machineId != undefined) {
        rankedResults.individualResults.delete(id);
      }
    });
    rankedResults.cumalativeResults = new Array<PinballCumlativeRankedScore>();
    return rankedResults;
  }

  @transaction()
  async getCumalativeResults(
    eventId,
    tournamentId
  ): Promise<PinballRankedResults> {
    const event = plainToClass(
      EventModel,
      (await this.dsClient.getDoc(eventId)).data()
    );
    const tournament = event.tournaments.get(tournamentId);
    const ranker = buildRanker(tournament.type);//new HerbRanker();
    ranker.deserialize(tournament.results);
    const rankedResults = ranker.getResults();
    rankedResults.individualResults = new Map<
      string,
      Array<PinballIndividualRankedScore>
    >();
    return rankedResults;
  }

  async getPlayers(eventId) {
    return (await this.dsClient.getDoc(eventId)).data().listOfPlayers;
  }

  //FIXME : need tests for this
  async getQueuesForTournament(eventId,tournamentId): Promise<Map<string,EventQueueItemModel[]>>{
      const event = plainToClass(EventModel,(await this.dsClient.getDoc(eventId)).data());
      const queues: Map<string,EventQueueItemModel[]> = new Map();
      for(const [machineId,machineVal] of event.tournaments.get(tournamentId).machines.entries()){
          queues.set(machineId,machineVal.machineQueue);
      }
      return queues;
  }

  @transaction()
  async addToQueue(eventId,tournamentId,machineId,playerId): Promise<void>{
      const event = plainToClass(EventModel,(await this.dsClient.getDoc(eventId)).data());
      const machine =  event.tournaments.get(tournamentId).machines.get(machineId);
      const queue:Array<EventQueueItemModel> = machine.machineQueue;
      if(event.listOfPlayers.get(playerId)==undefined){
          throw new Error("Player does not exist")
      }
      if(machine.currentPlayer==undefined && queue.length==0){
        throw new Error("No current player on machine and queue is empty");
      }
      queue.push(new EventQueueItemModel(playerId));
      await this.dsClient.updateDoc(eventId, {
        ['tournaments.'+tournamentId+'.machines.'+machineId+'.machineQueue']: classToPlain(queue)
      });
      //await this.dsClient.updateDocAddArray(eventId,'tournaments.'+tournamentId+'.machines.'+machineId+'.machineQueue',classToPlain(new EventQueueItemModel(playerId)))
  }

  @transaction()
  async removeFromQueue(eventId,tournamentId,machineId,playerId): Promise<void>{
    const event = plainToClass(EventModel,(await this.dsClient.getDoc(eventId)).data());
    const machine =  event.tournaments.get(tournamentId).machines.get(machineId);
    let queue:Array<EventQueueItemModel> = machine.machineQueue;
    if(event.listOfPlayers.get(playerId)==undefined){
        throw new Error("Player does not exist")
    }
    queue = queue.filter((i)=>{
      return i.playerId!=playerId;
    });
    await this.dsClient.updateDoc(eventId, {
      ['tournaments.'+tournamentId+'.machines.'+machineId+'.machineQueue']: classToPlain(queue)
    });  }

  // @transaction()
  // async setRankerOptions(eventId:string,tournamentId:string,rankerOptions:RankerOptions){
  //   const event = plainToClass(EventModel,(await this.dsClient.getDoc(eventId)).data());
  //   const tournament = event.tournaments.get(tournamentId);
  //   const ranker = buildRanker(tournament.type);
  //   ranker.deserialize(tournament.results);
  // }

  // @transaction()
  // async insertIntoQueue(eventId,tournamentId,machineId,playerId,position): Promise<void>{
  //     const event = plainToClass(EventModel,(await this.dsClient.getDoc(eventId)).data());
  //     if(event.listOfPlayers.get(playerId)==undefined){
  //         throw new Error("Player does not exist")
  //     }
  //     const newQueue = event.tournaments.get(tournamentId).machines.get(machineId).machineQueue.filter((e)=>e.playerId!=playerId);
  //     newQueue.splice(position-1,0,new EventQueueItemModel(playerId))
  //     await this.dsClient.updateDoc(eventId,{['tournaments.'+tournamentId+'.machines.'+machineId+'.machineQueue']:newQueue.map((e)=>classToPlain(e))})
  // }
}
