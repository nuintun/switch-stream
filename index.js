/**
 * Created by nuintun on 2015/10/16.
 */

'use strict';

var holding = require('holding');
var Stream = require('stream').Stream;
var through = require('@nuintun/through');
var duplexer = require('@nuintun/duplexer');

// to string
var toString = Object.prototype.toString;

/**
 * turn switch
 *
 * @param selector
 * @param chunk
 * @returns {String}
 */
function turnSwitch(selector, chunk) {
  if (toString.call(selector) === '[object Function]') {
    return selector(chunk);
  }

  return selector;
}

/**
 * do write
 *
 * @param stream
 * @param chunk
 * @param next
 */
function doWrite(stream, chunk, next) {
  if (stream.write(chunk)) {
    next();
  } else {
    stream.once('drain', next);
  }
}

/**
 * stream switch
 *
 * @param selector
 * @param cases
 * @param options
 * @returns {Duplexer}
 */
module.exports = function(selector, cases, options) {
  options = options || { objectMode: true };

  var flags = [];
  var streams = [];
  var output = through(options);

  for (var flag in cases) {
    if (cases.hasOwnProperty(flag)) {
      var stream = cases[flag];

      if (!(stream instanceof Stream)) {
        throw new TypeError(flag + ' is not a stream');
      }

      streams.push(stream);
      flags.push(flag);
    }
  }

  // stream end when all read ends
  var end = holding(streams.length - 1, function() {
    output.end();
  });

  // bind events
  streams.forEach(function(stream) {
    stream.on('error', function(error) {
      output.emit('error', error);
    });
    stream.once('end', end);
    stream.pipe(output, { end: false });
  });

  /**
   * input ---(unmatch)-------->--、
   * `---(caseA)----> streamA --->-、
   * `---(caseB)----> streamB ------> output
   */
  var input = through(function(chunk, encoding, next) {
    var flag = turnSwitch(selector, chunk);
    var index = flags.indexOf(flag);

    if (index !== -1) {
      doWrite(streams[index], chunk, next);
    } else {
      doWrite(output, chunk, next);
    }
  }, function(next) {
    streams.forEach(function(stream) {
      stream.end();
    });
    next();
  });

  input.pipe(output, { end: false });

  return duplexer(options, input, output);
};
module.exports.through = through;
module.exports.duplexer = duplexer;
