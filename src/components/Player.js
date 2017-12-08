import {BoxGeometry, CubeGeometry, MeshBasicMaterial, MeshLambertMaterial, Mesh, Box3, Vector3, DoubleSide} from 'three';
import {signal, eventConfig as ec, generateUniqueId} from "core/core";
// import Bullet from 'components/Bullet';
import Bullet from 'components/Bullet';

let material = new MeshBasicMaterial({color: 0x4286f4, transparent:true, opacity:0});
material.side = DoubleSide;//view box when in box

let standardGeomatry = new CubeGeometry(2, 2, 2);
standardGeomatry.computeBoundingBox();


let style ={
  color:{
    materialHit: 0xff0000,
  }
};

export default class Player {
  componentId = generateUniqueId({name: 'Player'})
  hitBox //used to determine if something hit us
  hitPoints
  constructor({x = 0, y = 0, z = 0, hitPoints=10, lookAtX=0, lookAtY=0, lookAtZ=0} = {}) {
    let geometry = standardGeomatry;
    this.hitPoints = hitPoints;
    this.threejsObject = new Mesh(geometry, material);
    this.threejsObject.position.set(x, y, z);
    this.threejsObject.name = this.componentId;//needed for removing from scene
    this.hitBox = new Box3().setFromObject(this.threejsObject);
    signal.registerSignals(this);

    signal.trigger(ec.player.hitPointsChanged, {hitPoints});
    signal.trigger(ec.camera.setPosition, {x, y, z});//move the camera to where the player is. a bit messy right now..
    //signal.trigger(ec.camera.setLookAt, {x: lookAtX, y:lookAtY, z:lookAtZ}); //todo: NOT WORKING
  }

  signals = {
    [ec.hitTest.hitComponent]({hitComponent, damage}) {
      let componentId = hitComponent.componentId;
      if (this.componentId !== componentId) {
        return;
      }
      this.hitPoints -= damage;
      this.playHitAnimation();
      signal.trigger(ec.player.hitPointsChanged, {hitPoints:this.hitPoints});
      if(this.hitPoints <= 0){
        signal.trigger(ec.stage.destroyComponent, {componentId});
        signal.trigger(ec.player.died);
      }
    },
    //follow the camera
    [ec.camera.positionChanged]({x, y, z}){
      this.threejsObject.position.set(x, y, z);
      this.hitBox = new Box3().setFromObject(this.threejsObject);
      signal.trigger(ec.player.positionChanged, {x, y, z});//let enemy know where you arez
      signal.trigger(ec.hitTest.updateComponentHitBox, {component:this});
    },
    [ec.stage.mouseClickedOnStage]({camera, cameraPosition, clientX, clientY, projector, width, height, cursorX, cursorY}){
      this.fireBulletNEW({camera, cameraPosition, projector, clientX, clientY, width, height, cursorX, cursorY});
    },
    [ec.cursor.mousexyzChanged]({x, y, z, direction}){
      this.mouseVector = new Vector3(x, y, z);
      this.mouseDirection = direction;
    }
  }

  playHitAnimation({hitPoints=this.hitPoints, threejsObject=this.threejsObject, intervalMs=100, maxIntervalCount=2, hitColor=style.color.materialHit}={}){
    if(this.playingHitAnimation){return;}
    this.playingHitAnimation = true;
    console.log('player hit animation');

    let originalColor = threejsObject.material.color.getHex();
    let intervalCount = 0;
    let intervalId = setInterval(function(){
      ++intervalCount;
      if(intervalCount >= maxIntervalCount){
        clearInterval(intervalId);
        this.playingHitAnimation = false;
        intervalCount = 0;
      }
      let color = intervalCount % 2 == 0 ? originalColor : hitColor;
      let transparent = intervalCount % 2 == 0 ? true : false;
      let opacity = intervalCount % 2 == 0 ? 0: .25;
      threejsObject.material.color.setHex(color);
      threejsObject.material.transparent = transparent;
      threejsObject.material.opacity = opacity;  //doesn't work?
    }.bind(this), intervalMs);
  }

  fireBulletNEW({camera, cameraPosition, projector, clientX, clientY, width, height, cursorX, cursorY}){
    if(!this.mouseDirection){return;}
    let direction = this.mouseDirection;
    let startPosition = this.mouseVector;

    let bullet = new Bullet({direction, startPosition, hitExclusionComponentId:this.componentId});
    signal.trigger(ec.stage.addComponent, {component:bullet});
  }

  // fireBullet({camera, cameraPosition, projector, clientX, clientY, width, height, cursorX, cursorY}){
  //
  //   // let mouseX = (clientX / width) * 2 - 1;
  //   // let mouseY = - (clientY / height) * 2 + 1;
  //   let mouseX = cursorX;
  //   let mouseY = cursorY;
  //   let mouseVector = new Vector3(mouseX, mouseY, 1);
  //   projector.unprojectVector(mouseVector, camera);
  //
  //   let direction = mouseVector.sub(cameraPosition).normalize();
  //   let startPosition = cameraPosition.clone();
  //
  //   let bullet = new Bullet({direction, startPosition, hitExclusionComponentId:this.componentId});
  //   signal.trigger(ec.stage.addComponent, {component:bullet});
  // }

  render() {
    this.hitBox = new Box3().setFromObject(this.threejsObject); //allow for moving box
  }

  addToScene({scene}) {
    scene.add(this.threejsObject);
    signal.trigger(ec.hitTest.registerHittableComponent, {component: this});
  }

  destroy({scene, name = this.threejsObject.name, componentId = this.componentId}) {
    signal.unregisterSignals(this);
    let object3d = scene.getObjectByName(name);
    scene.remove(object3d);
    signal.trigger(ec.hitTest.unregisterHittableComponent, {componentId});
  }

}