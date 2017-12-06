const BFX = require('bitfinex-api-node')
const fs = require('fs')
const path = require('path')

const API_KEY = 'SECRET'
const API_SECRET = 'SECRET'

const opts = {
  version: 2,
  transform: true
}

const bws = new BFX(API_KEY, API_SECRET, opts).ws
var cId = Date.now()
const writeable = fs.createWriteStream(path.join(__dirname, '/main.log'))
var buyOrder = [0,0,0]
var stopOrderId = 0
var stopOrderAmount = 0
var stopOrderDate = ''


bws.on('auth', () => {
  // emitted after .auth()
  // needed for private api endpoints  
  console.log('authenticated')
  /*setTimeout(() => {
    submitStopGainOrder('tIOTUSD',0.1,20)
  }, 5000)  */
})

bws.on('open', () => {
  //bws.subscribeTicker('IOTUSD')
  //bws.subscribeOrderBook('IOTUSD','P1',25)
  //bws.subscribeTrades('IOTUSD')	

  // authenticate
  bws.auth()
})

bws.on('orderbook', (pair, book) => {
  console.log('Order book:', book)
})

bws.on('trade', (pair, trade) => {
  console.log('Trade:', trade)
})

bws.on('ticker', (pair, ticker) => {
  console.log('Ticker:', ticker)
})


function submitOpenPositionOrder (symbol, price, amount) {
  const payload = [
    0,
    'on',
    null,
    {
      'gid': 1,
      'cid': cId, // unique client order id
      'type': 'LIMIT',
      'symbol': symbol,
      'amount': '' + amount,
      'price': '' + price,
      'hidden': 0
    }
  ]
  bws.send(payload)
  if(amount>0)
	buyOrder[0] = cId;
}

function submitStopGainOrder (symbol, price, amount) {
  if(stopOrderId===0){
	  cId = Date.now()  
	  const payload = [
		0,
		'on',
		null,
		{
		  'gid': 1,
		  'cid': cId, // unique client order id
		  'type': 'LIMIT',
		  'symbol': symbol,
		  'amount': '' + amount,
		  'price': '' + price,
		  'hidden': 0
		}
	  ]
	  bws.send(payload)
	  stopOrderId = cId  
	  stopOrderAmount = amount
	  var tempDate = new Date(Date.now())
	  stopOrderDate = tempDate.getFullYear() + '-' + (tempDate.getMonth()+1) + '-' + tempDate.getDate()
	  console.log('StopOrderDate: ' + stopOrderDate)
  }
}

/*function submitOrderWithStop (symbol, price, percentage) {
  var SL = 0;
  if (price>0)
	SL=price*(1-(percentage/100))
  if (price<0)
	SL=SL=price*(1+(percentage/100))  

  const payload = [
    0,
    'on',
    null,
    {
      'gid': 1,
      'cid': cId, // unique client order id
      'type': 'LIMIT',
      'symbol': 'tBTCUSD',
      'amount': '0.002',
      'price': '200',
      'hidden': 0
    }
  ]

  bws.send(payload)
}*/

function cancelOrder (oId) {
  // https://docs.bitfinex.com/v2/reference#ws-input-order-cancel

  const payload = [
    0,
    'oc',
    null,
    {
      'id': oId
    }
  ]

  bws.send(payload)
}

function cancelOrderByClientId (clientId, orderDate) {
  // https://docs.bitfinex.com/v2/reference#ws-input-order-cancel

  const payload = [
    0,
    'oc',
    null,
    {
      'cid': clientId,
	  'cid_date': orderDate
    }
  ]

  bws.send(payload)
}

bws.on('message', (msg) => {
  
  if (!Array.isArray(msg)) return
  
  const [ , type, payload ] = msg
  
  if(type === 'on' || type === 'ou' || type === 'oc' || type === 'te' || type === 'n')
  {
	console.log('----message-begin----')
	console.log(msg)
	console.log('-----message-end-----')		
  }  
  if(type != 'hb')
  {
	writeable.write(JSON.stringify(msg))
    writeable.write('\r\n')  
  }	  

  
  if (type === 'pu') { // new order confirmed
    if(payload[1] === 'ACTIVE') {
		if (stopOrderId!=0 && stopOrderAmount!=-payload[2]){
			cancelOrder(stopOrderId)			
			stopOrderId = 0
		}		
		if (stopOrderId === 0){
			var target = payload[2]>0 ? payload[3]*1.01 : payload[3]*0.99
			target = target.toFixed(4)
			console.log('Stop not found, creating Order on ' + payload[0] + ' with price ' + target + " at the amount of " + -payload[2])		
			writeable.write('Stop not found, creating Order on ' + payload[0] + ' with price ' + target + " at the amount of " + -payload[2])
			writeable.write('\r\n')		
			submitStopGainOrder(payload[0], target, -payload[2])
		}
	}
  }	
  
  if (type === 'on') { // new order confirmed
    if(payload[13] === 'ACTIVE' && payload[2] === cId && payload[6] > 0) {
		console.log('Found Active Order')		
		writeable.write('Found Active Order')
		writeable.write('\r\n')
		buyOrder[1]=payload[0];
	}
	//DEBUG ONLY CALL
	//cancelOrderByClientId(stopOrderId, stopOrderDate)
  }	
  
  if (type === 'te') { // trade executed
    if(payload[3] === BuyOrder[1] && payload[2] === cId && payload[6] > 0) {
		console.log('Trade executed')		
		writeable.write('Trade executed')
		writeable.write('\r\n')
		buyOrder[1]=payload[0];
	}
  }

  if (type === 'pc') { // position closed 
	stopOrderId = 0
  }
})

bws.on('error', (error) => {
  console.error('Error:')
  console.error(error)
})