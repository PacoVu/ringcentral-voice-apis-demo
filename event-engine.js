const sqlite3 = require('sqlite3').verbose();
var CALLREPORTING_DATABASE = './db/callreporting.db';
let db = new sqlite3.Database(CALLREPORTING_DATABASE);

function EventHandler(extensionId, customerNumbers){
  this.extensionId = extensionId
  this.activeCalls = []
  this.customerNumbers = customerNumbers

  this.createCallLogsAnalyticsTable( (err, result) => {
    console.log("Done table creation")
  })
}

var engine = EventHandler.prototype = {
  processNotification: function(body){
    var party = body.parties[0]
    console.log(party)
    console.log("========")
    var call = this.activeCalls.find(o => o.sessionId === body.sessionId)
    if (party.extensionId && party.extensionId == this.extensionId){
        if (call){
          var recordingId = (party.recordings) ? party.recordings[0].id : ''
          call.recordingId = recordingId
          var recording = (party.recordings) ? party.recordings[0].active : false
          call.recording = recording

          var timestamp = new Date(body.eventTime).getTime()
          if(party.status.code == "Setup"){
            // most probably a disorder sequence
            if (call.status == "Proceeding"){
              call.callTimestamp = timestamp
            }
          }else if (party.status.code == "Proceeding"){
            call.ringTimestamp = timestamp
            call.localRingTimestamp = new Date().getTime()
            call.status = party.status.code
            if (party.direction == "Inbound"){
              if (party.from){
                call.customerNumber = party.from.phoneNumber
                var customer = this.customerNumbers.find(o => o.phoneNumber == party.from.phoneNumber)
                if (customer){
                  call.customerName = customer.name
                }
              }
              if (party.to)
                call.agentNumber = party.to.phoneNumber
            }else{ // outbound
              var customer = this.customerNumbers.find(o => o.phoneNumber == party.to.phoneNumber)
              if (customer){
                call.customerName = customer.name
              }
              call.customerNumber = party.to.phoneNumber
              call.agentNumber = party.from.phoneNumber
            }
          }else if(party.status.code == "Answered"){
            // Answered event can be fired every time a call is unhold or start/stop recording
            if (call.status == "Hold"){
              var holdDuration = Math.round((timestamp - call.holdTimestamp) / 1000)
              call.callHoldDurationTotal += holdDuration
            }else if (call.recordingId == ''){
              if (call.direction == "Inbound" && call.status == "Proceeding"){
                call.connectTimestamp = timestamp
                call.localConnectTimestamp = new Date().getTime()
                var respondTime = (call.connectTimestamp - call.ringTimestamp) / 1000
                call.callRingDuration = Math.round(respondTime)
              }else{
                // For Outbound call, need to check when remote party answers the call
                console.log("Set the localConnectTimestamp in the repmote party block")
              }
            }
            if (party.direction == "Inbound"){
              if (party.from){
                call.customerNumber = party.from.phoneNumber
                var customer = this.customerNumbers.find(o => o.phoneNumber == party.from.phoneNumber)
                if (customer){
                  call.customerName = customer.name
                }
              }
              if (party.to)
                call.agentNumber = party.to.phoneNumber

              // war=sol: inbound call from PSTN does not get Answered event for remote party
              call.remotePartyStatus = 'Answered'
            }else{ // outbound
              var customer = this.customerNumbers.find(o => o.phoneNumber == party.to.phoneNumber)
              if (customer){
                call.customerName = customer.name
              }
              call.customerNumber = party.to.phoneNumber
              call.agentNumber = party.from.phoneNumber
            }
            call.status = "Answered"
          }else if(party.status.code == "Disconnected" || party.status.code == "Gone"){
            call.disconnectTimestamp = timestamp
            this.handleDisconnection(party, call)
          }else if(party.status.code == "Voicemail"){
            call.status = "Voicemail"
          }else if(party.status.code == "Hold"){
            call.holdTimestamp = timestamp
            call.localHoldTimestamp = new Date().getTime()
            call.status = "Hold"
            call.holdCount++
          }
        }else{
          if (party.status.code != 'Disconnected'){
            console.log("Add new active call")
            var activeCall = this.createNewActiveCall(body, party)
            this.activeCalls.push(activeCall)
            console.log(this.activeCalls.length)
          }else{
            console.log('Ignore warm transfer "Disconnected" event')
          }
        }
    }else{ // no extension id, or from the other party
        console.log("+++++++++ REMOTE PARTY EVENT +++++++++");
        if (call != undefined){
          call.remotePartyId = party.id
          var timestamp = new Date(body.eventTime).getTime()
          if (party.status.code == "Parked"){
            call.status = "Parked"
            if (party.park.id)
              call.parkNumber = party.park.id
          }else if (party.status.code == "Answered"){
            // if get remote party answered event
            call.remotePartyStatus = party.status.code
            call.connectTimestamp = timestamp
            call.localConnectTimestamp = new Date().getTime()
          }else if (party.status.code == "Proceeding"){
            call.remotePartyStatus = party.status.code
            call.ringTimestamp = timestamp
            call.localRingTimestamp = new Date().getTime()
          }
        }
    }
  },
  createNewActiveCall: function (body, party) {
    var recordingId = (party.recordings) ? party.recordings[0].id : ''
    var recording = (party.recordings) ? party.recordings[0].active : false
    var call = {
                sessionId: body.sessionId,
                telSessionId: body.telephonySessionId,
                partyId: party.id,
                remotePartyStatus: 'Proceeding',
                remotePartyId: '',
                customerNumber: "Anonymous",
                customerName: '',
                agentNumber: "Unknown",
                status: "NO-CALL",
                direction: party.direction,
                callTimestamp: 0,
                ringTimestamp: 0,
                connectTimestamp: 0,
                disconnectTimestamp: 0,
                holdTimestamp: 0,
                callHoldDurationTotal: 0,
                holdCount: 0,
                callAction: "",
                parkNumber: "",
                localRingTimestamp: 0,
                localConnectTimestamp: 0,
                localHoldTimestamp: 0,
                talkDuration: 0,
                callRingDuration: 0,
                callHoldDuration: 0,
                recordingId: recordingId,
                recording: recording,
              }
    var timestamp = new Date(body.eventTime).getTime()
    if (party.status.code == "Setup"){
      call.callTimestamp = timestamp
      call.status = "Setup"
    }else if (party.status.code == "Proceeding"){
      // This happens when there is an incoming call to a call queue
      // Need to deal with incoming calls to a call queue, where queue's members do not receive their own setup event!!!
      // Set default callTimestamp with ringTimestamp for just in case there was no setup event
      call.callTimestamp = timestamp
      // get callTimestamp from an active call with the same sessionId
        for (c of this.extension.activeCalls){
          if (body.sessionId == c.sessionId){
            call.callTimestamp = c.callTimestamp
            break
          }
        }
      call.ringTimestamp = timestamp
      call.status = "Proceeding"
      if (party.direction == "Inbound"){
        if (party.from)
          call.customerNumber = party.from.phoneNumber
        if (party.to)
          call.agentNumber = party.to.phoneNumber
      }else{ // outbound
        call.customerNumber = party.to.phoneNumber
        call.agentNumber = party.from.phoneNumber
      }
    }else if (party.status.code == "Answered"){
      call.connectTimestamp = timestamp
      call.status = "Answered"
      if (party.direction == "Inbound"){
        if (party.from)
          call.customerNumber = party.from.phoneNumber
        if (party.to)
          call.agentNumber = party.to.phoneNumber
      }else{ // outbound
        call.customerNumber = party.to.phoneNumber
        call.agentNumber = party.from.phoneNumber
      }
    }else if (party.status.code == "Disconnected"){
      call.disconnectTimestamp = timestamp
      call.status = "NO-CALL"
    }
    return call
  },
  handleDisconnection: function(party, call){
    if (call.status == "Answered"){
      if (call.remotePartyStatus == 'Answered'){
        call.callAction = "Connected"
      }else{
        if (call.direction == 'Outbound'){
          call.callAction = "Cancelled"
        }else{
          console.log("Most probably a missed call from internal call?")
        }
      }
      if (party.status.code == 'Disconnected'){
        if (party.status.reason && party.status.reason == 'BlindTransfer')
          call.callAction = "Connected -> Blind Transferred"
      }
    }else if (call.status == "Hold"){
      if (party.status.code == 'Gone')
        call.callAction = "Connected -> Warm Transferred"
      else
        call.callAction = "Connected"
      call.callHoldDurationTotal += (call.disconnectTimestamp - call.holdTimestamp) / 1000
    }else if (call.status == "Proceeding"){
      if (party.status.reason && party.status.reason == 'CallerDropped'){
        call.callAction = "Missed Call"
      }else{
        call.callAction = "Rejected"
      }
    }else if (call.status == "Voicemail"){
      call.callAction = "Voicemail"
    }else if (call.status == "Setup"){
      call.callAction = "Cancelled"
    }else if (call.status == "Parked"){
      call.callAction = "Parked"
    }else{
      call.callAction = "Unknown"
    }

    if (call.connectTimestamp > 0){
      call.talkDuration = Math.round((call.disconnectTimestamp - call.connectTimestamp) / 1000) - call.callHoldDurationTotal
    }else if (call.ringTimestamp > 0){
      call.callRingDuration = Math.round((call.disconnectTimestamp - call.ringTimestamp) / 1000)
    }
    call.status = "NO-CALL"
    this.updateCallReportTable(call)
  },
  createCallLogsAnalyticsTable: function(callback) {
      console.log("createCallLogsAnalyticsTable")
      var query = `CREATE TABLE IF NOT EXISTS call_report_demo_${this.extensionId} (`
      query += 'party_id VARCHAR(48) PRIMARY KEY'
      query += ', session_id VARCHAR(12)'
      query += ', customer_number VARCHAR(15)'
      query += ', customer_name VARCHAR(128)'
      query += ', agent_number VARCHAR(15)'
      query += ', direction VARCHAR(12)',
      query += ', call_timestamp BIGINT DEFAULT 0'
      query += ', ring_timestamp BIGINT DEFAULT 0'
      query += ', connect_timestamp BIGINT DEFAULT 0'
      query += ', disconnect_timestamp BIGINT DEFAULT 0'
      query += ', call_hold_duration INT DEFAULT 0'
      query += ', hold_count INT DEFAULT 0'
      query += ', call_action VARCHAR(15)',
      query += ')'
      db.run(query, function(err, result) {
        if (err) {
          callback(err, err.message)
        }else{
          callback(null, "Ok")
        }
      });
  },
  updateCallReportTable: function(call){
    var query = `INSERT OR IGNORE INTO call_report_demo_${this.extensionId}`
    query += " (party_id, session_id, customer_number, customer_name, agent_number, direction, call_timestamp, "
    query += "ring_timestamp, connect_timestamp, disconnect_timestamp, call_hold_duration, "
    query += "hold_count, call_action)"
    query += ` VALUES ('${call.partyId}',`
    query += `'${call.sessionId}',`
    query += `'${call.customerNumber}',`
    query += `'${call.customerName}',`
    query += `'${call.agentNumber}',`
    query += `'${call.direction}',`
    query += `${call.callTimestamp},`
    query += `${call.ringTimestamp},`
    query += `${call.connectTimestamp},`
    query += `${call.disconnectTimestamp},`
    query += `${call.callHoldDurationTotal},`
    query += `${call.holdCount},`
    query += `'${call.callAction}')`

    db.run(query, function(err, result) {
      if (err){
        console.error(err.message);
      }else{
        console.log("updateCallReportTable DONE");
      }
    });
  }
};

module.exports = EventHandler;
