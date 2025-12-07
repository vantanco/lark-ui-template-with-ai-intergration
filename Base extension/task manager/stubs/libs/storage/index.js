class StorageModule { constructor(){ this.store=new Map(); } get(k){ return this.store.get(k); } set(k,v){ this.store.set(k,v); return v; } } module.exports = { StorageModule };
