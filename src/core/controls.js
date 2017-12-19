import {eventConfig as ec} from "core/eventConfig";
import {signal} from "core/core";
import {Clock, Math as threeMath} from "three";

//NOTE: the code in here is old and kind of ghetto.


let lookClock = new Clock();
let moveClock = new Clock();

let qwertyKeyCodeOrder = [
  // 1   2   3   4   5   6   7   8   9   0  -    =    delete
  49, 50, 51, 52, 53, 54, 55, 56, 57,   48, 189, 187, 8,
  // q   w   e   r   t   y   u   i   o   p  [    ]    \
  81, 87, 69, 82, 84, 89, 85, 73, 79,   80, 219, 221, 220,
  // a   s   d   f   g   h   j   k   l  ;    '    Enter
  65, 83, 68, 70, 71, 72, 74, 75,   76, 186, 222, 13,
  // z   x   c   v   b   n   m  ,    .     /
  90, 88, 67, 86, 66, 78,   77, 188, 190,  191
];

let {moveForward, moveBackward, moveLeft, moveRight, moveUp, moveDown} = ec.camera;

//start listening for keyboard, window, mouse movements, etc.
export function listen(){
  listenKeyboard();
  controls.unlistenMouse = listenMouse();
  listenWindow();
  listenPointerLock();
  signal.registerSignals(controls);
  //setupRequestPointerLock();

}

//control camera position
let controls = {
  moveDistancePerSecond: 30 ,
  unlistenMouse: ()=>{}, //unregister all mouse events.
  //storage for keys that are currently pressed, and their associated interval id.
  //key should only be given one interval (started when key is first pressed, stopped when key is released)
  keysCurrentlyPressed: {key:undefined, intervalId:undefined},
  stopLookingWithMouse: false, //when mouse leaves window, this will be set to true

  mouseMoved({pageX, pageY, clientX, clientY, height=window.innerHeight, width=window.innerWidth}){
    this.mouseX = pageX - (width/2);
    this.mouseY = pageY - (height/2);
    this.clientX = clientX;
    this.clientY = clientY;

  },

  pointerMoved({movementX=0, movementY=0}){
    this.mouseX += movementX;
    this.mouseY += movementY;

    this.clientX += movementX;
    this.clientY += movementY;

    this.movementX = movementX;
    this.movementY = movementY;

  },

  calculateCursorPositionAndSignal({height=window.innerHeight, width=window.innerWidth}={}){
    this.cursorX = (this.clientX /width) * 2 - 1;
    this.cursorY = - (this.clientY /height) * 2 + 1;
    signal.trigger(ec.mouse.move, {mouseX:this.mouseX, mouseY:this.mouseY, clientX:this.clientX,
      clientY:this.clientY, cursorX:this.cursorX, cursorY:this.cursorY, movementX:this.movementX, movementY:this.movementY});
  },

  signals:{
    [ec.webgl.performFrameCalculations]({clock=moveClock}={}){
      //this.performLookAtBasedOnMouseMovement();
      this.performMovementBasedOnKeysPressed({clock});
      this.calculateCursorPositionAndSignal();
      //stop the mouse from moving
      // this.movementY = 0;
      // this.movementX = 0;
      // this.cursorX = 0;
      // this.cursorY = 0;
    }
  },
  performLookAtBasedOnMouseMovement({lookSpeed=0.1, mouseX=this.mouseX, mouseY=this.mouseY}={}){
    if(this.stopLookingWithMouse){return;}
    let delta = lookClock.getDelta();
    //console.log('delta is ', delta);
    //look
    var actualLookSpeed = delta * lookSpeed;
    var verticalLookRatio = 1;
    if(isNaN(this.lon)){
      this.lon = 0;
    }
    if(isNaN(this.lat)){
      this.lat = 0;
    }
    this.lon += mouseX * actualLookSpeed;
    //if( this.lookVertical )
    this.lat -= mouseY * actualLookSpeed * verticalLookRatio;

    this.lat = Math.max( - 85, Math.min( 85, this.lat ) );
    this.phi = threeMath.degToRad( 90 - this.lat );

    this.theta = threeMath.degToRad( this.lon );

    this.xyz = {
      x: 100 * Math.sin( this.phi ) * Math.cos(this.theta),
      y: 100 * Math.cos( this.phi ),
      z: 100 * Math.sin( this.phi ) * Math.sin( this.theta )
    };
    if(isNaN(this.xyz.x)){
      return;
    }
    signal.trigger(ec.camera.setLookAtFromMouseMovement, this.xyz);

  },

  //stop controlling camera position
  keyReleased({keyReleased, keyCode}){
    let key = keyCode + '';
    delete this.keysCurrentlyPressed[key];
  },

  //control the camera position
  keyPressed({keyPressed, keyCode}){
    console.log('keypressed, keycode', keyPressed, keyCode);
    if(keyCode === 70){ //f
      requestFullScreen();
      return;
    }
    if(keyCode === 80){ //p
      requestPointerLock();
      return;
    }
    let key = keyCode + '';
    this.keysCurrentlyPressed[key] = {keyPressed, keyCode, clock:new Clock()};
  },

  /**
   * iterates over all the keys currently pressed.
   * creates camera.multiDirectionMove event data in the form
   * {
   *   [ec.camera.moveDown]: .1,
   *   [ec.camera.moveLeft]: -.1,
   *   ...
   * }
   * @param keyCodeToCameraMovementMap
   * @param clock
   * @param moveDistancePerSecond
   */
  performMovementBasedOnKeysPressed({keyCodeToCameraMovementMap=this.keyCodeToCameraMovementMap, clock=moveClock, moveDistancePerSecond=this.moveDistancePerSecond}={}){
    let delta = clock.getDelta();
    let amount = moveDistancePerSecond * delta;

    let moveEvents = [];
    for(let key in this.keysCurrentlyPressed){
      let keyInfo = this.keysCurrentlyPressed[key];
      if(keyInfo == undefined){continue;}
      let {keyPressed, keyCode} = keyInfo;

      let event = keyCodeToCameraMovementMap[keyPressed.toLowerCase()] || keyCodeToCameraMovementMap[keyCode];
      if(!event){continue;}

      moveEvents.push(event);
    }
    if(moveEvents.length == 0){return;}//avoid divide by 0 or unnecessarily trying to move

    let multiMovesEventData = {};
    let adjustedAmount = amount / moveEvents.length;
    for(let i=0, len=moveEvents.length; i < len; ++i){
     let event = moveEvents[i];
     multiMovesEventData[event] = adjustedAmount;//e.g. camera.moveDown = .1
    }

    signal.trigger(ec.camera.moveMultiDirection, multiMovesEventData);
  },

  keyCodeToCameraMovementMap:{
    'w': moveForward,
    's': moveBackward,
    'a':moveLeft,
    'd':moveRight,
    [32]:moveUp,//spacebar
    [38]:moveUp, //up arrow
    [16]:moveDown, //left shift
    [40]:moveDown, //down arrow
    [39]:moveRight, //right arrow
    [37]:moveLeft, //left arrow
  },


};

function listenWindow(){
  window.addEventListener("resize", (e)=>{
    let height = window.innerHeight;
    let width = window.innerWidth;
    signal.trigger(ec.window.resize, {height, width});
  });
}

function listenMouse(){
  let removeEventListenerFuncs = []
  let onmousemove = (e)=>{
    if(controls.stopLookingWithMouse){return;}
    let {clientX, clientY, pageX, pageY} = e;
    //console.log(`mouse move x:${x} y:${y}`);
    controls.mouseMoved({clientX, clientY, pageX, pageY});
  }
  //document.onmousemove = onmousemove;
  document.addEventListener('mousemove', onmousemove);
  removeEventListenerFuncs.push(()=>{document.removeEventListener('mousemove', onmousemove, false)});

  let onmousedown = (e)=>{
    let {clientX, clientY, pageX, pageY} = e;
    signal.trigger(ec.mouse.mousedown, {clientX, clientY, pageX, pageY, cursorX: controls.cursorX, cursorY: controls.cursorY});
  }
  document.onmousedown = onmousedown;
  removeEventListenerFuncs.push(()=>{document.removeEventListener('mousedown', onmousedown, false)});

  let onmouseout = (e)=>{
    let from = e.relatedTarget || e.toElement;
    if(!from || from.nodeName == "HTML"){
      //console.log('movemovement tracking is stopped because mouseout');
      controls.stopLookingWithMouse = true;
      lookClock = new Clock();//reset the time so cursor movement doesn't jump to somewhere other than where we left the screen.
    }
  }
  document.onmouseout = onmouseout;
  removeEventListenerFuncs.push(()=>{document.removeEventListener('mouseout', onmouseout, false)});

  let onmouseover = (e)=>{
    controls.stopLookingWithMouse = false;
  }
  document.onmouseover = onmouseover;
  removeEventListenerFuncs.push(()=>{document.removeEventListener('mouseover', onmouseover, false)});

  function unlisten(){
    removeEventListenerFuncs.forEach(f=>f());
  }
  return unlisten;
}

let isUsingPointerLock = false;
function listenPointerLock(){
  let onmousemove = (e)=>{
    let {clientX, clientY, pageX, pageY, movementX, movementY} = e;
    controls.pointerMoved({clientX, clientY, pageX, pageY, movementX, movementY});
  }

  document.addEventListener('pointerlockchange', (e)=>{
    isUsingPointerLock = document.pointerLockElement === document.body ? true : false;
    if(!isUsingPointerLock){
      document.removeEventListener('mousemove', onmousemove);
      controls.unlistenMouse = listenMouse();
    }else{
      controls.unlistenMouse();
      document.addEventListener('mousemove', onmousemove);
    }
  });

  document.addEventListener('pointerlockerror', (e)=>{
    console.error(`pointer lock error`, e);
  });
}

function listenKeyboard(){
  document.onkeydown = (e)=>{
    let keyCode = e.which;
    let keyPressed = String.fromCharCode(e.which);
    controls.keyPressed({keyPressed, keyCode});
  }
  document.onkeyup = (e)=>{
    let keyCode = e.which;
    let keyPressed = String.fromCharCode(e.which);
    controls.keyReleased({keyPressed, keyCode});
  }
}

function setupRequestFullScreen(){
  function handleInitialFullScreenRequestBegin(){
    var el = document.documentElement,
      rfs = el.requestFullscreen
        || el.webkitRequestFullScreen
        || el.mozRequestFullScreen
        || el.msRequestFullscreen
    ;

    rfs.call(el);
    document.body.removeEventListener('mousedown', handleInitialFullScreenRequestBegin);
  }
  //document.body.addEventListener('mousedown', handleInitialFullScreenRequestBegin, false);
}

// function setupRequestPointerLock(){
//   function handleInitialPointerLockBegin(){
//     var el = document.documentElement,
//       rfs = el.requestPointerLock
//         || el.mozRequestPointerLock
//     ;
//
//     rfs.call(el);
//     document.body.removeEventListener('mousedown', handleInitialPointerLockBegin);
//   }
//   document.body.addEventListener('mousedown', handleInitialPointerLockBegin, false);
// }

function requestFullScreen(){
  var el = document.documentElement,
    rfs = el.requestFullscreen
      || el.webkitRequestFullScreen
      || el.mozRequestFullScreen
      || el.msRequestFullscreen
  ;

  rfs.call(el);
}

function requestPointerLock(){
  var el = document.body,
    rfs = el.requestPointerLock
      || el.mozRequestPointerLock
  ;

  rfs.call(el);
}