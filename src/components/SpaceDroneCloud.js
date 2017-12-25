import {BoxGeometry, CubeGeometry, MeshNormalMaterial, MeshLambertMaterial, Mesh, Box3, Texture, MirroredRepeatWrapping, Vector3, Clock, AudioLoader, PositionalAudio, AudioListener} from 'three';
import {signal, eventConfig as ec, generateUniqueId, generateRandomNumber as grn} from "core/core";
import SpaceDrone from 'components/SpaceDrone';

/*
  Cloud of space drones that form different shapes.
  Rectangle, circle, diamond, where each shape represents a level of difficulty in defeating.

  TODO: you cant just have each drone follow player. drone position and target tracking will need to be done here.
 */
export default class SpaceDroneCloud {
  componentId = generateUniqueId({name: 'SpaceDroneCloud'})
  excludedTargetComponentIds=[] //sometimes we dont want enemies to go after things like earth, etc. so we use these ids to ignore certain targets.
  droneComponents=[]
  constructor({numberOfDronesToCreate=10, x = grn({min, max}), y = grn({min, max}), z = grn({min, max}), hitPoints=1, bulletDistancePerSecond=150, moveDistancePerSecond=12, damage=0.2, excludedTargetComponentIds=[]} = {}) {
    this.excludedTargetComponentIds = excludedTargetComponentIds;

    this.droneComponents = this.createDrones({numberOfDronesToCreate});

    signal.registerSignals(this);
  }

  signals = {

  }

  createDrones({numberOfDronesToCreate, hitPoints=1, bulletDistancePerSecond=150, moveDistancePerSecond=12, damage=0.2, excludedTargetComponentIds=[]}){
    let drones = [];
    for(let i=0; i < numberOfDronesToCreate; ++i){
      let drone = this.createDrone({hitPoints, bulletDistancePerSecond, moveDistancePerSecond, damage, excludedTargetComponentIds});
      drones.push(drone);
    }
    return drones;
  }
  createDrone({x=0, y=0, z=0, hitPoints=1, bulletDistancePerSecond=150, moveDistancePerSecond=12, damage=0.2, excludedTargetComponentIds=[]}){
    let spaceDrone = new SpaceDrone({x, y, z, hitPoints, bulletDistancePerSecond, moveDistancePerSecond, damage, excludedTargetComponentIds});
    return spaceDrone;
  }

  /**
   * Form a shape
   */
  createDronePositions({numberOfPositionsToCreate=10}){
    let positions = [];
    for(let i = 0; i < numberOfPositionsToCreate; ++i){

    }
    return positions;
  }

  setDronePositionsInSquareFormation(){

  }

  /**
   * You could do some cool circling effects/reformation of each drone every interval.
   */
  render() {

  }

  addToScene({scene}) {
    scene.add(this.threejsObject);
  }



  destroy({scene, name = this.threejsObject.name, componentId = this.componentId}) {
    let object3d = scene.getObjectByName(name);
    scene.remove(object3d);
    signal.trigger(ec.hitTest.unregisterHittableComponent, {componentId});
    this.isDestroyed = true;
    this.humpBackAudio.stop();
  }

}
