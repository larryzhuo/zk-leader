"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderClient = void 0;
const events_1 = require("events");
const zookeeper_1 = __importDefault(require("zookeeper"));
const proto_1 = require("./proto");
class LeaderClient extends events_1.EventEmitter {
    constructor(options) {
        super();
        let { zkClient, path, hostname } = options;
        if (!zkClient) {
            throw new Error('options zkClient null');
        }
        if (!path) {
            path = '/election';
        }
        if (!hostname) {
            throw new Error('options hostname null');
        }
        this.zkClient = zkClient;
        this.path = path;
        this.hostname = hostname;
    }
    mkParentPath() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let ret = yield this.zkClient.pathExists(this.path, false);
                if (!ret) {
                    yield this.zkClient.create(this.path, '', zookeeper_1.default.constants.ZOO_PERSISTENT);
                }
            }
            catch (e) {
                // console.error('exception:', e);
            }
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.mkParentPath();
            let realPath = `${this.path}/n_`;
            let createPath = yield this.zkClient.create(realPath, this.hostname, zookeeper_1.default.constants.ZOO_EPHEMERAL_SEQUENTIAL);
            console.log(`create leader offer, path=${this.path}, hostname=${this.hostname}, createPath=${createPath}`);
            let offer = yield this.nodePathToOffer(createPath);
            if (!offer) {
                throw new Error(`create offer fail`);
            }
            this.nowOffer = offer;
            yield this.elect();
        });
    }
    /**
     * 有新节点加入，进行选举
     */
    elect() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            //读取出现有所有子节点
            let offerStrArr = yield this.zkClient.get_children(this.path, false);
            let offerArr = [];
            for (let offerStr of offerStrArr) {
                let offer = yield this.nodePathToOffer(offerStr);
                if (!offer) {
                    continue;
                }
                offerArr.push(offer);
            }
            for (let i = 0, ilen = offerArr.length; i < ilen; i++) {
                let offer = offerArr[i];
                if (offer.id == ((_a = this.nowOffer) === null || _a === void 0 ? void 0 : _a.id)) { //匹配当前节点
                    if (i == 0) { //当前节点是最小节点
                        this.emit(proto_1.EventEnum.BecomeLenderEvent, offer);
                    }
                    else {
                        this.watchLeftNode(offerArr[i - 1]);
                    }
                }
            }
        });
    }
    statCb(type, state, path) {
        var _a;
        if (!type)
            return;
        if (type == zookeeper_1.default.constants.ZOO_DELETED_EVENT) {
            console.log(`left node delete`);
            if (path == ((_a = this.nowOffer) === null || _a === void 0 ? void 0 : _a.nodePath)) {
                console.error(`statCb path == nowOffer`);
                return;
            }
            this.elect();
        }
    }
    watchLeftNode(leftOffer) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!leftOffer) {
                return;
            }
            //getData()，getChildren() 和 exists() 三个方法来设置 watcher
            let realPath = this.formatFullPath(leftOffer.nodePath);
            console.log(`watchLeftNode fullPath=${realPath}`);
            let dt = yield this.zkClient.w_exists(realPath, this.statCb.bind(this));
            if (dt) {
                console.log(`watchLeftNode success, nodePath=${realPath} `);
            }
            else {
                console.log(`watchLeftNode fail, node was gone between getChildren and exist call`);
                this.elect();
            }
        });
    }
    formatFullPath(nodePath) {
        if (nodePath.startsWith(this.path)) {
            nodePath = nodePath.replace(this.path, '');
        }
        if (nodePath.startsWith('/')) {
            nodePath = nodePath.substring(1);
        }
        return `${this.path}/${nodePath}`;
    }
    nodePathToOffer(nodePath, hostName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!nodePath) {
                return null;
            }
            let realPath = this.formatFullPath(nodePath);
            if (!hostName) {
                let data = yield this.zkClient.get(realPath, false);
                let bufStr = data && data.length > 1 && data[1].toString();
                hostName = bufStr;
            }
            let ret = /n_(\d+)/i.exec('/elec/n_0000000129');
            if (!ret || ret.length < 2) {
                throw new Error('解析id失败');
            }
            let id = parseInt(ret[1]);
            let offer = {
                id,
                nodePath,
                hostName: hostName || ''
            };
            return offer;
        });
    }
}
exports.LeaderClient = LeaderClient;
//# sourceMappingURL=leader-client.js.map