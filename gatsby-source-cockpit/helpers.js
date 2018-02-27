const { createRemoteFileNode } = require(`gatsby-source-filesystem`);
const crypto = require('crypto');
const { singular } = require('pluralize');
const validUrl = require('valid-url');

async function createRemoteAssetByPath(url, store, cache, createNode) {
  const { id, internal, ext, name } = await createRemoteFileNode({
    url,
    store,
    cache,
    createNode,
  });
  return ({ 
    url,
    id,
    ext,
    name,
    contentDigest: internal.contentDigest,
  });
}


async function createAssetsMap(assetPromises) {
  const allResults = await Promise.all(assetPromises);
  return allResults.reduce(
    (acc, { url, id }) => ({
      ...acc,
      [url]: id,
    }),
    {}
  );
}

class CockpitHelpers {
  constructor(cockpit, config) {
    this.cockpit = cockpit;
    this.config = config;
  }

  // get cockpit collection items by collection name
  async getCollectionItems(name) {
    const { fields, entries } = await this.cockpit.collectionGet(name);
    return { fields, entries, name };
  }

  // get all cockpit collections, together with their items
  async getCockpitCollections() {
    const collections = await this.getCollectionNames();
    return Promise.all(collections.map(name => this.getCollectionItems(name)));
  }  

  async getCollectionNames() {
    const allCollections = await this.cockpit.collectionList();
    const explictlyDefinedCollections = this.config.collections;

    return explictlyDefinedCollections instanceof Array 
      ? allCollections.filter(
        name => explictlyDefinedCollections.indexOf(name) > -1)
      : allCollections;
  }
}

class AssetMapHelpers {
  constructor({ 
    assets, 
    store, 
    cache, 
    createNode, 
    collectionsItems, 
    config,
  }) {
    this.assets = assets;
    this.store = store;
    this.cache = cache; 
    this.createNode = createNode; 
    this.collectionsItems = collectionsItems;
    this.config = config;
  }

  addAllOtherImagesPathsToAssetsArray() {
    this.collectionsItems.map(({ entries, fields }) => {
      const imageFields = Object.keys(fields).filter(
        fieldname => fields[fieldname].type === 'image'
      );
      imageFields.forEach(fieldname => {
        entries.forEach(entry => {
          if (entry[fieldname].path) {
            let path = entry[fieldname].path;
            if (!validUrl.isUri(path)) {
              path = this.config.baseURL + '/' + path;
            };
            if (validUrl.isUri(path)) {
              this.assets.push({
                path,
              });
            } else {
              throw new Error('The path of an image seems to be malformed -> ', path);              
            }
          }
        });
      });
    });
  }

  // gets all assets and adds them as file nodes
  // returns a map of url => node id
  async createAssetsNodes() {

    this.addAllOtherImagesPathsToAssetsArray();

    const allRemoteAssetsPromises = this.assets.map(asset => 
      createRemoteAssetByPath(asset.path, this.store, this.cache, this.createNode));
    
    const finalAssetsMap = await createAssetsMap(allRemoteAssetsPromises);

    return finalAssetsMap;
  }
}

class CreateNodesHelpers {
  constructor({
    collectionsItems,
    store,
    cache,
    createNode,
    assetsMap,
    config,
  }) {
    this.collectionsItems = collectionsItems;
    this.store = store;
    this.cache = cache;
    this.createNode = createNode;
    this.assetsMap = assetsMap;
    this.config = config;
  }

  async createCollectionsItemsNodes() {
    Promise.all(
      this.collectionsItems.map(({ fields, entries, name }) => {
        const nodes = entries.map(entry =>
          this.createItemNode({
            entry,
            name,
            fields,
          })
        );
        return { name, nodes, fields };
      })
    );
  }

  getImageFields(fields) {
    return Object.keys(fields).filter(
      fieldname => fields[fieldname].type === 'image'
    );
  }

  getLayoutFields(fields) {
    return Object.keys(fields).filter(
      fieldname => fields[fieldname].type === 'layout'
    );
  }

  getOtherFields(fields) {
    return Object.keys(fields).filter(
      fieldname => fields[fieldname].type !== 'image'
    );
  }

  // map the entry image fields to link to the asset node
  // the important part is the `___NODE`.
  composeEntryImageFields(imageFields, entry) {
    return imageFields.reduce(
      (acc, fieldname) => {
        if (entry[fieldname].path == null) {
          return acc;
        }
  
        let fileLocation;
        Object.keys(this.assetsMap).forEach(key => {
          if (key.includes(entry[fieldname].path)) {
            fileLocation = this.assetsMap[key];
          }
        });
        const key = fieldname + '___NODE';
        const newAcc = {
          ...acc,
          [key]: fileLocation,
        };
        return newAcc;
      }, {}
    );
  }

  async parseWysiwygField(field) {
    const srcRegex = /src\s*=\s*"(.+?)"/ig;

    const imageSources = field.match(srcRegex).map(src => src.substr(5).slice(0, -1));

    const validImageUrls = imageSources
      .map(src => validUrl.isUri(src) ? src : this.config.baseURL + src);

    const wysiwygImagesPromises = validImageUrls
      .map(url => createRemoteAssetByPath(url, this.store, this.cache, this.createNode));
    
    const imagesFulfilled = await Promise.all(wysiwygImagesPromises);

    const images = imagesFulfilled.map(({ contentDigest, ext, name }) => ({
      contentDigest,
      ext,
      name,
    }));
    
    const wysiwygImagesMap = await createAssetsMap(imagesFulfilled);

    return {
      images,
      wysiwygImagesMap,
      imageSources,
    };
  }

  parseLayout(layout, isColumn = false) {
    const parsedLayout = layout.map(node => {
      if (node.component === 'text') {
        this.parseWysiwygField(node.settings.text)
          .then( ({ wysiwygImagesMap, imageSources, images }) => {
            Object.entries(wysiwygImagesMap).forEach(([key, value], index) => {
              const { name, ext, contentDigest } = images[index];
              const newUrl = '/static/' + name + '-' + contentDigest + ext;
              node.settings.text = node.settings.text.replace(
                imageSources[index], newUrl
              );
            });
          });
      }
      if (node.children) {
        if (!isColumn) {
          console.log('component: ', node.component);
        } else {
          console.log('column');
        }
        node.children = this.parseLayout(node.children);
      }
      if (node.columns) {
        console.log('component: ', node.component);
        node.columns = this.parseLayout(node.columns, true);
      }

      return node;
    })
    return parsedLayout;
  }

  composeEntryLayoutFields(layoutFields, entry) {
    return layoutFields.reduce(
      (acc, fieldname) => {
        if (entry[fieldname].length === 0) {
          return acc;
        }
        this.parseLayout(entry[fieldname]);
        
        let fileLocation;
        Object.keys(this.assetsMap).forEach(key => {
          if (key.includes(entry[fieldname].path)) {
            fileLocation = this.assetsMap[key];
          }
        });
        const key = fieldname + '___NODE';
        const newAcc = {
          ...acc,
          [key]: fileLocation,
        };
        return newAcc;
      }, {}
    );
  }

  composeEntryWithOtherFields(otherFields, entry) {
    return otherFields.reduce(
      (acc, fieldname) => ({
        ...acc,
        [fieldname]: entry[fieldname],
      }),
      {}
    );
  }

  createItemNode({ entry, fields, name }) {
    const imageFields = this.getImageFields(fields);
    const layoutFields = this.getLayoutFields(fields);
    const otherFields = this.getOtherFields(fields);
    const entryImageFields = this.composeEntryImageFields(imageFields, entry);
    const entryLayoutFields = this.composeEntryLayoutFields(layoutFields, entry);
    const entryWithOtherFields = this.composeEntryWithOtherFields(otherFields, entry);

    const node = {
      ...entryWithOtherFields,
      ...entryImageFields,
      id: entry._id,
      children: [],
      parent: null,
      internal: {
        type: singular(name),
        contentDigest: crypto
          .createHash(`md5`)
          .update(JSON.stringify(entry))
          .digest(`hex`),
      },
    };
    this.createNode(node);
    return node;
  }
}

module.exports = {
  CockpitHelpers,
  AssetMapHelpers,
  CreateNodesHelpers,
};