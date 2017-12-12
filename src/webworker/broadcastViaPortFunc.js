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
 * https://jsfiddle.net/t463kLLw/12/
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
    //console.log(`postMessageToAllPorts ${portsArray.length} with data: `, subWorkerData);
    for(let i=0, len=portsArray.length; i < len; ++i){
      let port = portsArray[i];
      port.postMessage(subWorkerData);
    }
  }

  function postMessageToRandomPort(subWorkerData){
    if(!portsArray){return console.error(`broadcastViaPortFunc has not been initialized with ports.`);}
    let randomIndex = generateRandomNumber({min:0, max:portsArray.length-1});
    //console.log(`posting message to port index: ${randomIndex}`);
    let port = portsArray[randomIndex];
    port.postMessage(subWorkerData);
  }

  onmessage = function(e){
    let data = e.data;
    let command = data.command;
    let subWorkerData = data.subWorkerData;
    switch(command){
      case 'postMessageToAllPorts': //e.g. update positions
        postMessageToAllPorts(subWorkerData);
        break;
      case 'postMessageToRandomPort': //e.g. update positions
        postMessageToRandomPort(subWorkerData);
        break;
      case 'initialize':
        initialize(data);//ports
        break;
      case 'destroy':
        destroy(data);
        break;
      default:
        console.warn(`broadcastViaPortFunc did not recognize command --${command}--`);
    }
  }

  function generateRandomNumber({min=1, max=100}={}){
    return Math.round(Math.random() * (max - min)) + min;
  }
}