const GraphQLJSON = require('graphql-type-json');
const gatsbyNode = require('./gatsby-node');
const { singular } = require('pluralize');
const styler = require('react-styling');
const sanitizeHtml = require('sanitize-html');
const HtmlToReactParser = require('html-to-react').Parser;
const htmlToReactParser = new HtmlToReactParser();

module.exports = async (
  { type, store, pathPrefix, getNode, cache },
  { cockpitConfig }
) => {
  const { collectionsItems, collectionsNames } = gatsbyNode;
  const singularCollectionNames = collectionsNames.map(name => singular(name));

  if (singularCollectionNames.indexOf(type.name) === -1) {
    return {};
  }

  const parseLayout = layout => {
    if (layout == null || layout.length === 0) {
      return layout;
    }
    const parsedLayout = layout.map(node => {
      if (node.settings) {
        node = parseSettings(node);
      }
      Object.entries(node).forEach(([key, value]) => {
        if (value instanceof Array) {
          parseLayout(node[key]);
        }
        if (value instanceof Object && node[key].settings) {
          node[key].settings = parseSettings(node.settings);
        }
      });
      return node;
    });
    return parsedLayout;
  };

  const parseHtml = (type, node) => {
    const { settings } = node;
    if (settings[type] === '') {
      node.settings.html = null;
    } else if (settings[type] && settings[type].length > 0) {
      node.settings.html = settings[type];
      node.settings.html_sanitize = sanitizeHtml(
        settings[type],
        cockpitConfig.sanitizeHtmlConfig
      );
      node.settings.html_react = htmlToReactParser.parse(settings[type]);
    }
    return node;
  };

  const parseSettings = node => {
    const { settings } = node;
    if (settings.html) {
      node = parseHtml('html', node);
    }
    if (settings.text) {
      node = parseHtml('text', node);
    }
    if (settings.id === '') {
      settings.id = null;
    }
    if (settings.class === '') {
      settings.className = settings.class;
    } else {
      settings.className = null;
    }
    delete settings.class;
    if (settings.style === '' || settings.style == null) {
      settings.style = null;
    } else {
      settings.style = styler(settings.style);
    }
    return node;
  };

  let nodeExtendType = {};
  collectionsItems.map(({ entries, fields, name }) => {
    if (type.name !== singular(name)) {
      return;
    }

    const jsonFields = Object.keys(fields).filter(
      fieldname => fields[fieldname].type === 'layout'
    );

    jsonFields.forEach(fieldname => {
      nodeExtendType[`${fieldname}_parsed`] = {
        type: GraphQLJSON,
        resolve(Item) {
          const parsedLayout = parseLayout(Item[`${fieldname}`]);
          return parsedLayout;
        },
      };
    });
  });
  return nodeExtendType;
};
