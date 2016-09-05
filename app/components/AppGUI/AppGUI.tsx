/// <reference path="../../../typings/index.d.ts" />

import * as _ from 'lodash';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

// CUSTOM UI ELEMENTS
import { Player, PlayerProps } from '../Player/Player.tsx';
import { Bullet } from '../Bullet/Bullet.tsx';
import { KeyController } from '../KeyController/KeyController';
import { BoxUIEntity } from '../BoxUIEntity/BoxUIEntity.tsx';
import { EnemyCrawler, EnemyCrawlerProps } from '../EnemyCrawler/EnemyCrawler';
import { HUD } from '../HUD/HUD';
import { NavHeader } from '../NavHeader/NavHeader.tsx';

// TYPES
import { PlayerColor, InputType, InputEvent, AppState, controls, UIEntityProps, UIState } from '../../types/types.tsx';

// LOGIC
import { resolvePosition, resolveSpeed } from '../../logic/resolvePlayerMovement.tsx';
import { createUIBox, createEnemy } from '../../logic/npcFactories.tsx';
import { createBullet } from '../../logic/createBullet.tsx';
import { updateBulletPositions } from '../../logic/resolveBulletMovement.tsx';
import { bulletToUIEntityCollisions } from '../../logic/collisionHandler.tsx';

// REDUX
import { connect } from 'react-redux';
import { addItemToInputQueue, clearInputQueue, testSwitchState_AC,
         resetLastRenderedTime, setUIState, setUIUpdateReady, resolveUIState } from '../../store/actions.tsx';

require('./AppGUI.css');

// INTERFACES
const uiBoxWidth = 25;
const crawlerWidth = 28;
const bulletWidth = 7;

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
  state: GameArenaState = defaultState;

  // kickstart the game loop
  componentWillMount = () => requestAnimationFrame(this.tick);
  // componentDidMount = () => (document.onkeydown = this.events.keypress);

  events = {
    onClick: (e): void => {
      console.log('AppGUI.tsx:: e', e);
      console.log('AppGUI.tsx:: this', this);
      console.log('AppGUI.tsx:: testStateProperty: ', this.props.testStateProperty);
      this.props.testSwitchState(!this.props.testStateProperty);
    }
  };

  shouldComponentUpdate = (nextProps, nextState) => {
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
            { renderEntity(this.props.uiState.enemies.crawlers,
                           EnemyCrawler, { reachedEnd: false }) }
            { renderEntity(this.props.uiState.uiBoxes, BoxUIEntity,  {}) }
            <HUD score={ this.props.uiState.score } time={ this.state.time } />
          </main>
        </div>
      </KeyController>
    );
  };

  // ** GAME LOOP ** //
  /**
   * The game loop. Coordinates everything. Changes propagate down the tree every time it ticks.
   * On each tick: 1) get input (from inputQueue);
   *               2) Calc new app state (resolve position of items), then update stored app state
   *               3) re-render views
   *               4) Clear inputQueue
   */
  tick = () => {
    let time = Date.now();

    if (time - this.state.lastRenderedTime > 50) { // ensure game loop only ticks 20X / s
      this.setState(Object.assign({}, this.state, { lastRenderedTime: Date.now() }), () => {
        this.props.resolveUIState(time, this.props.uiState);
        this.handleInput(time, this.props.uiState, (newPositions) => {

          newPositions = this.handleUpdates(newPositions, time);
          this.props.setUIState(Object.assign({}, newPositions, { time: time }));
          this.props.clearInputQueue();
          this.props.setUIUpdateReady();
        });
      });
    }
    requestAnimationFrame(this.tick);
  };

  // ** INPUT HANDLING ** //
  /**
   * calculate new positions of all the things
   */
  handleInputQueue = (curUI: UIState, inputQueue: InputEvent[]) => {
    // console.logeMove#handleInputQueue: inputQueue', this.props.inputQueue);

    _.each(this.props.inputQueue, (inputEvent: InputEvent) => {
      let inputType = InputType[inputEvent.type];

      if (inputType === InputType[InputType.PlayerMove]) {
        curUI.player = resolvePosition(curUI.player, inputEvent.data);

      } else if (inputType === InputType[InputType.PlayerSpeedChange]) {
        curUI.player.speed = resolveSpeed(curUI.player.speed, inputEvent.data);

      } else if (inputType === InputType[InputType.PlayerShoot]) {
        curUI.bullets = createBullet(curUI.player, curUI.bullets);
      }
    });
    return curUI;
  };

  // ** INPUT HANDLING ** //
  /**
   * Handle UI changes that occur as a direct result of user input (e.g. player movement, shooting)
   */
  handleInput = (time: number, curUI: UIState, cb: Function) => {
    if (this.props.inputQueue.length > 0) { // do nothing if there are no input events
      curUI = this.handleInputQueue(this.props.uiState, this.props.inputQueue);
      this.props.clearInputQueue();
      cb(curUI);
    } else {
      cb(curUI);
    }
  };

  // ** UPDATE HANDLING ** //
  /**
   * Handle UI changes that occur without input from the user (e.g. bullet and uiBox movement)
   */
  handleUpdates = (curUI: UIState, time: number): UIState => {
    curUI.score = (curUI.score) ? curUI.score : this.props.uiState.score;
    curUI.bullets = updateBulletPositions(curUI.bullets);
    curUI = this.moveNPCs(curUI);
    curUI = this.generateNPCs(curUI);
    curUI = bulletToUIEntityCollisions(curUI);
    return curUI;
  };

  // ** GENERATION OF DATA ** //
  /**
   * Randomly generate NPCs (self-directed UI elements such as enemies) 
   */
  generateNPCs = (curUI: UIState, odds: number = 20): UIState => {
    // create NPC at random - approximately once / 40 ticks (every 4s). Don't create more than 10.
    if ((curUI.uiBoxes.length <= 10) && (_.random(0, 20) === 20)) {
      switch (_.sample(['uiBox', 'enemy.crawler'])) {
        case('uiBox'):
          curUI.uiBoxes = createUIBox(curUI);
          break;
        case('enemy.crawler'):
          curUI.enemies = createEnemy(curUI, curUI.enemies, 'crawler');
          break;
      }
    }
    return curUI;
  }

  // ** UPDATE HANDLING ** //
  /**
   * Generate random movements from enemies
   * ** ONGOING **
   */
  moveNPCs = (curUI: UIState): UIState => {
    curUI.enemies.crawlers = _.map(curUI.enemies.crawlers, (crawler: EnemyCrawlerProps) => {
      crawler.xLeft -= 1;
      if ((crawler.xLeft - crawler.width) < -300) {
        crawler.xLeft = -300 + crawler.width;
        crawler.reachedEnd = true;
      }
      return crawler;
    });
    return curUI;
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
  uiState: state.uiState
});

const mapDispatchToProps = (dispatch) => ({
  addItemToInputQueue: (input: InputEvent): void => { dispatch(addItemToInputQueue(input)); },
  clearInputQueue: (): void => { dispatch(clearInputQueue()); },
  resetLastRenderedTime: (): void => { dispatch(resetLastRenderedTime()); },
  testSwitchState: (newState: boolean): void => { dispatch(testSwitchState_AC(newState)); },
  setUIState: (newState: UIState): void => { dispatch(setUIState(newState)); },
  setUIUpdateReady: (): void => { dispatch(setUIUpdateReady()); },
  resolveUIState: (time: number, uiState: UIState): void => { dispatch(resolveUIState(time, uiState)); },
});

export const AppGUI: any = connect(
  mapStateToProps,
  mapDispatchToProps
)(AppGUIUnwrapped as any);
