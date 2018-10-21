

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
  async getSingletonItems(name) {
    const values = await this.cockpit.singletonData(name);
    const template = await this.cockpit.singletonGet(name);
    return { data: { values, template }, name };
  }

  // get all cockpit singletons, together with their items
  async getCockpitSingletons() {
    const singletons = await this.getSingletonNames();
    return Promise.all(singletons.map(name => {
      var i = this.getSingletonItems(name);
      return i;
    }));
  }

  async getSingletonNames() {

    const allSingletons = await this.cockpit.singletonList();
    const explictlyDefinedSingletons = this.config.singletons;

    return explictlyDefinedSingletons instanceof Array
      ? allSingletons.filter(
        name => explictlyDefinedSingletons.indexOf(name) > -1
      )
      : allSingletons;
  }
}