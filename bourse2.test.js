const BOURSE = require('./src/bourse2')

test('PUT ORDER', () => {
    let firstBourse = BOURSE.initBurseForTest();
    firstBourse.putOrder(5, 3, 'buy', 6, 4);
    firstBourse.putOrder(6, 3, 'sell', 7, 4);
    expect(firstBourse.orders.length).toBe(2);
})

test('TEST ORDERS ARRAY SORTED', () => {
    let firstBourse = BOURSE.initBurseForTest();
    firstBourse.putOrder(10, 3, 'buy', 6, 4);
    firstBourse.putOrder(15, 3, 'sell', 7, 4);
    firstBourse.putOrder(12, 3, 'buy', 7, 4);
    expect(firstBourse.orders.length).toBe(3);
    expect(firstBourse.orders[0].atPrice).toBe(10);
    expect(firstBourse.orders[1].atPrice).toBe(12);
    expect(firstBourse.orders[2].atPrice).toBe(15);
})


test('TEST OPEN POSITION', () => {
    let firstBourse = BOURSE.initBurseForTest();
    firstBourse.putOrder(10, 3, 'buy', 17, 4);
    firstBourse.putOrder(2, 3, 'buy', 7, 1);
    firstBourse.getCurrentPrice();
    expect(firstBourse.positions.length).toBe(1);
})


test('TEST POSITION ARRAY SORTED', () => {
    let firstBourse = BOURSE.initBurseForTest();
    firstBourse.putOrder(11, 3, 'buy', 17, 4);
    firstBourse.putOrder(9, 3, 'buy', 15, 1);
    firstBourse.putOrder(10, 3, 'buy', 15, 1);
    firstBourse.getCurrentPrice();
    expect(firstBourse.positions.length).toBe(3);
    expect(firstBourse.positions[0].openPrice).toBe(9);
    expect(firstBourse.positions[1].openPrice).toBe(10);
    expect(firstBourse.positions[2].openPrice).toBe(11);
})

test('TEST NOT OPEN POSITION MORE THEN BALANCE', () => {
    let firstBourse = BOURSE.initBurseForTest();
    firstBourse.putOrder(10, 1200, 'buy', 17, 4);
    firstBourse.getCurrentPrice();
    expect(firstBourse.positions.length).toBe(0);
})

test('TEST CLOSE ORDER', () => {
    let firstBourse = BOURSE.initBurseForTest();
    let myorder = firstBourse.putOrder(30, 20, 'buy', 45, 4);
    firstBourse.getCurrentPrice();
    expect(firstBourse.orders.length).toBe(1);
    firstBourse.closeOrder(myorder.id)
    expect(firstBourse.orders.length).toBe(0)
})

test('TEST CLOSE ALL ORDERS', () => {
    let firstBourse = BOURSE.initBurseForTest();
    let myorder = firstBourse.putOrder(30, 20, 'buy', 45, 4);
    let myorder2 = firstBourse.putOrder(40, 20, 'buy', 45, 4);
    let myorder3 = firstBourse.putOrder(50, 20, 'buy', 55, 4);
    firstBourse.getCurrentPrice();
    expect(firstBourse.orders.length).toBe(3);
    firstBourse.closeAllOrders();
    expect(firstBourse.orders.length).toBe(0);
})


test('TEST CLOSE BUY POSITION', () => {
    let firstBourse = BOURSE.initBurseForTest();
    firstBourse.putOrder(11, 3, 'buy', 17, 4);
    let myOrder = firstBourse.putOrder(9, 18, 'buy', 15, 1);
    firstBourse.putOrder(10, 3, 'buy', 15, 1);
    firstBourse.getCurrentPrice();
    expect(firstBourse.positions.length).toBe(3);
    expect(firstBourse.orders.length).toBe(0);
    firstBourse.closePosition(myOrder.id, 8);
    firstBourse.getCurrentPrice();
    expect(firstBourse.positions.length).toBe(2);
    expect(firstBourse.closedPositions.length).toBe(1);
    expect(firstBourse.closedPositions[0].value).toBe(-2);
})

test('TEST CLOSE SELL POSITION', () => {
    let firstBourse = BOURSE.initBurseForTest();
    firstBourse.putOrder(11, 3, 'sell', 17, 4);
    let myOrder = firstBourse.putOrder(9, 18, 'sell', 19, 6);
    firstBourse.putOrder(10.5, 3, 'buy', 15, 1);
    firstBourse.getCurrentPrice();
    expect(firstBourse.positions.length).toBe(3);
    expect(firstBourse.orders.length).toBe(0);
    firstBourse.closePosition(myOrder.id, 8);
    firstBourse.getCurrentPrice();
    expect(firstBourse.positions.length).toBe(2);
    expect(firstBourse.closedPositions.length).toBe(1);
    expect(firstBourse.closedPositions[0].value).toBe(2);
})

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

