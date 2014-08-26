var request = require('request');
var VectorTile = require('vector-tile').VectorTile
var Protobuf = require('pbf')
var fs = require('fs')
var zlib = require('zlib')
var mapnik = require('mapnik')
var concat = require('concat-stream')
var config = require('./config.json');
var url = 'https://a.tiles.mapbox.com/v4/mapbox.mapbox-streets-v6-dev/15/9371/12534.vector.pbf?access_token='+config.token

var x = '9371'
var y = '12534'
var z = '15'



request({url: url, encoding: null}, function(error, response, body) {
    if(error) console.log(error)
    if (!error && response.statusCode >= 200 && response.statusCode < 300) {
        var ab = new ArrayBuffer(body.length);
        var view = new Uint8Array(ab);
        for (var i = 0; i < body.length; ++i) {
            view[i] = body[i];
        }
        console.log(body)
        //console.log(view)
        zlib.gunzip(body, function(err, inflated){
            console.log(err)
            fs.writeFileSync('./cache/'+x+'-'+y+'-'+z+'.vector.pbf', inflated)
            //var data = fs.readFileSync('./cache/9371-12534-15.vector.pbf')
            //var data = fs.readFileSync('./cache/14-8801-5371.vector.pbf')

            var vt = new VectorTile(new Protobuf(inflated))
            console.log(vt.layers.building.feature(0).loadGeometry())
        })
    } else {
        console.log('SERVER FAIL')
    }
});

/*
var req = request(options);

req.on('response', function(e) {
    console.log('GOT RESPONSE')
    if (e.statusCode === 200) {
        req.pipe(zlib.createInflate()).pipe(concat(function(data) {
            console.log('MADE IT')
            var vtile = new mapnik.VectorTile(tileID.z, tileID.x, tileID.y);
            vtile.setData(data);
            vtile.parse();
            console.log(JSON.stringify(tileID) + " : " + data.length + " bytes");
            //return callback(null);
        }));
    } else {
        console.log()('No data')
    }
});*/

/*
req({url: url}, function(err, data, body){
    console.log('err', err)
    fs.writeFileSync('./cache/'+x+'-'+y+'-'+z+'.vector.pbf', body)
    //var body = fs.readFileSync('./cache/14-8801-5371.vector.pbf')
    //console.log('body', body)
    //console.log(body)
    zlib.inflate(body, function(err, inflated){
    	console.log(err)
    	var pbf = new Protobuf(zlib.inflate(inflated))
    	var vt = new VectorTile(pbf)
    })
    
})*/