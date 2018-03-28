const { singular } = require('pluralize');
const crypto = require('crypto');
const validUrl = require('valid-url');

module.exports = class CreateNodesHelpers {
  constructor({
    collectionsItems,
    regionsItems,
    store,
    cache,
    createNode,
    assetsMap,
    config,
  }) {
    this.collectionsItems = collectionsItems;
    this.regionsItems = regionsItems;
    this.store = store;
    this.cache = cache;
    this.createNode = createNode;
    this.assetsMap = assetsMap;
    this.config = config;
  }

  async createItemsNodes() {
    Promise.all(      
      this.collectionsItems.map(({ fields, entries, name }) => {
        
        const nodes = entries.map(entry =>
          this.createCollectionItemNode({
            entry,
            name,
            fields,
          })
        );

        return { name, nodes, fields };
      }),
      this.regionsItems.map( ({ name, data }) => {

        const node = this.createRegionItemNode({
          data,
          name,
        });

        return { name: 'region', node };
      })
    );
  }

  getImageFields(fields) {
    return Object.keys(fields).filter(
      fieldname => fields[fieldname].type === 'image'
    );
  }

  getAssetFields(fields) {
    return Object.keys(fields).filter(
      fieldname => fields[fieldname].type === 'asset'
    );
  }  

  getCollectionLinkFields(fields) {
    return Object.keys(fields).filter(
      fieldname => fields[fieldname].type === 'collectionlink'
    );
  }  

  getLayoutFields(fields) {
    return Object.keys(fields).filter(
      fieldname => fields[fieldname].type === 'layout'
    );
  }

  getOtherFields(fields) {
    return Object.keys(fields).filter(
      fieldname => !['image', 'asset', 'collectionlink'].includes(fields[fieldname].type)
    );
  }

  // map the entry image fields to link to the asset node
  // the important part is the `___NODE`.
  composeEntryAssetFields(assetFields, entry) {
    return assetFields.reduce((acc, fieldname) => {
      if (entry[fieldname].path == null) {
        return acc;
      }

      let fileLocation = this.getFileAsset(entry[fieldname].path);
      
      entry[fieldname].localFile___NODE = fileLocation;
      const newAcc = {
        ...acc,
        [fieldname]: entry[fieldname],
      };
      return newAcc;
    }, {});
  }

  // map the entry CollectionLink fields to link to the asset node
  // the important part is the `___NODE`.
  composeEntryCollectionLinkFields(collectionLinkFields, entry) {
    return collectionLinkFields.reduce((acc, fieldname) => {

      const key = fieldname + '___NODE';
      const newAcc = {
        ...acc,
        [key]: entry[fieldname]._id,
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
        setting.localFileId = fileLocation;
      }                
    }
    // if setting[0].path exists it is an array of images
    else if (setting !== null && typeof setting === 'object' && setting[0] != undefined && setting[0].path !== undefined) {
      Object.keys(setting).forEach( imageKey => {
        const image = setting[imageKey];
          
        fileLocation = this.getFileAsset(image.path);
        if(fileLocation) {
          image.localFileId = fileLocation;
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

    // filter duplicate assets
    const seenAssets = {};
    const distinctAssets = nodeAssets.filter( asset => {
      const seen = seenAssets[asset] !== undefined;
      seenAssets[asset] = true;
      return !seen;
    })

    return {
      node,
      nodeAssets: distinctAssets,
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
      
      if(layoutAssets.length > 0) {
        const key = fieldname + '_files___NODE';
        if(acc[key] !== undefined)acc[key] = acc[key].concat(layoutAssets);
        else acc[key] = layoutAssets;
      }

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

  createCollectionItemNode({ entry, fields, name }) {

    //1
    const imageFields = this.getImageFields(fields);
    const assetFields = this.getAssetFields(fields);
    const layoutFields = this.getLayoutFields(fields);
    const collectionLinkFields = this.getCollectionLinkFields(fields);
    const otherFields = this.getOtherFields(fields);
    //2
    const entryImageFields = this.composeEntryAssetFields(imageFields, entry);
    const entryAssetFields = this.composeEntryAssetFields(assetFields, entry);
    const entryCollectionLinkFields = this.composeEntryCollectionLinkFields(collectionLinkFields, entry);
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
      ...entryAssetFields,
      ...entryCollectionLinkFields,
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

  createRegionItemNode({ data, name }) {

    const node = {
      ...data,
      name: name,
      children: [],
      parent: null,
      id: `region-${name}`,
      internal: {
        type: 'region',
        contentDigest: crypto
          .createHash(`md5`)
          .update(JSON.stringify(data))
          .digest(`hex`),
      },
    };
    this.createNode(node);
    return node;
  }  
}