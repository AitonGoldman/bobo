import AVLTree from 'avl';
import { RankerOptions } from './models';
import {
  PinballResult,
  PinballRankedResults,
  PinballScore,
  ScoringPlayer,
  PinballIndividualRankedScore,
  PinballCumlativeRankedScore,
} from './PinballResult';
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
  rankerOptions?: RankerOptions;
}

//https://stackoverflow.com/questions/29085197/how-do-you-json-stringify-an-es6-map
export function replacer(key, value) {
  const originalObject = this[key];
  if (originalObject instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(originalObject.entries()), // or with spread: value: [...originalObject]
    };
  } else {
    return value;
  }
}

export function reviver(key, value) {
  if (typeof value === 'object' && value !== null) {
    if (value.dataType === 'Map') {
      return new Map(value.value);
    }
  }
  return value;
}

export class HerbRanker implements PinballScoreRanker {
  machineRankings: Map<string, AVLTree<number, HerbTreeNode>>;
  tournamentRankings: AVLTree<number, any>;
  rankerOptions: RankerOptions;

  //FIXME : need to be able to pass in configurations at creation time for points configuration
  constructor() {
    this.machineRankings = new Map<string, AVLTree<number, HerbTreeNode>>();
    this.tournamentRankings = new AVLTree<number, any>();
    this.rankerOptions = new RankerOptions();
    this.rankerOptions.maxScoresPerTicket.value=3;
    this.rankerOptions.maxScoresPerTicket.enabled=true;

  }
  //FIXME : deserialize should be a static builder that returns a PinballScoreRanker.  This
  //        requires some fancy footwork in the PinballScoreRanker to make deserialize static
  deserialize(rawString: string): void {
    const rawParsedTree: HerbDeserializedString = JSON.parse(
      rawString,
      reviver
    ) as HerbDeserializedString;
    rawParsedTree.machineRankings.forEach((scores, machineKey) => {
      const keys = scores.map((x) => x.score);
      if (!this.machineRankings.get(machineKey)) {
        this.machineRankings.set(
          machineKey,
          new AVLTree<number, HerbTreeNode>()
        );
      }
      this.machineRankings.get(machineKey).load(keys, scores);
    });
    this.rankerOptions = rawParsedTree.rankerOptions;

    //throw new Error("Method not implemented.");
  }
  serialize(): string {
    const serializeObject: HerbDeserializedString = {
      tournamentRankings: Array<any>(),
      machineRankings: new Map<string, HerbTreeNode[]>(),
    };
    this.machineRankings.forEach((scoresVal, machineKey) => {
      if (!serializeObject.machineRankings.get(machineKey)) {
        serializeObject.machineRankings.set(
          machineKey,
          new Array<HerbTreeNode>()
        );
      }
      scoresVal.forEach((score) => {
        serializeObject.machineRankings.get(machineKey).push(score.data);
      });
    });
    serializeObject.rankerOptions=this.rankerOptions;
    return JSON.stringify(serializeObject, replacer);
  }

  addResult(pinballResult: PinballResult): void {
    pinballResult.pinballScores.forEach((scoreVal: PinballScore) => {
      scoreVal.scoringPlayers.forEach((playerVal: ScoringPlayer) => {
        if (!this.machineRankings.get(scoreVal.machineId)) {
          this.machineRankings.set(
            scoreVal.machineId,
            new AVLTree((a, b) => b - a)
          );
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
  getResults(): PinballRankedResults {
    const pinballRankedResults: PinballRankedResults = {};
    pinballRankedResults.individualResults = new Map<
      string,
      Array<PinballIndividualRankedScore>
    >();
    const playerRankedHash = new Map<string,PinballCumlativeRankedScore>();
    const playerRankedArray = new Array<PinballCumlativeRankedScore>();
    pinballRankedResults.cumalativeResults = new Array<PinballCumlativeRankedScore>();
    this.machineRankings.forEach(
      (machineTreeVal: AVLTree<number, HerbTreeNode>, machineKey) => {
        pinballRankedResults.tournamentType = 'HERB';
        pinballRankedResults.individualResults.set(
          machineKey,
          new Array<PinballIndividualRankedScore>()
        );
        let rank = 1;
        let prevScore = -1;
        const playerExistingScoreOnMachine = new Map<string,number>();
        machineTreeVal.values().forEach((herbTreeNodeVal: HerbTreeNode, machineScoreIndex) => {
          if(this.rankerOptions.allowOnlyOneScorePerMachine.value==true){
            let existingScore = playerExistingScoreOnMachine.get(herbTreeNodeVal.playerId);
            if(existingScore!=undefined && existingScore>=herbTreeNodeVal.score){
              return;
            }
            if(existingScore==undefined){
              playerExistingScoreOnMachine.set(herbTreeNodeVal.playerId,herbTreeNodeVal.score);
              existingScore=herbTreeNodeVal.score;
            }
          }
          if (prevScore != herbTreeNodeVal.score) {
            rank = machineScoreIndex + 1;
          }
          //FIXME : the following line should use rank and not machineScoreIndex
          let points = 100-machineScoreIndex;
          prevScore = herbTreeNodeVal.score;
          pinballRankedResults.individualResults.get(machineKey).push({
            playerId: herbTreeNodeVal.playerId,
            machineId: herbTreeNodeVal.machineId,
            score: herbTreeNodeVal.score,
            points: points,
            rank: rank,
          });
          if(!playerRankedHash.get(herbTreeNodeVal.playerId)){
            playerRankedHash.set(herbTreeNodeVal.playerId,{machineResults:new Array<any>(),totalPoints:0,playerId:herbTreeNodeVal.playerId});
            playerRankedArray.push(playerRankedHash.get(herbTreeNodeVal.playerId));
          }
          playerRankedHash.get(herbTreeNodeVal.playerId).machineResults.push({machineId:herbTreeNodeVal.machineId,rank:rank,points:points})
        });
      }
    );
    playerRankedHash.forEach((v,k)=>{
      v.machineResults.sort((a,b)=>{
        if(a.points>b.points){
          return -1;
        }
        if(b.points>a.points){
          return 1;
        }
        return 0;
      })
      const maxScoresEnabled = this.rankerOptions.maxScoresPerTicket;
      const maxScores= this.rankerOptions.maxScoresPerTicket.value;

      const maxScoresPerTicket = maxScoresEnabled?maxScores:v.machineResults.length;
      v.machineResults = v.machineResults.slice(0,maxScoresPerTicket);
      const reducer = (a, b) => a + (b.points || 0);

      v.totalPoints = v.machineResults.reduce(reducer,0)
    })
    pinballRankedResults.cumalativeResults = playerRankedArray.sort((a,b)=>{
      if(a.totalPoints < b.totalPoints){
        return 1;
      }
      if(a.totalPoints > b.totalPoints){
        return -1;
      }
      return 0;
    });
    pinballRankedResults.cumalativeResults.map((v,i,arr)=>{
      let prevScore;
      if(i==0){
        prevScore=undefined;
      } else {
        prevScore = arr[i-1].totalPoints;
      }
      if (prevScore != v.totalPoints) {
        v.rank = i+1;
        return;
      }
      let prevIndex = i-1;
      while(prevIndex>=0 && arr[prevIndex].totalPoints == v.totalPoints){
        prevIndex=prevIndex-1;
      }
      v.rank = prevIndex;
    })
    return pinballRankedResults;
  }
}
