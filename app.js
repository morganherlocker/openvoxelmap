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
    var url = tileUrl.split('{x}').join(x);
    url = url.split('{y}').join(y);
    url = url.split('{z}').join(z);
    console.log('x',x)
    console.log('y',y)
    console.log('z',z)
    console.log(url)

    req(url, function(err, data, body){
        console.log('err', err)
        fs.writeFileSync('./cache/'+x+'-'+y+'-'+z+'.vector.pbf', body, 'utf8')
        var body = fs.readFileSync('./cache/14-8801-5371.vector.pbf')
        //console.log('body', body)
        var pbf = new Protobuf(body)
        var vt = new VectorTile(pbf)
        console.log('vt', vt)
    })
     /* var req = Request({url: url});

  req.on('response', function(e) {
        if (e.statusCode === 200) {
            req.pipe(zlib.createInflate()).pipe(concat(function(data) {
                var vtile = new VectorTile(z, x, y);
                vtile.setData(data);
                vtile.parse();
                console.log(vtile);
                done(null, vtile);
            }));
        } else {
            done(new Error('No data found'))
        }
    });*/
}