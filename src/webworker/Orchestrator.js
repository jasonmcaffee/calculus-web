import {NewWorker} from "webworker/WebWorker";
import {signal, eventConfig as ec} from "core/core";

const subWorkerResponseEventName = 'orchestrator.subworkerResponse';//todo: eventsConfig

export default class Orchestrator{
  subWorkers=[]
  subWorkerFunc
  messageChannel
  subWorkerResponseSignalEventName=subWorkerResponseEventName;
  constructor({subWorkerFunc, numberOfSubWorkersToCreate=2}){
    this.messageChannel = new MessageChannel();
    this.subWorkerFunc = this.subWorkerFunc;
    this.subWorkers = this.createSubWorkers({numberOfSubWorkersToCreate});
    this.tellSubWorkersToListenOnPort();
  }

  createSubWorkers({subWorkers=[], numberOfSubWorkersToCreate}={}){
    for(let i = 0; i < numberOfSubWorkersToCreate; ++i){
      let subWorker = this.createSubWorker();
      subWorkers.push(subWorker);
    }
    return subWorkers;
  }

  createSubWorker({subWorkerFunc=this.subWorkerFunc, subWorkerResponseSignalEventName=this.subWorkerResponseSignalEventName}={}){
    let subWorker = NewWorker(subWorkerFunc, subWorkerResponseSignalEventName);
    return subWorker;
  }

  tellSubWorkersToListenOnPort({subWorkers = this.subWorkers, port=this.messageChannel.port1}={}){
    for(let i = 0, len = subWorkers.length; i < len; ++i){
      let subWorker = subWorkers[i];

    }
  }

  signals={
    [subWorkerResponseEventName](data){
      console.log(`orchestrator received response from subworker`, data);
    }
  }

  destroy({signal=signal}){

  }
}