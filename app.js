var levelup = require('levelup');
var zlib = require('zlib');
var Hapi = require('hapi');
var fs = require('fs');
var config = require('./config.json');
var zoomEncoding = 27
var server = new Hapi.Server(3000);
var db = levelup(__dirname+'/../data/world');

server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
        reply.file('index.html')
    }
});

server.route({ 
    method : 'GET',
    path : '/public/{path*}',
    handler: {
        directory: { path: './world', listing: false, index: true }
    }
});

server.route({
    method: 'GET',
    path: '/{x}/{y}/{z}',
    handler: function (request, reply) {
        console.time('vt')
        db.get(request.params.x+'/'+request.params.y+'/'+request.params.z, function (err, value) {
            console.timeEnd('vt')
            if (err) return console.log(err) // likely the key was not found
            return result;
      });
    }
});

server.start(function () {
    console.log('Server running at:', server.info.uri);
});
