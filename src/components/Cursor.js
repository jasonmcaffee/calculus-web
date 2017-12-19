import {BoxGeometry, CubeGeometry, MeshBasicMaterial, MeshNormalMaterial, MeshLambertMaterial, SphereGeometry, Mesh, Box3, Vector3, Object3D, Euler, Raycaster, Clock} from 'three';
import {signal, eventConfig as ec, generateUniqueId, generateRandomNumber as grn} from "core/core";

let style = {
  material:{
    meshOne: new MeshBasicMaterial({color:0x4286f4, wireframe:true, transparent:true, opacity:.5}),
    meshTwo: new MeshNormalMaterial(),
  },
  geometry: {
    geometryOne: new SphereGeometry(.1 , 4, 4),
    geometryTwo: new CubeGeometry(.2, .2, .2),
  }
};

let PI_2 = Math.PI / 2;

export default class Cursor{
  componentId = generateUniqueId({name:'Cursor'})
  cameraPosition
  camera
  mouseX
  mouseY
  lookAt
  cursorX
  cursorY
  movementX
  movementY
  rotation = new Euler( 0, 0, 0, "YXZ" )
  direction = new Vector3( 0, 0, - 1 )
  raycaster = new Raycaster( new Vector3(), new Vector3( 0, - 1, 0 ), 0, 10 )
  prevTime = 0
  velocity = new Vector3()
  moveClock = new Clock()
  constructor({x=0, y=0, z=0, geometry=style.geometry.geometryOne, material=style.material.meshOne}={}){
    this.threejsObject = new Mesh(geometry, material);

    this.threejsObject.name = this.componentId;//needed for removing from scene
    this.hitBox = new Box3().setFromObject(this.threejsObject);

    this.yawObject = new Object3D();
    this.pitchObject = new Object3D();
    this.yawObject.position.y = 10;
    this.yawObject.add(this.pitchObject);

    signal.registerSignals(this);
  }
  signals = {
    [ec.mouse.move]({mouseX, mouseY, clientX, clientY, cursorX, cursorY, movementX, movementY}){
      //console.log(`got mouseMove x: ${mouseX}  y: ${mouseY} cursorX: ${cursorX} cursorY: ${cursorY}`);
      this.mouseX = mouseX;
      this.mouseY = mouseY;
      this.clientX = clientX;
      this.clientY = clientY;
      this.cursorX = cursorX;
      this.cursorY = cursorY;
      this.movementX = movementX;
      this.movementY = movementY;
    },
    [ec.camera.positionChanged]({x, y, z, camera}){
      this.cameraPosition = {x, y, z};
      this.camera = camera;
    },
    [ec.camera.moveMultiDirection](multiMovesEventData){
      //let {x, y, z} = this.camera.position;
      let moveDownAmount = multiMovesEventData[ec.camera.moveDown] || 0;
      let moveUpAmount = multiMovesEventData[ec.camera.moveUp] || 0;
      let moveLeftAmount = multiMovesEventData[ec.camera.moveLeft] || 0;
      let moveRightAmount = multiMovesEventData[ec.camera.moveRight] || 0;
      let moveForwardAmount = multiMovesEventData[ec.camera.moveForward] || 0;
      let moveBackwardAmount = multiMovesEventData[ec.camera.moveBackward] || 0;

      let zAmount =  moveBackwardAmount - moveForwardAmount;
      this.yawObject.translateZ(zAmount);
      // this.pitchObject.translateZ(zAmount);

      let xAmount = moveRightAmount - moveLeftAmount;
      this.yawObject.translateX(xAmount);
      // this.pitchObject.translateX(xAmount);

      let yAmount = moveUpAmount - moveDownAmount;
      this.yawObject.translateY(yAmount);
      // this.pitchObject.translateY(yAmount);

      //his.camera.position.set(x, y, z);
      let {x:newX, y:newY, z:newZ} = this.yawObject.position;


      signal.trigger(ec.camera.positionChanged, {x:newX, y:newY, z:newZ, camera:this.camera, xAmount, yAmount, zAmount});
    }
  }
  render() {
    //this.moveToWhereMouseIsPointed();
    this.rotateCameraBasedOnMouseMovement();
    this.calculateNewCursorPosition();//must be done after rotate.
    //stop camera from rotating if mouse stops.
    // this.movementX = 0;
    // this.movementY = 0;
    // this.cursorY = 0;
    // this.cursorX = 0;
  }

  //https://threejs.org/examples/misc_controls_pointerlock.html
  /**
   * The MouseEvent.movementX read-only property provides the shift in the X coordinate of the mouse pointer between that event and the previous mousemove event.
   * In other words, the value of that property is computed that way : currentEvent.movementX = currentEvent.screenX - previousEvent.screenX.
   * @param movementX
   * @param movementY
   * @param pitchObject
   * @param yawObject
   * @param direction
   * @param rotation
   * @param raycaster
   * @param prevTime
   * @param velocity
   * @param moveXAmount
   * @param moveYAmount
   * @param delta
   */
  rotateCameraBasedOnMouseMovement({movementX=this.movementX, movementY=this.movementY, pitchObject=this.pitchObject, yawObject=this.yawObject, direction=this.direction,
          rotation=this.rotation, raycaster=this.raycaster, prevTime=this.prevTime, velocity=this.velocity,
          moveXAmount=.05, moveYAmount=.05, delta=this.moveClock.getDelta()}={}){
    if(movementX == undefined){return;}
    this.yawObject.rotation.y -= movementX * moveYAmount * delta;
    this.pitchObject.rotation.x -= movementY * moveXAmount * delta;
    this.pitchObject.rotation.x = Math.max( - PI_2, Math.min( PI_2, this.pitchObject.rotation.x ) );

  }
  getDirection({v=new Vector3()}={}){ //not sure if anything calls this
    this.rotation.set( this.pitchObject.rotation.x, this.yawObject.rotation.y, 0);
    //console.log(`new rotation: ${this.rotation.x} ${this.rotation.y}`);
    v.copy(this.direction ).applyEuler( this.rotation );
    return v;
  }

  calculateNewCursorPosition({cameraPosition=this.getObject().position, direction=this.getDirection(),  cursorX=this.cursorX, cursorY=this.cursorY, camera=this.camera}={}){
    var vector = new Vector3(cursorX, cursorY, .5);
    vector.unproject( camera );
    var dir = direction;//vector.sub( cameraPosition ).normalize();
    var distance = 15;//- camera.position.z / dir.z;
    var pos = cameraPosition.clone().add( dir.multiplyScalar( distance ) );

    //set new position
    this.threejsObject.position.copy(pos);
    //console.log(`new position ${JSON.stringify(this.threejsObject.position)}`);
    let {x, y, z} = this.threejsObject.position;
    //console.log(`new cursor position is x: ${x}  y: ${y}  z: ${z}`)
    signal.trigger(ec.cursor.mousexyzChanged, {x, y, z, direction:dir});
  }
  // moveToWhereMouseIsPointed({mouseX=this.mouseX, mouseY=this.mouseY, camera=this.camera, cursorX=this.cursorX, cursorY=this.cursorY}={}){
  //   if(!camera){return;}
  //   //console.log(`cursorX ${cursorX} cursorY: ${cursorY}`);
  //
  //   var vector = new Vector3(cursorX, cursorY, .5);
  //   vector.unproject( camera );
  //   var dir = vector.sub( camera.position ).normalize();
  //   var distance = 2;//- camera.position.z / dir.z;
  //   var pos = camera.position.clone().add( dir.multiplyScalar( distance ) );
  //   this.threejsObject.position.copy(pos);
  //   //console.log(`new position ${JSON.stringify(this.threejsObject.position)}`);
  //   let {x, y, z} = this.threejsObject.position;
  //   //signal.trigger(ec.cursor.mousexyzChanged, {x, y, z, direction:dir});
  //
  // }

  getObject(){
    return this.yawObject;
  }

  addToScene({scene, camera}) {
    this.camera = camera;
    scene.add(this.threejsObject);

    this.pitchObject.add(camera);
    //this.yawObject.add(camera);

    scene.add(this.getObject());

  }

  destroy({scene, name=this.threejsObject.name, componentId=this.componentId}){
    let object3d = scene.getObjectByName(name);
    scene.remove(object3d);
  }

}


// raycaster.ray.origin.copy( this.getObject().position );
// raycaster.ray.origin.y -= 10;


// var time = performance.now();
// var delta = ( time - prevTime ) / 1000;
//
// velocity.x -= velocity.x * 10.0 * delta;
// velocity.z -= velocity.z * 10.0 * delta;
//
// velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass
//
// // direction.z = Number( true ) - Number( false );
// // direction.x = Number( false ) - Number( false );
// // direction.normalize(); // this ensures consistent movements in all directions
// //
// // if ( true || false ) velocity.z -= direction.z * 400.0 * delta;
// // if ( false || false ) velocity.x -= direction.x * 400.0 * delta;
//
// // if ( onObject === true ) {
// //
// //   velocity.y = Math.max( 0, velocity.y );
// //   canJump = true;
// //
// // }
//
// console.log(`moving x: ${velocity.x} y: ${velocity.y} z:${velocity.z} movementX:${movementX} movementY:${movementY}`);
// this.getObject().translateX( velocity.x * delta );
// this.getObject().translateY( velocity.y * delta );
// this.getObject().translateZ( velocity.z * delta );
//
// this.prevTime = time;