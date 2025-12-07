class ModuleManager { constructor(){ this.modules = new Map(); } register(name, mod){ this.modules.set(name, mod); return mod; } get(name){ return this.modules.get(name); } init(mods){ this.modules = new Map(Object.entries(mods)); return mods; } execute(){ return Promise.resolve(null); } }
module.exports = ModuleManager;
module.exports.ModuleManager = ModuleManager;
