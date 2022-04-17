import ZooKeeper from 'zookeeper';

export interface IClientOpts {
    zkClient:ZooKeeper;     //zk client连接
    path:string;            //zk node path
    hostname:string;        //当前节点ip
}

export interface ILeaderOffer {
    id:number;
    nodePath:string;
    hostName:string;
}

export enum EventEnum {
    BecomeLenderEvent = 'BecomeLenderEvent',
    BecomeReadyEvent = 'BecomeReadyEvent'
}