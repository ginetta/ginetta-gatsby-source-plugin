import React from 'react';
import Markdown from 'react-markdown';
import renderHTML from 'react-render-html';
import Layout from '../components/Layout/Layout';
import uuidv4 from 'uuid/v4';

const arrayHead = arr => arr.length && arr[0];

export default ({ data }) => {
  const post = arrayHead(data.allPost.edges).node;
  console.log('post.layout_parsed', post.layout_parsed);
  return (
    <div>
      <h1>{post.title}</h1>
      {
        post.image 
          ? <img src={post.image.localFile.publicURL} /> 
          : null
      }
      {
        post.layout_parsed
          ? post.layout_parsed.map(props => <Layout key={uuidv4()} {...props}/>)
          : null
      }
    </div>
  );
};

export const query = graphql`
  query BlogPostQuery($slug: String!) {
    allPost(filter: { slug: { eq: $slug } }) {
      edges {
        node {
          title
          layoutGrid
          image {
            localFile {
              publicURL
            }
          }
          layout {
            component
          }
          layout_parsed
        }
      }
    }
  }
`;
