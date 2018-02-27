import React from 'react';
import g from 'glamorous';
import Link from 'gatsby-link';

import { rhythm } from '../utils/typography';

export default ({ data }) => {
  console.log('data', data)
  return (
    <div>
      <g.H1 display={'inline-block'} borderBottom={'1px solid'}>
        Amazing Pandas Eating Things
      </g.H1>
      <h4>{data.site.siteMetadata.title} Posts</h4>
    </div>
  );
};

export const query = graphql`
  query IndexQuery {
    site {
      siteMetadata {
        title
      }
    }
  }
`;
