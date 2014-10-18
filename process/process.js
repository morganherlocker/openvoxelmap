var levelup = require('levelup')
var zlib = require('zlib');
var request = require('request');
var VectorTile = require('vector-tile').VectorTile
var concat = require('concat-stream');
var Protobuf = require('pbf')
var fs = require('fs')
var traverse = require('traverse')
var tilebelt = require('tilebelt')
var cover = require('tile-cover')
var bboxPolygon = require('turf-bbox-polygon')
var queue = require('queue-async')
var colors = require('colors');
var log = require('single-line-log').stdout;
var argv = require('minimist')(process.argv.slice(2));
var config = require('../config.json');

var vectorTileZoom = 15;
var zoomEncoding = 20
var bbox = argv.bbox.split(',')
var limits = {min_zoom: zoomEncoding, max_zoom: zoomEncoding};

console.log('Creating database'.green.bold)
var db = levelup(__dirname+'/../data/world')

console.log('Processing bbox: %s'.blue, bbox)

console.log('Calculating z15 tiles'.green.bold)
var tiles = cover.tiles(bboxPolygon(bbox).geometry, {min_zoom: vectorTileZoom, max_zoom: vectorTileZoom});

console.log('Retrieving tiles: %s'.blue, tiles)

var vts = [];
var q = queue(1);
tiles.forEach(function(tile){
    q.defer(function(cb){
        getVectorTile(tile[0], tile[1], tile[2], function(err, vectorTile){
            processVectorTile(vectorTile, tile, function(err, res) {
                //vts.push(res)
                cb();
            })
        })
    })
})
q.awaitAll(function(){
    console.log('Complete'.green.bold.italic)
})

function getVectorTile(x,y,z, done){
    var tileUrl = 'https://a.tiles.mapbox.com/v4/mapbox.mapbox-streets-v6-dev/{z}/{x}/{y}.vector.pbf?access_token='+config.token;
    var url = tileUrl.split('{x}').join(x);
    url = url.split('{y}').join(y);
    url = url.split('{z}').join(z);
    var vtFile = __dirname+'/../cache/'+x+'-'+y+'-'+z+'.vector.pbf'
    var vectorTile;

    // if the file exists, just pull from the cache
    // add a timeout in the future for realtimey stuff
    fs.exists(vtFile, function(vtExists){
        if(!vtExists) {
            console.log('tile not found, requesting: %s'.blue, x+'/'+y+'/'+z)
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
                console.log('tile %s retrieved from cache'.blue,  x+'/'+y+'/'+z)
                done(err, new VectorTile(new Protobuf(vectorTile)));
            });        
        }
    })
}

function processVectorTile(vt, tile, done) {
    var buildings = []
    var numBuldings = vt.layers.building.length

    console.log('Processing buildings in tile %s'.blue, tile.toString())
    var bar = require('progress-bar').create(process.stdout, 80);
    bar.format = '$bar;'.white.bgGreen + ' -- $percentage;%'

    // decode buildings
    for(var i = 0; i < numBuldings; i++) {
        bar.update((i/numBuldings));
        var building = {}
        building.properties = vt.layers.building.feature(i).properties;
        building.geometry = vt.layers.building.feature(i).loadGeometry();

        // convert z15 4096 encoded geometry to WG84 geojson geometry
        traverse(building.geometry).forEach(function(g){
            if(!Array.isArray(g) && typeof g.x === 'number') {
                var topLeft = tile;
                while(topLeft[2] < 27){
                    topLeft = tilebelt.getChildren(topLeft)[0]
                }
                var x = topLeft[0] + g.x
                var y = topLeft[1] + g.y
                var bbox = tilebelt.tileToBBOX([x,y,27])
                var lon = (bbox[0] + bbox[2])/2
                var lat = (bbox[1] + bbox[3])/2
                this.update([lon,lat]);
            }
        });
        building.type = 'Feature'
        building.geometry = {
            type: 'Polygon',
            coordinates: building.geometry
        }

        // try to encode geometry as voxels
        // a z25 cover will be 1.12 meter resolution
        try {
            var voxelTiles = cover.tiles(building.geometry, limits);

            // encode buildings 5 meters tall
            voxelTiles.forEach(function(t){
                for(var y = 1; y < 5; y++) {
                    //console.log(t.toString())
                    db.put(t.toString, 1, function (err) {
                        // tile insert
                    });
                }
            })
        } catch(err) {
            console.log('building failed')
            //console.log('found error in building: %s', JSON.stringify(building));
        }
    }
    done(null, [buildings])
}