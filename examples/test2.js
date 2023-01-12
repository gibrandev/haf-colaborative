const engine = require('../index');
const prompt = require('prompt-sync')({sigint: true});

console.log("Membuat Data\n")
const totalUser = prompt("Ada berapa user ? : ");
const totalItem = prompt("Ada berapa Item ? : ");
const nilaiZ = prompt("Berapa Nilai Z ? : ");

console.log("Total User : " + totalUser);
console.log("Total Item : " + totalItem);
const d = [];
for (let i = 0; i < totalUser; i++) {
    d[i] = [];
    for (let n = 0; n < totalItem; n++) {
        d[i][n] = prompt("Masukan data untuk user ke-" + (i+1) + " item ke-" + (n+1) + " : ") * 1;
        
    }   
}


const itemRekomendasi = engine.cfilter(d,nilaiZ);
console.log("\n\n");
console.log("Item Rekomendasi: \n");
console.log(itemRekomendasi);
