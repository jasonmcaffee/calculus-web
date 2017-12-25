import React from 'react';
import 'styles/index.scss';
import {signal, eventConfig as ec} from "core/core";

import typewriterSoundSource from 'sounds/typewriter.mp3';

/**
 * Prints text in a typewriter type fashion
 */
export default class TypeWriterText extends React.Component {
  typeIntervalId //startInterval result
  constructor(){
    super();
    this.state = {fullTextToType:"", currentTextDisplayed:"", className:"typewritertext-component", textClassName:"typewritertext-text",typeIntervalMs:25};
  }

  componentWillMount({props=this.props}={}){
    // signal.registerSignals(this);
    this.setState(props);
    this.typeWriterAudio = new Audio(typewriterSoundSource);
    this.typeWriterAudio.loop = true;
    this.typeWriterAudio.volume = 0.3;

  }
  componentDidMount(){
    this.startTyping();
  }
  startTyping({state=this.state}={}){
    this.typeWriterAudio.currentTime = 0;
    //this.typeWriterAudio.play();
    let {typeIntervalMs} = state;
    let self = this;
    this.typeIntervalId = setInterval(()=>{
      let {currentTextDisplayed, fullTextToType} = self.state;
      if(currentTextDisplayed.length >= fullTextToType.length){
        clearInterval(self.typeIntervalId);
        this.typeWriterAudio.pause();
        return;
      }
      let currentTextDisplayedLength = currentTextDisplayed.length;
      let nextLetter = fullTextToType[currentTextDisplayedLength];
      let newTextToDisplay = currentTextDisplayed + nextLetter;
      self.setState({currentTextDisplayed:newTextToDisplay});
    }, typeIntervalMs);
  }

  componentWillUnmount(){
    // signal.unregisterSignals(this);
    clearInterval(this.typeIntervalId);
    this.typeWriterAudio.pause();
  }
  render(){
    let {className, fullTextToType, currentTextDisplayed, textClassName} = this.state;
    return(
      <div className={className}>
        <div className={"textwritertext-hidden-text " + textClassName} dangerouslySetInnerHTML={ {__html:fullTextToType} }>
        </div>
        <br/>
        <div className="typewritertext-text-overlay">
          <div className={textClassName} dangerouslySetInnerHTML={ {__html:currentTextDisplayed}}>
          </div>
        </div>
      </div>
    );
  }
}