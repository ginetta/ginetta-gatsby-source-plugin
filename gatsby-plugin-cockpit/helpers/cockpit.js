

module.exports = class CockpitHelpers {
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

  // get cockpit collection items by collection name
  async getRegionItems(name) {
    const values = await this.cockpit.regionData(name);
    const template = await this.cockpit.regionGet(name);
    return { data: {values, template}, name };
  }

  // get all cockpit regions, together with their items
  async getCockpitRegions() {
    const regions = await this.getRegionNames();
    return Promise.all(regions.map(name => {
      var i = this.getRegionItems(name);
      return i;
    }));
  }  

  async getRegionNames() {
    
    const allRegions = await this.cockpit.regionList(); 
    const explictlyDefinedRegions = this.config.regions;

    return explictlyDefinedRegions instanceof Array
      ? allRegions.filter(
        name => explictlyDefinedRegions.indexOf(name) > -1
      )
      : allRegions;
  }
}