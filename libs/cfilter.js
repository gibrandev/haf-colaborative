const _ = require('lodash');
const {round} = require('mathjs');
const kalkulasi = (data) => {

    const itemRecords = data[0].length;
    const userRecords = data.length;
    const result = {};
    for (let indexItem = 0; indexItem < itemRecords; indexItem++) {
        let x = 0.01;
        let y = 0.05;
        for (let indexUser = 0; indexUser < userRecords; indexUser++) {
            //cek apakah ada nilai lebih dari 1
            if(data[indexUser][indexItem] == 1){
                x = x+1;
            }
            if(data[indexUser][indexItem] > 0){
                // console.log(indexUser + "," + indexItem);
                y = y+1;
            }
            
        }
        const total = round(x/y,6);
        // console.log(indexItem + " -- " + x + " / " + y + " = " + total);
        // _.assign({indexItem: total}, result);
        // result.push({indexItem:total});
        result["i" + (indexItem+1)] = total;
        
    }
    const hasil = _.fromPairs(_.sortBy(_.toPairs(result),1).reverse())
    return hasil;
}

const cfilter = (data) => {
    const source = _.values(_.invert(kalkulasi(data)));
    const result = [];
    let i = 0;
    for (const key in source) {
        if (Object.hasOwnProperty.call(source, key)) {
            result[i] = source[key].replace("i", "")*1;
            i++;
        }
    }
    return result;
}

module.exports = {
    cfilter: cfilter
};