function hoursInTimeStemp(hours) {
    return 1000 * 60 * 60 * hours;
}

function makeDataToTimeUnits(long, data) {
    newData = [];
    for (let i = 0; i < data.length; i += long) {
        newOpen = data[i].open;
        newClose = data[i + long - 1].close;
        newLow = data[i].low;
        newHigh = data[i].high;
        newVolume = data[i].volume;
        newTimestamp = data[i].timestamp;
        for (let j = 1; j < long; j++) {
            newLow = data[i + j].low < newLow ? data[i + j].low : newLow;
            newHigh = data[i + j].high > newHigh ? data[i + j].high : newHigh;
            newVolume += data[i + j].volume;
        }
        newData.push([{ newTimestamp, newOpen, newHigh, newLow, newClose, newVolume }])
    }
}


module.exports = { hoursInTimeStemp, makeDataToTimeUnits }

