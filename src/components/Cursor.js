import {BoxGeometry, CubeGeometry, MeshBasicMaterial, MeshNormalMaterial, MeshLambertMaterial, SphereGeometry, Mesh, Box3, Vector3} from 'three';
import {signal, eventConfig as ec, generateUniqueId, generateRandomNumber as grn} from "core/core";

let style = {
  material:{
    meshOne: new MeshBasicMaterial({color:0x4286f4, wireframe:false}),
    meshTwo: new MeshNormalMaterial(),
  },
  geometry: {
    geometryOne: new SphereGeometry(.1 , 4, 4),
    geometryTwo: new CubeGeometry(.2, .2, .2),
  }
};


export default class Cursor{
  componentId = generateUniqueId({name:'Cursor'})
  cameraPosition
  camera
  mouseX
  mouseY
  lookAt
  cursorX
  cursorY
  constructor({x=0, y=0, z=0, geometry=style.geometry.geometryOne, material=style.material.meshTwo}={}){
    this.threejsObject = new Mesh(geometry, material);

    this.threejsObject.name = this.componentId;//needed for removing from scene
    this.hitBox = new Box3().setFromObject(this.threejsObject);
    signal.registerSignals(this);
  }
  signals = {
    [ec.mouse.move]({mouseX, mouseY, clientX, clientY, cursorX, cursorY}){
      //console.log(`got mouseMove x: ${mouseX}  y: ${mouseY} cursorX: ${cursorX} cursorY: ${cursorY}`);
      this.mouseX = mouseX;
      this.mouseY = mouseY;
      this.clientX = clientX;
      this.clientY = clientY;
      this.cursorX = cursorX;
      this.cursorY = cursorY;
    },
    [ec.camera.positionChanged]({x, y, z, camera}){
      this.cameraPosition = {x, y, z};
      this.camera = camera;
    },
  }
  render() {
    this.moveToWhereMouseIsPointed();
  }
  moveToWhereMouseIsPointed({mouseX=this.mouseX, mouseY=this.mouseY, camera=this.camera, cursorX=this.cursorX, cursorY=this.cursorY}={}){
    if(!camera){return;}
    //console.log(`cursorX ${cursorX} cursorY: ${cursorY}`);

    var vector = new Vector3(cursorX, cursorY, .5);
    vector.unproject( camera );
    var dir = vector.sub( camera.position ).normalize();
    var distance = 2;//- camera.position.z / dir.z;
    var pos = camera.position.clone().add( dir.multiplyScalar( distance ) );

    this.threejsObject.position.copy(pos);
    let {x, y, z} = this.threejsObject.position;

    signal.trigger(ec.cursor.mousexyzChanged, {x, y, z, direction:dir});

  }

  addToScene({scene}) {
    scene.add(this.threejsObject);
  }

  destroy({scene, name=this.threejsObject.name, componentId=this.componentId}){
    let object3d = scene.getObjectByName(name);
    scene.remove(object3d);
  }

}