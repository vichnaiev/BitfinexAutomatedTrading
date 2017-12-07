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
var stopOrderInternalId = 0
var stopOrderAmount = 0
var stopOrderDate = ''
var stopOrderPrice = 0
var ignorePU = false


bws.on('auth', () => {
  // emitted after .auth()
  // needed for private api endpoints  
  console.log('authenticated')
  
  //DEBUG CALL
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
	  console.log(new Date(Date.now()).toString() + " Stop created")
	  writeable.write(getCurrentDateTime() + " Stop created: " + symbol + "at " + price + "at the amount of " + amount + " Client Id: " + cId + ". Date: " + stopOrderDate)
	  writeable.write('\r\n')
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
  writeable.write(getCurrentDateTime() + " Sent cancel request by internal id: " + oId)
  writeable.write('\r\n')
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
  console.log(new Date(Date.now()).toString() + " Sent cancel request")
  writeable.write(getCurrentDateTime() + " Sent cancel request: " + clientId + " " + orderDate)
  writeable.write('\r\n')  
}

function cancelOrdersByGroupId (groupId) {
  // https://docs.bitfinex.com/v2/reference#ws-input-order-cancel

  const payload = [
    0,
    'oc_multi',
    null,
    {
      'gid': [[groupId]]
    }
  ]
  bws.send(payload)
  writeable.write(getCurrentDateTime() + " Sent cancel request for group " + groupId)
  writeable.write('\r\n')
}

bws.on('message', (msg) => {
  
  if (!Array.isArray(msg)) return
  
  const [ , type, payload ] = msg
  
  if(type === 'on' || type === 'ou' || type === 'oc' || type === 'te' || type === 'n')
  {
	console.log('----message-begin---- ' + new Date(Date.now()).toString())
	console.log(msg)
	console.log('-----message-end----- ' + new Date(Date.now()).toString())		
  }  
  if(type != 'hb')
  {
	writeable.write(getCurrentDateTime() + ' ' + JSON.stringify(msg))
    writeable.write('\r\n')  
  }	  

  
  if (type === 'pu') { // new order confirmed
    if(payload[1] === 'ACTIVE' && !ignorePU) {
		if (stopOrderId!=0 && stopOrderAmount!=-payload[2]){
			cancelOrdersByGroupId(1)
			cancelOrderByClientId(stopOrderId, stopOrderDate)
			cancelOrder(stopOrderInternalId)			
			stopOrderId = 0
			console.log(new Date(Date.now()).toString() + ' Stop order has different amount, cancelling and creating a new one on ' + payload[0] + ' with price ' + target + " at the amount of " + -payload[2])		
			writeable.write(getCurrentDateTime() + ' Stop order has different amount, cancelling and creating a new one on ' + payload[0] + ' with price ' + target + " at the amount of " + -payload[2])
			writeable.write('\r\n')		
		}		
		if (stopOrderId === 0){
			var target = payload[2]>0 ? payload[3]*1.01 : payload[3]*0.99
			target = target.toFixed(4)
			console.log(new Date(Date.now()).toString() + ' Stop not found, creating Order on ' + payload[0] + ' with price ' + target + " at the amount of " + -payload[2])		
			writeable.write(getCurrentDateTime() + ' Stop not found, creating Order on ' + payload[0] + ' with price ' + target + " at the amount of " + -payload[2])
			writeable.write('\r\n')		
			submitStopGainOrder(payload[0], target, -payload[2])
		}
	}
  }	
  
  if (type === 'on') { // new order confirmed
    if(stopOrderId != 0 && payload[13] === 'ACTIVE' && stopOrderId==payload[2])
	{
		stopOrderInternalId = payload[0]
		writeable.write(getCurrentDateTime() + ' Found stop confirmation at ON, setting internal id to ' + stopOrderInternalId)
		writeable.write('\r\n')
		//DEBUG ONLY CALL
		//cancelOrderByClientId(stopOrderId, stopOrderDate)
		//cancelOrdersByGroupId(1)
	}
  }	
  if (type === 'n') { // new order confirmed
    if(stopOrderId != 0 && payload[1] === 'on-req' && stopOrderId==payload[4][2])
	{
		stopOrderInternalId = payload[4][0]
		writeable.write(getCurrentDateTime() + ' Found stop confirmation at ON-REQ, setting internal id to ' + stopOrderInternalId)
		writeable.write('\r\n')		
	}
  }	
  
  if (type === 'te') { // trade executed
    if(payload[3] == stopOrderInternalId) {
		ignorePU = true
		console.log('Ignoring next position update, stop order being executed')		
		writeable.write('Ignoring next position update, stop order being executed')
		writeable.write('\r\n')
		
	} else ignorePU = false
  }

  if (type === 'pc') { // position closed 
	stopOrderId = 0
	stopOrderDate = ''
  }
})

bws.on('error', (error) => {
  console.error('Error:')
  console.error(error)
})

function getCurrentDateTime(){
	var tempDate = new Date(Date.now())
	return(tempDate.getDate() + '/' + (tempDate.getMonth()+1) + '/' + tempDate.getFullYear() + ' ' + tempDate.getHours() + ':' +  tempDate.getMinutes() + ':' + tempDate.getSeconds()+ ':' + tempDate.getMilliseconds())	
}