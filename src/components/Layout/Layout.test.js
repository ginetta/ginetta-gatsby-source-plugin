import React from 'react';
import toJson from 'enzyme-to-json';
import { shallow } from 'enzyme';
import { mockSettings } from '../../utils/testHelpers';

import Layout from './Layout';
const mockComponent = 'section';
const mockNonExistingComponent = 'hello world';

describe('<Layout />', () => {
  it('renders as expected', () => {
    const component = shallow(
        <Layout settings={mockSettings} component={mockComponent} />
      ),
      tree = toJson(component);
    expect(tree).toMatchSnapshot();
  });
  it('handles missing component correctly', () => {
    const component = shallow(
        <Layout settings={mockSettings} component={mockNonExistingComponent} />
      ),
      tree = toJson(component);
    expect(tree).toMatchSnapshot();
  });
});
