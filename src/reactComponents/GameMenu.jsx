import React from 'react';
import 'styles/index.scss';
import {signal, eventConfig as ec} from "core/core";
import Modal from 'reactComponents/Modal';
import Button from 'reactComponents/Button';
import TextWriterText from 'reactComponents/TypeWriterText';
import TypeWriterText from "./TypeWriterText";

const modalIdForWelcomeScreen = "modal1";
const modalIdForResultsScreen = "modal2";

//https://vectorseven.bandcamp.com/
import startMenuAudioSource from 'sounds/hyperion-vector-seven.mp3';

export default class GameMenu extends React.Component {
  constructor(){
    super();
    this.state = {
      modalIdToDisplay: modalIdForWelcomeScreen,
      resultMessage:'',
      didPlayerWin: false,
    };

    this.startMenuAudio = new Audio(startMenuAudioSource);
    this.startMenuAudio.loop = true;
  }

  componentWillMount(){
    signal.registerSignals(this);
    this.createModalMap();
  }
  componentDidMount(){
    //this.startMenuAudio.play();
  }
  componentWillUnmount(){
    signal.unregisterSignals(this);

    this.startMenuAudio.currentTime = 0;
    this.startMenuAudio.pause();
  }

  signals = {
    [ec.game.gameEnded]({resultMessage, didPlayerWin}){
      let modalIdToDisplay = modalIdForResultsScreen;
      this.setState({resultMessage, didPlayerWin, modalIdToDisplay});
    }
  }
  render(){
    let modalComponent = this.createStartMenuModal();
    let {modalIdToDisplay} = this.state;
    let componentToDisplayFunc = this.modalMap[modalIdToDisplay];
    let componentToDisplay = componentToDisplayFunc ? componentToDisplayFunc(): null;
    let result = null;
    if(componentToDisplay){
      result = (
        <div className="game-menu-component">
          {componentToDisplay}
        </div>
      );
    }

    return result;
  }

  createStartMenuModal(){
    let fullTextToType=`
      In the year 1994, Tyson's Mom was exposed to radioactive slime while touring Kumkop General Foodstuff Factory in North Korea.
      <br/>
      She subsequently became an evil space cube and disappeared into the dark web.
      <br/>
      24 years later, she has returned. The people of Earth watched helplessly as she destroyed the Moon, and began heading towards Earth.
      <br/>
      Armed only with laser weapons, bravery, and the hope of planet Earth, you must defeat her and save the world from annihilation.
      <br/>
      Pro Tip: Try luring her into the moon debris, where explosions from asteroids inflict severe damage.
    `;
    return (
      <Modal>
        <TypeWriterText fullTextToType={fullTextToType} textClassName="game-menu-message"/>
        <Button className="start-game-button" label="Press Start" onClick={this.handleStartGameClick.bind(this)}/>
      </Modal>
    );
  }

  createShowGameResultsModal(){
    let {didPlayerWin, resultMessage} = this.state;
    let fullTextToType=`
      ${resultMessage}
      <br/>
      <br/>
      <br/>
      <br/>
      <br/>
      <br/>
      <br/>
      <br/>
      <br/>
    `;
    return (
      <Modal>
        <TypeWriterText fullTextToType={fullTextToType} textClassName="game-menu-message"/>
        <Button className="start-game-button" label="Press Start" onClick={this.handleStartGameClick.bind(this)}/>
      </Modal>
    );
  }

  handleStartGameClick(){
    console.log('start game');
    signal.trigger(ec.game.startGame);
    this.setState({modalIdToDisplay:'none'});
    this.startMenuAudio.currentTime = 0;
    this.startMenuAudio.pause();
  }

  createModalMap(){
    this.modalMap = {
      'none': null,
      [modalIdForWelcomeScreen]: this.createStartMenuModal.bind(this),
      [modalIdForResultsScreen]: this.createShowGameResultsModal.bind(this),
    }
  }

}
//
// {/*<div className="game-menu-component">*/}
// {/*Game Menu*/}
// {/*</div>*/}