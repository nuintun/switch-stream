/**
 * @module index
 * @license MIT
 * @version 2017/11/13
 */

'use strict';

const holding = require('holding');
const Stream = require('stream').Stream;
const through = require('@nuintun/through');
const duplexer = require('@nuintun/duplexer');

// Object toString
const toString = Object.prototype.toString;

/**
 * @function turnSwitch
 * @param {Function|string} selector
 * @param {any} chunk
 * @returns {string}
 */
function turnSwitch(selector, chunk) {
  if (toString.call(selector) === '[object Function]') {
    return selector(chunk);
  }

  return selector;
}

/**
 * @function doWrite
 * @param {Stream} stream
 * @param {any} chunk
 * @param {Function} next
 */
function doWrite(stream, chunk, next) {
  if (stream.write(chunk)) {
    next();
  } else {
    stream.once('drain', next);
  }
}

/**
 * @function streamSwitch
 * @param {Function|string} selector
 * @param {Object} cases
 * @param {Object} options
 * @returns {Duplexer}
 */
module.exports = function(selector, cases, options) {
  options = options || { objectMode: true };

  const flags = [];
  const streams = [];
  const output = through(options);

  for (let flag in cases) {
    if (cases.hasOwnProperty(flag)) {
      let stream = cases[flag];

      if (!(stream instanceof Stream)) {
        throw new TypeError(flag + ' is not a stream');
      }

      streams.push(stream);
      flags.push(flag);
    }
  }

  // Stream end when all read ends
  const end = holding(streams.length - 1, () => {
    output.end();
  });

  // Bind events
  streams.forEach((stream) => {
    stream.on('error', (error) => {
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
  const input = through((chunk, encoding, next) => {
    const flag = turnSwitch(selector, chunk);
    const index = flags.indexOf(flag);

    if (index !== -1) {
      doWrite(streams[index], chunk, next);
    } else {
      doWrite(output, chunk, next);
    }
  }, (next) => {
    streams.forEach((stream) => {
      stream.end();
    });
    next();
  });

  input.pipe(output, { end: false });

  return duplexer(options, input, output);
};
module.exports.through = through;
module.exports.duplexer = duplexer;
