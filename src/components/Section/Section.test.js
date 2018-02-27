import React from 'react';
import toJson from 'enzyme-to-json';
import { shallow } from 'enzyme';
import Section from './Section';
import { mockSettings, mockChildren } from '../../utils/testHelpers';
jest.mock('uuid/v4', () => jest.fn(() => '9999-9999'));

test('Section component should render as expected', () => {
  const component = shallow(
    <Section settings={mockSettings} children={mockChildren} />
  );
  const tree = toJson(component);
  expect(tree).toMatchSnapshot();
});
