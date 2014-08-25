var zlib = require('zlib');
var Hapi = require('hapi');
var req = require('request');
var VectorTile = require('vector-tile')
var config = require('./config.json');

var server = new Hapi.Server(8081);

server.route({
    method: 'GET',
    path: '/{x}/{y}/{z}',
    handler: function (request, reply) {
        getVectorTile(request.params.x, request.params.y, request.params.z, function(err, vtile){
            if(err){
                reply(err) // TODO: make this a valid error code
            } else {
                reply(vtile)
            }
        });
    }
});

server.start(function () {
    console.log('Server running at:', server.info.uri);
});

function getVectorTile(x,y,z, done){
    var tileUrl = 'https://a.tiles.mapbox.com/v4/mapbox.mapbox-streets-v6-dev/{z}/{x}/{y}.vector.pbf?access_token='+config.token;
    var url = tileUrl.split('{x}').join(position.x);
    url = tileUrl.split('{y}').join(position.z);
    url = tileUrl.split('{z}').join('15');

    var req = request({url: url});

    req.on('response', function(e) {
        if (e.statusCode === 200) {
            req.pipe(zlib.createInflate()).pipe(concat(function(data) {
                var vtile = new mapnik.VectorTile(tileID.z, tileID.x, tileID.y);
                vtile.setData(data);
                vtile.parse();
                console.log(vtile);
                done(null, vtile);
            }));
        } else {
            done(new Error('No data found'))
        }
    });
}