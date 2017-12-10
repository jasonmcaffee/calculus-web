//U
// this will be stringified. no external references allowed
/**
 * Only responsible for recieving message, then re-broadcasting that same message on the given port.
 * PostMessage is an expensive/timely function, so we only want to postMessage once, and have this orchestrator do all
 * sub-communication.
 *
 * This is needed because chrome does not allow a worker to create workers in it's thread.
 *
 * main thread -> create orchestrator. create sub workers.
 * main thread orchestrator -> create message channel, create subworkers, attach to port.
 * main thread orchestrator.postMessage -> post message via messageChannel to all subworkers.
 */
export default function broadcastViaPortFunc(){
  let port;//messageChannelPort

  function initialize({port}){
    port = port;
  }
  function destroy(){
    port = undefined;
  }

  function postMessageToPort(subWorkerData){
    if(!port){return console.error(`broadcastViaPortFunc has not been initialized with a port.`);}
    port.postMessage(subWorkerData);
  }

  function receiveMessageFromWorker(e){
    let data = e.data;
    postMessage(data);
  }

  onmessage = function(e){
    let data = e.data;
    let command = data.command;
    let subWorkerData = data.data;
    switch(command){
      case 'postMessageToPort':{ //e.g. update positions
        postMessageToPort(subWorkerData);
        break;
      }
      case 'intialize':{
        initialize(data);//port
        break;
      }
      case 'destroy':{
        destroy(data);
        break;
      }
      default:{
        console.log(`broadcastViaPortFunc did not recognize command ${command}`);
      }
    }
  }
}