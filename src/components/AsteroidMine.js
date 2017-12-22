import {BoxGeometry, CubeGeometry, MeshNormalMaterial, MeshLambertMaterial, MeshPhongMaterial, Mesh, Box3, Vector3, DodecahedronGeometry, MeshStandardMaterial, Texture} from 'three';
import {signal, eventConfig as ec, generateUniqueId, generateRandomNumber as grn} from "core/core";
import Bullet from 'components/Bullet';

import asteroidImageSource from 'images/asteroid/asteroid.jpg';
//for performance, create 1 texture and reuse.
let asteroidTexture = createTextureFromImage({imageSource:asteroidImageSource});

//for performance, cache a finite set of random asteroid shapes
let asteroidGeometries = createArrayOfRandomAsteroidGeometries({numberOfGeometriesToCreate:100, minSize:1, maxSize:1});

export default class AsteroidMine{
  componentId = generateUniqueId({name:'AsteroidMine'})
  hitBox //used to determine if something hit us
  rotationEnabled = false
  constructor({x=0, y=0, z=0, numberOfBulletsOnExplode=10, bulletDistance=10, bulletDamage=5, rotationEnabled=false, geometries=asteroidGeometries}={}){

    this.numberOfBulletsOnExplode = numberOfBulletsOnExplode;
    this.bulletDistance = bulletDistance;
    this.bulletDamage = bulletDamage;
    this.rotationEnabled = rotationEnabled;

    this.threejsObject = this.createAsteroidMesh({geometries});
    this.threejsObject.position.set(x, y, z);
    this.threejsObject.name = this.componentId;//needed for removing from scene
    this.hitBox = new Box3().setFromObject(this.threejsObject);
    signal.registerSignals(this);
  }

  createAsteroidMesh({size=1,spreadX=1,maxWidth=5,maxHeight=5,maxDepth=1, texture=asteroidTexture, geometries}={}){
    let geometry = getRandomAsteroidGeometry({geometries});

    let asteroidMaterial  = new MeshPhongMaterial({
      map:texture,
    });

    let cube = new Mesh(geometry, asteroidMaterial);
    cube.scale.set(1+Math.random()*0.4,1+Math.random()*0.8,1+Math.random()*0.4);

    return cube;
  }

  signals = {
    [ec.hitTest.hitComponent]({hitComponent}){
      let componentId = hitComponent.componentId;
      if(this.componentId !== componentId){return;}
      this.explode();
      signal.trigger(ec.stage.destroyComponent, {componentId});
    }
  }

  render() {
    if(this.rotationEnabled){
      this.threejsObject.rotation.x += 0.01;
      this.threejsObject.rotation.y += 0.02;
      this.hitBox = new Box3().setFromObject(this.threejsObject); //allow for moving box
    }

  }

  explode({numberOfBulletsOnExplode=this.numberOfBulletsOnExplode, bulletDistance=this.bulletDistance}={}){
    if(this.hasExploded){return;} //hits can occur briefly after destroy component is fired.
    console.log(`exploding ${numberOfBulletsOnExplode} bullets`);
    for(let i = 0; i < numberOfBulletsOnExplode; ++i){
      this.fireBulletInRandomDirection();
    }
    this.hasExploded = true;
  }

  fireBulletInRandomDirection({threejsObject=this.threejsObject, distance=this.bulletDistance, min=-10000, max=10000,
                                sphereMaterial=Bullet.style.material.sphereMaterialOrange, damage=this.bulletDamage, hitResolution=1}={}){
    let positionVector = new Vector3(grn({min, max}), grn({min, max}), grn({min, max}));

    let startPosition = threejsObject.position.clone();
    let direction = new Vector3();
    direction.subVectors(positionVector, startPosition);

    let bullet = new Bullet({direction, startPosition, hitExclusionComponentId:this.componentId, distance, sphereMaterial, distancePerSecond: 2, damage, hitResolution});
    signal.trigger(ec.stage.addComponent, {component:bullet});
  }

  addToScene({scene}) {
    scene.add(this.threejsObject);
    signal.trigger(ec.hitTest.registerHittableComponent, {component:this});
  }

  destroy({scene, name=this.threejsObject.name, componentId=this.componentId}){
    let object3d = scene.getObjectByName(name);
    scene.remove(object3d);
    signal.trigger(ec.hitTest.unregisterHittableComponent, {componentId});
  }

}


function createTextureFromImage({imageSource, onload=()=>{}}){
  let image = new Image();
  image.src = imageSource;
  let texture = new Texture();
  texture.image = image;
  image.onload = ()=>{texture.needsUpdate=true; onload();}
  return texture;
}

function createArrayOfRandomAsteroidGeometries({numberOfGeometriesToCreate=20, minSize=1, maxSize=2}={}){
  let geometries = [];
  let size = Math.random() * (maxSize - minSize) + minSize;
  for(let i =1; i <= numberOfGeometriesToCreate; ++i){
    let geometry = createRandomAsteroidGeometry({size});
    geometries.push(geometry);
  }
  return geometries;
}

function getRandomAsteroidGeometry({geometries}){
  let min = 0;
  let max = geometries.length - 1;
  let randomIndex = grn({min, max});
  let geometry = geometries[randomIndex];
  return geometry;
}

function createRandomAsteroidGeometry({size=1}={}){
  let geometry = new DodecahedronGeometry(size, 1);
  geometry.vertices.forEach(function(v){
    v.x += (0-Math.random()*(size/4));
    v.y += (0-Math.random()*(size/4));
    v.z += (0-Math.random()*(size/4));
  });
  return geometry;
}