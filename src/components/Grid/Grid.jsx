import React from 'react';
import Column from '../Column/Column';
import uuidv4 from 'uuid/v4';

export default ({columns, settings}) => {
  const {className, ...other} = settings;
  return (
    <div className={`${className} l-grid`} {...other}>
      { columns && columns.map(component => <Column key={uuidv4()} {...component} />) }
    </div>
  )
}
