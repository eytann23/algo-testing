const { Bourse } = require("./bourse2");
const { hoursInTimeStemp } = require("./utils")

class Trader {
    constructor(balance) {
        this.historyData = [];
    }

    initialHistoryData(allHistoryData) {
        this.historyData = [...allHistoryData];
    }

    updateHistoryData(price) {
        this.historyData.shift();
        this.historyData.push(price);
    }


    getBurseTask() {
        let sum = 0;
        for (let price of this.historyData) {
            sum += price.close;
        }
        let avg = sum / this.historyData.length;

        if (this.historyData[this.historyData.length - 1].close > avg) {
            return 'sell';
        } else {
            return 'buy';
        }
    }


}
async function runAgasintBurse(balance, startTime) {
    let timeToFetchData = startTime;
    let myBurse = new Bourse(balance, '1m', startTime, 480, 'ETH/USDT');
    await myBurse.init();
    let myTrader = new Trader(myBurse.getHistoyData());
    for (let i = 0; i < 2; i++) {
        timeToFetchData += hoursInTimeStemp(8);
        myBurse = new Bourse(balance, '1m', timeToFetchData, 480, 'ETH/USDT');
        await myBurse.init();
        for (let j = 0; j < 480; j++) {
            let currPrice = myBurse.getCurrentPrice();
            myTrader.updateHistoryData(currPrice);
            let task = myTrader.getBurseTask();
            switch (task) {
                case 'sell':
                    console.log('selling...');
                    myBurse.putOrder(currPrice.close + 0.5, 100, 'sell', currPrice.close - 10, currPrice.close + 10);
                case 'buy':
                    console.log('buying...')
                    myBurse.putOrder(currPrice.close - 0.5, 100, 'buy', currPrice.close + 10, currPrice.close - 10);
            }
        }
        console.log('all the open orders: ', myBurse.getAllOrders().length);
        console.log('all the open positions: ', myBurse.getAllPositions().length);
        console.log('all the closed positions: ', myBurse.getAllClosedPositions().length);
        console.log('the balance is: ', myBurse.getBalance());
    }

}

// function algoTrading() {
//     while (true) {

//         currPrice = Bourse.getCurrentPrice();
//         shouldOpenPosition(currPrice);
//     }

// }




// function shouldOpenPosition(currentPrice) {

// }


runAgasintBurse(10000, 1652004126);