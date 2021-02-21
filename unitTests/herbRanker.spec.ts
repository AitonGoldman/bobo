import { HerbRanker } from '../src/HerbRanker';

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

describe("A HERB Ranker", function() {
    it("can rank A Single Score",function(){
        const ranker:HerbRanker = new HerbRanker();
        ranker.addResult(createScore(1));
        expect(ranker.machineRankings.size).toEqual(1);
        expect(ranker.machineRankings.get("1").size).toEqual(1);
        expect(ranker.machineRankings.get("1").contains(1)).toEqual(true)
    })
    it("Can deserialize machine results",function(){
        const ranker:HerbRanker = new HerbRanker();
        ranker.deserialize('{"tournamentRankings":[],"machineRankings":{"dataType":"Map","value":[["1",[{"score":15,"playerId":"1","machineId":"1","ticketId":1},{"score":6,"playerId":"1","machineId":"1","ticketId":1},{"score":3,"playerId":"1","machineId":"1","ticketId":1}]]]}}');
        ranker.addResult(createScore(6));
        expect(ranker.serialize()).toEqual('{"tournamentRankings":[],"machineRankings":{"dataType":"Map","value":[["1",[{"score":6,"playerId":"1","machineId":"1","ticketId":1},{"score":15,"playerId":"1","machineId":"1","ticketId":1},{"score":6,"playerId":"1","machineId":"1","ticketId":1},{"score":3,"playerId":"1","machineId":"1","ticketId":1}]]]}}');
     
    })
    it("Can serialize machine results",function(){
        const ranker:HerbRanker = new HerbRanker();
        ranker.addResult(createScore(6));
        ranker.addResult(createScore(3));
        ranker.addResult(createScore(15));
        expect(ranker.serialize()).toEqual('{"tournamentRankings":[],"machineRankings":{"dataType":"Map","value":[["1",[{"score":15,"playerId":"1","machineId":"1","ticketId":1},{"score":6,"playerId":"1","machineId":"1","ticketId":1},{"score":3,"playerId":"1","machineId":"1","ticketId":1}]]]}}');
     
    })
    it("Can get ranked results with ties between players",function(){
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
    it("Can get ranked results",function(){
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

    it("Can get ranked results for 2 players when there are more than 3 games played per player",function(){
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
        //console.log(results.cumalativeResults);
        // expect(results.individualResults.get("1")[0].rank).toEqual(1);  
        // expect(results.individualResults.get("1")[0].score).toEqual(15);  
        // expect(results.individualResults.get("1")[1].rank).toEqual(2);  
        // expect(results.individualResults.get("1")[1].score).toEqual(6);  
        // expect(results.individualResults.get("1")[2].rank).toEqual(3);  
        // expect(results.individualResults.get("1")[2].score).toEqual(3);  
    })
    it("Can rank 3 scores",function(){
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
