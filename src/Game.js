
import StageOne from 'stages/StageOne';
import {signal} from "core/core";
import {eventConfig as ec} from 'core/eventConfig';
import GameOne from 'stages/GameOne';

import ohyeahfullsong from 'sounds/ohyeahfullsong.mp3';

export default class Game{
  constructor({gameConfig=new GameOne(), threeJsRenderDiv}={}){
    this.gameConfig = gameConfig;
    this.threeJsRenderDiv = threeJsRenderDiv;

    this.ohyeahfullsongAudio = createAudio({src:ohyeahfullsong});

    signal.registerSignals(this);
  }

  signals = {
    [ec.game.startGame]({gameConfig=this.gameConfig}={}){
      if(this.stage){
        this.stage.destroy();
      }
      this.ohyeahfullsongAudio.pause();
      this.ohyeahfullsongAudio.currentTime = 0;

      this.stage = new StageOne();
      gameConfig.registerComponentsWithStage();
      this.threeJsRenderDiv.innerHTML = "";
      this.threeJsRenderDiv.appendChild( this.stage.rendererDomElement);
    },
    //game config should send this.
    [ec.game.gameEnded]({resultMessage, didPlayerWin}){
      this.stage.destroy();
      this.gameConfig.destroy();
      this.ohyeahfullsongAudio.play();
    }
  }

  destroy(){
    signal.unregisterSignals(this);
    if(this.stage){
      this.stage.destroy();
    }

  }
}

function createAudio({src}={}){
  let audio = new Audio();
  audio.src = src;
  //audio.play();
  return audio;
}