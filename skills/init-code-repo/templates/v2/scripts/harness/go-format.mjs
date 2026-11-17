import { spawnSync } from 'node:child_process';
const r=spawnSync('gofmt',['-l','.'],{encoding:'utf8'});
if(r.error){console.error(r.error.message);process.exit(2);}
if(r.status||r.stdout.trim()){console.error(r.stdout||r.stderr);process.exit(1);}
