const BFX = require('bitfinex-api-node')

const API_KEY = 'SECRET'
const API_SECRET = 'SECRET'

const opts = {
  version: 2,
  transform: true
}

const bws = new BFX(API_KEY, API_SECRET, opts).ws

bws.on('auth', () => {
  // emitted after .auth()
  // needed for private api endpoints
  const cId = Date.now()
  console.log('authenticated')
  /*setTimeout(() => {
    submitOrder(cId)
  }, 5000)*/
})

bws.on('open', () => {
  //bws.subscribeTicker('IOTUSD')
  //bws.subscribeOrderBook('IOTUSD')
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


function submitOrder () {
  const payload = [
    0,
    'on',
    null,
    {
      'gid': 1,
      'cid': cId, // unique client order id
      'type': 'LIMIT',
      'symbol': 'tBTCUSD',
      'amount': '0.001',
      'price': '200',
      'hidden': 0
    }
  ]

  bws.send(payload)
}

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

bws.on('message', (msg) => {
  console.log('----message-begin----')
  console.log(msg)
  console.log('-----message-end-----')

  if (!Array.isArray(msg)) return

  const [ , type, payload ] = msg

  if (type === 'ou') { // order update
    if (payload[2] === cId) {
      const oId = payload[0]
      console.log('cancelling order...')
      cancelOrder(oId)
    }
  }
})

bws.on('error', (error) => {
  console.error('Error:')
  console.error(error)
})