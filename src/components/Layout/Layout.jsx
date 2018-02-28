import React, { Fragment, Component } from 'react';
import Section from '../Section/Section';
import Grid from '../Grid/Grid';
import Text from '../Text/Text';
import Html from '../Html/Html';

const components = {
  section: Section,
  grid: Grid,
  text: Text,
  html: Html,
};

export default ({ component, ...others }) => {
  const ComponentType = components[component];
  return ComponentType ? (
    <ComponentType {...others} />
  ) : (
    <div>{`${component} component doesn't exist`}</div>
  );
};
