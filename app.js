var zlib = require('zlib');
var Hapi = require('hapi');
var req = require('request');
var VectorTile = require('vector-tile').VectorTile
var concat = require('concat-stream');
var Protobuf = require('pbf')
var fs = require('fs')
var config = require('./config.json');

var server = new Hapi.Server(8081);

server.route({
    method: 'GET',
    path: '/{x}/{y}/{z}',
    handler: function (request, reply) {
        getVectorTile(request.params.x, request.params.y, request.params.z, function(err, vtile){
            if(err){
                reply(err); // TODO: make this a valid error code
            } else {
                reply(vtile);
            }
        });
    }
});

server.start(function () {
    console.log('Server running at:', server.info.uri);
});

function getVectorTile(x,y,z, done){
    var tileUrl = 'https://a.tiles.mapbox.com/v4/mapbox.mapbox-streets-v6-dev/{z}/{x}/{y}.vector.pbf?access_token='+config.token;
    var url = tileUrl.split('{x}').join(x);
    url = url.split('{y}').join(y);
    url = url.split('{z}').join(z);
    var vtFile = './cache/'+x+'-'+y+'-'+z+'.vector.pbf'
    var vectorTile;

    if(!fs.exitsts(vtFile)) {
        var options = {
            url: url,
            encoding: null
        }
        request(options, function(error, response, body) {
            if(error) {
                throw error;
            }
            if (response.statusCode >= 200 && response.statusCode < 300) {
                var ab = new ArrayBuffer(body.length);
                var view = new Uint8Array(ab);
                for (var i = 0; i < body.length; ++i) {
                    view[i] = body[i];
                }
                zlib.gunzip(body, function(err, inflated){
                    fs.writeFile(vtFile, inflated, function(){
                       return new VectorTile(new Protobuf(inflated));
                    });
                });
            }
        });
    } else {
        fs.readFile(vtFile, function(err, vectorTile) {
            return vectorTile;
        });        
    }
}