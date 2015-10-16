/**
 * Created by nuintun on 2015/10/16.
 */

'use strict';

var is = require('is');
var pedding = require('pedding');
var Stream = require('stream').Stream;
var through = require('./lib/through');
var duplexer = require('./lib/duplexer');

/**
 * turn switch
 * @param selector
 * @param chunk
 * @returns {*}
 */
function turnSwitch(selector, chunk){
  if (is.fn(selector)) {
    return selector(chunk);
  }

  return selector;
}

/**
 * stream switch
 * @param selector
 * @param cases
 * @param options
 * @returns {Duplexer|*}
 */
module.exports = function (selector, cases, options){
  var flags = [];
  var streams = [];
  options = options || { objectMode: true };
  var output = through(options);

  for (var flag in cases) {
    if (cases.hasOwnProperty(flag)) {
      var stream = cases[flag];

      if (!(stream instanceof Stream))
        throw new TypeError(flag + ' is not a stream');

      streams.push(stream);
      flags.push(flag);
    }
  }

  // stream end when all read ends
  var end = pedding(streams.length + 1, function (){
    output.end();
  });

  streams.forEach(function (stream){
    stream.on('error', function (error){
      output.emit('error', error);
    });
    stream.on('end', end);
    stream.pipe(output, { end: false });
  });

  /**
   * input ---(unmatch)-------->--、
   * `---(caseA)----> streamA --->-、
   * `---(caseB)----> streamB ------> output
   */
  var input = through(function (chunk, encoding, next){
    var flag = turnSwitch(selector, chunk);
    var index = flags.indexOf(flag);

    if (index > -1) {
      streams[index].write(chunk);

      return next();
    }

    this.push(chunk);
    next();
  }, function (next){
    streams.forEach(function (stream){
      stream.end();
    });
    end();
    next();
  });

  input.pipe(output, { end: false });

  return duplexer(options, input, output);
};
module.exports.through = through;
module.exports.duplexer = duplexer;
