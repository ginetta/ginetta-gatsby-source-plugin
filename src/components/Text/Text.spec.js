import React from 'react';
import toJson from 'enzyme-to-json';
import { shallow } from 'enzyme';
import Text from './Text';
import { mockSettings, mockHtml } from '../../utils/testHelpers';

test('Text component should render as expected', () => {
  const component = shallow(<Text settings={mockSettings} html={mockHtml} />);
  const tree = toJson(component);
  expect(tree).toMatchSnapshot();
});
