import {BoxGeometry, CubeGeometry, MeshNormalMaterial, MeshLambertMaterial, Mesh, Box3, Texture, MirroredRepeatWrapping, Vector3, Clock, AudioLoader, PositionalAudio, AudioListener} from 'three';
import {signal, eventConfig as ec, generateUniqueId, generateRandomNumber as grn} from "core/core";
import SpaceDrone from 'components/SpaceDrone';
import {calculateSphereSurfacePositions} from 'services/mathService';
/*
  Cloud of space drones that form different shapes.
  Rectangle, circle, diamond, where each shape represents a level of difficulty in defeating.

  TODO: you cant just have each drone follow player. drone position and target tracking will need to be done here.

  TODO: listen for droids to die, then indicate this component is dead. (for game end scenarios)  ec.spaceDrone.died {componentId} <--
 */
export default class SpaceDroneCloud {
  componentId = generateUniqueId({name: 'SpaceDroneCloud'})
  excludedTargetComponentIds=[] //sometimes we dont want enemies to go after things like earth, etc. so we use these ids to ignore certain targets.
  droneComponents=[]
  constructor({numberOfDronesToCreate=15, x = grn({min, max}), y = grn({min, max}), z = grn({min, max}), hitPoints=1, bulletDistancePerSecond=150, moveDistancePerSecond=12, damage=0.2, excludedTargetComponentIds=[], droneSizeRadius=.5} = {}) {
    this.excludedTargetComponentIds = excludedTargetComponentIds;
    this.position = {x, y, z};
    this.droneComponents = this.createDrones({numberOfDronesToCreate, droneSizeRadius, excludedTargetComponentIds});

    signal.registerSignals(this);
  }

  signals = {
    [ec.enemy.died]({componentId}){
      let myDeadSpaceDrone = this.droneComponents.find(d=> d.componentId === componentId);
      if(!myDeadSpaceDrone){return;}

      console.log(`my babies! someone killed my baby ${componentId}`);
      this.removeDrone({componentId});
      signal.trigger(ec.stage.destroyComponent, {componentId});
    }
  }

  removeDrone({componentId, droneComponents=this.droneComponents}){
    let index = droneComponents.findIndex(e=>e.componentId == componentId);
    if(index < 0){return;}
    droneComponents.splice(index, 1);
  }
  createDrones({startPosition=this.position, numberOfDronesToCreate, hitPoints=1, bulletDistancePerSecond=150, moveDistancePerSecond=12, damage=0.2, excludedTargetComponentIds=[], droneSizeRadius=2}){
    //first create their positions
    let radius = droneSizeRadius * 2 * numberOfDronesToCreate;
    let positions = calculateSphereSurfacePositions({radius, degreeIncrement: 360 / numberOfDronesToCreate, flatX:true});
    let drones = positions.map( ({x, y, z})=> this.createDrone({x, y, z, hitPoints, bulletDistancePerSecond, moveDistancePerSecond, damage, excludedTargetComponentIds}) );
    return drones;
  }

  createDrone({x=0, y=0, z=0, hitPoints=1, bulletDistancePerSecond=150, moveDistancePerSecond=12, damage=0.2, excludedTargetComponentIds=[], followTargets=false}){
    let spaceDrone = new SpaceDrone({x, y, z, hitPoints, bulletDistancePerSecond, moveDistancePerSecond, damage, excludedTargetComponentIds, followTargets});
    return spaceDrone;
  }

  /**
   * You could do some cool circling effects/reformation of each drone every interval.
   */
  render() {

  }

  addToScene({scene}) {
    //this.droneComponents.forEach(d=>d.addToScene({scene}));
    this.droneComponents.forEach(d=>signal.trigger(ec.stage.addComponent, {component:d}));
  }



  destroy({scene, name = this.componentId, componentId = this.componentId}) {
    // let object3d = scene.getObjectByName(name);
    // scene.remove(object3d);
    this.droneComponents.forEach(d=>d.destroy({scene}));
  }

}
