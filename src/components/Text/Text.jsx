import React from 'react';
import uuidv4 from 'uuid/v4';

export default ({settings, html}) => 
  <div {...settings}
    dangerouslySetInnerHTML={{ __html: html }}
  />
