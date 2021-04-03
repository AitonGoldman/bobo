import { HerbRanker, replacer } from '../src/HerbRanker';

function createScore(score:number,playerId:string="1", ticketId:number=1,machineId:string="1"){
    return {
      ticketId:ticketId,
      pinballScores: [{
       machineId:machineId,
       scoringPlayers: [
         {
           playerId:playerId,
           score:score
         }
       ]
      }]
    }
}

function createFakeSerializedRankerTournamentRankings(serializedRankerObject){
    serializedRankerObject.tournamentRankings=[]
}

function createFakeSerializedRankerOptions(serializedRankerObject){
    serializedRankerObject.rankerOptions={maxScoresPerTicket:{available:false,enabled:true,value:3},
                                          allowOnlyOneScorePerMachine:{available:false,enabled:false}
    }
}
function createFakeSerializedRankerMachineRanking(serializedRankerObject,machineId,score,playerId,ticketId){
    if(serializedRankerObject.machineRankings==undefined){
        serializedRankerObject.machineRankings = new Map<string,any>();
    }

    const machineRanking = {score:score,playerId:playerId,machineId:machineId,ticketId:ticketId};
    const machineRankingsExist = serializedRankerObject.machineRankings.has(machineId);
    if(!machineRankingsExist){
        serializedRankerObject.machineRankings.set(machineId,[]);
    }
    serializedRankerObject.machineRankings.get(machineId).push(machineRanking);
}


describe("A HERB Ranker", function() {
    it("Can deserialize machine results",function(){
        const ranker:HerbRanker = new HerbRanker();
        const serializedRankerObject:any = {};
        createFakeSerializedRankerTournamentRankings(serializedRankerObject);
        createFakeSerializedRankerMachineRanking(serializedRankerObject,"1",15,"1",1);
        createFakeSerializedRankerMachineRanking(serializedRankerObject,"1",3,"1",1);
        createFakeSerializedRankerOptions(serializedRankerObject);
        const serializedRanker = JSON.stringify(serializedRankerObject, replacer);
        ranker.deserialize(serializedRanker);
        ranker.addResult(createScore(6));
        //FIXME : poor mans deserialization screws up ordering of scores - fix this when we switch to using proper deserialization
        serializedRankerObject.machineRankings.get("1").push({score:6,playerId:"1",machineId:"1",ticketId:1})
        const returnedSerializedRanker = JSON.stringify(serializedRankerObject, replacer);
        //console.log(ranker.serialize());
        expect(ranker.serialize()).toEqual(returnedSerializedRanker);
    })
    it("Can serialize machine results",function(){
        const ranker:HerbRanker = new HerbRanker();
        ranker.addResult(createScore(6));
        ranker.addResult(createScore(3));
        ranker.addResult(createScore(15));
        const serializedRankerObject:any = {};
        createFakeSerializedRankerTournamentRankings(serializedRankerObject);
        createFakeSerializedRankerMachineRanking(serializedRankerObject,"1",15,"1",1);
        createFakeSerializedRankerMachineRanking(serializedRankerObject,"1",6,"1",1);
        createFakeSerializedRankerMachineRanking(serializedRankerObject,"1",3,"1",1);
        createFakeSerializedRankerOptions(serializedRankerObject);
        const serializedRanker = JSON.stringify(serializedRankerObject, replacer);
        expect(ranker.serialize()).toEqual(serializedRanker);
    })
    it("can rank A Single Score from a single player on a single machine",function(){
        const ranker:HerbRanker = new HerbRanker();
        ranker.addResult(createScore(1));
        expect(ranker.machineRankings.size).toEqual(1);
        expect(ranker.machineRankings.get("1").size).toEqual(1);
        expect(ranker.machineRankings.get("1").contains(1)).toEqual(true)
    })
    it("can rank Multiple Scores from a single player on a single machine",function(){
        const ranker:HerbRanker = new HerbRanker();
        ranker.addResult(createScore(15));
        ranker.addResult(createScore(3));
        ranker.addResult(createScore(6));
        expect(ranker.machineRankings.size).toEqual(1);
        expect(ranker.machineRankings.get("1").size).toEqual(3);
        expect(ranker.machineRankings.get("1").at(0).data.score).toEqual(15);
        expect(ranker.machineRankings.get("1").at(1).data.score).toEqual(6);
        expect(ranker.machineRankings.get("1").at(2).data.score).toEqual(3);
    })
    it("can rank A Single Score from a single player on multiple machines",function(){
        const ranker:HerbRanker = new HerbRanker();
        ranker.addResult(createScore(1,"P1",1,"1"));
        ranker.addResult(createScore(2,"P1",1,"2"));
        expect(ranker.machineRankings.size).toEqual(2);
        expect(ranker.machineRankings.get("1").size).toEqual(1);
        expect(ranker.machineRankings.get("1").contains(1)).toEqual(true)
        expect(ranker.machineRankings.get("2").size).toEqual(1);
        expect(ranker.machineRankings.get("2").contains(2)).toEqual(true)
    })
    it("can rank Multiple Scores from a single player on multiple machines",function(){
        const ranker:HerbRanker = new HerbRanker();
        ranker.addResult(createScore(1,"P1",1,"1"));
        ranker.addResult(createScore(2,"P1",1,"1"));
        ranker.addResult(createScore(3,"P1",1,"2"));
        ranker.addResult(createScore(4,"P1",1,"2"));
        expect(ranker.machineRankings.size).toEqual(2);
        expect(ranker.machineRankings.get("1").size).toEqual(2);
        expect(ranker.machineRankings.get("2").size).toEqual(2);
        expect(ranker.machineRankings.get("1").at(0).data.score).toEqual(2);
        expect(ranker.machineRankings.get("1").at(1).data.score).toEqual(1);
        expect(ranker.machineRankings.get("2").at(0).data.score).toEqual(4);
        expect(ranker.machineRankings.get("2").at(1).data.score).toEqual(3);

    })
    it("can rank Multiple Scores from mutliple players on a single machine",function(){
        const ranker:HerbRanker = new HerbRanker();
        ranker.addResult(createScore(15,"P101"));
        ranker.addResult(createScore(14,"P102"));
        ranker.addResult(createScore(3,"P101"));
        ranker.addResult(createScore(4,"P102"));
        ranker.addResult(createScore(6,"P101"));
        ranker.addResult(createScore(5,"P102"));
        expect(ranker.machineRankings.size).toEqual(1);
        expect(ranker.machineRankings.get("1").size).toEqual(6);
        expect(ranker.machineRankings.get("1").at(0).data.score).toEqual(15);
        expect(ranker.machineRankings.get("1").at(0).data.playerId).toEqual("P101");
        expect(ranker.machineRankings.get("1").at(1).data.score).toEqual(14);
        expect(ranker.machineRankings.get("1").at(1).data.playerId).toEqual("P102");
        expect(ranker.machineRankings.get("1").at(2).data.score).toEqual(6);
        expect(ranker.machineRankings.get("1").at(2).data.playerId).toEqual("P101");
        expect(ranker.machineRankings.get("1").at(3).data.score).toEqual(5);
        expect(ranker.machineRankings.get("1").at(3).data.playerId).toEqual("P102");
        expect(ranker.machineRankings.get("1").at(4).data.score).toEqual(4);
        expect(ranker.machineRankings.get("1").at(4).data.playerId).toEqual("P102");
        expect(ranker.machineRankings.get("1").at(5).data.score).toEqual(3);
        expect(ranker.machineRankings.get("1").at(5).data.playerId).toEqual("P101");
    })
    it("can rank Multiple Scores from mutliple players on multiple machine",function(){
        const ranker:HerbRanker = new HerbRanker();
        ranker.addResult(createScore(15,"P101",1,"1"));
        ranker.addResult(createScore(14,"P102",1,"1"));
        ranker.addResult(createScore(13,"P101",1,"1"));
        ranker.addResult(createScore(12,"P102",1,"1"));
        ranker.addResult(createScore(4,"P101",1,"2"));
        ranker.addResult(createScore(3,"P102",1,"2"));
        ranker.addResult(createScore(2,"P101",1,"2"));
        ranker.addResult(createScore(1,"P102",1,"2"));
        expect(ranker.machineRankings.size).toEqual(2);
        expect(ranker.machineRankings.get("1").size).toEqual(4);
        expect(ranker.machineRankings.get("2").size).toEqual(4);
        expect(ranker.machineRankings.get("1").at(0).data.score).toEqual(15);
        expect(ranker.machineRankings.get("1").at(0).data.playerId).toEqual("P101");
        expect(ranker.machineRankings.get("1").at(1).data.score).toEqual(14);
        expect(ranker.machineRankings.get("1").at(1).data.playerId).toEqual("P102");
        expect(ranker.machineRankings.get("1").at(2).data.score).toEqual(13);
        expect(ranker.machineRankings.get("1").at(2).data.playerId).toEqual("P101");
        expect(ranker.machineRankings.get("1").at(3).data.score).toEqual(12);
        expect(ranker.machineRankings.get("1").at(3).data.playerId).toEqual("P102");
        expect(ranker.machineRankings.get("2").at(0).data.score).toEqual(4);
        expect(ranker.machineRankings.get("2").at(0).data.playerId).toEqual("P101");
        expect(ranker.machineRankings.get("2").at(1).data.score).toEqual(3);
        expect(ranker.machineRankings.get("2").at(1).data.playerId).toEqual("P102");
        expect(ranker.machineRankings.get("2").at(2).data.score).toEqual(2);
        expect(ranker.machineRankings.get("2").at(2).data.playerId).toEqual("P101");
        expect(ranker.machineRankings.get("2").at(3).data.score).toEqual(1);
        expect(ranker.machineRankings.get("2").at(3).data.playerId).toEqual("P102");

    })

    it("Can get ranked results for a single player on a single machine",function(){
        const ranker:HerbRanker = new HerbRanker();
        ranker.addResult(createScore(15));
        ranker.addResult(createScore(3));
        ranker.addResult(createScore(6));
        const results = ranker.getResults();
        expect(results.individualResults.get("1")[0].rank).toEqual(1);
        expect(results.individualResults.get("1")[0].score).toEqual(15);
        expect(results.individualResults.get("1")[1].rank).toEqual(2);
        expect(results.individualResults.get("1")[1].score).toEqual(6);
        expect(results.individualResults.get("1")[2].rank).toEqual(3);
        expect(results.individualResults.get("1")[2].score).toEqual(3);
    })
    it("Can get ranked results for a single player on multiple machines",function(){
        const ranker:HerbRanker = new HerbRanker();
        ranker.addResult(createScore(15,"P1",1,"1"));
        ranker.addResult(createScore(16,"P1",1,"1"));
        ranker.addResult(createScore(5,"P1",1,"2"));
        ranker.addResult(createScore(6,"P1",1,"2"));
        const results = ranker.getResults();
        expect(results.individualResults.size).toEqual(2);
        expect(results.individualResults.get("1").length).toEqual(2);
        expect(results.individualResults.get("2").length).toEqual(2);
        expect(results.individualResults.get("1")[0].rank).toEqual(1);
        expect(results.individualResults.get("1")[0].score).toEqual(16);
        expect(results.individualResults.get("1")[1].rank).toEqual(2);
        expect(results.individualResults.get("1")[1].score).toEqual(15);
        expect(results.individualResults.get("2")[0].rank).toEqual(1);
        expect(results.individualResults.get("2")[0].score).toEqual(6);
        expect(results.individualResults.get("2")[1].rank).toEqual(2);
        expect(results.individualResults.get("2")[1].score).toEqual(5);
    })
    it("Can get ranked results for a multiple players on a single machine",function(){

    })
    it("Can get ranked results for a mutliple players on multiple machines",function(){

    })
    it("Can get machine ranked results with ties between players on a single machine",function(){
        const ranker:HerbRanker = new HerbRanker();
        ranker.addResult(createScore(15,"p1"));
        ranker.addResult(createScore(15,"p2"));
        ranker.addResult(createScore(3,"p3"));
        ranker.addResult(createScore(6,"p4"));
        ranker.addResult(createScore(6,"p5"));
        ranker.addResult(createScore(3,"p6"));
        ranker.addResult(createScore(5,"p7"));

        const results = ranker.getResults();
        expect(results.individualResults.get("1")[0].rank).toEqual(1);
        expect(results.individualResults.get("1")[0].score).toEqual(15);
        expect(results.individualResults.get("1")[0].playerId).toEqual("p2");
        expect(results.individualResults.get("1")[1].rank).toEqual(1);
        expect(results.individualResults.get("1")[1].score).toEqual(15);
        expect(results.individualResults.get("1")[1].playerId).toEqual("p1");
        expect(results.individualResults.get("1")[2].rank).toEqual(3);
        expect(results.individualResults.get("1")[2].score).toEqual(6);
        expect(results.individualResults.get("1")[2].playerId).toEqual("p5");
        expect(results.individualResults.get("1")[3].rank).toEqual(3);
        expect(results.individualResults.get("1")[3].score).toEqual(6);
        expect(results.individualResults.get("1")[3].playerId).toEqual("p4");
        expect(results.individualResults.get("1")[4].rank).toEqual(5);
        expect(results.individualResults.get("1")[4].score).toEqual(5);
        expect(results.individualResults.get("1")[4].playerId).toEqual("p7");
        expect(results.individualResults.get("1")[5].rank).toEqual(6);
        expect(results.individualResults.get("1")[5].score).toEqual(3);
        expect(results.individualResults.get("1")[5].playerId).toEqual("p6");
        expect(results.individualResults.get("1")[6].rank).toEqual(6);
        expect(results.individualResults.get("1")[6].score).toEqual(3);
        expect(results.individualResults.get("1")[6].playerId).toEqual("p3");

    })
    it("Can get machine ranked results with ties between players on multiple machines",function(){

    })
    it("Can get machine ranked results with multiple players getting same scores on multiple machines",function(){

    })
    it("will observe maxGames games played per player on multiple machines",function(){
        const ranker:HerbRanker = new HerbRanker();
        ranker.addResult(createScore(10,"p1",0,"m1"));
        ranker.addResult(createScore(11,"p2",0,"m1"));
        ranker.addResult(createScore(12,"p3",0,"m1"));

        ranker.addResult(createScore(13,"p1",0,"m2"));
        ranker.addResult(createScore(14,"p2",0,"m2"));
        ranker.addResult(createScore(15,"p3",0,"m2"));

        ranker.addResult(createScore(16,"p1",0,"m3"));
        ranker.addResult(createScore(17,"p2",0,"m3"));
        ranker.addResult(createScore(18,"p3",0,"m3"));

        ranker.addResult(createScore(55,"p1",0,"m4"));
        ranker.addResult(createScore(20,"p2",0,"m4"));
        ranker.addResult(createScore(21,"p3",0,"m4"));

        ranker.addResult(createScore(66,"p1",0,"m5"));
        ranker.addResult(createScore(23,"p2",0,"m5"));
        ranker.addResult(createScore(24,"p3",0,"m5"));

        const results = ranker.getResults();
        //console.log(results.cumalativeResults[0].machineResults);
        expect(results.cumalativeResults[0].machineResults.length).toEqual(3);
        expect(results.cumalativeResults[1].machineResults.length).toEqual(3);
        expect(results.cumalativeResults[2].machineResults.length).toEqual(3);
        // expect(results.individualResults.get("1")[0].rank).toEqual(1);
        // expect(results.individualResults.get("1")[0].score).toEqual(15);
        // expect(results.individualResults.get("1")[1].rank).toEqual(2);
        // expect(results.individualResults.get("1")[1].score).toEqual(6);
        // expect(results.individualResults.get("1")[2].rank).toEqual(3);
        // expect(results.individualResults.get("1")[2].score).toEqual(3);
    })

    it("Will observe the allowOnlyOneScorePerMachine option on a single machine",function(){
        const ranker:HerbRanker = new HerbRanker();
        ranker.rankerOptions.allowOnlyOneScorePerMachine.value=true;
        ranker.addResult(createScore(15));
        ranker.addResult(createScore(3));
        ranker.addResult(createScore(6));
        const results = ranker.getResults();
        expect(ranker.machineRankings.size).toEqual(1);
        expect(ranker.machineRankings.get("1").size).toEqual(3);
        expect(ranker.machineRankings.get("1").at(0).data.score).toEqual(15);
        expect(ranker.machineRankings.get("1").at(1).data.score).toEqual(6);
        expect(ranker.machineRankings.get("1").at(2).data.score).toEqual(3);
        expect(results.individualResults.size).toEqual(1);
        expect(results.individualResults.get("1").length).toEqual(1);
        expect(results.individualResults.get("1")[0].score).toEqual(15);
        expect(results.cumalativeResults.length).toEqual(1);
        expect(results.cumalativeResults[0].machineResults.length).toEqual(1);
    })
    it("Will observe the allowOnlyOneScorePerMachine option on multiple machines",function(){

    })
    // it("Load Test",function(){
    //     const ranker:HerbRanker = new HerbRanker();
    //     console.time("insertion");
    //     for(let p = 1;p<100;p++){
    //         const playerId="P"+p;
    //         for(let m=1;m<17;m++){
    //             const machineId="M"+m;
    //             for(let s=1;s<20;s++){
    //                 ranker.addResult(createScore(p*m*s*10000,playerId,0,machineId));
    //             }
    //         }
    //     }
    //     //console.timeEnd("insertion");
    //     console.timeLog("insertion");
    //     console.time("results");
    //     const results = ranker.getResults();
    //     console.timeLog("results");
    //     console.time("serialize");
    //     const output = ranker.serialize();
    //     console.timeLog("serialize");
    //     console.time("deserialize");
    //     const newranker:HerbRanker = new HerbRanker();

    //     newranker.deserialize(output);
    //     console.timeLog("deserialize");
    // })

})
