import {BoxGeometry, CubeGeometry, MeshNormalMaterial, MeshLambertMaterial, Mesh, Box3} from 'three';
import {signal, eventConfig as ec, generateUniqueId} from "core/core";

let material = new MeshNormalMaterial();
let standardGeomatry = new CubeGeometry(.2, .2, .2);
standardGeomatry.computeBoundingBox();

export default class RotatingBox{
  componentId = generateUniqueId({name:'RotatingBox'})
  hitBox //used to determine if something hit us
  constructor({x=0, y=0, z=0}={}){
    let geometry = standardGeomatry;
    this.threejsObject = new Mesh(geometry, material);
    this.threejsObject.position.set(x, y, z);
    this.threejsObject.name = this.componentId;//needed for removing from scene
    this.hitBox = new Box3().setFromObject(this.threejsObject);
    signal.registerSignals(this);
  }
  signals = {
    [ec.hitTest.hitComponent]({hitComponent}){
      let componentId = hitComponent.componentId;
      if(this.componentId !== componentId){return;}
      signal.trigger(ec.stage.destroyComponent, {componentId});
    }
  }
  render() {
    this.threejsObject.rotation.x += 0.01;
    this.threejsObject.rotation.y += 0.02;
    this.hitBox = new Box3().setFromObject(this.threejsObject); //allow for moving box
  }

  addToScene({scene}) {
    scene.add(this.threejsObject);
    signal.trigger(ec.hitTest.registerHittableComponent, {component:this});
  }

  destroy({scene, name=this.threejsObject.name, componentId=this.componentId}){
    console.log(`destroy called for: ${name}`);
    let object3d = scene.getObjectByName(name);
    scene.remove(object3d);
    signal.trigger(ec.hitTest.unregisterHittableComponent, {componentId});
  }

}