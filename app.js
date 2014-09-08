var zlib = require('zlib');
var Hapi = require('hapi');
var request = require('request');
var VectorTile = require('vector-tile').VectorTile
var concat = require('concat-stream');
var Protobuf = require('pbf')
var fs = require('fs')
var traverse = require('traverse')
var config = require('./config.json');

var server = new Hapi.Server(8081);

server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
        reply.file('index.html')
    }
});

server.route({ 
    method : 'GET',
    path : '/world/{path*}',
    handler: {
        directory: { path: './world', listing: false, index: true }
    }
});

server.route({
    method: 'GET',
    path: '/{x}/{y}/{z}',
    handler: function (request, reply) {
        console.time('vt')
        getVectorTile(request.params.x, request.params.y, request.params.z, function(err, vectorTile){
            processVectorTile(vectorTile, [request.params.x, request.params.y, request.params.z], function(err, res) {
                console.timeEnd('vt')
                if(err){
                    reply(err); // TODO: make this a valid error code
                } else {
                    reply(res);
                }
            });
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

    // if the file exists, just pull from the cache
    // add a timeout in the future for realtimey stuff
    fs.exists(vtFile, function(vtExists){
        if(!vtExists) {
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
                           done(null, new VectorTile(new Protobuf(inflated)));
                        });
                    });
                }
            });
        } else {
            fs.readFile(vtFile, function(err, vectorTile) {
                console.log('getting cache')
                done(err, new VectorTile(new Protobuf(vectorTile)));
            });        
        }
    })
}

function processVectorTile(vt, tile, done) {
    var buildings = []
    var numBuldings = vt.layers.building.length
    for(var i = 0; i < numBuldings; i++) {
        var building = {}
        building.properties = vt.layers.building.feature(i).properties;
        building.geometry = vt.layers.building.feature(i).loadGeometry();
        traverse(building.geometry).forEach(function(g){
            if(!Array.isArray(g) && g.x) {
                //console.log(g)
                var x = tile[0] + (g.x / 4096)
                var y = tile[1] + (g.y / 4096)
                this.update([x,y]);
            }
        });
        buildings.push(building)
    }
    done(null, [buildings])
}
