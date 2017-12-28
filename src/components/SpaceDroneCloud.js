import {Line, LineBasicMaterial, Geometry, BoxGeometry, CubeGeometry, MeshNormalMaterial, MeshLambertMaterial, Mesh, Box3, Texture, MirroredRepeatWrapping, Vector3, Clock, AudioLoader, PositionalAudio, AudioListener} from 'three';
import {signal, eventConfig as ec, generateUniqueId, generateRandomNumber as grn} from "core/core";
import SpaceDrone from 'components/SpaceDrone';
import {calculateSphereSurfacePositions, rotateVector} from 'services/mathService';
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
  droneSizeRadius //rough size of drone to help figure out how to position them in circle
  nearestTargetVector //set anytime a target moves/change position.
  targets = []
  moveClock = new Clock()
  moveDistancePerSecond = 0
  constructor({numberOfDronesToCreate=10, x = grn({min, max}), y = grn({min, max}), z = grn({min, max}), hitPoints=1, bulletDistancePerSecond=150, moveDistancePerSecond=12, damage=0.2, excludedTargetComponentIds=[], droneSizeRadius=.5} = {}) {
    this.excludedTargetComponentIds = excludedTargetComponentIds;
    this.positionVector = new Vector3(x, y, z);
    this.droneComponents = this.createDrones({numberOfDronesToCreate, droneSizeRadius, excludedTargetComponentIds});
    this.droneSizeRadius = droneSizeRadius;
    this.excludedTargetComponentIds = excludedTargetComponentIds;
    this.moveDistancePerSecond = moveDistancePerSecond;

    signal.registerSignals(this);

  }

  signals = {
    [ec.enemy.died]({componentId}){
      let myDeadSpaceDrone = this.droneComponents.find(d=> d.componentId === componentId);
      if(!myDeadSpaceDrone){return;}

      console.log(`my babies! someone killed my baby ${componentId}`);
      this.removeDrone({componentId});
      signal.trigger(ec.stage.destroyComponent, {componentId});
      this.formDronesIntoACircle();
    },
    //see if we hit anything while moving.e.g earth
    [ec.hitTest.hitTestResult]({doesIntersect, hitteeComponentId, hitComponentId, damage=this.damage}){
      let mySpaceDroneThatHitSomething = this.droneComponents.find(d=> d.componentId === hitteeComponentId);
      if(!mySpaceDroneThatHitSomething){return;}

      return;//todo move all drones backwards.
      //this.repositionDrones();

      if(this.componentId != hitteeComponentId){return;}
      this.hasHit = true;
      console.log(`cloud: spacedrone has hit something ${hitteeComponentId}  ${hitComponentId}`);
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
  isTargetComponentIdExcluded({componentId, excludedTargetComponentIds=this.excludedTargetComponentIds}){
    let isExcluded =  excludedTargetComponentIds.includes(componentId);
    return isExcluded;
  }

  removeDrone({componentId, droneComponents=this.droneComponents}){
    let index = droneComponents.findIndex(e=>e.componentId == componentId);
    if(index < 0){return;}
    droneComponents.splice(index, 1);
  }

  formDronesIntoACircle({droneComponents=this.droneComponents, startPosition=this.positionVector, droneSizeRadius=this.droneSizeRadius}={}){
    let numberOfDrones = droneComponents.length;
    if(numberOfDrones <= 0){return;}

    //calculate new positions
    let radius = droneSizeRadius * 2 * numberOfDrones;
    let positions = calculateSphereSurfacePositions({startPosition, radius, degreeIncrement: 360 / numberOfDrones, flatX:true});
    if(positions.length != numberOfDrones){
      console.error(`positions dont match number of drones.`);
      return;
    }

    //set drone positions
    for(let i=0; i < numberOfDrones; ++i){
      let drone = droneComponents[i];
      let position = positions[i];
      let {x, y, z} = position;
      signal.trigger(ec.component.setPosition, {componentId:drone.componentId, x, y, z});
    }
  }

  createDrones({startPosition=this.positionVector, numberOfDronesToCreate, hitPoints=1, bulletDistancePerSecond=150, moveDistancePerSecond=12, damage=0.2, excludedTargetComponentIds=[], droneSizeRadius=2, handleHitTestResults=false}){
    //first create their positions
    let radius = droneSizeRadius * 2 * numberOfDronesToCreate;
    let positions = calculateSphereSurfacePositions({startPosition, radius, degreeIncrement: 360 / numberOfDronesToCreate, flatX:true});
    let drones = positions.map( ({x, y, z})=> this.createDrone({x, y, z, hitPoints, bulletDistancePerSecond, moveDistancePerSecond, damage, excludedTargetComponentIds, handleHitTestResults}) );
    return drones;
  }

  createDrone({x=0, y=0, z=0, hitPoints=1, bulletDistancePerSecond=150, moveDistancePerSecond=12, damage=0.2, excludedTargetComponentIds=[], followTargets=false, handleHitTestResults=false}){
    let spaceDrone = new SpaceDrone({x, y, z, hitPoints, bulletDistancePerSecond, moveDistancePerSecond, damage, excludedTargetComponentIds, followTargets, handleHitTestResults});
    return spaceDrone;
  }

  //when player moves, we want to either attack earth or the player.
  findNearestTargetVector({targets=this.targets, startPosition=this.positionVector}={}){
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

  createLinePointingStraightUp({startPosition=this.positionVector, lineLength=100} = {}){
    let direction = new Vector3();
    let straightUpVector = new Vector3(startPosition.x, startPosition.y +100, startPosition.z);
    direction.subVectors(straightUpVector, startPosition);

    let distance = lineLength;
    let endPosition = direction.multiplyScalar(distance);

    let {x, y, z} = startPosition;
    let {x: x2, y: y2, z: z2} = endPosition;


    console.log(`startPosition: x: ${x}, y: ${y}, z:${z}    endPosition: x: ${x2}, y: ${y2}, z: ${z2}`);
    let line = createLine({x, y, z, x2, y2, z2});
    return line;
  }


  followNearestTarget({nearestTargetVector=this.nearestTargetVector, delta=this.moveClock.getDelta(), moveDistancePerSecond=this.moveDistancePerSecond, startPosition=this.positionVector}={}){
    if(!nearestTargetVector){ return;}

    let playerPositionVector = new Vector3(nearestTargetVector.x, nearestTargetVector.y, nearestTargetVector.z);
    let direction = new Vector3();
    direction.subVectors(nearestTargetVector, startPosition);
    this.currentDirection = direction;//needed so when we run into something we can back up.

    let distance = (moveDistancePerSecond * delta);

    let newPosition = new Vector3().copy(direction).normalize().multiplyScalar(distance);
    this.positionVector.add(newPosition);

    this.formDronesIntoACircle();
  }

  /**
   * You could do some cool circling effects/reformation of each drone every interval.
   */
  render() {
   // this.followNearestTarget();
    this.rotateDrones();
  }

  rotateDrones({droneComponents=this.droneComponents, degrees=2, axisVector={x:0, y:1, z:0} } ={}){
    axisVector.y += this.positionVector.y;
    axisVector.z += this.positionVector.z;
    axisVector.x += this.positionVector.x;
    //axisVector = this.positionVector.clone();
    // axisVector.y += 1;
    //axisVector.normalize();
    //axisVector.y += 1;

    for(let i = 0, len=droneComponents.length; i < len; ++i){
      let drone = droneComponents[i];
      if(i>0){return;}//debug
      this.rotateDrone({drone, degrees, axisVector});

    }
  }

  rotateDrone({drone, degrees=1, axisVector={x:0, y:1, z:0} } ={}){
    let componentId = drone.componentId;
    let startPosition = drone.threejsObject.position;//<--- this seems wrong. should be fixed point?
    let endPosition = rotateVector({vector: startPosition, axisVector, degrees});
    let {x, y, z} = endPosition;
   // signal.trigger(ec.component.setPosition, {componentId, x, y, z});
    drone.setPosition({x, y, z});
    //console.log(`new position: x: ${x}  y: ${y}  z: ${z}`);
  }

  //when we run into something.
  moveInOppositeDirection({currentDirection=this.currentDirection, currentPosition=this.positionVector, distance=-2}={}){
    console.log(`tysons mom moving in opposite direction`);
    let newPosition = new Vector3().copy(currentDirection).normalize().multiplyScalar(distance);
    this.positionVector.add(newPosition);
    this.formDronesIntoACircle();
  }

  performHitTest({hitteeComponent=this}={}){
    signal.trigger(ec.hitTest.performHitTest, {hitteeComponent});
  }

  addToScene({scene}) {
    //this.droneComponents.forEach(d=>d.addToScene({scene}));
    this.droneComponents.forEach(d=>signal.trigger(ec.stage.addComponent, {component:d}));
    let {x: x2, y: y2, z: z2} = this.positionVector;

    //debug rotation issue
    let positionLine = createLine({x:0, y:0, z:0, x2, y2, z2});
    scene.add(positionLine);

    let straightUpLine = this.createLinePointingStraightUp();
    scene.add(straightUpLine);
  }



  destroy({scene, name = this.componentId, componentId = this.componentId}) {
    // let object3d = scene.getObjectByName(name);
    // scene.remove(object3d);
    this.droneComponents.forEach(d=>d.destroy({scene}));
  }

}


function createLine({x=0, y=0, z=0, x2=0, y2=0, z2=0, material=new LineBasicMaterial({color:0x4286f4})}={}){
  let geometry = new Geometry();
  geometry.vertices.push(new Vector3(x, y, z));
  geometry.vertices.push(new Vector3(x2, y2, z2));
  let line = new Line(geometry, material);
  line.name = generateUniqueId({name:'line'});
  return line;
}