import {eventConfig as ec} from 'core/eventConfig';
import {NewWorker} from "webworker/WebWorker";
import hitTestWorkerFunc from 'webworker/hitTestWorkerFunc';
import Orchestrator from 'webworker/Orchestrator';

//events
let webWorkerCommands = {
  performHitTest: 'performHitTest',
  registerHittableWebWorkerHitBox: 'registerHittableWebWorkerHitBox',
  unregisterHittableWebWorkerHitBox: 'unregisterHittableWebWorkerHitBox',
  destroy: 'destroy',
  updateComponentHitBox: 'updateComponentHitBox',
};

let webWorkerResultCommands = {
  hitTestResult: 'hitTestResult',
}

export default class HitTestService{
  hitTestWorkers=[]
  destroyFuncs=[]
  hitTestOrchestrator
  constructor({signal, numberOfSubWorkers=3}){
    this.signal=signal;
    signal.registerSignals(this);
    this.destroyFuncs.push(function(){
      signal.unregisterSignals(this);
    }.bind(this));

    this.hitTestOrchestrator = new Orchestrator({
      subWorkerFunc:hitTestWorkerFunc,
      numberOfSubWorkersToCreate:numberOfSubWorkers,
      onmessage:this.handleSubWorkerResultMessage.bind(this)
    });


  }

  handleSubWorkerResultMessage(e){
    let data = e.data;
    let {command} = data;
    switch(command){
      case webWorkerResultCommands.hitTestResult:{
        this.signal.trigger(ec.hitTest.hitTestResult, data);
        break;
      }
      default:{
        console.log(`unknown webWorkerResult command ${command}`);
      }
    }
  }

  //for things like updating hittableComponent's position.
  postMessageToAllSubWorkers(message){
    this.hitTestOrchestrator.postMessageToAllSubWorkers(message);
  }

  //for things like hit test for a bullet.
  postMessageToRandomSubWorker(message){
    this.hitTestOrchestrator.postMessageToRandomSubWorker(message);
  }

  destroySubWorkers(){
    this.postMessageToAllSubWorkers({command:webWorkerCommands.destroy});
    for(let i=0, len=this.hitTestWorkers.length; i < len; ++i) {
      let worker = this.hitTestWorkers[i];
      worker.terminate();
    }
    this.hitTestWorkers = [];
  }

  destroy(){
    this.destroyFuncs.forEach(df=>df());
    this.destroyFuncs = [];
    this.signal.unregisterSignals(this);
    this.destroySubWorkers();
  }

  signals = {
    [ec.hitTest.performHitTest]({hitteeComponent, requestId, hitTestWorker=this.hitTestWorker}){
      let webWorkerHitBox1 = createWebWorkerHitBoxFromComponent({component: hitteeComponent});
      let webWorkerRequest = {command: webWorkerCommands.performHitTest, webWorkerHitBox1};
      // hitTestWorker.postMessage(webWorkerRequest);
      this.postMessageToRandomSubWorker(webWorkerRequest);
    },
    [ec.hitTest.destroy]({hitTestWorker=this.hitTestWorker}={}){
      this.destroy();
    },
    [ec.hitTest.registerHittableComponent]({component, hitTestWorker=this.hitTestWorker}){
      let hb = createWebWorkerHitBoxFromComponent({component});
      let {componentId, hitBox} = hb;
      let webWorkerRequest = {command: webWorkerCommands.registerHittableWebWorkerHitBox, componentId, hitBox};
      //hitTestWorker.postMessage(webWorkerRequest);
      this.postMessageToAllSubWorkers(webWorkerRequest);
    },
    [ec.hitTest.unregisterHittableComponent]({componentId, hitTestWorker=this.hitTestWorker}){
      let webWorkerRequest = {command: webWorkerCommands.unregisterHittableWebWorkerHitBox, componentId};
      //hitTestWorker.postMessage(webWorkerRequest);
      this.postMessageToAllSubWorkers(webWorkerRequest);
    },
    [ec.hitTest.updateComponentHitBox]({component}){
      let hb = createWebWorkerHitBoxFromComponent({component});
      let {componentId, hitBox} = hb;
      let webWorkerRequest = {command: webWorkerCommands.updateComponentHitBox, componentId, hitBox};
      this.postMessageToAllSubWorkers(webWorkerRequest);
    }
  }
}




function createWebWorkerHitBoxFromComponent({component}){
  let {componentId, hitBox} = component;
  let {min, max} = hitBox;
  let wwHitBox = {
    componentId, hitBox:{min, max}
  }
  return wwHitBox;
}

function generateRandomNumber({min=1, max=100}={}){
  return Math.round(Math.random() * (max - min)) + min;
}