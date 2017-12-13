import {Scene, Camera, WebGLRenderer, Raycaster, PerspectiveCamera, Vector3, Vector2, Projector} from 'three';
import {eventConfig as ec} from 'core/eventConfig';
import {signal, generateRandomNumber} from "core/core";
import RotatingBox from 'components/RotatingBox';
import Floor from 'components/Floor';
import HitTestService from 'services/HitTestService';

export default class StageOne {
  camera
  scene
  renderer
  hittableComponents = [] //[component, component]
  hitteeComponents = []//[component, component]
  rendererDomElement //created during initThreejs and used by react component to append to appropriate div
  children = []
  raycaster = new Raycaster()//used for hit tests
  projector = new Projector()//used for hit tests v2
  constructor({children=[]}={}) {
    this.children = children;
    signal.registerSignals(this);
    let hitTestService = new HitTestService({signal});

    //begin animation after instantiating scene, camera, and renderer.
    this.initThreeJs();

    console.log('signals: ' + JSON.stringify(signal.getSignalIds()));
  }

  /**
   * Setup camera, scene, etc
   */
  initThreeJs(){
    let {width, height} = this.getScreenDimensions();
    let camera = this.camera = new PerspectiveCamera( 70, width / height, 1, 700 );
    signal.trigger(ec.camera.setPosition, {x:0, y:0, z:0});
    signal.trigger(ec.camera.setLookAt, {x:0, y:0, z:0});
    //camera.rotation.set(0,0,0);//for Cursor

    let scene = this.scene = new Scene();
    this.addToScene({scene, camera});

    this.renderer = new WebGLRenderer( { antialias: true } );
    this.renderer.setSize(width, height);

    this.rendererDomElement = this.renderer.domElement;
    animate({camera, scene, renderer:this.renderer, stage:this});
  }



  addComponent({component, scene=this.scene, children=this.children, camera=this.camera}){
    children.push(component);
    component.addToScene({scene, camera});
  }
  signals = {
    [ec.camera.setPosition]({x, y, z}){
      this.camera.position.set(x, y, z);
    },
    [ec.camera.setLookAt]({x, y, z}){
      //console.log(`looking at x: ${x} y: ${y} z: ${z}`);
      this.camera.lookAt(new Vector3(x, y, z));
    },
    // [ec.camera.setLookAtFromMouseMovement]({x, y, z}){
    //   //console.log(`setLookAtFromMouseMovement ${x}, ${y}, ${z}`);
    //   x += this.camera.position.x;
    //   y += this.camera.position.y;
    //   z += this.camera.position.z;
    //   signal.trigger(ec.camera.setLookAt, {x,y,z});
    // },
    [ec.camera.moveMultiDirection](multiMovesEventData){
      // //let {x, y, z} = this.camera.position;
      // let moveDownAmount = multiMovesEventData[ec.camera.moveDown] || 0;
      // let moveUpAmount = multiMovesEventData[ec.camera.moveUp] || 0;
      // let moveLeftAmount = multiMovesEventData[ec.camera.moveLeft] || 0;
      // let moveRightAmount = multiMovesEventData[ec.camera.moveRight] || 0;
      // let moveForwardAmount = multiMovesEventData[ec.camera.moveForward] || 0;
      // let moveBackwardAmount = multiMovesEventData[ec.camera.moveBackward] || 0;
      //
      // let zAmount =  moveBackwardAmount - moveForwardAmount;
      // this.camera.translateZ(zAmount);
      //
      // let xAmount = moveRightAmount - moveLeftAmount;
      // this.camera.translateX(xAmount);
      //
      // let yAmount = moveUpAmount - moveDownAmount;
      // this.camera.translateY(yAmount);
      //
      // //his.camera.position.set(x, y, z);
      // let {x:newX, y:newY, z:newZ} = this.camera.position;
      //
      //
      // signal.trigger(ec.camera.positionChanged, {x:newX, y:newY, z:newZ, camera:this.camera, xAmount, yAmount, zAmount});

    },

    [ec.window.resize]({height, width}){
      let {camera, renderer} = this;
      let aspect = width / height;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    },
    [ec.camera.attachAudioListenerToCamera]({listener, camera=this.camera}){
      camera.add(listener);
    },

    //hit test
    //all registered hittable components will be evaluated to determine if the mouse x, y coordinates intersect/hit.
    //https://threejs.org/docs/#api/core/Raycaster
    [ec.mouse.mousedown]({clientX, clientY, cursorX, cursorY, cameraPosition=this.camera.position, camera=this.camera, screenDimensions=this.getScreenDimensions(), projector=this.projector}){
      // this.fireBullet({clientX, clientY});
      let {width, height} = screenDimensions;
      signal.trigger(ec.stage.mouseClickedOnStage, {camera, cameraPosition, clientX, clientY, width, height, projector, cursorX, cursorY});
    },
    //anything that wants to be hittable (e.g. by a bullet) should register via this signal
    [ec.hitTest.registerHittableComponent]({component}){
      this.hittableComponents.push(component);
    },
    [ec.hitTest.unregisterHittableComponent]({componentId}){
      let hitIndex = this.hittableComponents.findIndex((element)=>{
        return element.componentId === componentId;
      });
      if(hitIndex < 0){return;}
      this.hittableComponents.splice(hitIndex, 1);//remove hittable component from array
    },
    [ec.stage.addComponent]({component, scene=this.scene, children=this.children}){
      this.addComponent({component, scene, children});
    },

    //bullet calls this when its finished its distance and after it hits something.
    [ec.stage.destroyComponent]({componentId, scene=this.scene}){
      //since this is done while iterating over children, don't modify the array while looping. wait until next tick
      setTimeout(function(){
        let component = this.removeChild({componentId});
        if(!component){return;} //same componentId over and over.
        component.destroy({scene});
      }.bind(this), 0)

    }
  }

  removeChild({componentId, children=this.children}){
    let componentIndex = children.findIndex((element)=>{
      return element.componentId === componentId;
    });
    if(componentIndex < 0){return;}
    let removedChild = children.splice(componentIndex, 1)[0];
    return removedChild;
  }
  render({hittableComponents=this.hittableComponents}={}) {
    this.renderChildren({hittableComponents});
  }

  renderChildren({children=this.children, hittableComponents=this.hittableComponents}={}){
    let length = children.length - 1;
    while(length >= 0){
      children[length--].render({hittableComponents});
    }
  }

  addToScene({scene, camera}) {
    this.addChildrenToScene({scene, camera});
  }

  addChildrenToScene({children=this.children, scene, camera}={}){
    //this.children.forEach(c=>c.addToScene({scene}));
    let length = children.length - 1;
    while(length >= 0){
      children[length--].addToScene({scene, camera});
    }
  }

  getScreenDimensions(){
    let {innerWidth: width, innerHeight: height} = window;
    return {width, height};
  }

  destroy({children=this.children, scene=this.scene}={}){
    signal.unregisterSignals(this);
    //children.forEach(c=>c.destroy && c.destroy({scene}));
    let length = children.length - 1;
    try{
      while(length >= 0){
        let child = children[length--];
        if(child && child.destroy){
          child.destroy({scene});
        }else{
          console.warn(`child did not have a destroy:`, child);
        }

      }
    }catch(e){
      console.error(`child ${JSON.stringify(children[length+1])} no destroy`, e);
    }

    this.children = [];
    this.hittableComponents = [];
    this.stopAnimating = true;
    signal.trigger(ec.hitTest.destroy);
  }
}


function animate({camera, scene, renderer, stage}){

  let animationFrameFunc = ()=>{
    if(stage.stopAnimating){return;}
    signal.trigger(ec.webgl.performFrameCalculations);
    stage.render();
    renderer.render(scene, camera);
    requestAnimationFrame(animationFrameFunc)
  };
  animationFrameFunc();
}