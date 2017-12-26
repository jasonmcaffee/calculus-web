import {BoxGeometry, CubeGeometry, MeshNormalMaterial, MeshLambertMaterial, Mesh, Box3, Texture, MirroredRepeatWrapping, Vector3, Clock, AudioLoader, PositionalAudio, AudioListener} from 'three';
import {signal, eventConfig as ec, generateUniqueId, generateRandomNumber} from "core/core";
import Bullet from 'components/Bullet';

import humpbackWhale1 from 'sounds/HumpbackWhale1.mp3';
import velicoraptorScream from 'sounds/velicoraptorScream.mp3';
import trexRoar from 'sounds/trexRoar.mp3';

import tysonsFaceImageSource from 'images/people/tysonsface.png';

let style ={
  color:{
    material: 0xffffff,
    materialHit: 0xff0000,
  }
};
let cubeSize = 1;
let standardGeomatry = new CubeGeometry(cubeSize, cubeSize, cubeSize);
standardGeomatry.computeBoundingBox();

let min = -100;
let max = 100;
let grn = generateRandomNumber;

export default class SpaceDrone {
  componentId = generateUniqueId({name: 'SpaceDrone'})
  hitBox //used to determine if something hit us
  hitPoints
  nearestTargetVector //keep track of where player currently is
  bulletDistancePerSecond
  moveDistancePerSecond
  audioListeners = [] //for positional sounds
  positionalSounds = []
  targets = [] //{componentId, x, y, z} all targets that move
  moveClock = new Clock()
  excludedTargetComponentIds=[] //sometimes we dont want enemies to go after things like earth, etc. so we use these ids to ignore certain targets.
  followTargets = true //disable when we are using a SpaceDroneCloud, which needs to orchestrate movements for all drones.
  handleHitTestResults = true //should drone control when it moves backwards after hitting something. dronecloud wants to control this.
  constructor({x = grn({min, max}), y = grn({min, max}), z = grn({min, max}), hitPoints=1, bulletDistancePerSecond=150, moveDistancePerSecond=12, damage=0.2,
                excludedTargetComponentIds=[], followTargets=true} = {}, handleHitTestResults=true) {
    let geometry = standardGeomatry;
    this.hitPoints = hitPoints;
    this.bulletDistancePerSecond = bulletDistancePerSecond;
    this.moveDistancePerSecond = moveDistancePerSecond;
    this.image = new Image();
    this.image.src = tysonsFaceImageSource;
    this.damage = damage;
    this.excludedTargetComponentIds = excludedTargetComponentIds;
    this.followTargets = followTargets;
    this.handleHitTestResults = handleHitTestResults;

    let texture = new Texture();
    texture.image = this.image;
    this.image.onload = ()=>{
      texture.needsUpdate = true;
    }
    //texture.repeat.set(3, 3);
    texture.wrapS = texture.wrapT = MirroredRepeatWrapping;

    this.material = new MeshLambertMaterial({ color: style.color.material, map: texture });

    this.threejsObject = new Mesh(geometry, this.material);
    this.threejsObject.position.set(x, y, z);
    this.threejsObject.name = this.componentId;//needed for removing from scene
    this.hitBox = new Box3().setFromObject(this.threejsObject);

    this.createSounds();
    signal.registerSignals(this);
  }

  createSounds({threejsObject=this.threejsObject, positionalSounds=this.positionalSounds, audioListeners=this.audioListeners}={}){
    var {audio:hbAudio, listener:hbListener} = this.createPositionalSound({src:humpbackWhale1, repeat:true, playWhenReady:true});
    this.humpBackAudio = hbAudio;
    this.audioListeners.push(hbListener);

    var {audio:vrAudio, listener:vrListener} = this.createPositionalSound({src:velicoraptorScream});
    this.velociraptorScreamAudio = vrAudio;
    this.audioListeners.push(vrListener);

    var {audio:trAudio, listener:trListener} = this.createPositionalSound({src:trexRoar});
    this.trexRoarAudio = trAudio;
    this.audioListeners.push(trListener);

    threejsObject.add(this.humpBackAudio);
    threejsObject.add(this.velociraptorScreamAudio);
    threejsObject.add(this.trexRoarAudio);
  }

  signals = {
    //used when we disable following targets. drone cloud will fire this event.
    [ec.component.setPosition]({componentId, x, y, z}){
      if(this.componentId !== componentId){return;}
      this.threejsObject.position.set(x, y, z);
      this.hitBox = new Box3().setFromObject(this.threejsObject);
      signal.trigger(ec.hitTest.updateComponentHitBox, {component:this});
    },
    [ec.hitTest.hitComponent]({hitComponent, damage=0}) {
      let componentId = hitComponent.componentId;
      if (this.componentId !== componentId) {
        return;
      }
      this.hitPoints -= damage;
      this.playHitAnimation();

      if(this.hitPoints <= 0){
        signal.trigger(ec.stage.destroyComponent, {componentId});
        signal.trigger(ec.enemy.died, {componentId});
      }
    },
    //see if we hit anything while moving.e.g earth
    [ec.hitTest.hitTestResult]({doesIntersect, hitteeComponentId, hitComponentId, damage=this.damage}){
      if(!this.handleHitTestResults){return;}
      if(this.componentId != hitteeComponentId || this.hitExclusionComponentId == hitComponentId){return;}
      this.hasHit = true;
      console.log(`spacedrone has hit something ${hitteeComponentId}  ${hitComponentId}`);
      this.lastHitComponentId = hitComponentId;
      this.moveInOppositeDirection();
    },
    [ec.enemy.targetPositionChanged]({x, y, z, componentId}){
      if(this.isTargetComponentIdExcluded({componentId})){return;}
      let target = this.getTargetByComponentId(componentId);
      if(!target){
        target = {componentId, x, y, z};
        this.addTarget(target);
      }else{
        target.x = x;
        target.y = y;
        target.z = z;
      }
      let {nearestTargetVector, nearestComponentId} = this.findNearestTargetVector();
      this.nearestTargetVector = nearestTargetVector;
      this.nearestComponentId = nearestComponentId;
    }
  }
  isTargetComponentIdExcluded({componentId, excludedTargetComponentIds=this.excludedTargetComponentIds}){
    let isExcluded =  excludedTargetComponentIds.includes(componentId);
    return isExcluded;
  }
  addTarget(target){
    this.targets.push(target);
  }
  getTargetByComponentId(componentId){
    for(let i =0, len=this.targets.length; i < len; ++i){
      let target = this.targets[i];
      if(target.componentId === componentId){
        return target;
      }
    }
    return undefined;
  }

  //when player moves, we want to either attack earth or the player.
  findNearestTargetVector({targets=this.targets, startPosition=this.threejsObject.position}={}){
    let nearestTargetVector = new Vector3(0, 0, 0);
    let shortestDistance;
    let nearestComponentId;
    for(let i=0, len=targets.length; i < len; ++i){
      let target = targets[i];
      let targetVector = new Vector3(target.x, target.y, target.z);
      let distance = startPosition.distanceTo(targetVector);

      if(target.componentId.indexOf('Player')>=0){
        distance *= 2; //the player should be twice as close as the earth for us to follow them.
      }

      if(!shortestDistance){
        shortestDistance = distance;
        nearestTargetVector = targetVector;
        nearestComponentId = target.componentId;
      }
      if(distance < shortestDistance){
        shortestDistance = distance;
        nearestTargetVector = targetVector;
        nearestComponentId = target.componentId;
      }

    }
    return {nearestTargetVector, nearestComponentId};
  }
  stopMovingIfYouHitEarth(){
    //if we previously hit earth, and earth is still the nearest target, dont move.
    if(this.lastHitComponentId && this.lastHitComponentId.indexOf('Earth') >= 0){
      if(this.nearestComponentId === this.lastHitComponentId){
        return true;
      }else{
        this.lastHitComponentId = undefined;//clear out so when she leaves earth, she'll go back again.
      }
    }
    return false;
  }
  followNearestTarget({nearestTargetVector=this.nearestTargetVector, delta=this.moveClock.getDelta(), moveDistancePerSecond=this.moveDistancePerSecond}={}){
    if(!this.followTargets){return; }
    if(!nearestTargetVector){ return;}
    if(this.stopMovingIfYouHitEarth()){return;}

    let playerPositionVector = new Vector3(nearestTargetVector.x, nearestTargetVector.y, nearestTargetVector.z);

    let startPosition = this.threejsObject.position;
    let direction = new Vector3();
    direction.subVectors(nearestTargetVector, startPosition);
    this.currentDirection = direction;//needed so when we run into something we can back up.

    let distance = (moveDistancePerSecond * delta);

    let newPosition = new Vector3().copy(direction).normalize().multiplyScalar(distance);
    this.threejsObject.position.add(newPosition);
    this.hitBox = new Box3().setFromObject(this.threejsObject);

    signal.trigger(ec.hitTest.updateComponentHitBox, {component:this});

    this.performHitTest();
  }
  startFiringBullets(timeout=generateRandomNumber({min:100, max:1000})){
    if(this.isDestroyed){return;}
    setTimeout(function(){
      //this.fireBulletAtNearestTarget();
     // this.startFiringBullets();
    }.bind(this), timeout)
  }

  fireBulletAtNearestTarget({nearestTargetVector=this.nearestTargetVector, threejsObject=this.threejsObject, componentId=this.componentId,
                              bulletMaterial=Bullet.style.material.sphereMaterialRed, bulletDistancePerSecond=this.bulletDistancePerSecond, damage=this.damage}={}){
    if(!nearestTargetVector){return;}//don't fire if you don't have targets.
    let targetVector = nearestTargetVector;
    let startPosition = threejsObject.position.clone();
    let direction = new Vector3();
    direction.subVectors(nearestTargetVector, startPosition);

    let bullet = new Bullet({direction, startPosition, hitExclusionComponentId:componentId, sphereMaterial: bulletMaterial, distancePerSecond:bulletDistancePerSecond, damage});
    signal.trigger(ec.stage.addComponent, {component:bullet});
  }

  hitCount = 0
  playHitAnimation({threejsObject=this.threejsObject, hitColor=style.color.materialHit}={}, intervalMs=100, maxIntervalCount=10){
    if(this.playingHitAnimation){return;}
    this.playingHitAnimation = true;

    let screamAudio = this.hitCount++ % 2 == 0 ? this.velociraptorScreamAudio : this.trexRoarAudio;
    screamAudio.play();

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
      threejsObject.material.color.setHex(color);
    }.bind(this), intervalMs);

  }

  //when we run into something.
  moveInOppositeDirection({currentDirection=this.currentDirection, currentPosition=this.threejsObject.position, distance=-2}={}){
    console.log(`tysons mom moving in opposite direction`);
    let newPosition = new Vector3().copy(currentDirection).normalize().multiplyScalar(distance);
    this.threejsObject.position.add(newPosition);
    this.hitBox = new Box3().setFromObject(this.threejsObject);
    signal.trigger(ec.hitTest.updateComponentHitBox, {component:this});
  }

  performHitTest({hitteeComponent=this}={}){
    signal.trigger(ec.hitTest.performHitTest, {hitteeComponent});
  }

  render() {
    this.threejsObject.rotation.x += 0.01;
    this.threejsObject.rotation.y += 0.02;
    //this.hitBox = new Box3().setFromObject(this.threejsObject); //allow for moving box
    this.followNearestTarget();
  }

  addToScene({scene}) {
    scene.add(this.threejsObject);
    signal.trigger(ec.hitTest.registerHittableComponent, {component: this});
    this.startFiringBullets();
    this.audioListeners.forEach(listener=>{
      signal.trigger(ec.camera.attachAudioListenerToCamera, {listener});
    });

  }

  createPositionalSound({src=humpbackWhale1, repeat=false, playWhenReady=false}={}){
    let listener = new  AudioListener();

    var audio = new PositionalAudio( listener );
    var audioLoader = new AudioLoader();
    audioLoader.load(src, function( buffer ) {
      audio.setBuffer( buffer );
      audio.setRefDistance( 10);
      if(repeat){
        audio.setLoop(true);
      }
      if(playWhenReady){
        audio.play();
      }
    });

    return {audio, listener};
  }

  createAudio({src}={}){
    let audio = new Audio();
    audio.src = src;
    //audio.play();
    return audio;
  }

  destroy({scene, name = this.threejsObject.name, componentId = this.componentId}) {
    let object3d = scene.getObjectByName(name);
    scene.remove(object3d);
    signal.trigger(ec.hitTest.unregisterHittableComponent, {componentId});
    this.isDestroyed = true;
    this.humpBackAudio.stop();
  }

}
