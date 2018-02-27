const path = require(`path`);

exports.createPages = ({ graphql, boundActionCreators }) => {
  const { createPage } = boundActionCreators;
  graphql(`
    {
      allPost {
        edges {
          node {
            slug
          }
        }
      }
    }
  `).then(result => {
    JSON.stringify(result);
    result.data.allPost.edges.map(({ node }) => node).map(post =>
      createPage({
        path: `/${post.slug}`,
        component: path.resolve('./src/templates/blog-post.js'),
        // In your member template's graphql query, you can use slug
        // as a GraphQL variable to query for data.
        context: {
          slug: post.slug,
        },
      })
    );
  });
};
