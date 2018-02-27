import React from 'react';
import Layout from '../Layout/Layout';
import uuidv4 from 'uuid/v4';

export default ({children, settings}) => {
  const {className, ...other} = settings;
  return (
    <div className={`${className} l-grid-cell`} {...other}>
      { children && children.map(component => <Layout key={uuidv4()} {...component} />) }
    </div>
  )
}