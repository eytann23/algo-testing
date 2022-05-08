const { findBatchedResistanceLevels, findBatchedSupportLevels } = require('./src/find-r-s-levels');


(async () => {
    console.log(await findBatchedResistanceLevels());
    console.log(await findBatchedSupportLevels());
})()