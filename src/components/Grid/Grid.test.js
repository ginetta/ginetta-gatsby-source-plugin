import React from 'react';
import toJson from 'enzyme-to-json';
import { shallow } from 'enzyme';
import Grid from './Grid';
import { mockSettings, mockColumns } from '../../utils/testHelpers';
jest.mock('uuid/v4', () => jest.fn(() => '9999-9999'));

test('Grid component should render as expected', () => {
  const component = shallow(
    <Grid settings={mockSettings} columns={mockColumns} />
  );
  const tree = toJson(component);
  expect(tree).toMatchSnapshot();
});
