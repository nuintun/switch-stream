switch-stream
=========

>A stream condition for switch/case
>
>[![Dependencies][david-image]][david-url]

[david-image]: http://img.shields.io/david/nuintun/switch-stream.svg?style=flat-square
[david-url]: https://david-dm.org/nuintun/switch-stream

### Usage
![switch.png](https://raw.githubusercontent.com/nuintun/switch-stream/master/images/switch.png)

```js
var switchStream = require('switch-stream');

process.in
.pipe(switchStream(function(buf) {
  if (buf > 0) {
    return 'case1';
  } else if (buf < 0) {
    return 'case2'
  }
}, {
  'case1': streamA,
  'case2': streamB
}))
.pipe(process.stdout)
```

If buf great than 0, then pipe to streamA. If buf less than 0, then pipe to streamB. Otherwise buf equal to 0, pipe to output directly.

### API
#### switchStream(switch, cases, options)

- switch
  
  Switch condition determine which case will be choose.
  Switch can be any type, if switch is function, it will be called.

- cases
  
  Choose which stream will be piped to by key switch return.
  
- options
    
  The stream options settings.

### Reference
Modify from popomore's [stream-switch](https://github.com/popomore/stream-switch), but use stream3.
