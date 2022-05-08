const { getHistoryData } = require('./fetch-data');


function findLevelsByMovingBlocks(historyData, blockSize, stepSize, isMax) {
    let newRes = new Set();
    for (let i = 0; i < historyData.length; i++) {
        let check = true;
        let checkArr = historyData.slice(i, i + blockSize);
        let firstMax = isMax ? Math.max(...checkArr) : Math.min(...checkArr);
        for (let j = 1; j < stepSize; j++) {
            let testArr = historyData.slice(i + j, i + j + blockSize);
            let testMax = isMax ? Math.max(...testArr) : Math.min(...testArr);
            if (testMax !== firstMax) {
                check = false;
                break
            }
        }
        if (check) {
            newRes.add(firstMax);
        }
    }
    return [...newRes];
}

function getMinAndMaxFromData(historyData) {
    const highest = Math.max(...historyData.map(data => data.high));
    const minimum = Math.min(...historyData.map(history => history.low));
    return [highest, minimum];
}

function batchLevelPoints(levelsArr, lowestPrice, highestPrice, spreadUnits, moreThan, isMax) {
    let deviation = (highestPrice - lowestPrice) / spreadUnits
    let levels = [lowestPrice];
    for (let i = 0; i < spreadUnits; i++) {
        levels.push(levels[i] + deviation)
    }
    let newRes = new Set();
    for (const level of levels) {
        let countedData = levelsArr.filter(value => (value < (level + deviation)) && (value > (level - deviation)));
        if (countedData.length >= moreThan) {
            newRes.add({ count: countedData.length, value: isMax ? Math.max(...countedData) : Math.min(...countedData) })
        }
    }
    return [...newRes];
}

async function findBatchedResistanceLevels() {
    const history = await getHistoryData();
    const minMax = getMinAndMaxFromData(history);
    const resistanceLevelsByMovingBlocks = findLevelsByMovingBlocks(history.map(data => data.close), 9, 5, true);
    const batchedResistanceLevels = batchLevelPoints(resistanceLevelsByMovingBlocks, minMax[1], minMax[0], 27, 3, true);
    return batchedResistanceLevels;
}

async function findBatchedSupportLevels() {
    const history = await getHistoryData();
    const minMax = getMinAndMaxFromData(history);
    const supportLevelsByMovingBlocks = findLevelsByMovingBlocks(history.map(data => data.close), 9, 5, false);
    const batchedSupportLevels = batchLevelPoints(supportLevelsByMovingBlocks, minMax[1], minMax[0], 27, 3, false);
    return batchedSupportLevels;
}


/*
(async () => {
    const history = await getHistoryData();
    const minMax = getMinAndMaxFromData(history);
    // const res = getLevelFrom5Points(history);
    // const batchedLevels = batchLevelPoints(res, minMax);
    // const graphFirstLevels = res.map(data => data.high);
    // const graphSecondLevels = batchedLevels.map(data => data.value);
    const resistanceLevelsByMovingBlocks = findLevelsByMovingBlocks(history.map(data => data.close), 9, 5, true);
    const supportLevelsByMovingBlocks = findLevelsByMovingBlocks(history.map(data => data.close), 9, 5, false);
    // console.log(resistanceLevelsByMovingBlocks);
    // console.log(supportLevelsByMovingBlocks);
    const batchedResistanceLevels = batchLevelPoints(resistanceLevelsByMovingBlocks, minMax[1], minMax[0], 27, 3, true);
    const batchedSupportLevels = batchLevelPoints(supportLevelsByMovingBlocks, minMax[1], minMax[0], 27, 3, false);
    // const batchedSupportLevels = batchLevelPoints([...supportLevelsByMovingBlocks, ...resistanceLevelsByMovingBlocks], minMax[1], minMax[0], 33, 3, false);
    console.log(batchedResistanceLevels);
    console.log(batchedSupportLevels);
    console.log(batchedResistanceLevels.map(data => data.value));
    console.log(batchedSupportLevels.map(data => data.value));
})()
*/

module.exports = { findBatchedResistanceLevels, findBatchedSupportLevels }