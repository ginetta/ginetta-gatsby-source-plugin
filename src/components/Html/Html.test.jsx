import React from "react";
import toJson from "enzyme-to-json";
import { shallow } from "enzyme";
import Html from "./Html";
import { mockSettings, mockHtml } from "../../utils/testHelpers";

test("Html component should render as expected", () => {
  const component = shallow(<Html settings={mockSettings} html={mockHtml} />);
  const tree = toJson(component);
  expect(tree).toMatchSnapshot();
});
