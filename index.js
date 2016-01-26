var bole = require('bole')
var NumbatEmitter = require('numbat-emitter')
var procfs = require('procfs-stats')
var linuxTCPStates = require('linux-tcp-states')

var DEFAULT_INTERVAL = 1000

var NetstatProducer = module.exports = function (options) {
  var emitter = new NumbatEmitter(options)
  emitter.emit('netstat.monitor.start')

  setInterval(produce, options.interval || DEFAULT_INTERVAL)

  function produceSocketsByState() {
    procfs.tcp(function (err, sockets) {
      if (err) return emitter.metric('netstat.error')

      var states = {}
      sockets.forEach(function (socket) {
        var state = linuxTCPStates[parseInt(socket.st, 16)]
        if (!states[state]) states[state] = 1
        else ++states[state]
      })

      Object.keys(states).forEach(function (state) {
        emitter.metric({
          name: 'sockets.' + state,
          value: states[state]
        })
      })
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
