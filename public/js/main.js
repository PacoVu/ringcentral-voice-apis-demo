var timeOffset = 0
var activeCalls = []
var callReport = []
function init(){
  timeOffset = new Date().getTimezoneOffset()*60000;
  timer = setInterval(function () {
      updateData()
    }, 1000);
}

function updateData(){
  var getting = $.get("get-active-calls")
  getting.done(function(res) {
    if (res.status = 'ok'){
      activeCalls = res.activeCalls
      var html = ''
      for (var call of res.activeCalls){
        if (call.status == "NO-CALL" || call.status == "Gone"){
          callReport.unshift(call)
          makeCallReports()
          /*
          var cr = callReport.find(o => o.sessionId == call.sessionId)
          if (!cr){
            callReport.unshift(call)
            makeCallReports()
          }
          */
        }else {
          html += '<div class="row col-xl-12 phone-block">'
          html += makeActiveCallBlock(call)
          // make call control
          html += '<div class="col-xl-12">'
          if (call.direction == 'Inbound'){
            if (call.status == "Setup" || call.status == "Proceeding"){
              html += `<img class="control-btn" src="./img/ringing-1.png" onclick="answerCall('${call.telSessionId}')" onmouseover="showCodeBlock('answer')"/>`
              html += `<img class="control-btn" src="./img/hangup.png" onclick="hangupCall('${call.telSessionId}')" title="Hangup" onmouseover="showCodeBlock('hangup')"/>`
              html += `<img class="control-btn" src="./img/forward.png" onclick="loadTeamNumbers('${call.telSessionId}', 'forward')" onmouseover="showCodeBlock('forward')"/>`
            }else{
              html += `<img class="control-btn" src="./img/hangup.png" onclick="hangupCall('${call.telSessionId}')" title="Hangup" onmouseover="showCodeBlock('hangup')"/>`
              var holdBtnText = 'hold.png'
              if (call.status == 'Hold')
                holdBtnText = 'unhold.png'
              html += `<img class="control-btn" src="./img/${holdBtnText}" onclick="hold_unholdCall('${call.telSessionId}')" onmouseover="showCodeBlock('hold')"/>`
              var recordBtnText = 'record.png'
              if (call.recordingId != ''){
                recordBtnText = (call.recording) ? 'recording.png' : 'record.png'
              }
              html += `<img class="control-btn" src="./img/${recordBtnText}" onclick="record_resumeCall('${call.telSessionId}')" onmouseover="showCodeBlock('record')"/>`
              html += `<img class="control-btn" src="./img/blind-trans.png" onclick="loadTeamNumbers('${call.telSessionId}', 'blind-transfer')" onmouseover="showCodeBlock('blind')"/>`
              if (activeCalls.length > 1){
                if (call.status == 'Hold')
                  html += `<img class="control-btn" src="./img/warm-trans.png" onclick="warmTransferCall('${call.telSessionId}')" onmouseover="showCodeBlock('warm')"/>`
              }
            }
          }else{ // Outbound
            html += `<img class="control-btn" src="./img/hangup.png" onclick="hangupCall('${call.telSessionId}')" title="Hangup" onmouseover="showCodeBlock('hangup')"/>`
            if (call.remotePartyStatus != 'Proceeding'){
              var holdBtnText = 'hold.png'
              if (call.status == 'Hold')
                holdBtnText = 'unhold.png'
              html += `<img class="control-btn" src="./img/${holdBtnText}" onclick="hold_unholdCall('${call.telSessionId}')" title="Hold/Unhold" onmouseover="showCodeBlock('hold')"/>`
              var recordBtnText = 'record.png'
              if (call.recordingId != ''){
                recordBtnText = (call.recording) ? 'recording.png' : 'record.png'
              }
              html += `<img class="control-btn" src="./img/${recordBtnText}" onclick="record_resumeCall('${call.telSessionId}')" title="Record"  onmouseover="showCodeBlock('record')"/>`
              html += `<img class="control-btn" src="./img/blind-trans.png" onclick="loadTeamNumbers('${call.telSessionId}', 'blind-transfer')" title="Blind transfer" onmouseover="showCodeBlock('blind')"/>`
              if (activeCalls.length > 1){
                if (call.status == 'Hold')
                  html += `<img class="control-btn" src="./img/warm-trans.png" onclick="warmTransferCall('${call.telSessionId}')" title="Warm transfer" onmouseover="showCodeBlock('warm')"/>`
              }
            }
          }
          html += '</div></div>'
        }
      }
      $("#active-call-list").html(html)
    }
  });
  getting.fail(function(response){
    alert(response.statusText);
  });
}

function makeCallReports(){
  var html = ''
  for (call of callReport){
    html += '<div class="row col-xl-12 call-report-block">'
    var startTime = new Date(call.callTimestamp - timeOffset).toISOString().match(/(\d{2}:){2}\d{2}/)[0]
    var icon = (call.direction == "Inbound") ? "out-call.png" : "in-call.png"
    html += `<div><img src='img/${icon}'/> Call Start: ${startTime}</div>`
    if (call.recordingId != ''){
      html += `<div>Recorded: <img src='img/listen.png'/> - <img src='img/download.png'/></div>`
    }
    var customerName = (call.customerName == '') ? formatPhoneNumber(call.customerNumber) : call.customerName
    if (call.direction == "Inbound"){
      if (call.callAction == 'Missed Call'){
        html += `<div>From: <a href='javascript:makeCallOutCall("${call.customerNumber}")'>${customerName}</a></div>`
      }else
        html += `<div>From: ${customerName}</div>`
    }else{
      html += `<div>To: ${customerName} </div>`
    }
    if (call.status == "NO-CALL" || call.status == "Gone"){
      html += `<div>Result: ${call.callAction}</div>`
    }
    if (call.direction == "Inbound")
      html += `<div>Ring: ${formatDurationTime(call.callRingDuration)}</div>`
    else
      html += `<div>Wait: ${formatDurationTime(call.callRingDuration)}</div>`
    html += `<div>Hold: ${formatDurationTime(call.callHoldDuration)}</div>`
    html += `<div>Talk: ${formatDurationTime(call.talkDuration)}</div>`
    if (call.status == "NO-CALL"){
      if (call.parkNumber != "")
        html += `<div'>Park #: ${call.parkNumber}</div>`
    }
    html += '</div>'
  }
  $('#call-report-list').html(html)
}

function makeActiveCallBlock(call){
    var startTime = new Date(call.callTimestamp - timeOffset).toISOString().match(/(\d{2}:){2}\d{2}/)[0]
    var html = `<div class='row col-xl-12'>`
    var icon = (call.direction == "Inbound") ? "out-call.png" : "in-call.png"
    html += `<div class='col-sm-6 center'><img src='img/${icon}'/> Call Start: ${startTime}</div>`
    var customerName = (call.customerName == '') ? formatPhoneNumber(call.customerNumber) : call.customerName
    if (call.direction == "Inbound"){
      if (call.callAction == 'Missed Call'){
        html += `<div class='col-sm-6 center'>From: <a href='javascript:makeCallOutCall("${call.customerNumber}")'>${customerName}</a></div>`
      }else
        html += `<div class='col-sm-6 center'>From: ${customerName}</div>`
    }else{
      html += `<div class='col-sm-6 center'>To: ${customerName} </div>`
    }
    html += `</div>`
    if (call.status == "NO-CALL" || call.status == "Gone"){
      html += `<div class='row col-xl-12 center'>Result: ${call.callAction}</div>`
    }
    html += `<div class='row col-xl-12'>`
    if (call.direction == "Inbound")
      html += `<div class='col-sm-4 center'>Ring: ${formatDurationTime(call.callRingDuration)}</div>`
    else
      html += `<div class='col-sm-4 center'>Wait: ${formatDurationTime(call.callRingDuration)}</div>`
    html += `<div class='col-sm-4 center'>Hold: ${formatDurationTime(call.callHoldDuration)}</div>`
    html += `<div class='col-sm-4 center'>Talk: ${formatDurationTime(call.talkDuration)}</div>`
    if (call.status == "NO-CALL"){
      if (call.parkNumber != "")
        html += `<div class='col-sm-4 center'>Park #: ${call.parkNumber}</div>`
    }
    html += `</div>`

    return html
}

function makeRingOutCall(){
  var number = $("#ringout-number").val()
  if (number == "")
    return alert("Please enter your valid phone number")
  var url = `/ring-out?customernumber=${number}`
    var getting = $.get( url );
    getting.done(function( res ) {
      if (res.status == "ok"){
        $('#call-info').html(res.message)
      }else{
        alert(res.message)
      }
    });
    getting.fail(function(response){
      alert(response);
    });
}

function makeCallOutCall(number){
  var url = `/call-out?customernumber=${encodeURIComponent(number)}`
  var getting = $.get( url );
  getting.done(function( res ) {
      if (res.status != "ok"){
        alert(res.message)
      }
    });
  getting.fail(function(response){
      alert(response);
  });
}

function toggleShowReport(){
  if ($('#call-report-list').css('visibility')=="hidden")
    $('#call-report-list').css('visibility', 'visible')
  else
    $('#call-report-list').css('visibility', 'hidden')
}

function toggleSetting(){
  if ($('#settings').css('visibility')=="hidden")
    $('#settings').css('visibility', 'visible')
  else
    $('#settings').css('visibility', 'hidden')
}

function enableAutoFunction(elm){
  var option = $('input[name=automatic]:checked').val()
  if (option == "reply"){
    $("#enter-text").show()
    $("#enter-number").hide()
    showCodeBlock('auto-reply')
  }else if (option == "forward"){
    $("#enter-number").show()
    $("#enter-text").hide()
    showCodeBlock('auto-forward')
  }else{
    $("#enter-number").hide()
    $("#enter-text").hide()
    hideCodeBlock()
  }
}

function setAutoFunction(){
  var option = $('input[name=automatic]:checked').val()
  var params = {
    feature: '',
    autoReply: (option == 'reply') ? true : false,
    autoForward: (option == 'forward') ? true : false,
    text: ''
  }
  if (option == 'reply')
    params.text = $('#auto-reply-text').val()
  else if (option == 'forward')
    params.text = $('#forward-number').val()
  toggleSetting()
  var url = `/set-auto-function`
  var posting = $.post( url, params );
  posting.done(function( res ) {
      if (res.status != "ok"){
        alert(res.message)
      }
    });
  posting.fail(function(response){
      alert(response);
  });
}

function answerCall(telSessionId){
  console.log("answerCall")
  var activeCall = activeCalls.find(o => o.telSessionId == telSessionId)
  if (activeCall){
      params = {
        command: 'answer',
        action: 'answer',
        telSessionId: activeCall.telSessionId,
        partyId: activeCall.partyId
      }
      sendCallControl(params)
  }
}

function hangupCall(telSessionId){
  if (telSessionId != ''){
    params = {
      command: 'hangup',
      action: 'hangup',
      telSessionId: telSessionId
    }
    sendCallControl(params)
  }
}
// Reject goes to voicemail if user expect to take voicemail
function rejectCall(telSessionId){
  var activeCall = activeCalls.find(o => o.telSessionId == telSessionId)
  if (activeCall){
    var params = {
        command: 'reject',
        action: 'reject',
        telSessionId: activeCall.telSessionId,
        partyId: activeCall.partyId
      }
    sendCallControl(params)
  }
}

function record_resumeCall(telSessionId){
  console.log("record_resumeCall")
  var activeCall = activeCalls.find(o => o.telSessionId == telSessionId)
  if (activeCall){
    var params = {}
    if (activeCall.recordingId == ''){
      params = {
        command: 'recording',
        action: 'record',
        telSessionId: activeCall.telSessionId,
        partyId: activeCall.partyId,
        recordingId: activeCall.recordingId
      }
    }else{
      var action = (activeCall.recording) ? 'pause' : 'resume'
      params = {
        command: 'recording',
        action: action,
        telSessionId: activeCall.telSessionId,
        partyId: activeCall.partyId,
        recordingId: activeCall.recordingId
      }
    }
    sendCallControl(params)
  }
}

function hold_unholdCall(telSessionId){
  console.log("hold_unholdCall")
  var activeCall = activeCalls.find(o => o.telSessionId == telSessionId)
  if (activeCall){
    var params = {}
    if (activeCall.status == 'Hold'){
      params = {
        command: 'hold',
        action: 'unhold',
        telSessionId: activeCall.telSessionId,
        partyId: activeCall.partyId
      }
    }else{
      params = {
        command: 'hold',
        action: 'hold',
        telSessionId: activeCall.telSessionId,
        partyId: activeCall.partyId
      }
    }
    sendCallControl(params)
  }
}

var selectedActiveCall = null
function loadTeamNumbers(telSessionId, mode){
  if (mode == 'blind-transfer')
    $("#blind-trans-selection").show()
  else
    $("#forward-selection").show()
  selectedActiveCall = activeCalls.find(o => o.telSessionId == telSessionId)
}

function callForward(elm){
    var phoneNumber = $(elm).val()
    if(phoneNumber == '') return
    var params = {
      command: 'forward',
      action: 'forward',
      telSessionId: selectedActiveCall.telSessionId,
      partyId: selectedActiveCall.partyId,
      destPhoneNumber: phoneNumber
    }
    sendCallControl(params)
    $("#forward-selection").hide()
}

function callBlindTransfer(elm){
    if (activeCalls.length == 0){
      $("#blind-trans-selection").hide()
      return
    }
    var phoneNumber = $(elm).val()
    if(phoneNumber == '') return
    var params = {
      command: 'transfer',
      action: 'blind',
      telSessionId: selectedActiveCall.telSessionId,
      partyId: selectedActiveCall.partyId,
      destPhoneNumber: phoneNumber
    }
    sendCallControl(params)
    $("#blind-trans-selection").hide()
}

function warmTransferCall(telSessionId){
  var activeCall = activeCalls.find(o => o.telSessionId == telSessionId)
  if (activeCall){
    var destActiveCall = undefined
    for (var ac of activeCalls){
      if (ac.telSessionId != telSessionId){
        destActiveCall = ac
        break
      }
    }
    if (destActiveCall){
      var params = {
          command: 'transfer',
          action: 'warm',
          telSessionId: activeCall.telSessionId,
          partyId: activeCall.partyId,
          destTelSessionId: destActiveCall.telSessionId,
          destPartyId: destActiveCall.partyId
      }
      sendCallControl(params)
    }
  }
}

function sendCallControl(params){
  var url = `/call-control`
  var posting = $.post( url, params );
  posting.done(function( res ) {
    if (res.status != "ok"){
      alert(res.status)
    }
  });
  posting.fail(function(response){
    alert(response);
  });
}

function formatPhoneNumber(phoneNumberString) {
  var cleaned = ('' + phoneNumberString).replace(/\D/g, '')
  var match = cleaned.match(/^(1|)?(\d{3})(\d{3})(\d{4})$/)
  if (match) {
    var intlCode = (match[1] ? '+1 ' : '')
    return [intlCode, '(', match[2], ') ', match[3], '-', match[4]].join('')
  }
  return phoneNumberString
}

function formatDurationTime(dur){
  dur = Math.round(dur)
  if (dur > 86400) {
    var d = Math.floor(dur / 86400)
    dur = dur % 86400
    var h = Math.floor(dur / 3600)
    h = (h < 10) ? `0${h}` : h
    dur = dur % 3600
    var m = Math.floor(dur / 60)
    m = (m < 10) ? `0${m}` : m
    var s = dur % 60
    s = (s < 10) ? `0${s}` : s
    //return d + "d " + h + "h " + m + "m " + s + "s"
    return `${d}  ${h}:${m}:${s}`
  }else if (dur >= 3600){
    var h = Math.floor(dur / 3600)
    var h = Math.floor(dur / 3600)
    dur = dur % 3600
    var m = Math.floor(dur / 60)
    m = (m < 10) ? `0${m}` : m
    var s = dur % 60
    s = (s < 10) ? `0${s}` : s
    //return h + "h " + m + "m " + s + "s"
    return `${h}:${m}:${s}`
  }else if (dur >= 60){
    var m = Math.floor(dur / 60)
    m = (m < 10) ? `0${m}` : m
    var s = dur % 60
    s = (s < 10) ? `0${s}` : s
    //return m + "m " + s + "s"
    return `00:${m}:${s}`
  }else{
    //return dur + "s"
    dur = (dur < 10) ? `0${dur}` : dur
    return `00:00:${dur}`
  }
}

function hideCodeBlock(){
  $("#demo-code").hide()
}

function showCodeBlock(block){
  var code = '<pre>'
  switch (block){
    case 'url-scheme':
code += "<xmp>\n\
  <a href='rcapp://r/dialer?number=+14082223333'>Lauren</a></br>\n\
  <a href='rcapp://r/call?number=+16504445555'>Fernando</a>\n\
</xmp>"
      break
    case 'call-out':
code += "/**** CLIENT CODE - CALL-OUT ****/\n\
<xmp>// HTML \n\
<a href='javascript:makeCallOutCall('+14082223333')>Lauren</a></br>\n\
<a href='javascript:makeCallOutCall('+16504445555')>Fernando</a></xmp>\n\
function makeCallOutCall(number){\n\
  var url = `/call-out?customerNumber=${encodeURIComponent(number)}`\n\
  var getting = $.get( url );\n\
  getting.done(function( res ) {\n\
      if (res.status == 'failed'){\n\
        alert(res.status)\n\
      }\n\
    });\n\
  getting.fail(function(response){\n\
      alert(response);\n\
  });\n\
}\n\n\
/**** SERVER CODE ****/\n\
app.get('/call-out', function (req, res) {\n\
  var customerNumber = req.query.customerNumber)\n\
  try {\n\
    <b class='highlightable'>var resp = await platform.get('/restapi/v1.0/account/~/extension/~/device')</b>\n\
    var jsonObj = await resp.json()\n\
    for (var record of jsonObj.records){\n\
      <b class='highlightable'>if (record.status == 'Online' && record.id == '802636634121'){</b>\n\
        <b class='highlightable'>var endpoint = '/restapi/v1.0/account/~/telephony/call-out'</b>\n\
        var phoneNumber = (customerNumber.indexOf('+') < 0) ? `+${customerNumber}` : customerNumber\n\
        <b class='highlightable'>var params = {\n\
              from: { deviceId: record.id },\n\
              to: { phoneNumber: phoneNumber }\n\
            }</b>\n\
        <b class='highlightable'>var resp = await platform.post(endpoint, params)</b>\n\
        var jsonObj = await resp.json()\n\
        res.send({ status: 'ok' })\n\
        return\n\
      }\n\
    }\n\
    res.send({ status: record.status })\n\
  }catch(e){\n\
    res.send({ status: 'failed' })\n\
  }\n\
}"
      break
    case 'ring-out':
code += "/**** CLIENT CODE - RING OUT ****/\n\
function makeRingOutCall(){\n\
  var number = $('#ringout-number').val()\n\
  if (number == '')\n\
    return alert('Please enter your valid phone number')\n\
  var url = `/ring-out?customernumber=${number}`\n\
  var getting = $.get( url );\n\
  getting.done(function( res ) {\n\
    if (res.status == 'ok'){\n\
      alert(res.message)\n\
    }\n\
  });\n\
  getting.fail(function(response){\n\
    alert(response);\n\
  });\n\
}\n\
/**** SERVER CODE ****/\n\
app.get('/ring-out', function (req, res) {\n\
  make_ringout(res, req.query.customernumber)\n\
})\n\
\n\
var callQueueNumber = '12223334444'\n\
async function make_ringout(res, customerNumber) {\n\
  try {\n\
    <b class='highlightable'>var endpoint = '/restapi/v1.0/account/~/extension/~/ring-out'</b>\n\
    <b class='highlightable'>var params = {\n\
          'from' : {'phoneNumber': callQueueNumber},\n\
          'to'   : {'phoneNumber': customerNumber},\n\
          'callerId' : { 'phoneNumber': callQueueNumber},\n\
          'playPrompt' : false})\n\
    }</b>\n\
    <b class='highlightable'>var resp = await platform.post(endpoint, params)</b>\n\
    <b class='highlightable'>var jsonObj = await resp.json()</b>\n\
    res.send({\n\
      status: 'ok',\n\
      message: jsonObj.status.callStatus\n\
    })\n\
  }catch (e){\n\
    res.send({\n\
      status: 'error',\n\
      message: 'Please try again.'\n\
    })\n\
  }\n\
}"
      break
    case 'answer':
code += "/**** CLIENT CODE - ANSWERED ****/\n\
function answerCall(telSessionId){\n\
  var activeCall = activeCalls.find(o => o.telSessionId == telSessionId)\n\
  if (activeCall){\n\
      params = {\n\
        telSessionId: activeCall.telSessionId,\n\
        partyId: activeCall.partyId\n\
      }\n\
      sendCallControl(params)\n\
  }\n\
}\n\n\
/**** SERVER CODE ****/\n\
async function answerCall(res, body){\n\
  try {\n\
    <b class='highlightable'>var resp = await platform.get('/restapi/v1.0/account/~/extension/~/device')</b>\n \
    var jsonObj = await resp.json()\n \
    for (var record of jsonObj.records){\n \
      <b>if (record.status == 'Online' && record.id == '802636634121'){</b>\n \
        <b class='highlightable'>var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${body.telSessionId}/parties/${body.partyId}/answer`</b>\n \
        <b>var params = {  deviceId: record.id }</b>\n \
        <b class='highlightable'>var resp = await platform.post(endpoint, params)</b>\n \
        return res.send({ status: 'ok' })\n \
      }\n\
      res.send({ status: 'Device is offline or not found.' })\n\
    }\n\
  }catch (e){\n \
    res.send({ status: 'failed' })\n\
  }\n \
}"
      break
    case 'forward':
code += "/**** CLIENT CODE - FORWARD CALL ****/\n\
function callForward(elm){\n\
    var phoneNumber = $(elm).val()\n\
    var params = {\n\
      telSessionId: selectedActiveCall.telSessionId,\n\
      partyId: selectedActiveCall.partyId,\n\
      destPhoneNumber: phoneNumber\n\
    }\n\
    sendCallControl(params)\n\
}\n\n\
/**** SERVER CODE ****/\n\
async function forwardCall(res, body){\n\
  try {\n\
    <b class='highlightable'>var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${body.telSessionId}/parties/${body.partyId}/forward`</b>\n\
    <b>var params = { phoneNumber: body.destPhoneNumber }</b>\n\
    <b class='highlightable'>var resp = await platform.post(endpoint, params)</b>\n\
    res.send({ status: 'ok' })\n\
  }catch(e){\n\
    res.send({ status: 'failed' })\n\
  }\n \
}"
      break
    case 'hold':
code += "/**** CLIENT CODE - HOLD/UNHOLD CALL ****/ \n\
function hold_unholdCall(telSessionId){\n\
  var activeCall = activeCalls.find(o => o.telSessionId == telSessionId)\n\
  if (activeCall){\n\
    var params = {\n\
      telSessionId: activeCall.telSessionId,\n\
      partyId: activeCall.partyId\n\
      action: (activeCall.status == 'Hold') ? 'unhold' : 'hold',\n\
    }\n\
    sendCallControl_Hold_Unhold(params)\n\
  }\n\
}\n\n\
/**** SERVER CODE ****/ \n\
async function hold_unholdCall(res, body){\n\
  <b class='highlightable'>var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${body.telSessionId}/parties/${body.partyId}/${body.action}`</b>\n\
  try {\n\
    <b class='highlightable'>var resp = await platform.post(endpoint)</b>\n\
    res.send({ status: 'ok' })\n\
  }catch(e){\n\
    res.send({ status: 'failed' })\n\
  }\n\
}"
      break
    case 'record':
code += "/**** CLIENT CODE - RECORD CALL ****/ \n\
function record_resumeCall(telSessionId){\n\
  var activeCall = activeCalls.find(o => o.telSessionId == telSessionId)\n\
  if (activeCall){\n\
    var params = {\n\
      action: 'record',\n\
      telSessionId: activeCall.telSessionId,\n\
      partyId: activeCall.partyId,\n\
      recordingId: activeCall.recordingId\n\
    }\n\
    if (activeCall.recordingId != ''){\n\
      params.action = (activeCall.recording) ? 'pause' : 'resume'\n\
    }\n\
    sendCallControl_Record(params)\n\
  }\n\
}\n\n\
/**** SERVER CODE ****/ \n\
async function recordCall(res, body){\n\
  <b class='highlightable'>var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${body.telSessionId}/parties/${body.partyId}/recordings`</b>\n \
  if (body.action == 'record'){\n\
    try {\n\
      <b class='highlightable'>var resp = await platform.post(endpoint)</b>\n\
      res.send({ status: 'ok' })\n\
    }catch(e){\n\
      res.send({ status: 'failed' })\n\
    }\n\
  }else{\n\
    <b>endpoint += `/${body.recordingId}`</b>\n\
    var params = {\n\
      active: (body.action == 'pause') ? false : true\n\
    }\n\
    try {\n\
      <b class='highlightable'>var resp = await platform.patch(endpoint, params)</b>\n\
      res.send({ status: 'ok' })\n\
    }catch(e){\n\
      res.send({ status: 'failed' })\n\
    }\n\
  }\n\
}"
      break
    case 'blind':
code += "/**** CLIENT CODE - BLIND TRANSFER ****/ \n\
function blindTransfer(telSessionId, phoneNumber){\n\
  var activeCall = activeCalls.find(o => o.telSessionId == telSessionId)\n\
  if (activeCall){\n\
    var params = {\n\
      command: 'transfer',\n\
      action: 'blind',\n\
      telSessionId: activeCall.telSessionId,\n\
      partyId: activeCall.partyId,\n\
      destPhoneNumber: phoneNumber\n\
    }\n\
    sendCallControl(params)\n\
  }\n\
}\n\
/**** SERVER CODE ****/ \n\
async function blindTransfer(res, body){\n\
  <b class='highlightable'>var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${body.telSessionId}/parties/${body.partyId}/transfer`</b>\n\
  var phoneNumber = (body.destPhoneNumber.indexOf('+') < 0) ? `+${body.destPhoneNumber}` : body.destPhoneNumber\n\
  <b class='highlightable'>var params = { phoneNumber: phoneNumber }</b>\n\
  try {\n\
    <b class='highlightable'>var resp = await platform.post(endpoint, params)</b>\n\
    res.send({ status: 'ok' })\n\
  }catch(e){\n\
    console.log(e)\n\
    res.send({ status: 'failed' })\n\
  }\n\
}"
      break
    case 'warm':
code += "/**** CLIENT CODE - WARM TRANSFER ****/\n\
function warmTransfer(telSessionId){\n\
  var activeCall = activeCalls.find(o => o.telSessionId == telSessionId)\n\
  if (activeCall){\n\
    var destActiveCall = undefined\n\
    for (var ac of activeCalls){\n\
      if (ac.telSessionId != telSessionId){\n\
        destActiveCall = ac\n\
        break\n\
      }\n\
    }\n\
    if (destActiveCall){\n\
      var params = {\n\
          command: 'transfer',\n\
          action: 'warm',\n\
          telSessionId: activeCall.telSessionId,\n\
          partyId: activeCall.partyId,\n\
          destTelSessionId: destActiveCall.telSessionId,\n\
          destPartyId: destActiveCall.partyId\n\
      }\n\
      sendCallControl(params)\n\
    }\n\
  }\n\
}\n\n\
/**** SERVER CODE ****/ \n\
async function warmTransfer(res, body){\n\
  <b class='highlightable'>var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${body.telSessionId}/parties/${body.partyId}/bridge`</b>\n\
  <b class='highlightable'>var params = {\n\
      telephonySessionId: body.destTelSessionId,\n\
      partyId: body.destPartyId\n\
    }</b>\n\
  try {\n\
    <b class='highlightable'>var resp = await platform.post(endpoint, params)</b>\n\
    res.send({ status: 'ok' })\n\
  }catch(e){\n\
    console.log(e)\n\
    res.send({ status: 'failed' })\n\
  }\n\
}"
      break
    case 'hangup':
code += "/**** CLIENT CODE - HANDUP ****/\n\
function hangup(telSessionId){\n\
  var activeCall = activeCalls.find(o => o.telSessionId == telSessionId)\n\
  if (activeCall){\n\
    params = {\n\
      telSessionId: activeCall.telSessionId,\n\
    }\n\
    sendCallControl(params)\n\
  }\n\
}\n\n\
/**** SERVER CODE ****/\n\
async function hangup(res, body){\n\
  <b class='highlightable'>var endpoint = `/restapi/v1.0/account/~/telephony/sessions/${body.telSessionId}`</b>\n\
  try {\n\
     <b class='highlightable'>var resp = await platform.delete(endpoint)</b>\n\
    res.send({ status: 'ok' })\n\
  }catch(e){\n\
    console.log(e)\n\
    res.send({ status: 'failed' })\n\
  }\n\
}"
      break
    case 'auto-reply':
code += "/**** CLIENT CODE - AUTO-REPLY ****/\n\
function setAutoFunction(){\n\
  var option = $('input[name=automatic]:checked').val()\n\
  var params = {\n\
    autoReply: (option == 'reply') ? true : false,\n\
    autoForward: (option == 'forward') ? true : false,\n\
    text: ''\n\
  }\n\
  if (option == 'reply')\n\
    params.text = $('#auto-reply-text').val()\n\
  else if (option == 'forward')\n\
    params.text = $('#forward-number').val()\n\
\n\
  var url = `/set-auto-function`\n\
  var posting = $.post( url, params );\n\
  ...\n\
}\n\n\
/**** SERVER CODE ****/\n\
subscription.on(subscription.events.notification, function(msg) {\n\
  var body = msg.body\n\
  var party = body.parties[0]\n\
  if (autoFunction.autoReply && party.direction == 'Inbound'){\n\
    var customer = customerNumbers.find(o => o.phoneNumber == party.from.phoneNumber)\n\
    var customizedText = autoFunction.text\n\
    if (customer){\n\
      customizedText = customizedText.replace('{name}', customer.name)\n\
    }else{\n\
      customizedText = customizedText.replace('{name}', '')\n\
    }\n\
    console.log(customizedText)\n\
    <b class='highlightable'>if (party.status.code == 'Setup' && party.status.reason != 'CallReplied')</b>{\n\
      <b class='highlightable'>callAutoReply(body.telephonySessionId, party.id, customizedText)</b>\n\
    }\n\
  }"
      break
    case 'auto-forward':
code += "/**** CLIENT CODE - AUTO-FORWARD ****/\n\
function setAutoFunction(){\n\
  var option = $('input[name=automatic]:checked').val()\n\
  var params = {\n\
    autoReply: (option == 'reply') ? true : false,\n\
    autoForward: (option == 'forward') ? true : false,\n\
    text: ''\n\
  }\n\
  if (option == 'reply')\n\
    params.text = $('#auto-reply-text').val()\n\
  else if (option == 'forward')\n\
    params.text = $('#forward-number').val()\n\
\n\
  var url = `/set-auto-function`\n\
  var posting = $.post( url, params );\n\
  ...\n\
}\n\n\
/**** SERVER CODE ****/\n\
subscription.on(subscription.events.notification, function(msg) {\n\
  var body = msg.body\n\
  var party = body.parties[0]\n\
  if (autoFunction.autoReply && party.direction == 'Inbound'){\n\
      ...\n\
  }else if (autoFunction.autoForward && party.direction == 'Inbound'){\n\
    if (party.status.code == 'Setup'){\n\
      <b class='highlightable'>callAutoForward(body.telephonySessionId, party.id, autoFunction.text)</b>\n\
    }\n\
  }else{\n\
    // Handle call events normally\n\
    ...\n\
  }"
      break
    case 'notifications':
code += "/**** SERVER CODE - EVENT NOTIFICATION ****/ \n\
async function subscribe_for_telephony_notification(){\n\
  var eventFilters = [\n\
    <b class='highlightable'>'/restapi/v1.0/account/~/extension/~/telephony/sessions'</b>\n\
  ]\n\
  subscription.setEventFilters(eventFilters)\n\
  .register()\n\
  .then(async function(subscriptionResponse) {\n\
      console.log('Ready to receive Tel session events.')\n\
  })\n\
  .catch(function(e) {\n\
    console.error(e.message);\n\
  })\n\
}\n\
\n\
var activeCalls = []\n\
subscription.on(subscription.events.notification, function(msg) {\n\
  var body = msg.body\n\
  var party = body.parties[0]\n\
  <b class='highlightable'>if (party.extensionId){</b>\n\
    var activeCall = activeCalls.find(o => o.sessionId == body.sessionId)\n\
    <b>var recordingId = (party.recordings) ? party.recordings[0].id : ''</b>\n\
    <b>var recording = (party.recordings) ? party.recordings[0].active : false</b>\n\
    if (activeCall){\n\
      activeCall.status = party.status.code\n\
      activeCall.recordingId = recordingId\n\
      activeCall.recording = recording\n\
      return\n\
    }\n\
    var activeCall = {\n\
      <b>sessionId: body.sessionId,</b>\n\
      <b>telSessionId: body.telephonySessionId,</b>\n\
      <b>partyId: party.id,</b>\n\
      status: party.status.code,\n\
      direction: party.direction,\n\
      from: party.from.phoneNumber,\n\
      to: party.to.phoneNumber,\n\
      recordingId: recordingId,\n\
      recording: recording\n\
      }\n\
    activeCalls.push(activeCall)\n\
  }\n\
});"
      break
    default:
      break
  }
  code += '</pre>'
  $("#demo-code").show()
  $("#demo-code").html(code)
}

/*
[Object: null prototype] {
  command: 'transfer',
  action: 'warm',
  telSessionId: 's-911c7d93d5ea455094bed12c90866263',
  partyId: 'p-911c7d93d5ea455094bed12c90866263-2',
  destTelSessionId: 's-a897760797304a07a34dccf6a0539806',
  destPartyId: 'p-a897760797304a07a34dccf6a0539806-1'
}
{
  accountId: '809646016',
  extensionId: '62288329016',
  id: 'p-911c7d93d5ea455094bed12c90866263-2',
  direction: 'Inbound',
  to: {
    phoneNumber: '+12092520012',
    name: 'Paco Vu',
    extensionId: '62288329016'
  },
  from: { phoneNumber: '+16502245476', name: 'WIRELESS CALLER' },
  status: {
    code: 'Gone',
    reason: 'AttendedTransfer',
    peerId: {
      telephonySessionId: 's-a897760797304a07a34dccf6a0539806',
      sessionId: '692172502016',
      partyId: 'p-a897760797304a07a34dccf6a0539806-1'
    },
    rcc: false
  },
  park: {},
  missedCall: false,
  standAlone: false,
  muted: false
}

{
  accountId: '809646016',
  extensionId: '62288329016',
  id: 'p-a897760797304a07a34dccf6a0539806-1',
  direction: 'Outbound',
  to: {
    phoneNumber: '+12092484775',
    name: 'Agent 120',
    extensionId: '595861017'
  },
  from: {
    phoneNumber: '+17203861294',
    name: 'Paco Vu',
    extensionId: '62288329016',
    deviceId: '42954004'
  },
  status: {
    code: 'Gone',
    reason: 'AttendedTransfer',
    peerId: {
      telephonySessionId: 's-911c7d93d5ea455094bed12c90866263',
      sessionId: '692172473016',
      partyId: 'p-911c7d93d5ea455094bed12c90866263-2'
    },
    rcc: false
  },
  park: {},
  missedCall: false,
  standAlone: false,
  muted: false
}
*/
