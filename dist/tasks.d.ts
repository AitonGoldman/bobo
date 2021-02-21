import { OperatorFunction } from 'rxjs';
import { EventModel } from './models';
import { DataStoreClient } from './data-store-client';
interface PipelineTask {
    task: OperatorFunction<any, any>;
}
declare class BaseTask {
    dsClient: DataStoreClient;
    params: any;
    task: OperatorFunction<any, any>;
    constructor(dsClient: DataStoreClient, params: any);
}
export declare class CheckGameStartedTask extends BaseTask implements PipelineTask {
    task: OperatorFunction<EventModel, EventModel>;
}
export declare class CheckPlayerExistsTask extends BaseTask implements PipelineTask {
    task: OperatorFunction<EventModel, EventModel>;
}
export declare class ResetCurrentPlayerTask extends BaseTask implements PipelineTask {
    task: OperatorFunction<EventModel, EventModel>;
}
export declare class UpdatePlayerTicketsTask extends BaseTask implements PipelineTask {
    task: OperatorFunction<EventModel, EventModel>;
}
export declare class CommitTicketChangesTask extends BaseTask implements PipelineTask {
    task: OperatorFunction<EventModel, EventModel>;
}
export declare class UpdateMachineScoresTask extends BaseTask implements PipelineTask {
    task: OperatorFunction<EventModel, EventModel>;
}
export {};
