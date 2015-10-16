/**
 * Created by nuintun on 2015/10/16.
 */

'use strict';

var pedding = require('pedding');
var Stream = require('stream').Stream;
var through = require('./lib/through');
var duplexer = require('./lib/duplexer');

/**
 * call switch
 * @param selector
 * @param chunk
 * @returns {*}
 */
function callSwitch(selector, chunk){
  if (typeof selector === 'function') {
    return selector(chunk);
  }

  return selector;
}

/**
 * stream switch
 * @param selector
 * @param cases
 * @returns {Duplexer|*}
 */
module.exports = function (selector, cases){
  var flags = [];
  var streams = [];
  var output = through();

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
  var input = through(function (chunk, enc, callback){
    var flag = callSwitch(selector, chunk);
    var index = flags.indexOf(flag);

    if (index > -1) {
      streams[index].write(chunk);
      return callback();
    }
    this.push(chunk);
    callback();
  }, function (callback){
    streams.forEach(function (stream){
      stream.end();
    });
    end();
    callback();
  });

  input.pipe(output, { end: false });

  return duplexer(input, output);
};
module.exports.through = through;
module.exports.duplexer = duplexer;
