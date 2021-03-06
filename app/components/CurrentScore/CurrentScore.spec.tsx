/// <reference path="../../../typings/index.d.ts" />

declare function require(name: string);

import * as _ from 'lodash';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { expect } from 'chai';
import { mount, shallow } from 'enzyme';
import * as sinon from 'sinon';
import * as mocha from 'mocha';

import { CurrentScore } from './CurrentScore.tsx';

describe('<CurrentScore />', () => {
  it('should contain 1 div', () => {
    console.log('CurrentScore.spec: testing');
    const wrapper = shallow(<CurrentScore score={3} />);
    expect(wrapper.find('div')).to.have.length(1);
  });
});

