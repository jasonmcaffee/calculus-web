import {NewWorker} from "webworker/WebWorker";
import {signal, eventConfig as ec, generateRandomNumber as grn} from "core/core";
import broadcastViaPortFunc from 'webworker/broadcastViaPortFunc';

//const subWorkerResponseEventName = 'orchestrator.subworkerResponse';//todo: eventsConfig

//todo probably don't need workerId any longer
export default class Orchestrator{
  subWorkers=[]
  subWorkerFunc //orchestrator only works with 1 type of worker func. e.g. perform hit test would have its own orchestrator
  //subWorkerResponseSignalEventName=subWorkerResponseEventName;
  onmesssage //so we can subscribe similar to a webworker.
  broadCastViaPortWorker //worker which will have an array of ports that it will post to. allows us to have 1 post on main thread, and multiple posts in sub thread.
  ports=[]//cache of all ports used to send message to workers on
  constructor({subWorkerFunc, numberOfSubWorkersToCreate, onmessage=(data)=>{} }){
    //signal.registerSignals(this);
    this.onmesssage = onmessage;
    this.subWorkerFunc = subWorkerFunc;

    this.subWorkers = this.createSubWorkers({numberOfSubWorkersToCreate});
    this.tellSubWorkersToListenOnPort();

    this.broadCastViaPortWorker = this.createBroadCastViaPortWorker();//should be done after subWorkers have been created.
  }

  createSubWorkers({subWorkers=[], numberOfSubWorkersToCreate}={}){
    for(let i = 0; i < numberOfSubWorkersToCreate; ++i){
      let subWorker = this.createSubWorker();
      subWorkers.push(subWorker);
    }
    return subWorkers;
  }

  //note: a given port can only be transferred to a subworker once.
  createBroadCastViaPortWorker({}={}){
    this.ports = this.getPort1ArrayFromSubWorkers();
    let ports = this.ports;
    let worker = NewWorker(broadcastViaPortFunc, undefined);//shouldn't broadcast any messages.
    worker.postMessage({command:'initialize', ports}, ports);//must transfer ports as second param.
    return worker;
  }

  //useful for constructing broadcastViaPortWorker.
  getPort1ArrayFromSubWorkers({subWorkers=this.subWorkers}={}){
    let ports = [];
    for(let i=0, len=subWorkers.length; i < len; ++i){
      let subWorker = subWorkers[i];
      let mc = subWorker.messageChannel;
      if(!mc){console.error('no message channel found on worker'); continue;}
      ports.push(mc.port1);
    }
    return ports;
  }

  createSubWorker({subWorkerFunc=this.subWorkerFunc}={}){
    let subWorker = NewWorker(subWorkerFunc, undefined);
    subWorker.messageChannel = new MessageChannel();
    subWorker.onmessage = this.handleSubWorkerResponse.bind(this);
    return subWorker;
  }

  //send initialize with port to subworkers.
  //workers will use port2, orchestrator will use port1.
  tellSubWorkersToListenOnPort({subWorkers = this.subWorkers}={}){
    for(let i = 0, len = subWorkers.length; i < len; ++i){
      let subWorker = subWorkers[i];
      let port = subWorker.messageChannel.port2;

      subWorker.postMessage({command:'intialize', port, workerId:i}, [port]);
    }
  }

  //for work only 1 subworker needs to do
  messageRandomSubWorker({broadcastViaPortWorker=this.broadCastViaPortWorker, data}){
    //broadcastViaPortWorker.postMessage({command:'postMessageToRandomPort', subWorkerData:data});
    //don't go through orchestrator for this. message port directly.
    let randomIndex = grn({min:0, max:this.subWorkers.length-1});
    // let port = this.ports[randomIndex];
    // port.postMessage(data);
    // console.log(`posted data to port: `, data);
    let subWorker = this.subWorkers[randomIndex];
    subWorker.postMessage(data);
  }

  //for work all subworkers need to do. sending undefined workerId will indicate that every worker on the port will
  //perform the operation.
  messageAllSubWorkers({broadcastViaPortWorker=this.broadCastViaPortWorker, data}){
    broadcastViaPortWorker.postMessage({command:'postMessageToAllPorts', subWorkerData:data});
    // for(let i=0, len=this.subWorkers.length; i<len; ++i){
    //   let subWorker = this.subWorkers[i];
    //   subWorker.postMessage(data);
    // }
  }

  //when subWorkers post a message, we will fire our onmessage callback so others can subscribe to Orchestrator as they
  //would a web worker.
  handleSubWorkerResponse(data){
    //console.log(`orchestrator received response from subWorker: `, data);
    this.onmesssage(data);
  }


  destroy(){
    this.broadCastViaPortWorker.postMessage({command:'destroy'});
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