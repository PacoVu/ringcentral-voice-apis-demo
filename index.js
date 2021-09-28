var path = require('path')
var util = require('util')

require('dotenv').config()

var express = require('express');

var app = express();
var bodyParser = require('body-parser');
var urlencoded = bodyParser.urlencoded({extended: false})

app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.use(urlencoded);

var port = process.env.PORT || 5000

var server = require('http').createServer(app);
server.listen(port);
console.log("listen to port " + port)

var fs = require('fs')
var sampleData = fs.readFileSync('./data/customer-numbers.json', 'utf-8')
var customerNumbers = JSON.parse(sampleData)
var sampleData = fs.readFileSync('./data/team-numbers.json', 'utf-8')
var teamMembers = JSON.parse(sampleData)

// Handle page launching
app.get('/', function (req, res) {
  res.render('intranet', {
      customerNumbers: customerNumbers,
      teamMembers: teamMembers
  })
})

app.get('/intranet', function (req, res) {
  res.render('intranet', {
      customerNumbers: customerNumbers,
      teamMembers: teamMembers
  })
})

app.get('/internet', function (req, res) {
  res.render('internet')
})

app.get('/about', function (req, res) {
  res.render('about')
})
//

const RingCentral = require('@ringcentral/sdk').SDK
const Subscriptions = require('@ringcentral/subscriptions').Subscriptions;
const rcsdk = new RingCentral({
  server: process.env.RINGCENTRAL_SERVER,
  clientId: process.env.RINGCENTRAL_CLIENTID,
  clientSecret: process.env.RINGCENTRAL_CLIENTSECRET
})

const EventHandler = require('./event-engine.js')

var platform = rcsdk.platform();
const subscriptions = new Subscriptions({
   sdk: rcsdk
});
var subscription = subscriptions.createSubscription();

rcsdk.login({
        username: process.env.RINGCENTRAL_USERNAME,
        extension: process.env.RINGCENTRAL_EXTENSION,
        password: process.env.RINGCENTRAL_PASSWORD
      })

platform.on(platform.events.loginSuccess, async function(resp){
    console.log("Login success")
    var tokenObj = await platform.auth().data()
    subscribe_for_telephony_notification()
    eventEngine = new EventHandler(tokenObj.owner_id, customerNumbers)
    /** Comment out the 2 lines above and uncomment the line below to clean
    *** up pending subscriptions if you run and stop the code many times
    *** in a short period (few mins) of time!
    *** Return the code to original to continue testing the app.
    ***/
    //read_delete_subscription()
});

async function read_delete_subscription(){
  var resp = await platform.get('/restapi/v1.0/subscription')
  var jsonObj = await resp.json()
  console.log(jsonObj)
  for (var record of jsonObj.records){
    await platform.delete('/restapi/v1.0/subscription/' + record.id)
    console.log("Delete " + record.id)
  }
}

var eventEngine = undefined

async function subscribe_for_telephony_notification(){
  var eventFilters = [
    '/restapi/v1.0/account/~/extension/~/telephony/sessions',
  ]
  subscription.setEventFilters(eventFilters)
  .register()
  .then(async function(subscriptionResponse) {
      console.log("Ready to receive Tel session events via PubNub.")
  })
  .catch(function(e) {
    console.error(e.message);
  })
}

// telephony session event handler
subscription.on(subscription.events.notification, function(msg) {
  var body = msg.body
  var party = body.parties[0]
  if (autoFunction.autoReply && party.direction == 'Inbound'){
    var customer = customerNumbers.find(o => o.phoneNumber == party.from.phoneNumber)
    var customizedText = autoFunction.text
    if (customer){
      customizedText = customizedText.replace('{name}', customer.name)
    }else{
      customizedText = customizedText.replace('{name}', '')
    }
    if (party.status.code == 'Setup' && party.status.reason != 'CallReplied'){
      callAutoReply(body.telephonySessionId, party.id, customizedText)
    }
  }else if (autoFunction.autoForward && party.direction == 'Inbound'){
    if (party.status.code == 'Setup' || party.status.code == 'Proceeding'){
      callAutoForward(body.telephonySessionId, party.id, autoFunction.text)
    }
  }
  eventEngine.processNotification(body)
});

// Polling call data from client every sec
app.get('/get-active-calls', function (req, res) {
  var currentTimestamp = new Date().getTime()
  for (var n=0; n<eventEngine.activeCalls.length; n++){
    var call = eventEngine.activeCalls[n]
    if (call.localConnectTimestamp > 0){
      if (call.status == "Answered")
        call.talkDuration = Math.round((currentTimestamp - call.localConnectTimestamp)/1000) - call.callHoldDuration
    }
    if (call.localRingTimestamp > 0){
      if (call.status == "Proceeding" || call.remotePartyStatus == "Proceeding")
        call.callRingDuration = Math.round((currentTimestamp - call.localRingTimestamp)/1000)
    }
    if (call.localHoldTimestamp > 0 && call.status == "Hold")
      call.callHoldDuration = Math.round((currentTimestamp - call.localHoldTimestamp)/1000) + call.callHoldDurationTotal
  }

  var response = {
          status: 'ok',
          activeCalls: eventEngine.activeCalls
        }
  res.send(response)
  for (var i=0; i<eventEngine.activeCalls.length; i++){
    var activeCall = eventEngine.activeCalls[i]
    if (activeCall.status == "NO-CALL" || activeCall.status == "Gone"){
      eventEngine.activeCalls.splice(i, 1)
    }
  }
})

app.get('/ring-out', function (req, res) {
  console.log('Make a Ring-Out call')
  console.log(req.query.customernumber)
  make_ringout(res, req.query.customernumber)
})

app.get('/call-out', function (req, res) {
  console.log('Make a Call-Out call')
  console.log(req.query.customernumber)
  get_extension_devices(res, req.query.customernumber)
})

app.post('/call-control', function (req, res) {
  console.log('Control active call')
  console.log(req.body)
  controlCall(res, req.body)
})

app.post('/set-auto-function', function (req, res) {
  console.log('Set auto function')
  console.log(req.body)
  autoFunction.autoReply = (req.body.autoReply == 'true') ? true : false
  autoFunction.autoForward = (req.body.autoForward == 'true') ? true : false
  autoFunction.text = req.body.text
  console.log(autoFunction)
})

var autoFunction = {
  autoReply: false,
  autoForward: false,
  text: ''
}

async function callAutoReply(telSessionId, partyId, customizedText){
  var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${telSessionId}/parties/${partyId}/reply`
  var params = {
    replyWithText: customizedText
  }
  try {
    var resp = await platform.post (endpoint, params)
    var jsonObj = await resp.json()
    console.log(jsonObj)
  }catch(e){
    console.log(e.message)
  }
}

async function callAutoForward(telSessionId, partyId, phoneNumber){
  var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${telSessionId}/parties/${partyId}/forward`
  phoneNumber = (phoneNumber.indexOf('+') >= 0) ? phoneNumber : `+${phoneNumber}`
  var params = {
    phoneNumber: phoneNumber
  }
  console.log(endpoint)
  console.log(params)
  try {
    var resp = await platform.post (endpoint, params)
    var jsonObj = await resp.json()
    console.log(jsonObj)
  }catch(e){
    console.log(e.message)
  }
}

async function make_ringout(res, customerNumber) {
  try {
    var resp = await platform.post('/restapi/v1.0/account/~/extension/~/ring-out', {
      'from' : {'phoneNumber': process.env.MY_RING_OUT_NUMBER},
      'to'   : {'phoneNumber': customerNumber},
      'callerId' : { 'phoneNumber': process.env.MY_RING_OUT_NUMBER},
      'playPrompt' : false})
    var jsonObj = await resp.json()
    console.log("Call placed. Call status: " + jsonObj.status.callStatus)
    console.log(jsonObj)
    res.send({
      status: 'ok',
      message: jsonObj.status.callStatus,
      telSessionId: jsonObj.id
    })
  }catch (e){
    console.log(e.message)
  }
}

async function get_extension_devices(res, customerNumber) {
  try {
    var resp = await platform.get('/restapi/v1.0/account/~/extension/~/device')
    var jsonObj = await resp.json()
    for (var record of jsonObj.records){
      console.log(record)
      if (record.status == "Online" && record.id == process.env.MY_DEVICE_ID){
        return await call_out(res, customerNumber, record.id)
      }
    }
    res.send({ status: 'failed', message: 'Device is offline.'})
  }catch(e){
    console.log(e.message)
  }
}

async function call_out(res, customerNumber, deviceId) {
  var number = (customerNumber.indexOf("+") < 0) ? `+${customerNumber}` : customerNumber
  var params = {
    from: { deviceId: deviceId },
    to: { phoneNumber: number }
  }
  try{
    var resp = await platform.post('/restapi/v1.0/account/~/telephony/call-out', params)
    var jsonObj = await resp.json()
    res.send({
      status: 'ok',
      message: 'Call in progress',
      telSessionId: jsonObj.session.id,
      partyId: jsonObj.session.parties[0].id
    })
  }catch(e){
    console.log("Failed here")
    console.log(e.message)
    res.send({
      status: 'error"',
      message: e.message
    })
  }
}

async function controlCall(res, body){
  switch (body.command) {
    case 'recording':
      var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${body.telSessionId}/parties/${body.partyId}/recordings`
      if (body.action == 'record'){
        try {
          var resp = await platform.post(endpoint)
          var jsonObj = await resp.json()
          res.send({
            status: 'ok'
          })
        }catch(e){
          console.log(e)
          res.send({
            status: 'failed'
          })
        }
      }else{
        endpoint += `/${body.recordingId}`
        var params = {
          active: (body.action == 'pause') ? false : true
        }
        try {
          var resp = await platform.patch(endpoint, params)
          res.send({ status: 'ok' })
        }catch(e){
          console.log(e.message)
          res.send({ status: 'failed' })
        }
      }
      break;
    case 'hangup':
      var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${body.telSessionId}`
      try {
        var resp = await platform.delete(endpoint)
        res.send({ status: 'ok' })
      }catch(e){
        console.log(e.message)
        res.send({ status: 'failed' })
      }
      break
    case 'reject':
      var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${body.telSessionId}`
      try {
        var resp = await platform.delete(endpoint)
        res.send({ status: 'ok' })
      }catch(e){
        console.log(e.message)
        res.send({ status: 'failed' })
      }
      break
    case 'hold':
      var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${body.telSessionId}/parties/${body.partyId}/${body.action}`
      try {
        var resp = await platform.post(endpoint)
        res.send({ status: 'ok' })
      }catch(e){
        console.log(e)
        res.send({ status: 'failed' })
      }
      break
    case 'transfer':
      if (body.action == 'warm'){
        var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${body.telSessionId}/parties/${body.partyId}/bridge`
        var params = {
          telephonySessionId: body.destTelSessionId,
          partyId: body.destPartyId
        }
        try {
          var resp = await platform.post(endpoint, params)
          res.send({
            status: 'ok'
          })
        }catch(e){
          console.log(e)
          res.send({
            status: 'failed'
          })
        }
      }else{ // blind
        var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${body.telSessionId}/parties/${body.partyId}/transfer`
        var phoneNumber = (body.destPhoneNumber.indexOf("+") < 0) ? `+${body.destPhoneNumber}` : body.destPhoneNumber
        var params = {
          phoneNumber: phoneNumber
        }
        try {
          var resp = await platform.post(endpoint, params)
          res.send({
            status: 'ok'
          })
        }catch(e){
          console.log(e)
          res.send({
            status: 'failed'
          })
        }
      }
      break
    case 'answer':
      try {
        var resp = await platform.get('/restapi/v1.0/account/~/extension/~/device')
        var jsonObj = await resp.json()
        for (var record of jsonObj.records){
          if (record.status == "Online" && record.id == process.env.MY_DEVICE_ID){
            var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${body.telSessionId}/parties/${body.partyId}/answer`
            var params = {
              deviceId: record.id
            }
            var resp = await platform.post(endpoint, params)
            return res.send({
              status: 'ok'
            })
          }
        }
        res.send({
          status: 'failed'
        })
      }catch(e){
        console.log(e)
        res.send({
          status: 'failed'
        })
      }
      break
    case 'forward':
      var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${body.telSessionId}/parties/${body.partyId}/forward`
      var params = {
        phoneNumber: body.destPhoneNumber
        }
      try {
        var resp = await platform.post(endpoint, params)
        res.send({
          status: 'ok'
        })
      }catch(e){
        console.log(e)
        res.send({
          status: 'failed'
        })
      }
      break
    default:
      break
  }
}
