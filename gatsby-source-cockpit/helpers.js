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
        name => explictlyDefinedCollections.indexOf(name) > -1
      )
      : allCollections;
  }
}

class AssetMapHelpers {
  constructor({ assets, store, cache, createNode, collectionsItems, config }) {
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
    return imageFields.reduce((acc, fieldname) => {
      if (entry[fieldname].path == null) {
        return acc;
      }

      let fileLocation = this.getFileAsset(entry[fieldname].path);

      const key = fieldname + '___NODE';
      const newAcc = {
        ...acc,
        [key]: fileLocation,
      };
      return newAcc;
    }, {});
  }

  async parseWysiwygField(field) {
    const srcRegex = /src\s*=\s*"(.+?)"/gi;
    let imageSources;
    try {
      imageSources = field
        .match(srcRegex)
        .map(src => src.substr(5).slice(0, -1));
    } catch (error) {
      return {
        images: [],
        wysiwygImagesMap: [],
        imageSources: [],
      };
    }

    const validImageUrls = imageSources.map(
      src => (validUrl.isUri(src) ? src : this.config.host + src)
    );

    const wysiwygImagesPromises = validImageUrls.map(url =>
      createRemoteAssetByPath(url, this.store, this.cache, this.createNode)
    );

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

  getFileAsset(path) {
    let fileLocation;

    Object.keys(this.assetsMap).forEach(key => {
      if (key.includes(path)) {
        fileLocation = this.assetsMap[key];
      }
    });

    return fileLocation;
  }

  getLayoutSettingFileLocation(setting) {
    let fileLocation;
    let assets = [];

    // if setting.path exists it is an images
    if(setting !== null && setting.path !== undefined) {
      fileLocation = this.getFileAsset(setting.path);
      if(fileLocation) {
        assets.push(fileLocation);
        setting.file = fileLocation;
      }                
    }
    // if setting[0].path exists it is an array of images
    else if (setting !== null && typeof setting === 'object' && setting[0] != undefined && setting[0].path !== undefined) {
      Object.keys(setting).forEach( imageKey => {
        const image = setting[imageKey];
          
        fileLocation = this.getFileAsset(image.path);
        if(fileLocation) {
          image.file = fileLocation;
          assets.push(fileLocation);
        }          

        setting[imageKey] = image;
      })
    }

    return { setting, assets };
  }

  // look into Cockpit CP_LAYOUT_COMPONENTS for image and images.
  parseCustomComponent( node, fieldname ) {
    const { settings } = node;
    const nodeAssets = [];

    Object.keys(settings).map( (key, index) => {
      
      const { setting, assets } = this.getLayoutSettingFileLocation(settings[key]);
      settings[key] = setting;
      assets.map(asset => nodeAssets.push(asset));
    })
    node.settings = settings;

    return {
      node,
      nodeAssets,
    };
  }

  parseLayout(layout, fieldname, isColumn = false) {
    let layoutAssets = [];

    const parsedLayout = layout.map(node => {
      if (node.component === 'text' || node.component === 'html') {
        this.parseWysiwygField(node.settings.text || node.settings.html).then(
          ({ wysiwygImagesMap, imageSources, images }) => {
            Object.entries(wysiwygImagesMap).forEach(([key, value], index) => {
              const { name, ext, contentDigest } = images[index];
              const newUrl = '/static/' + name + '-' + contentDigest + ext;
              if (node.settings.text) {
                node.settings.text = node.settings.text.replace(
                  imageSources[index],
                  newUrl
                );
              }
              if (node.settings.html) {
                node.settings.html = node.settings.html.replace(
                  imageSources[index],
                  newUrl
                );
              }
            });
          }
        );
      }

      // parse Cockpit Custom Components (defined in plugin config in /gatsby-config.js)
      if(this.config.customComponents.includes(node.component)) {
        const {node: customNode, nodeAssets: customComponentAssets } = this.parseCustomComponent(node, fieldname);
        
        node = customNode;
        layoutAssets = layoutAssets.concat(customComponentAssets);  
      }

      if (node.children) {
        if (!isColumn) {
          console.log('component: ', node.component);
        } else {
          console.log('column');
        }
        
        const {parsedLayout: childrenLayout, layoutAssets: childrenAssets } = this.parseLayout(node.children, fieldname);
        node.children = childrenLayout;
        layoutAssets = layoutAssets.concat(childrenAssets);
      }
      if (node.columns) {
        const {parsedLayout: columnsLayout, layoutAssets: columnsAssets } = this.parseLayout(node.columns, fieldname, true);
        node.columns = childrenLayout;
        layoutAssets = layoutAssets.concat(columnsAssets);        
      }

      return node;
    });

    
    return {
      parsedLayout,
      layoutAssets,
    };
  }

  composeEntryLayoutFields(layoutFields, entry) {

    return layoutFields.reduce((acc, fieldname) => {
      if( entry[fieldname] == null) return;
      if(typeof entry[fieldname] === 'string')entry[fieldname] = eval('(' + entry[fieldname] + ')');
      
      if (entry[fieldname].length === 0) {
        return acc;
      }
      const {parsedLayout, layoutAssets} = this.parseLayout(entry[fieldname], fieldname);
      
      const key = fieldname + '_files___NODE';
      
      if(acc[key] !== undefined)acc[key] = acc[key].concat(layoutAssets);
      else acc[key] = layoutAssets;

      return acc;

    }, {});
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

    //1
    const imageFields = this.getImageFields(fields);
    const layoutFields = this.getLayoutFields(fields);
    const otherFields = this.getOtherFields(fields);
    //2
    const entryImageFields = this.composeEntryImageFields(imageFields, entry);
    const entryLayoutFields = this.composeEntryLayoutFields(
      layoutFields,
      entry
    );
    const entryWithOtherFields = this.composeEntryWithOtherFields(
      otherFields,
      entry
    );

    //3
    const node = {
      ...entryWithOtherFields,
      ...entryImageFields,
      ...entryLayoutFields,
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
