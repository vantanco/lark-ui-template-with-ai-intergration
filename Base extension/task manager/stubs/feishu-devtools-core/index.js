class StorageModule { constructor(){ this.store=new Map(); } get(k){return this.store.get(k);} set(k,v){this.store.set(k,v); return v;} getRootPath(){return process.cwd();}}
class PreviewModule { genQcodePage(){ return ''; } execute(){ return; } }
class UploadModule extends PreviewModule { getPlatformUrl(){ return '#'; } }
class UIModule {}
class EventTrackerModule { execute(){ return; } }
class ServiceModule { execute(){ return; } }
class FeedbackModule { execute(){ return; } }
class AccountModule { execute(){ return; } }
class StaticModule { execute(){ return; } }
const ModuleName = { ui: 'ui' };
const UICmdEnum = { showInfo:'showInfo', link:'link', pick:'pick', confirm:'confirm', input:'input', openPage:'openPage', dialog:'dialog', showLoading:'showLoading', showProgress:'showProgress', hideLoading:'hideLoading', multiPick:'multiPick' };
const EventTrackerCmdEnum = { Timer: 'timer', Track: 'track' };
const ServiceCmdEnum = { Init: 'init', Fetch: 'fetch' };
const AccountCmdEnum = { IsLogin:'isLogin', Login:'login', Logout:'logout' };
module.exports = { StorageModule, PreviewModule, UploadModule, UIModule, ModuleName, UICmdEnum, EventTrackerModule, EventTrackerCmdEnum, ServiceModule, ServiceCmdEnum, FeedbackModule, AccountModule, AccountCmdEnum, StaticModule };
