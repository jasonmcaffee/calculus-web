import {BoxGeometry, SphereGeometry, MeshPhongMaterial, MeshLambertMaterial, Mesh, Box3, Vector3, Texture, Object3D, ImageUtils, ShaderLib, UniformsUtils, ShaderMaterial, DoubleSide} from 'three';
import {signal, eventConfig as ec, generateUniqueId, generateRandomNumber as grn} from "core/core";


let standardGeomatry = new SphereGeometry(20, 32, 32);
standardGeomatry.computeBoundingBox();

import earthSurfaceImageSource from 'images/earth/earthSurface.jpg';
//import earthBumpMapImageSource from 'images/earth/earthhdbumpmap.jpg';
import earthAtmosphereImageSource from 'images/earth/earthAtmosphere.png';
import earthSurfaceSpecularImageSource from 'images/earth/earthSurfaceSpecular.jpg';

/**
 * http://learningthreejs.com/blog/2013/09/16/how-to-make-the-earth-in-webgl/
 */
export default class Earth{
  componentId = generateUniqueId({name:'Earth'})
  hitBox //used to determine if something hit us
  constructor({x=0, y=0, z=-300}={}){

    let {globeMesh, cloudMesh} = this.createGlobeMesh();
    this.cloudMesh = cloudMesh;
    this.cloudMesh.position.set(x,y,z);
    this.threejsObject = globeMesh;
    this.threejsObject.name = this.componentId;
    this.threejsObject.position.set(x, y, z);
    this.hitBox = new Box3().setFromObject(this.threejsObject);

    signal.registerSignals(this);
  }

  createGlobeMesh(){
    function onload(){
      if(typeof globeMaterial != undefined){
        material.needsUpdate = true;
        console.log('material updated');
      }
    }
    let earthSurfaceTexture = this.createTextureFromImage({imageSource: earthSurfaceImageSource, onload});
    let earthAtmosphereTexture = this.createTextureFromImage({imageSource: earthAtmosphereImageSource, onload});
    //let earthBumpTexture = this.createTextureFromImage({imageSource: earthBumpMapImageSource, onload});

    let geometry   = new SphereGeometry(150, 32, 32);
    let cloudGeometry = new SphereGeometry(152, 32, 32);

    //globe
    let globeMaterial  = new MeshPhongMaterial({
      map:earthSurfaceTexture,
      //bumpMap: earthBumpTexture,
      bumpScale: 8,
    });

    let globeMesh = new Mesh(geometry, globeMaterial);

    //clouds
    let material  = new MeshPhongMaterial({
      map     : earthAtmosphereTexture,
      side        : DoubleSide,
      opacity     : 0.5,
      transparent : true,
      depthWrite  : false,
    })
    let cloudMesh = new Mesh(cloudGeometry, material)
    //globeMesh.add(cloudMesh);

    return {globeMesh, cloudMesh};

  }

  createTextureFromImage({imageSource, onload=()=>{}}){
    let image = new Image();
    image.src = imageSource;
    let texture = new Texture();
    texture.image = image;
    image.onload = ()=>{texture.needsUpdate=true; onload();}
    return texture;
  }

  createGlobeMeshOUTDATEDAPI(){
    let earthSurfaceImage = new Image();
    earthSurfaceImage.src = earthSurfaceImageSource;
    let earthSurfaceTexture = new Texture();
    earthSurfaceTexture.image = earthSurfaceImage;
    earthSurfaceImage.onload = ()=>{
      earthSurfaceTexture.needsUpdate = true;
    };

    let shader = ShaderLib["normal"];
    let uniforms = UniformsUtils.clone(shader.uniforms);

    //uniforms["tNormal"].texture = normalMap;
    uniforms.tNormal = {texture:earthSurfaceTexture};
    //uniforms["tSpecular"].texture = specularMap;

    // uniforms["enableDiffuse"].value = true;
    // uniforms["enableSpecular"].value = true;

    let shaderMaterial = new ShaderMaterial({
        fragmentShader: shader.fragmentShader,
        vertexShader: shader.vertexShader,
        uniforms: uniforms,
        //lights: true
      });
    let globeGeometry = new SphereGeometry(20, 32, 32);
    globeGeometry.computeTangents();

    let globeMesh = new Mesh(globeGeometry, shaderMaterial);
    return globeMesh;

  }


  signals = {
    [ec.hitTest.hitComponent]({hitComponent}){
      let componentId = hitComponent.componentId;
      if(this.componentId !== componentId){return;}
      console.log(`earth was hit dude`);
      //signal.trigger(ec.stage.destroyComponent, {componentId});
    }
  }
  render() {
    // this.threejsObject.rotation.x += 0.01;
    this.threejsObject.rotation.y += 0.0007;
    this.cloudMesh.rotation.y += 0.0006;
    //this.threejsObject.rotation.z += 0.01;
    this.hitBox = new Box3().setFromObject(this.threejsObject); //allow for moving box
  }

  addToScene({scene}) {
    scene.add(this.threejsObject);
    scene.add(this.cloudMesh);
    signal.trigger(ec.hitTest.registerHittableComponent, {component:this});
  }

  destroy({scene, name=this.threejsObject.name, componentId=this.componentId}){
    let object3d = scene.getObjectByName(name);
    scene.remove(object3d);
    signal.trigger(ec.hitTest.unregisterHittableComponent, {componentId});
  }

}