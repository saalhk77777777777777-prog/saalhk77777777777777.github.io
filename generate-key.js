const crypto = require('crypto');
function sha256(text) { return crypto.createHash('sha256').update(text).digest('hex'); }
function rand(n) { const c='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'; return Array.from({length:n},()=>c[Math.floor(Math.random()*36)]).join(''); }
function makeHash(p) { const h=sha256('skybox-studio-'+p); let n=BigInt('0x'+h.substring(0,12)); const c='0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'; let r=''; for(let i=0;i<5;i++){r+=c[Number(n%35n)];n/=35n;} return r; }
function gen(type) {
    let p = type==='L' ? 'L'+rand(19) : 'M'+rand(19);
    const h = makeHash(p);
    return [p.substring(0,5),p.substring(5,10),p.substring(10,15),p.substring(15,20),h].join('-');
}
const t = process.argv[2]==='monthly' ? 'M' : 'L';
console.log((t==='L'?'평생':'월정기')+': '+gen(t));
