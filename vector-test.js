var url = 'https://a.tiles.mapbox.com/v4/mapbox.mapbox-streets-v6-dev/15/9371/12534.vector.pbf?access_token=pk.eyJ1IjoibW9yZ2FuaGVybG9ja2VyIiwiYSI6Ii1zLU4xOWMifQ.FubD68OEerk74AYCLduMZQ'
var req = require('request');
var VectorTile = require('vector-tile').VectorTile
var Protobuf = require('pbf')
var fs = require('fs')
var zlib = require('zlib')

var config = require('./config.json');

var x = '9371'
var y = '12534'
var z = '15'

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
    
})