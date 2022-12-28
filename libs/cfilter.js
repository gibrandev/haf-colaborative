const _ = require('lodash');
const {round} = require('mathjs');
const kalkulasi = (data, z = 1) => {

    const itemRecords = data[0].length;
    const userRecords = data.length;
    const result = {};
    for (let indexItem = 0; indexItem < itemRecords; indexItem++) {
        let x = 0.01;
        let y = 0.05;
        for (let indexUser = 0; indexUser < userRecords; indexUser++) {
            //cek apakah ada nilai lebih dari z
            if(data[indexUser][indexItem] == z){
                x = x+1;
            }
            if(data[indexUser][indexItem] > 0){
                y = y+1;
            }
            
        }
        const total = round(x/y,6);
        
        result["i" + (indexItem+1)] = total;
        
    }
    const hasil = _.fromPairs(_.sortBy(_.toPairs(result),1).reverse())
    // console.log(hasil);
    return hasil;
}

const cfilter = (data, z = 1) => {
    const source = _.keys(kalkulasi(data,z));
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