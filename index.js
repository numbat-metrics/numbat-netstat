'use strict'

var bole = require('bole')
var NumbatEmitter = require('numbat-emitter')
var procfs = require('procfs-stats')
var linuxTCPStates = require('linux-tcp-states')

var DEFAULT_INTERVAL = 1000

var NetstatProducer = module.exports = function (options) {
  var emitter = new NumbatEmitter(options)
  var previousRetransmissions = new Map()

  emitter.metric('sockets.monitor.start')

  setInterval(produce, options.interval || DEFAULT_INTERVAL)

  function produceSocketsByState() {
    procfs.tcp(function (err, sockets) {
      if (err) return emitter.metric('netstat.error')

      var states = {}
      var retransmissions = new Map()

      sockets.forEach(function (socket) {
        var host
        var countForHost
        var state = linuxTCPStates[parseInt(socket.st, 16)]

        if (!states[state]) states[state] = 1
        else ++states[state]

        if (socket.retrnsmt > 0) {
          host = socket.rem_address.split(':')[0]
          countForHost = retransmissions.get(host) || 0
          retransmissions.set(host, countForHost + parseInt(socket.retrnsmt, 10))
        }
      })

      Object.keys(states).forEach(function (state) {
        emitter.metric({
          name: 'sockets.' + state,
          value: states[state]
        })
      })

      for (var value of retransmissions) {
        emitter.metric({
          name: 'sockets.retransmissions.' + value[0],
          value: value[1] - (previousRetransmissions.get(value[0]) || 0)
        })
      }

      previousRetransmissions = retransmissions
    })
  }

  function produce() {
    // What we're looking for is:
    // * sockets by state
    // * bytes in, bytes out (TODO)
    // * retransmissions! (TODO)
    produceSocketsByState()
  }
}
