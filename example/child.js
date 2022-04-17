const {LeaderClient} = require('../index');
const ZooKeeper = require('zookeeper');

let i = process.argv[2];
if(!i) {
    process.exit();
}

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
        let leaderClient = new LeaderClient({
            zkClient,
            path: '/elec',
            hostname: `192.168.0.${i}`
        });
        leaderClient.start();

        leaderClient.on('BecomeLenderEvent', (data) => {
            console.log('该节点成为lender：', data);
        })
    });
    
    zkClient.init(config);
}

processBody();