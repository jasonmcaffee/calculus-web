import {Vector3, Sphere} from 'three';
import {signal, eventConfig as ec, generateRandomNumber as grn} from "core/core";
import RotatingBox from 'components/RotatingBox';
import Floor from 'components/Floor';
import TysonsMom from 'components/TysonsMom';
import Player from 'components/Player';
import Cursor from 'components/Cursor';
import Earth from 'components/Earth';
import Galaxy from 'components/Galaxy';
import AsteroidMine from 'components/AsteroidMine'
import SunLight from 'components/SunLight';

export default class GameOne{
  onDestroyFuncs = [] //stuff to run when we destroy.
  enemies = []
  constructor(){
    signal.registerSignals(this);
    this.addDestroy(function(){signal.unregisterSignals(this)});
  }

  signals = {
    [ec.player.died](){
      //let game menu know. let game know so it can destroy the stage.
      signal.trigger(ec.game.gameEnded, {resultMessage:"You died in agonizing pain.", didPlayerWin:false});
      this.enemies = [];
    },
    [ec.enemy.died]({componentId}){
      this.removeEnemy({componentId});
      if(this.enemies.length <= 0){
        signal.trigger(ec.game.gameEnded, {resultMessage:"YOU HAVE DEFEATED HER!!!!.  THE EARTH IS SAVED!!!!", didPlayerWin:true});
      }
    },
    [ec.earth.died]({enemies=this.enemies}={}){
      enemies.forEach(e=>{
        signal.trigger(ec.stage.destroyComponent, {componentId: e.componentId});
      });
    },
    [ec.earth.doneExploding](){
      signal.trigger(ec.game.gameEnded, {resultMessage:"All those you loved are now dead.", didPlayerWin:false});
    }
  }

  removeEnemy({componentId, enemies=this.enemies}={}){
    let index = enemies.findIndex(e=>e.componentId == componentId);
    if(index < 0){return;}
    enemies.splice(index, 1);
  }

  addEnemyAndRegisterWithStage(enemy){
    this.enemies.push(enemy);
    signal.trigger(ec.stage.addComponent, {component: enemy});
  }

  registerComponentsWithStage({earthRadius=150}={}){
    //tell the camera where to look
    signal.trigger(ec.controls.reset, {lat:-40, lon:-40});

    let moonPosition = new Vector3(134, 140, -50);
    createRandomAsteroids({centerPosition:moonPosition, numberToCreate:3000, radius: 100});


    let component = new Floor({numberOfLines:0, distanceBetweenLines:100});
    signal.trigger(ec.stage.addComponent, {component});

    this.addEnemyAndRegisterWithStage(new TysonsMom({hitPoints:100, x:5.3, y: 56, z:8.6}));
    // this.addEnemyAndRegisterWithStage(new TysonsMom({hitPoints:100}));
    // this.addEnemyAndRegisterWithStage(new TysonsMom({hitPoints:100}));
    // this.addEnemyAndRegisterWithStage(new TysonsMom({hitPoints:100}));
    signal.trigger(ec.stage.addComponent, {component: new Player({hitPoints:10, x: -153, y:158, z:40 })});
    signal.trigger(ec.stage.addComponent, {component: new Cursor()});
    signal.trigger(ec.stage.addComponent, {component: new Earth({radius:earthRadius})});
    signal.trigger(ec.stage.addComponent, {component: new Galaxy()});
    signal.trigger(ec.stage.addComponent, {component: new SunLight({x: 100, y:100, z:700})})
  }


  addDestroy(func){
    func.bind(this);
    this.onDestroyFuncs.push(func);
  }
  runDestroyFuncs({onDestroyFuncs=this.onDestroyFuncs}={}){
    onDestroyFuncs.forEach(f=>f());
  }
  destroy(){
    this.runDestroyFuncs();
    this.enemies = [];
  }
}

function createRandomCubeVectors({centerPosition, radius, numberToCreate=3000}){
  let {x, y, z} = centerPosition;
  let minX = x - radius;
  let maxX = x + radius;
  let minY = y - radius;
  let maxY = y + radius;
  let minZ = z - radius;
  let maxZ = z + radius;

  let vectors = [];
  for(let i=1; i <= numberToCreate; ++i){
    let vector = new Vector3( grn({min:minX, max:maxX}), grn({min:minY, max:maxY}), grn({min:minZ, max:maxZ}) );
    vectors.push(vector);
  }

  return vectors;
}

function createRandomSphereVectors({centerPosition, radius, numberToCreate=3000}){
  let cubeVectors = createRandomCubeVectors({centerPosition, radius, numberToCreate});
  let sphereVectors = [];
  let sphere = new Sphere(new Vector3(centerPosition.x, centerPosition.y, centerPosition.z), radius);
  for(let i = 0, len=cubeVectors.length; i < len; ++i){
    let cubeVector = cubeVectors[i];
    let {x, y, z} = cubeVector;
    let s = new Sphere(new Vector3(x, y, z), .1);
    if(sphere.intersectsSphere(s)){
      sphereVectors.push(cubeVector);
    }
  }
  return sphereVectors;
}


function createRandomAsteroids({centerPosition, numberToCreate, radius}){

  let randomCubeVectors = createRandomSphereVectors({centerPosition, numberToCreate, radius});
  let randomAsteroids = randomCubeVectors.map((v)=>{
    let {x, y, z} = v;
    let component = new AsteroidMine({ rotationEnabled:false, x, y, z});
    signal.trigger(ec.stage.addComponent, {component});
    return component;
  });
  return randomAsteroids;

}

function randomSpherePointSameAs2({centerPosition, radius}){
  var newPos = new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5 ).normalize().multiplyScalar( radius * Math.random() );
  return newPos;
}
/*
 https://stackoverflow.com/questions/5531827/random-point-on-a-given-sphere
 Returns a random point of a sphere, evenly distributed over the sphere.
 The sphere is centered at (x0,y0,z0) with the passed in radius.
 The returned point is returned as a three element array [x,y,z].
 */
function randomSpherePointBad2({centerPosition,radius}){
  let {x, y, z} = centerPosition;
  var u = Math.random();
  var v = Math.random();
  var theta = 2 * Math.PI * u;
  var phi = Math.acos(2 * v - 1);
  var xResult = x + (radius * Math.sin(phi) * Math.cos(theta));
  var yResult = y + (radius * Math.sin(phi) * Math.sin(theta));
  var zResult = z + (radius * Math.cos(phi));
  return new Vector3(xResult, yResult, zResult);
}



function radomSpherePointBad({min, max, radius}){
  let vector = new Vector3( grn({min, max}), grn({min, max}), grn({min, max}) );
  vector.normalize();
  vector.multiplyScalar(radius);
  return vector;
}