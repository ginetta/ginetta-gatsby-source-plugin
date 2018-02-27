import React from 'react';
import Layout from '../Layout/Layout';
import uuidv4 from 'uuid/v4';

export default ({ children, settings }) => (
  <section {...settings}>
    {children &&
      children.map(component => <Layout key={uuidv4()} {...component} />)}
  </section>
);
