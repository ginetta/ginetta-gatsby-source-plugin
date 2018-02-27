const sanitizeHtml = require('sanitize-html');

module.exports = {
  siteMetadata: {
    title: `Pandas Eating Lots`,
  },
  plugins: [
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `src`,
        path: `${__dirname}/src/`,
      },
    },
    {
      resolve: 'gatsby-source-cockpit-headless-cms',
      options: {
        cockpitConfig: {
          baseURL: 'http://localhost:8888',
          folder: '/cockpit',
          accessToken: '52e96b14e61f3d3c5e5723bd9b9927',
          sanitizeHtmlConfig: {
            // https://www.npmjs.com/package/sanitize-html
            allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img' ])
          },
        },
      },
    },
    {
      resolve: `gatsby-plugin-typography`,
      options: {
        pathToConfigModule: `src/utils/typography`,
      },
    },
    `gatsby-plugin-glamor`,
    `gatsby-plugin-react-next`,
  ],
};
