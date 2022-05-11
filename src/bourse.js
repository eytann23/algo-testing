const ccxt = require('ccxt');

// the burse give the algo the price of a spesific coin minute by minute.
// the algo can make an order by price and specify the amount it wants to buy in, if the amount is greater than the balance 
// then the order is not confirmed, otherwise it is enter to the orders list. as soon as the order hits
// target price it benn closed and we open a position at the price spesefied.
// when a position hits its stoploss or take profit price it been closed and moved into closedPositions
// array.


// the algo should decied how much money to put on every position considering the grade of all the
// data in a given moment.
// the algo has to have log of why it entered each position.
class Bourse {
    constructor(balance, timeFrame,fromDate, limit, symbol) {
        this.currOrderId = 0;
        this.positions = [];
        this.orders = [];
        this.balance = balance;
        this.closedPositions = [];
        this.fromDate = fromDate;
        this.timeFrame = timeFrame;
        this.limit = limit;
        this.currentPrice = 0;
        this.symbol = symbol;
        this.historyPrice = [];
        this.priceIndex = 0;
    }

    async init() {
        let history = await new ccxt.binance().fetchOHLCV(this.symbol, this.timeFrame, this.fromDate, this.limit);
        for (let ticker of history) {
            const [timestamp, open, high, low, close, volume] = ticker;
            this.historyPrice.push({ timestamp, open, high, low, close, volume });
        }
        this.currentPrice = this.historyPrice[0];
        this.priceIndex +=1;
    }

    getCurrentPrice() {
        this.checkEnteredIntoPosition();
        this.checkIfNeedToClosePosition();
        let currPrice = this.currentPrice;
        this.priceIndex +=1; 
        this.currentPrice = this.historyPrice[this.priceIndex];
        return currPrice;
    }

    findIndexToEnterOrder(atPrice) {
     for (let i=0; i < this.orders.length; i++ ) {
            if (atPrice < this.orders[i].atPrice) {
                return i;
            }
        }
        return this.orders.length;
    }

    findIndexToEnterPosition(atPrice) {
        for (let i=0; i < this.positions.length; i++ ) {
               if (atPrice < this.positions[i].openPrice) {
                   return i;
               }
           }
           return this.positions.length;
       }

    putOrder(atPrice, amount, position, takeProfit, stopLoss) {
        if (position === 'buy' && amount > this.balance) {
            return {};
        } else {
            let pushingIndex = this.findIndexToEnterOrder(atPrice);
            let newOrder = new order(atPrice, amount, position, takeProfit, stopLoss, this.currOrderId);
            this.orders.splice(pushingIndex, 0,newOrder);
            this.currOrderId +=1;
            this.balance -= amount;
            return newOrder;
        }
    }

    closeAllOrders() {
        this.orders = [];
    }

    closeOrder(orderid) {
        for (let i=0; i<this.orders.length; i++) {
            if (orderid === this.orders[i].orderid) {
                this.orders.splice(i,1);
                break;
            }
        }
    }

    openPosition(openOrder) {
        let pushingIndex = this.findIndexToEnterPosition(openOrder.atPrice);
        this.positions.splice(pushingIndex, 0, new position(openOrder.atPrice, openOrder.amount,
            openOrder.position, openOrder.takeProfit, openOrder.stopLoss, openOrder.id))
    }

    isInPriceRange(price) {
        if (price >= this.currentPrice.low && price <= this.currentPrice.high) {
            return true;
        }
        return false;
    }

    checkEnteredIntoPosition() {
        console.log('checking enter into position ', this.orders);
        for (let openOrder of this.orders) {
            if (this.isInPriceRange(openOrder.atPrice)) {
                this.openPosition(openOrder);
            }
        }
    }

    checkIfNeedToClosePosition() {
        console.log('checking need to close position ', this.positions); 
        let toClosePositionsArr = [];
        for (let currPosition of this.positions) {
            if (this.isInPriceRange(currPosition.takeProfit)) {
                currPosition.closedPrice = currPosition.takeProfit;
                currPosition.value = (position.share * position.closedPrice) - (position.share * position.openPrice);
                this.balance += currPosition.value;
                toClosePositionsArr.push(currPosition);
            } else if (this.isInPriceRange(currPosition.stopLoss)) {
                currPosition.closedPrice = currPosition.stopLoss;
                currPosition.value = (position.share * position.closedPrice) - (position.share * position.openPrice);
                this.balance += currPosition.value;
                toClosePositionsArr.push(currPosition);
            } 
            }
            this.closePositions(toClosePositionsArr)
        }

    containPositionWithTheSameId(positionsArr, position) {
        for (let currPosition of positionsArr) {
            if (currPosition.id === position.id) {
                return true;
            }
        }
        return false;
    }

    closePositions(positionsArr) {
        this.closedPositions.concat(positionsArr);
        this.positions = this.positions.filter(position => !this.containPositionWithTheSameId(positionsArr,position))
        this.balance += position.value;
        this.closedPositions.push(position);
    }
}

class position {
    constructor(openPrice, amount, position, takeProfit, stopLoss, id) {
        this.id = id;
        this.openPrice = openPrice;
        this.amount = amount;
        this.share = amount / openPrice;
        this.date = new Date().toLocaleString();
        this.position = position;
        this.takeProfit = takeProfit;
        this.stopLoss = stopLoss;
    }

}

class order {
    constructor(atPrice, amount, position, takeProfit, stopLoss, id) {
        this.id = id
        this.atPrice = atPrice;
        this.amount = amount;
        this.date = new Date().toLocaleString();
        this.position = position;
        this.takeProfit = takeProfit;
        this.stopLoss = stopLoss;
    }
}

// (async () => {
//   let firstBourse = new Bourse(1000,'1m',1652004126,600,'ETH/USDT');
//   await firstBourse.init();
//   console.log(firstBourse);
//   let firstPrice = firstBourse.getCurrentPrice();
//   firstBourse.putOrder(300,100,'buy',302,299);
//   console.log(firstPrice);
//   console.log(firstBourse);
//   firstPrice = firstBourse.getCurrentPrice();

// })();
