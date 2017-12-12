// this will be stringified. no external references allowed

/**
 * Allows us to put all the calling of other ports/workers into a worker thread.
 * This helps us get around Chrome's limitation where web workers cannot create WebWorkers.
 *
 * Speeds things up considerably.
 * 4 workers, calling postMessage to each takes ~70ms.
 * with this func time is reduced to ~20ms.
 *
 * this func is the orchestrator in:
 * https://jsfiddle.net/t463kLLw/8/
 */
export default function broadcastViaPortFunc(){
  let portsArray;//messageChannelPort

  function initialize({ports}){
    portsArray = ports;
  }
  function destroy(){
    portsArray = undefined;
  }

  function postMessageToAllPorts(subWorkerData){
    if(!portsArray){return console.error(`broadcastViaPortFunc has not been initialized with ports.`);}
    for(let i=0, len=portsArray.length; i < len; ++i){
      let port = portsArray[i];
      port.postMessage(subWorkerData);
    }
  }

  onmessage = function(e){
    let data = e.data;
    let command = data.command;
    let subWorkerData = data.data;
    switch(command){
      case 'postMessageToAllPorts':{ //e.g. update positions
        postMessageToAllPorts(subWorkerData);
        break;
      }
      case 'intialize':{
        initialize(data);//ports
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