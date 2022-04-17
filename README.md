# zk-leader
Leader election implement by zookeeper

NodeJs implement follow zookeeper recipe [leader election](https://zookeeper.apache.org/doc/r3.8.0/recipes.html#sc_leaderElection).

javascript example:
```javascript
const {LeaderClient} = require('zk-leader');
const ZooKeeper = require('zookeeper');

async function processBody() {
    const config = {
        connect: "127.0.0.1:2181",
        timeout: 2000,
        debug_level: ZooKeeper.ZOO_LOG_LEVEL_WARN,
        host_order_deterministic: false,
    }
    let zkClient = new ZooKeeper(config);

    zkClient.on('connect', () => {
        // start using the client
        for(let i=0, ilen=10; i<ilen; i++) {
            let leaderClient = new LeaderClient({
                zkClient,
                path: '/elec',
                hostname: `192.168.0.${i}`
            });
            leaderClient.start();

            leaderClient.on('BecomeLenderEvent', (data) => {
                console.log('该节点成为lender：', data);
            });
        }
    });
    
    zkClient.init(config);
}

processBody();
```

more detail please look /example



