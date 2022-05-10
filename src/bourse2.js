const ccxt = require('ccxt');

// the burse give the algo the price of a spesific coin minute by minute.
// the algo can make an order by price and specify the amount it wants to buy in, if the amount is greater than the balance 
// then the order is not confirmed, otherwise it is enter to the orders list. as soon as the order hits
// target price it benn closed and we open a position at the price spesefied.
// when a position hits its stoploss or take profit price it been closed and moved into closedPositions
// array.


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

// the algo should decied how much money to put on every position considering the grade of all the
// data in a given moment.
// the algo has to have log of why it entered each position.
class Bourse {
    constructor(balance, timeFrame, fromDate, limit, symbol) {
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

    // using testHistory for tests
    async init(testHistory = null) {
        let history = testHistory ? testHistory : await new ccxt.binance().fetchOHLCV(this.symbol, this.timeFrame, this.fromDate, this.limit);
        for (let ticker of history) {
            const [timestamp, open, high, low, close, volume] = ticker;
            this.historyPrice.push({ timestamp, open, high, low, close, volume });
        }
        this.currentPrice = this.historyPrice[0];
        this.priceIndex += 1;
    }

    getCurrentPrice() {
        this.checkEnteredIntoPosition();
        this.checkIfNeedToClosePosition();
        let currPrice = this.currentPrice;
        this.priceIndex += 1;
        this.currentPrice = this.historyPrice[this.priceIndex];
        return currPrice;
    }

    findIndexToEnterOrder(atPrice) {
        for (let i = 0; i < this.orders.length; i++) {
            if (atPrice < this.orders[i].atPrice) {
                return i;
            }
        }
        return this.orders.length;
    }

    findIndexToEnterPosition(atPrice) {
        for (let i = 0; i < this.positions.length; i++) {
            if (atPrice < this.positions[i].openPrice) {
                return i;
            }
        }
        return this.positions.length;
    }

    // if entered into short position and the price went up, and you dont have enough money to rebuy
    // the position what do we do?
    putOrder(atPrice, amount, position, takeProfit, stopLoss) {
        if (position === 'buy' && amount > this.balance && (atPrice !== takeProfit && atPrice !== stopLoss)) {
            return {};
        } else {
            let pushingIndex = this.findIndexToEnterOrder(atPrice);
            let newOrder = new order(atPrice, amount, position, takeProfit, stopLoss, this.currOrderId);
            console.log('open new order');
            this.orders.splice(pushingIndex, 0, newOrder);
            this.currOrderId += 1;
            // there is a problem with short because you actully get money but it doesnt enter into your
            this.orders.splice(pushingIndex, 0, newOrder);
            this.currOrderId += 1;
            // there is a problem with short because you acctully get money but it doesnt enter into your
            // account untill you buy back the position, but in this way you can sell as much as you want.
            if (position === 'buy') {
                this.balance -= amount;
            }
            return newOrder;
        }
    }

    closeAllOrders() {
        this.orders = [];
    }

    closeOrder(orderid) {
        for (let i = 0; i < this.orders.length; i++) {
            if (orderid === this.orders[i].id) {
                this.balance += this.orders[i].amount;
                this.orders.splice(i, 1);
                break;
            }
        }
    }

    openPosition(openOrder) {
        let pushingIndex = this.findIndexToEnterPosition(openOrder.atPrice);
        this.positions.splice(pushingIndex, 0, new position(openOrder.atPrice, openOrder.amount,
            openOrder.position, openOrder.takeProfit, openOrder.stopLoss, openOrder.id))
    }

    getPositionById(positionId) {
        return this.positions.filter(position => position.id === positionId);
    }

    removePositionById(positionId) {
        return this.positions.filter(position => position.id !== positionId);
    }

    closePosition(positionId, atPrice) {
        let toClosePosition = this.getPositionById(positionId);
        this.positions = this.removePositionById(positionId);
        if (toClosePosition.position === 'buy') {
            toClosePosition.position = 'sell';
        } else {
            toClosePosition.position = 'buy';
        }
        this.putOrder(atPrice, toClosePosition.amount, toClosePosition.position, atPrice, atPrice);
    }

    isInPriceRange(price) {
        if (price >= this.currentPrice.low && price <= this.currentPrice.high) {
            return true;
        }
        return false;
    }

    checkEnteredIntoPosition() {
        let ordersToClose = [];
        for (let openOrder of this.orders) {
            if (this.isInPriceRange(openOrder.atPrice)) {
                this.openPosition(openOrder);
                ordersToClose.push(openOrder);
            }
        }
        this.closeOrderWhichBecamePosition(ordersToClose);
    }

    closeOrderWhichBecamePosition(ordersToCloseArr) {
        for (order of ordersToCloseArr) {
            this.orders = this.orders.filter(order => !this.containObjectWithTheSameId(ordersToCloseArr,order))
        }
    }

    checkIfNeedToClosePosition() {
        let toClosePositionsArr = [];
        for (let currPosition of this.positions) {
            if (this.isInPriceRange(currPosition.takeProfit)) {
                currPosition.closedPrice = currPosition.takeProfit;
                let multiplyFactor = currPosition.position === 'buy' ? 1 : -1
                currPosition.value = multiplyFactor * ((currPosition.share * currPosition.closedPrice) - (currPosition.share * currPosition.openPrice));
                currPosition.value = (currPosition.share * currPosition.closedPrice) - (currPosition.share * currPosition.openPrice);
                this.balance += currPosition.value;
                toClosePositionsArr.push(currPosition);
            } else if (this.isInPriceRange(currPosition.stopLoss)) {
                currPosition.closedPrice = currPosition.stopLoss;
                let multiplyFactor = currPosition.position === 'buy' ? 1 : -1
                currPosition.value = multiplyFactor * ((currPosition.share * currPosition.closedPrice) - (currPosition.share * currPosition.openPrice));
                this.balance += currPosition.value;
                toClosePositionsArr.push(currPosition);
            }
            // fix the short enter to minus positions
            if (currPosition.position === 'sell') {
                this.checkIfNeedToCloseShortPosition(currPosition);                
            }
        }
        this.closePositions(toClosePositionsArr)
    }

    checkIfNeedToCloseShortPosition(shortPosition) {
       let positionValue = (shortPosition.share * this.currentPrice.high) - (shortPosition.share * shortPosition.openPrice);
       if( this.balance - positionValue <= 0 ) {
           console.log('in close short under 0');
           zeroPrice = (balance + shortPosition.openPrice * shortPosition.share) / shortPosition.share
           if (zeroPrice < this.currentPrice.low) {
               shortPosition.value = (this.currentPrice.low * shortPosition.share) 
           }
           this.closePositions([shortPosition]);
       }
    }

    containObjectWithTheSameId(objectArr, object) {
        for (let currObject of objectArr) {
            if (currObject.id === object.id) {
                return true;
            }
        }
        return false;
    }

    closePositions(positionsArr) {
        this.closedPositions = this.closedPositions.concat(...positionsArr);
        this.positions = this.positions.filter(position => !this.containObjectWithTheSameId(positionsArr, position))
    }
}

// [timestamp, open, high, low, close, volume]
const fakeHistory = [[1,2,12,9],[2,2,10,8],[3,2,9,6],[4,2,14,10]]


async function testBourseCreation() {
    let firstBourse = new Bourse(1000,'1m',1652004126,600,'ETH/USDT');
      await firstBourse.init();
      console.log(firstBourse.historyPrice.length === 600);
}

async function testBourseWithTestHistory() {
    let firstBourse = new Bourse(1000,'1m',1652004126,600,'ETH/USDT');
    await firstBourse.init(fakeHistory);
    console.log(firstBourse.historyPrice.length === 4);
}

async function testPutOrder() {
    let firstBourse = new Bourse(1000,'1m',1652004126,600,'ETH/USDT');
    await firstBourse.init(fakeHistory);
    firstBourse.putOrder(5,3,'buy',6,4);
    firstBourse.putOrder(6,3,'buy',7,4);
    console.log(firstBourse.orders.length === 2);
}

async function testOrdersArraySorted() {
    let firstBourse = new Bourse(1000,'1m',1652004126,600,'ETH/USDT');
    await firstBourse.init(fakeHistory);
    firstBourse.putOrder(10,3,'buy',6,4);
    firstBourse.putOrder(15,3,'buy',7,4);
    firstBourse.putOrder(12,3,'buy',7,4);
    console.log(firstBourse.orders.length === 3);
    console.log(firstBourse.orders[0].atPrice === 10);
    console.log(firstBourse.orders[1].atPrice === 12);
    console.log(firstBourse.orders[2].atPrice === 15);
}

async function testOpenPosition() {
    let firstBourse = new Bourse(1000,'1m',1652004126,600,'ETH/USDT');
    await firstBourse.init(fakeHistory);
    firstBourse.putOrder(10,3,'buy',17,4);
    firstBourse.putOrder(2,3,'buy',7,1);
    firstBourse.getCurrentPrice();
    console.log(firstBourse.positions.length === 1);
}

async function testPositionsArraySorted() {
    let firstBourse = new Bourse(1000,'1m',1652004126,600,'ETH/USDT');
    await firstBourse.init(fakeHistory);
    firstBourse.putOrder(11,3,'buy',17,4);
    firstBourse.putOrder(9,3,'buy',15,1);
    firstBourse.putOrder(10,3,'buy',15,1);
    firstBourse.getCurrentPrice();
    console.log(firstBourse.positions.length === 3);
    console.log(firstBourse.positions[0].openPrice === 9);
    console.log(firstBourse.positions[1].openPrice === 10);
    console.log(firstBourse.positions[2].openPrice === 11);
    console.log(firstBourse.positions);
}

async function testNotOpenPositionMoreThenBalance() {
    let firstBourse = new Bourse(1000,'1m',1652004126,600,'ETH/USDT');
    await firstBourse.init(fakeHistory);
    firstBourse.putOrder(10,1200,'buy',17,4);
    console.log(firstBourse.positions.length === 0);
}

async function testCloseOrder() {
    let firstBourse = new Bourse(1000,'1m',1652004126,600,'ETH/USDT');
    await firstBourse.init(fakeHistory);
    let myorder = firstBourse.putOrder(30,20,'buy',45,4);
    firstBourse.getCurrentPrice();
    console.log(firstBourse.orders.length === 1);
    firstBourse.closeOrder(myorder.id)
    console.log(firstBourse.orders.length === 0);
}

async function testCloseAllOrders() {
    let firstBourse = new Bourse(1000,'1m',1652004126,600,'ETH/USDT');
    await firstBourse.init(fakeHistory);
    let myorder = firstBourse.putOrder(30,20,'buy',45,4);
    let myorder2 = firstBourse.putOrder(40,20,'buy',45,4);
    let myorder3 = firstBourse.putOrder(50,20,'buy',55,4);
    firstBourse.getCurrentPrice();
    console.log(firstBourse.orders.length === 3);
    firstBourse.closeAllOrders();
    console.log(firstBourse.orders.length === 0);
}


async function testCloseBuyPosition() {
    let firstBourse = new Bourse(1000,'1m',1652004126,600,'ETH/USDT');
    await firstBourse.init(fakeHistory);
    firstBourse.putOrder(11,3,'buy',17,4);
    let myOrder = firstBourse.putOrder(9,3,'buy',15,1);
    firstBourse.putOrder(10,3,'buy',15,1);
    firstBourse.getCurrentPrice();
    console.log('positions length' , firstBourse.positions.length === 3);
    console.log('orders length', firstBourse.orders.length === 0);
    firstBourse.closePosition(myOrder.id, 8);
    console.log(firstBourse.orders.length === 1);
    firstBourse.getCurrentPrice();
    console.log(firstBourse.positions.length === 2);
    console.log(firstBourse.closedPositions.length === 1);
    console.log(firstBourse.closedPositions);
}

async function testCoinShare() {
    let firstBourse = new Bourse(1000,'1m',1652004126,600,'ETH/USDT');
    await firstBourse.init(fakeHistory);
    let myorder = firstBourse.putOrder(10,20,'buy',14,4);
    let myorder2 = firstBourse.putOrder(10,15,'buy',14,4);
    firstBourse.getCurrentPrice();
    console.log(firstBourse.positions[0].share === 2);
    console.log(firstBourse.positions[1].share === 1.5);
}



async function testTakeProfitForBuy() {
    let firstBourse = new Bourse(1000,'1m',1652004126,600,'ETH/USDT');
    await firstBourse.init(fakeHistory);
    let myorder = firstBourse.putOrder(10,20,'buy',14,4);
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    console.log(firstBourse.orders.length === 0);
    console.log(firstBourse.positions.length === 0);
    console.log(firstBourse.closedPositions.length === 1);
    console.log(firstBourse.closedPositions[0].value === 8);
}

async function testStopLossForBuy() {
    let firstBourse = new Bourse(1000,'1m',1652004126,600,'ETH/USDT');
    await firstBourse.init(fakeHistory);
    let myorder = firstBourse.putOrder(10,20,'buy',20,6);
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    console.log(firstBourse.orders.length === 0);
    console.log(firstBourse.positions.length === 0);
    console.log(firstBourse.closedPositions.length === 1);
    console.log(firstBourse.closedPositions[0].value === -8);

}

async function testTakeProfitForSell() {
    let firstBourse = new Bourse(1000,'1m',1652004126,600,'ETH/USDT');
    await firstBourse.init(fakeHistory);
    let myorder = firstBourse.putOrder(10,20,'sell',6,20);
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    console.log(firstBourse.orders.length === 0);
    console.log(firstBourse.positions.length === 0);
    console.log(firstBourse.closedPositions.length === 1);
    console.log(firstBourse.closedPositions[0].value === 8);
}

async function testStopLossForSell() {
    let firstBourse = new Bourse(1000,'1m',1652004126,600,'ETH/USDT');
    await firstBourse.init(fakeHistory);
    let myorder = firstBourse.putOrder(10,20,'sell',4,14);
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    console.log(firstBourse.orders.length === 0);
    console.log(firstBourse.positions.length === 0);
    console.log(firstBourse.closedPositions.length === 1);
    console.log(firstBourse.closedPositions[0].value === -8);
}



testBourseCreation();
testBourseWithTestHistory();
testPutOrder();
testOpenPosition();
testNotOpenPositionMoreThenBalance();
testCloseOrder();
testCloseAllOrders();
testOrdersArraySorted();
testPositionsArraySorted();
testCloseBuyPosition();
testCoinShare();
testTakeProfitForBuy();
testStopLossForBuy();
testStopLossForSell();
testTakeProfitForSell();
