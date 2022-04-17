
const {fork} = require('child_process');
const path = require('path');

for(let i=0, ilen=3; i<ilen; i++) {
    fork(path.resolve(__dirname, './child.js'), [i]);
}
