'use strict';

var parser5 = require('parse5');
var got = require('got');
var _ = require('lodash');
var pp = require('promisepipe');

function read(uri) {
  if (_.startsWith(uri, 'file://')) {
    return fs.createReadStream(uri);
  } else if (_.startsWith(uri, 'http')) {
    return got(uri);
  } else {
    var Readable = require('stream').Readable;
    var stream = new Readable();
    stream.push(uri);
    stream.push(null);
    return stream;
  }
}

function parseLink(html) {
  var link = [];
  var parser = new parser5.SimpleApiParser({
    startTag: function(name, attrs, selfClosing) {
      if (name === 'link' && attrs) {
        var href = attrs[_.findIndex(attrs, {name: 'href'})];

        if (href && href.value.indexOf('fonts.googleapis.com') !== -1) {
          link.push(href);
        }
      }
    }
  });

  parser.parse(html);

  return link;
}


function parse() {
  var Transform = require('stream').Transform;
  var parser = new Transform({objectMode: true});
  parser._transform = function(data, encoding, done) {
    var str = data.toString('utf8');
    parseLink(str).forEach(function (link) {
      this.push(link);
    }.bind(this));
    done();
  };
  return parser;
}

function fetch() {
  var Transform = require('stream').Transform;
  var stream = new Transform({objectMode: true});
  stream._transform = function(data, encoding, done) {
    got('http:'+ data.value, function(err, data, res) {
      stream.push(data);
      done();
    });
  };
  return stream;
}

function download() {
  var Writable = require('stream').Writable;
  var stream = new Writable({objectMode: true});
  stream._write = function(data, encoding, done) {
    stream.end();
    done();
  };
  return stream;
}


module.exports = {
  get: function(uri) {
    return pp(
      read(uri),
      parse(),
      fetch(),
      download()
    );
  }
}
