

//this function is turned into a string, then loaded as a web worker.
// no outside references allowed.
//work the worker does when receiving a message
export default function hitTestWorkerFunc(){
  importScripts('https://cdnjs.cloudflare.com/ajax/libs/three.js/88/three.js');
  let {Box3} = THREE;
  let hittableWebWorkerHitBoxes = [];
  let p; //MessageChannel port we receive messages other than initialize on.
  let id;//unique id provided by initialize function so that tasks can be given to 1 subworker at a time if needed.

  //performs hit tests agains all boxes
  function performHitTest({requestId, webWorkerHitBox1, webWorkerHitBoxes=hittableWebWorkerHitBoxes}){
    let hitteeComponentId = webWorkerHitBox1.componentId;
    let box1box3 = new Box3().set(webWorkerHitBox1.hitBox.min, webWorkerHitBox1.hitBox.max);

    //console.log(`performing hit test for hitteeComponentId: ${hitteeComponentId} against ${webWorkerHitBoxes.length} hittable boxes`);
    let doesIntersect = false;
    let intersectResult = {doesIntersect, hitteeComponentId, hitComponentId:undefined};

    for(let i = 0, len = webWorkerHitBoxes.length; i < len; ++i){
      let webWorkerHitBox2 = webWorkerHitBoxes[i];

      let box2box3 = new Box3().set(webWorkerHitBox2.hitBox.min, webWorkerHitBox2.hitBox.max);
      let doesIntersect = box1box3.intersectsBox(box2box3);
      if(doesIntersect === true){
        let hitComponentId = webWorkerHitBox2.componentId;
        intersectResult.doesIntersect = true;
        intersectResult.hitComponentId = hitComponentId;
        break;
      }
    }
    if(intersectResult.doesIntersect){
      let webWorkerResponse = intersectResult;
      webWorkerResponse.command = 'hitTestResult';
      postMessage(webWorkerResponse);
    }
  }

  function registerHittableWebWorkerHitBox({componentId, hitBox, hitBoxes=hittableWebWorkerHitBoxes}){
    hitBoxes.push({componentId, hitBox});
  }

  function unregisterHittableWebWorkerHitBox({componentId, hitBoxes=hittableWebWorkerHitBoxes}){
    let hitIndex = hitBoxes.findIndex((element)=>{
      return element.componentId === componentId;
    });
    if(hitIndex < 0){return;}
    hitBoxes.splice(hitIndex, 1);//remove hittable component from
  }

  function updateComponentHitBox({componentId, hitBox, hitBoxes=hittableWebWorkerHitBoxes}){
    for(let i = 0, len=hitBoxes.length; i < len; ++i){
      let hb = hitBoxes[i];
      if(hb.componentId == componentId){
        hb.hitBox = hitBox;
        break;
      }
    }
  }

  function intialize({port, workerId}){
    if(!port){console.error(`hitTestWorkerFunc was not initialized with a port`);}
    p = port;
    p.onmessage = onmessage;
    id = workerId;
  }

  function destroy(){
    hittableWebWorkerHitBoxes = [];
  }

  //postMessage and port.postMessage will end up here.
  function onmessage(e){
    let data = e.data;
    let command = data.command;
    let workerId = data.workerId;
    if(workerId != undefined || workerId != id){return;}

    switch(command){
      case 'initialize':{
        intialize(data);
      }
      case 'performHitTest':{
        performHitTest(data);
        break;
      }
      case 'registerHittableWebWorkerHitBox':{
        registerHittableWebWorkerHitBox(data);
        break;
      }
      case 'unregisterHittableWebWorkerHitBox':{
        unregisterHittableWebWorkerHitBox(data);
        break;
      }
      case 'updateComponentHitBox':{
        updateComponentHitBox(data);
        break;
      }
      case 'destroy':{
        destroy(data);
        break;
      }
      default:{
        console.log(`web worker did not recognize command ${command}`);
      }
    }
  }

  onmessage = onmessage
}
