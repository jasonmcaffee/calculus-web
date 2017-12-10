// //U
// // this will be stringified. no external references allowed
// /**
//  * creates subworkers and communicates postMessages via messageChannel.
//  * PostMessage is an expensive/timely function, so we only want to postMessage once, and have this orchestrator do all
//  * sub-communication.
//  *
//  * This is needed because chrome does not allow a worker to create workers in it's thread.
//  *
//  * main thread -> create orchestrator. create sub workers.
//  * main thread orchestrator -> create message channel, create subworkers, attach to port.
//  * main thread orchestrator.postMessage -> post message via messageChannel to all subworkers.
//  */
// export default function orchestrationViaPortFunc(){
//
//   function generateRandomNumber({min=1, max=100}={}){
//     return Math.round(Math.random() * (max - min)) + min;
//   }
//
//   let workers = [];
//   function initialize({numberOfWorkers, workerFunctionString}){
//     for(let i = 0; i < numberOfWorkers; ++i){
//       let newWorker = NewWorker(workerFunctionString, receiveMessageFromWorker);
//       workers.push(newWorker);
//     }
//   }
//   function destroy(){
//     for(let i = 0, len = workers.length; i < len; ++i){
//       let worker = workers[i];
//       worker.onmessage = undefined;
//     }
//     postMessageToWorkers({command:'destroy'});
//     workers = [];
//   }
//
//   function postMessageToRandomWorker(subWorkerData){
//     let min = 0;
//     let max = workers.length;
//     let randomIndex = generateRandomNumber({min, max});
//     let worker = workers[randomIndex];
//     worker.postMessage(subWorkerData);
//   }
//
//   function postMessageToWorkers(subWorkerData){
//     for(let i = 0, len = workers.length; i < len; ++i){
//       let worker = workers[i];
//       worker.postMessage(subWorkerData);
//     }
//   }
//
//   function receiveMessageFromWorker(e){
//     let data = e.data;
//     postMessage(data);
//   }
//
//   onmessage = function(e){
//     let data = e.data;
//     let command = data.command;
//     let subWorkerData = data.data;
//     switch(command){
//       case 'postMessageToWorkers':{ //e.g. update positions
//         postMessageToWorkers(subWorkerData);
//         break;
//       }
//       case 'postMessageToRandomWorker':{
//         postMessageToRandomWorker(subWorkerData);
//         break;
//       }
//       case 'intialize':{
//         initialize(data);
//         break;
//       }
//       case 'destroy':{
//         destroy(data);
//         break;
//       }
//       default:{
//         console.log(`web worker orchestrator did not recognize command ${command}`);
//       }
//     }
//   }
// }