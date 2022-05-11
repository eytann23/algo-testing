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

function createOrder(atPrice, amount, position, takeProfit, stopLoss, id) {
    return {
        'atPrice': atPrice,
        'amount': amount,
        'position': position,
        'takeProfit': takeProfit,
        'stopLoss': stopLoss,
        'id': id,
        'date': new Date().toLocaleString()
    }
}


function createPosition(openPrice, amount, position, takeProfit, stopLoss, id) {
    return {
        'openPrice': openPrice,
        'amount': amount,
        'share': amount / openPrice,
        'position': position,
        'takeProfit': takeProfit,
        'stopLoss': stopLoss,
        'id': id,
        'date': new Date().toLocaleString()
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
        this.currentPrice = this.historyPrice[this.priceIndex];
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

    putOrder(atPrice, amount, position, takeProfit, stopLoss) {
        let pushingIndex = this.findIndexToEnterOrder(atPrice);
        let newOrder = createOrder(atPrice, amount, position, takeProfit, stopLoss, this.currOrderId);
        this.orders.splice(pushingIndex, 0, newOrder);
        this.currOrderId += 1;
        return newOrder;
    }

    closeAllOrders() {
        this.orders = [];
    }

    closeOrder(orderid) {
        for (let i = 0; i < this.orders.length; i++) {
            if (orderid === this.orders[i].id) {
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
        return this.positions.filter(position => position.id === positionId)[0];
    }

    removePositionById(positionId) {
        return this.positions.filter(position => position.id !== positionId);
    }

    closePosition(positionId, atPrice) {
        let toClosePosition = this.getPositionById(positionId);
        toClosePosition.stopLoss = atPrice;
        toClosePosition.takeProfit = atPrice;

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
            if (this.isInPriceRange(openOrder.atPrice) && this.balance > openOrder.amount) {
                this.openPosition(openOrder);
                this.balance -= openOrder.amount;
                ordersToClose.push(openOrder);
            }
        }
        this.closeOrderWhichBecamePosition(ordersToClose);
    }

    closeOrderWhichBecamePosition(ordersToCloseArr) {
        for (order of ordersToCloseArr) {
            this.orders = this.orders.filter(order => !this.containObjectWithTheSameId(ordersToCloseArr, order))
        }
    }

    //add close all positions if price reach to 0.
    checkIfNeedToClosePosition() {
        let toClosePositionsArr = [];
        for (let currPosition of this.positions) {
            let { position, stopLoss, takeProfit, share, amount } = currPosition;
            let multiplyFactor = position === 'buy' ? 1 : -1
            if (this.checkIfNeedToCloseShortPositionOutOfBalance(currPosition)) {
                continue;
            } else if (this.isInPriceRange(takeProfit) || this.isInPriceRange(stopLoss)) {
                currPosition.closedPrice = this.isInPriceRange(takeProfit) ? takeProfit : stopLoss;
                currPosition.value = multiplyFactor * ((share * currPosition.closedPrice) - amount);
                this.balance += amount + currPosition.value;
                toClosePositionsArr.push(currPosition);
            }
        }
        this.closePositions(toClosePositionsArr)
    }


    checkIfNeedToCloseShortPositionOutOfBalance(currPosition) {
        if (currPosition.position === 'sell') {
            const { share, stopLoss, openPrice, amount } = currPosition;
            let positionValue = (share * this.currentPrice.high) - (share * openPrice);
            if ((this.balance - amount) - positionValue <= 0) {
                let zeroPrice = ((this.balance - amount) / share) + openPrice;
                if (zeroPrice > stopLoss) {
                    currPosition.value = amount - (stopLoss * share);
                    currPosition.closedPrice = stopLoss
                } else if (zeroPrice > this.currentPrice.low) {
                    currPosition.value = amount - (zeroPrice * share);
                    currPosition.closedPrice = zeroPrice;
                } else {
                    currPosition.value = amount - (this.currentPrice.low * share);
                    currPosition.closedPrice = this.currentPrice.low;
                }
                this.balance += currPosition.value + amount;
                this.closePositions([currPosition]);
                return true;
            }
        }
        return false;
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
const fakeHistory = [[1, 2, 12, 9], [2, 8, 10, 8], [3, 8, 9, 6], [4, 9, 14, 10]]
function initBurseForTest() {
    const firstBourse = new Bourse(1000, '1m', 1652004126, 600, 'ETH/USDT');
    firstBourse.init(fakeHistory);
    return firstBourse;
}



async function testBourseCreation() {
    console.log('TEST BOURSE CREATION');
    let firstBourse = new Bourse(1000, '1m', 1652004126, 600, 'ETH/USDT');
    await firstBourse.init();
    console.log(firstBourse.historyPrice);
    console.log(firstBourse.historyPrice.length === 600);
}

async function testBourseWithTestHistory() {
    console.log('TEST BOURSE WITH TEST HISTORY');
    let firstBourse = initBurseForTest();
    console.log(firstBourse.historyPrice.length === 4);
}

async function testPutOrder() {
    console.log('TEST PUT ORDER');
    let firstBourse = initBurseForTest();
    firstBourse.putOrder(5, 3, 'buy', 6, 4);
    firstBourse.putOrder(6, 3, 'sell', 7, 4);
    console.log(firstBourse.orders.length === 2);
}

async function testOrdersArraySorted() {
    console.log('TEST ORDERS ARRAY SORTED');
    let firstBourse = initBurseForTest();
    firstBourse.putOrder(10, 3, 'buy', 6, 4);
    firstBourse.putOrder(15, 3, 'sell', 7, 4);
    firstBourse.putOrder(12, 3, 'buy', 7, 4);
    console.log(firstBourse.orders.length === 3);
    console.log(firstBourse.orders[0].atPrice === 10);
    console.log(firstBourse.orders[1].atPrice === 12);
    console.log(firstBourse.orders[2].atPrice === 15);
}

async function testOpenPosition() {
    console.log('TEST OPEN POSITION');
    let firstBourse = initBurseForTest();
    firstBourse.putOrder(10, 3, 'buy', 17, 4);
    firstBourse.putOrder(2, 3, 'buy', 7, 1);
    firstBourse.getCurrentPrice();
    console.log(firstBourse.positions.length === 1);
}

async function testPositionsArraySorted() {
    console.log('TEST POSITION ARRAY SORTED');
    let firstBourse = initBurseForTest();
    firstBourse.putOrder(11, 3, 'buy', 17, 4);
    firstBourse.putOrder(9, 3, 'buy', 15, 1);
    firstBourse.putOrder(10, 3, 'buy', 15, 1);
    firstBourse.getCurrentPrice();
    console.log(firstBourse.positions.length === 3);
    console.log(firstBourse.positions[0].openPrice === 9);
    console.log(firstBourse.positions[1].openPrice === 10);
    console.log(firstBourse.positions[2].openPrice === 11);
}

async function testNotOpenPositionMoreThenBalance() {
    console.log('TEST NOT OPEN POSITION MORE THEN BALANCE');
    let firstBourse = initBurseForTest();
    firstBourse.putOrder(10, 1200, 'buy', 17, 4);
    firstBourse.getCurrentPrice();
    console.log(firstBourse.positions.length === 0);
}

async function testCloseOrder() {
    console.log('TEST CLOSE ORDER');
    let firstBourse = initBurseForTest();
    let myorder = firstBourse.putOrder(30, 20, 'buy', 45, 4);
    firstBourse.getCurrentPrice();
    console.log(firstBourse.orders.length === 1);
    firstBourse.closeOrder(myorder.id)
    console.log(firstBourse.orders.length === 0);
}

async function testCloseAllOrders() {
    console.log('TEST CLOSE ALL ORDERS');
    let firstBourse = initBurseForTest();
    let myorder = firstBourse.putOrder(30, 20, 'buy', 45, 4);
    let myorder2 = firstBourse.putOrder(40, 20, 'buy', 45, 4);
    let myorder3 = firstBourse.putOrder(50, 20, 'buy', 55, 4);
    firstBourse.getCurrentPrice();
    console.log(firstBourse.orders.length === 3);
    firstBourse.closeAllOrders();
    console.log(firstBourse.orders.length === 0);
}


function testCloseBuyPosition() {
    console.log('TEST CLOSE BUY POSITION');
    let firstBourse = initBurseForTest();
    firstBourse.putOrder(11, 3, 'buy', 17, 4);
    let myOrder = firstBourse.putOrder(9, 18, 'buy', 15, 1);
    firstBourse.putOrder(10, 3, 'buy', 15, 1);
    firstBourse.getCurrentPrice();
    console.log('positions length', firstBourse.positions.length === 3);
    console.log('orders length', firstBourse.orders.length === 0);
    firstBourse.closePosition(myOrder.id, 8);
    firstBourse.getCurrentPrice();
    console.log(firstBourse.positions.length === 2);
    console.log(firstBourse.closedPositions.length === 1);
    console.log(firstBourse.closedPositions[0].value === -2);

}

function testCloseSellPosition() {
    console.log('TEST CLOSE SELL POSITION');
    let firstBourse = initBurseForTest();
    firstBourse.putOrder(11, 3, 'sell', 17, 4);
    let myOrder = firstBourse.putOrder(9, 18, 'sell', 19, 6);
    firstBourse.putOrder(10.5, 3, 'buy', 15, 1);
    firstBourse.getCurrentPrice();
    console.log('positions length', firstBourse.positions.length === 3);
    console.log('orders length', firstBourse.orders.length === 0);
    firstBourse.closePosition(myOrder.id, 8);
    firstBourse.getCurrentPrice();
    console.log(firstBourse.positions.length === 2);
    console.log(firstBourse.closedPositions.length === 1);
    console.log(firstBourse.closedPositions[0].value === 2);
}

async function testCoinShare() {
    console.log('TEST COIN SHARE');
    let firstBourse = initBurseForTest();
    let myorder = firstBourse.putOrder(10, 20, 'buy', 14, 4);
    let myorder2 = firstBourse.putOrder(10, 15, 'buy', 14, 4);
    firstBourse.getCurrentPrice();
    console.log(firstBourse.positions[0].share === 2);
    console.log(firstBourse.positions[1].share === 1.5);
}



async function testTakeProfitForBuy() {
    console.log('TEST TAKE PROFIT FOR BUY');
    let firstBourse = initBurseForTest();
    let myorder = firstBourse.putOrder(10, 20, 'buy', 14, 4);
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    console.log(firstBourse.orders.length === 0);
    console.log(firstBourse.positions.length === 0);
    console.log(firstBourse.closedPositions.length === 1);
    console.log(firstBourse.closedPositions[0].value === 8);
}

async function testStopLossForBuy() {
    console.log('TEST STOP LOSS FOR BUY');
    let firstBourse = initBurseForTest();
    let myorder = firstBourse.putOrder(10, 20, 'buy', 20, 6);
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    console.log(firstBourse.orders.length === 0);
    console.log(firstBourse.positions.length === 0);
    console.log(firstBourse.closedPositions.length === 1);
    console.log(firstBourse.closedPositions[0].value === -8);

}

async function testTakeProfitForSell() {
    console.log('TEST TAKE PROFIT FOR SELL');
    let firstBourse = initBurseForTest();
    let myorder = firstBourse.putOrder(10, 20, 'sell', 6, 20);
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    console.log(firstBourse.orders.length === 0);
    console.log(firstBourse.positions.length === 0);
    console.log(firstBourse.closedPositions.length === 1);
    console.log(firstBourse.closedPositions[0].value === 8);
}

async function testStopLossForSell() {
    console.log('TEST STOP LOSS FOR SELL');
    let firstBourse = initBurseForTest();
    let myorder = firstBourse.putOrder(10, 20, 'sell', 4, 14);
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    console.log(firstBourse.orders.length === 0);
    console.log(firstBourse.positions.length === 0);
    console.log(firstBourse.closedPositions.length === 1);
    console.log(firstBourse.closedPositions[0].value === -8);
}


async function testCloseShortWhenEnterToMinusWithoutStopLoss() {
    console.log('TEST CLOSE SHORT WHEN ENTER TO MINUS');
    let firstBourse = initBurseForTest();
    let myorder = firstBourse.putOrder(9, 700, 'sell', 1, 20);
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    console.log(firstBourse.orders.length === 0);
    console.log(firstBourse.positions.length === 0);
    console.log(firstBourse.closedPositions.length === 1);
    console.log(firstBourse.closedPositions[0].value === -300);
}

async function testCloseShortWhenEnterToMinusWithStopLoss() {
    console.log('TEST CLOSE SHORT WHEN ENTER TO MINUS');
    let firstBourse = initBurseForTest();
    let myorder = firstBourse.putOrder(9, 700, 'sell', 1, 12);
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    firstBourse.getCurrentPrice();
    console.log(firstBourse.orders.length === 0);
    console.log(firstBourse.positions.length === 0);
    console.log(firstBourse.closedPositions.length === 1);
    console.log(firstBourse.closedPositions[0].value === 700 - (700 / 9 * 12));
}

async function testBalance() {
    console.log('TEST BALANCE');
    let firstBourse = initBurseForTest();
    let myorder = firstBourse.putOrder(9, 90, 'buy', 14, 1);
    let myorder2 = firstBourse.putOrder(8, 80, 'sell', 6, 20);
    console.log(firstBourse.balance === 1000);
    firstBourse.getCurrentPrice();
    console.log(firstBourse.balance === 910);
    firstBourse.getCurrentPrice();
    console.log(firstBourse.balance === 830);
    firstBourse.getCurrentPrice();
    console.log(firstBourse.balance === 930);
    firstBourse.getCurrentPrice();
    console.log(firstBourse.balance === 1070);
    console.log(firstBourse.orders.length === 0);
    console.log(firstBourse.positions.length === 0);
    console.log(firstBourse.closedPositions.length === 2);
}

async function realFuckingTest() {
    let firstBourse = new Bourse(10000, '1m', 1652004126, 600, 'ETH/USDT');
    await firstBourse.init();
    for (let i = 0; i < 200; i++) {
        let currPrice = firstBourse.getCurrentPrice();
        if (currPrice.low <= 300) {
            firstBourse.putOrder(300.5, 601, 'buy', 301, 299);

        } else if (currPrice.high >= 301.5) {
            firstBourse.putOrder(301.5, 601, 'sell', 300, 303);
        }
    }
    firstBourse.closeAllOrders();
    console.log('======ORDERS=====');
    console.log(firstBourse.orders);
    console.log('======POSITIONS=====')
    console.log(firstBourse.positions);
    console.log('======CLOSED-POSITIONS=====')
    console.log(firstBourse.closedPositions);
    console.log(firstBourse.balance);
}


// testBourseCreation();
// testBourseWithTestHistory();
// testPutOrder();
// testOpenPosition();
// testNotOpenPositionMoreThenBalance();
// testCloseOrder();
// testCloseAllOrders();
// testOrdersArraySorted();
// testPositionsArraySorted();
// testCloseBuyPosition();
// testCloseSellPosition();
// testCoinShare();
// testTakeProfitForBuy();
// testStopLossForBuy();
// testTakeProfitForSell();
// testStopLossForSell();
// testCloseShortWhenEnterToMinusWithoutStopLoss();
// testCloseShortWhenEnterToMinusWithStopLoss();
// testBalance();
// realFuckingTest();
