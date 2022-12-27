# HOW TO USE

```javascript
const engine = require('./libs/cfilter');
```

```javascript
const data = [
    [1,0,5,1,0,0,2,0,0], //USER 1
    [0,0,5,2,3,3,2,0,0], //USER 2
    [2,1,0,0,0,0,3,0,0], //User 3
    [0,0,0,1,2,0,5,2,2], //User 4
    [0,2,0,1,0,0,0,4,2] //User 5
];


const itemRekomendasi = engine.cfilter(data);

console.log("Item Rekomendasi: ");
console.log(itemRekomendasi);
```