const ccxt = require('ccxt')


function hoursToTimestamp(hours) {
    return 1000 * 60 * 60 * hours;
}

const timestampBeforeFourHours = (new Date().getTime()) - hoursToTimestamp(4);

async function getHistoryData(symbol = 'ETH/USDT', timeframe = '1m', startTime = timestampBeforeFourHours, limit = 240) {
    const ohlcv = await new ccxt.binance().fetchOHLCV(symbol, timeframe, startTime, limit)
    const historyTickers = [];
    for (let ticker of ohlcv) {
        const [timestamp, open, high, low, close, volume] = ticker;
        historyTickers.push({ timestamp, open, high, low, close, volume });
    }
    return historyTickers;
}


module.exports = { getHistoryData }