/// <reference path="../../../typings/index.d.ts" />

import * as _ from 'lodash';
import * as React from 'react';

// CUSTOM UI ELEMENTS
import { BoxUIEntity } from '../BoxUIEntity/BoxUIEntity.tsx';
import { Bullet } from '../Bullet/Bullet.tsx';
import { EnemyCrawler } from '../EnemyCrawler/EnemyCrawler';
import { HUD } from '../HUD/HUD';
import { KeyController } from '../KeyController/KeyController';
import { NavHeader } from '../NavHeader/NavHeader.tsx';
import { Player } from '../Player/Player.tsx';

// TYPES
import { InputEvent, InputType, PlayerColor, UIState } from '../../types/types.tsx';

// LOGIC
import { createBullet } from '../../logic/createBullet.tsx';
import { resolvePosition, resolveSpeed } from '../../logic/resolvePlayerMovement.tsx';

// REDUX
import { actionCreators } from '../../store/actions.tsx';
import { connect } from 'react-redux';

let { addItemToInputQueue, clearInputQueue, testSwitchState,
      resetLastRenderedTime, setUIState, setUIUpdateReady, resolveUIState } = actionCreators;

console.log('AppGUI.tsx:: actionCreators', actionCreators);

require('./AppGUI.css'); // tslint:disable-line

// INTERFACES
// const uiBoxWidth = 25;
// const crawlerWidth = 28;
// const bulletWidth = 7;

interface GameArenaState {
  time: number;
  lastRenderedTime: number;
  updateReady: boolean;
}

const defaultState: GameArenaState = {
  time: Date.now(),
  lastRenderedTime: 0,
  updateReady: false,
};

interface GameArenaProps {
  spriteSize: number;

  addItemToInputQueue: Function;
  clearInputQueue: Function;
  testSwitchState: Function;
  resetLastRenderedTime: Function;
  setUIState: Function;
  setUIUpdateReady: Function;
  resolveUIState: Function;

  testStateProperty: boolean;
  lastRenderedTime: number;
  inputQueue: InputEvent[];
  uiState: UIState; // TODO more specific
};

/**
 * Entry point for the whole application (excepting the redux wrapper)
 */
class AppGUIUnwrapped extends React.Component<GameArenaProps, GameArenaState> {
  events = {
    onClick: (e): void => {
      console.log('AppGUI.tsx:: clicked the component!');
      this.props.testSwitchState(!this.props.testStateProperty);
    },
  };

  state: GameArenaState = defaultState;

  componentWillMount = () => requestAnimationFrame(this.tick); // kickstart the game loop

  shouldComponentUpdate = (nextProps, nextState) => {
    // TODO this is fucked up, look at the equality comparison, it makes no sense
    // AHA THIS IS THE KEY! THIS IS HOW YOU CAN MAKE THIS WORK WITH A GAME LOOP! TODO: SPLIT THIS COMPONENT.
    if (!_.isEqual(this.props.uiState.player, nextProps.uiState)) {
      return true;
    }
    return false;
  };

  render() {
    const renderEntity = (entityCollection, EntityComponent, extraProps: Object) =>
        _.map(entityCollection, (entity, index) =>
            <EntityComponent key={index} {...extraProps} {...entity} />);
    return (
      <KeyController onClick={this.events.onClick}>
        <div className="layout-transparent mdl-layout mdl-js-layout">
          <NavHeader />
          <main className="mdl-layout__content">
            <Player color={ PlayerColor.Red } width={ this.props.spriteSize } {...this.props.uiState.player}/>
            { renderEntity(this.props.uiState.bullets, Bullet, {}) }
            { renderEntity(this.props.uiState.enemies.crawlers, EnemyCrawler, { reachedEnd: false }) }
            { renderEntity(this.props.uiState.uiBoxes, BoxUIEntity,  {}) }
            <HUD score={ this.props.uiState.score } time={ this.state.time } />
          </main>
        </div>
      </KeyController>
    );
  };

  /**
   * Determine when the game loop logic should run - ensures it only runs on set intervals.
   */
  tick = (): void => {
    let time = Date.now();
    if (time - this.state.lastRenderedTime > 50) { // ensure game loop only ticks 20X / s
      this.setState(Object.assign({}, this.state, { lastRenderedTime: Date.now() }), () => {
        this.executeGameLoopActions(time);
      });
    }
    requestAnimationFrame(this.tick);
  };

  /**
   * The game loop actions, run after a certain amount of time elapsed. 
   * Coordinates everything, changes propagate down the UI tree. On each run:
   *     1) get input (from inputQueue);
   *     2) Calc new app state (resolve position of items), then update stored app state
   *     3) re-render views & Clear inputQueue
   */
  executeGameLoopActions = (time: number): void => {
    this.handleInput(time, this.props.uiState, (newPositions) => {
      this.props.setUIState(Object.assign({},
        this.props.resolveUIState(time, newPositions), { time }));
      this.props.clearInputQueue();
      this.props.setUIUpdateReady();
    });
  };

  /**
   * calculate new positions of all the things
   */
  handleInputQueue = (curUI: UIState, inputQueue: InputEvent[]) => {
    _.each(this.props.inputQueue, (inputEvent: InputEvent) => {
      let inputType = InputType[inputEvent.type];

      if (inputType === InputType[InputType.PlayerMove]) {
        curUI.player = resolvePosition(curUI.player, inputEvent.input);

      } else if (inputType === InputType[InputType.PlayerSpeedChange]) {
        curUI.player.speed = resolveSpeed(curUI.player.speed, inputEvent.input);

      } else if (inputType === InputType[InputType.PlayerShoot]) {
        curUI.bullets = createBullet(curUI.player, curUI.bullets);
      }
    });
    return curUI;
  };

  /**
   * Handle UI changes that occur as a direct result of user input (e.g. player movement, shooting)
   */
  handleInput = (time: number, curUI: UIState, cb: Function) => {
    if (this.props.inputQueue.length > 0) { // do nothing if there are no input events
      curUI = this.handleInputQueue(this.props.uiState, this.props.inputQueue);
      this.props.clearInputQueue();
    }
    cb(curUI);
  };
};

//
// ************************ REDUX ************************* //
//

const mapStateToProps = (state) => ({
  inputQueue: state.inputQueue,
  lastRenderedTime: state.lastRenderedTime,
  testStateProperty: state.testStateProperty,
  uiUpdateReady: state.testStateProperty,
  uiState: state.uiState,
});

const mapDispatchToProps = (dispatch) => ({
  addItemToInputQueue: (input: InputEvent): void => { dispatch(addItemToInputQueue(input)); },
  clearInputQueue: (): void => { dispatch(clearInputQueue()); },
  resetLastRenderedTime: (): void => { dispatch(resetLastRenderedTime()); },
  testSwitchState: (newState: boolean): void => { dispatch(testSwitchState(newState)); },
  setUIState: (newState: UIState): void => { dispatch(setUIState(newState)); },
  setUIUpdateReady: (): void => { dispatch(setUIUpdateReady()); },
  resolveUIState: (time: number, uiState: UIState): void => { dispatch(resolveUIState(time, uiState)); },
});

export const AppGUI: any = connect(
  mapStateToProps,
  mapDispatchToProps
)(AppGUIUnwrapped as any);
