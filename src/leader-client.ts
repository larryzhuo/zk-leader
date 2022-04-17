import {EventEmitter} from 'events';
import ZooKeeper from 'zookeeper';
import {EventEnum, IClientOpts, ILeaderOffer} from './proto';


export class LeaderClient extends EventEmitter {
    zkClient:ZooKeeper;
    path:string;
    hostname:string;
    nowOffer?:ILeaderOffer;

    constructor(options:IClientOpts) {
        super();

        let {zkClient, path, hostname} = options;
        if(!zkClient) {
            throw new Error('options zkClient null');
        }
        if(!path) {
            path = '/election';
        }
        if(!hostname) {
            throw new Error('options hostname null');
        }
        this.zkClient = zkClient;
        this.path = path;
        this.hostname = hostname;
    }

    async mkParentPath() {          //如果父目录不存在，则创建
        try {
            let ret = await this.zkClient.pathExists(this.path, false);
            if(!ret) {
                await this.zkClient.create(this.path, '', ZooKeeper.constants.ZOO_PERSISTENT);
            }
        } catch(e) {
            // console.error('exception:', e);
        }
    }

    async start() {
        await this.mkParentPath();

        let realPath = `${this.path}/n_`;
        let createPath = await this.zkClient.create(realPath, this.hostname, ZooKeeper.constants.ZOO_EPHEMERAL_SEQUENTIAL);
        console.log(`create leader offer, path=${this.path}, hostname=${this.hostname}, createPath=${createPath}`);

        let offer = await this.nodePathToOffer(createPath);
        if(!offer) {
            throw new Error(`create offer fail`);
        }
        this.nowOffer = offer;

        await this.elect();
    }

    /**
     * 有新节点加入，进行选举
     */
    async elect():Promise<void> {
        //读取出现有所有子节点
        let offerStrArr:Array<string> = await this.zkClient.get_children(this.path, false);
        let offerArr:ILeaderOffer[] = [];
        for(let offerStr of offerStrArr) {          
            let offer = await this.nodePathToOffer(offerStr);
            if(!offer) {
                continue;
            }
            offerArr.push(offer);
        }
        
        for(let i=0,ilen=offerArr.length; i<ilen; i++) {
            let offer = offerArr[i];
            if(offer.id == this.nowOffer?.id) {          //匹配当前节点
                if(i == 0) {            //当前节点是最小节点
                    this.emit(EventEnum.BecomeLenderEvent, offer);
                } else {
                    this.watchLeftNode(offerArr[i-1]);
                }
            }
        }
    }

    statCb(type: number, state: number, path: string) {
        if(!type) return;

        if(type == ZooKeeper.constants.ZOO_DELETED_EVENT) {
            console.log(`left node delete`);
            if(path == this.nowOffer?.nodePath) {
                console.error(`statCb path == nowOffer`);
                return;
            }

            this.elect();
        }
    }

    async watchLeftNode(leftOffer:ILeaderOffer) {
        if(!leftOffer) {
            return;
        }
        //getData()，getChildren() 和 exists() 三个方法来设置 watcher
        let realPath = this.formatFullPath(leftOffer.nodePath);
        console.log(`watchLeftNode fullPath=${realPath}`);
        let dt = await this.zkClient.w_exists(realPath, this.statCb.bind(this));
        if(dt) {
            console.log(`watchLeftNode success, nodePath=${realPath} `);
        } else {
            console.log(`watchLeftNode fail, node was gone between getChildren and exist call`);
            this.elect();
        }
    }

    formatFullPath(nodePath:string):string {
        if(nodePath.startsWith(this.path)) {
            nodePath = nodePath.replace(this.path, '');
        }
        if(nodePath.startsWith('/')) {
            nodePath = nodePath.substring(1);
        }
        return `${this.path}/${nodePath}`;
    }

    async nodePathToOffer(nodePath:string, hostName?:string):Promise<ILeaderOffer|null> {      //n_0000001
        if(!nodePath) {
            return null;
        }
        let realPath = this.formatFullPath(nodePath);
        if(!hostName) {
            let data:any[] = await this.zkClient.get(realPath, false);
            let bufStr = data && data.length>1 && data[1].toString();
            hostName = bufStr;
        }

        let ret = /n_(\d+)/i.exec('/elec/n_0000000129');
        if(!ret || ret.length<2) {
            throw new Error('解析id失败');
        }
        let id = parseInt(ret[1]);
        let offer:ILeaderOffer = {
            id,
            nodePath,
            hostName: hostName || ''
        }
        return offer;
    }
}