import {NewWorker} from "webworker/WebWorker";
import {signal, eventConfig as ec, generateRandomNumber as grn} from "core/core";
import broadcastViaPortFunc from 'webworker/broadcastViaPortFunc';

const subWorkerResponseEventName = 'orchestrator.subworkerResponse';//todo: eventsConfig

export default class Orchestrator{
  subWorkers=[]
  subWorkerFunc
  messageChannel
  subWorkerResponseSignalEventName=subWorkerResponseEventName;
  onmesssage //so we can subscribe similar to a webworker.
  constructor({subWorkerFunc, numberOfSubWorkersToCreate=2, onmessage=()=>{} }){
    signal.registerSignals(this);
    this.onmesssage = onmessage;
    this.messageChannel = new MessageChannel();
    this.subWorkerFunc = subWorkerFunc;
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

  //send initialize with port to subworkers.
  tellSubWorkersToListenOnPort({subWorkers = this.subWorkers, port=this.messageChannel.port1}={}){
    for(let i = 0, len = subWorkers.length; i < len; ++i){
      let subWorker = subWorkers[i];
      subWorker.postMessage({command:'intialize', port, workerId:i}, [port]);
    }
  }

  //for work only 1 subworker needs to do
  messageRandomSubWorker({subWorkers=this.subWorkers, port=this.messageChannel.port1, data}){
    let randomIndex = grn({min:0, max:this.subWorkers.length - 1});
    port.postMessage({workerId:randomIndex, data});
  }

  //for work all subworkers need to do. sending undefined workerId will indicate that every worker on the port will
  //perform the operation.
  messageAllSubWorkers(data){
    port.postMessage({data});
  }

  signals={
    [subWorkerResponseEventName](data){
      console.log(`orchestrator received response from subworker`, data);
      this.onmessage(data);
    }
  }

  destroy({signal=signal}){
    signal.unregisterSignals(this);
    this.terminateSubWorkers();
    this.subWorkers = [];
    this.onmesssage = undefined;
  }

  terminateSubWorkers({subWorkers=this.subWorkers}={}){
    for(let i = 0, len = subWorkers.length; i < len; ++i){
      let subWorker = subWorkers[i];
      subWorker.terminate();
    }
  }
}


// onSubWorkerMessage({data}){
//
// }
//
// listenToSubWorkers({subWorkers=this.subWorkers}={}){
//   for(let i = 0, len = subWorkers.length; i < len; ++i){
//     let subWorker = subWorkers[i];
//     subWorker.onmessage = this.onSubWorkerMessage.bind(this);
//   }
// }