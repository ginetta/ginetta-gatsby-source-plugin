const { createRemoteFileNode } = require(`gatsby-source-filesystem`);
const validUrl = require('valid-url');

async function createRemoteAssetByPath(url, store, cache, createNode) {
  const { id, internal, ext, name } = await createRemoteFileNode({
    url,
    store,
    cache,
    createNode,
  });
  return {
    url,
    id,
    ext,
    name,
    contentDigest: internal.contentDigest,
  };
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

class AssetMapHelpers {
  constructor({ assets, store, cache, createNode, collectionsItems, config }) {
    this.assets = assets;
    this.store = store;
    this.cache = cache;
    this.createNode = createNode;
    this.collectionsItems = collectionsItems;
    this.config = config;
    this.config.host = config.baseURL + config.folder;
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
              path = this.config.host + '/' + path;
            }
            if (validUrl.isUri(path)) {
              this.assets.push({
                path,
              });
            } else {
              throw new Error(
                'The path of an image seems to be malformed -> ',
                path
              );
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
      createRemoteAssetByPath(
        asset.path,
        this.store,
        this.cache,
        this.createNode
      )
    );

    const finalAssetsMap = await createAssetsMap(allRemoteAssetsPromises);
    return finalAssetsMap;
  }
}

module.exports = {
  AssetMapHelpers,
  createAssetsMap,
};