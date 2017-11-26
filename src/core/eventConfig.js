export const eventConfig = {
  mouse:{
    move: "mouse.move",
    mousedown: "mouse.mousedown",
  },
  camera:{
    setPosition: "camera.setPosition",
    setLookAt: "camera.setLookAtVector",
    setLookAtFromMouseMovement: "camera.setLookAtFromMouseMovent",
    moveBackward:"camera.moveBackward",
    moveForward:"camera.moveForward",
    moveLeft:"camera.moveLeft",
    moveRight:"camera.moveRight",
    moveUp:"camera.moveUp",
    moveDown:"camera.moveDown",
    positionChanged:"camera.positionChanged", //let player hitbox follow
    attachAudioListenerToCamera:"camera.attachAudioListenerToCamera"
  },
  window:{
    resize:"window.resize",
  },
  webworker:{
    message: 'webworker.message',
  },
  webgl:{
    performFrameCalculations: 'webgl.performFrameCalculations', //let all objects know to recalculate for upcoming render.
  },
  hitTest:{
    registerHittableComponent: 'hitTest.registerHittableComponent',//{componentId:'box123', threejsObject: new THREE.Mesh( geometry, material)}
    unregisterHittableComponent:'hitTest.unregisterHittableComponent',//{componentId:'box123'}
    // registerHitteeComponent: 'hitTest.registerHitteeComponent',
    // unregisterHitteeComponent: 'hitTest.unregisterHitteeComponent',
    hitComponent: 'hitTest.hitComponent', //{hitComponent: 'box123', hitByComponent: 'bullet12359'}
  },
  stage:{
    destroyComponent:'stage.destroyComponent', //{componentId}
    addComponent:'stage.addComponent', //for adding dynamic stuff from components. e.g. fire bullet
    mouseClickedOnStage:'stage.mouseClickedOnStage'//pass camera position and mouse coordinates so player can fire bullet.
  },
  player:{
    positionChanged:'player.positionChanged',//let enemies know where you are
    hitPointsChanged: 'player.hitPointsChanged',
    died: 'player.died',
  },
  enemy:{
    died: 'enemy.died' //so game config can determine if game ended.
  },
  game:{
    startGame:'game.startGame',
    stopGame:'game.stopGame',
    gameEnded:'game.gameEnded',
  }
}