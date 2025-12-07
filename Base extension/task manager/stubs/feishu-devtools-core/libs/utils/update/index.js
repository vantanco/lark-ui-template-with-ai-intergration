class BaseUpdate {
  async fetchUpdateData() { return {}; }
  async writeUpdateData() { return {}; }
  getFGData() { return {}; }
  async writeFGData() { return {}; }
  getUpdateData() { return { cli: {} }; }
  getStorageProxy() { return {}; }
}
module.exports = BaseUpdate;
