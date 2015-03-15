var createGame = require('voxel-engine')
var highlight = require('voxel-highlight')
var player = require('voxel-player')
var voxel = require('voxel')
var extend = require('extend')
var fly = require('voxel-fly')
var walk = require('voxel-walk')
var tilebelt = require('tilebelt')
var cover = require('tile-cover')
var request = require('browser-request')
var VectorTile = require('vector-tile')
var Protobuf = require('pbf');
var turf = require('turf')

var tileUrl = 'https://b.tiles.mapbox.com/v4/mapbox.mapbox-streets-v6/{z}/{x}/{y}.vector.pbf?access_token=pk.eyJ1IjoibW9yZ2FuaGVybG9ja2VyIiwiYSI6Ii1zLU4xOWMifQ.FubD68OEerk74AYCLduMZQ';
var playerZoom = 24;

var start = 
[-77.04496532678604,
          38.91961359883852]

var startLon = start[0]
var startLat = start[1]
var startingPosition = tilebelt.pointToTile(startLon, startLat, playerZoom);

var tileHash = {};

module.exports = function(opts, setup) {
  setup = setup || defaultSetup
  var defaults = {
    generate: function(x,y,z){
      if(tileHash[x+'/'+y+'/'+z]) {
        return tileHash[x+'/'+y+'/'+z]
      } else if(y === 0){
        return 1
      } 
    },
    chunkDistance: 2,
    materials: ['#8BA870', '#AAAAAA', '#f5f5dc', '#E8E8E8', '#0ff'],
    materialFlatColor: true,
    worldOrigin: [0, 0, 0],
    controls: { discreteFire: true }
  }

  opts = extend({}, defaults, opts || {})
  var game = createGame(opts)
  var container = opts.container || document.body
  window.game = game 
  game.appendTo(container)
  if (game.notCapable()) return game
  
  var createPlayer = player(game)
  var avatar = createPlayer(opts.playerSkin || 'player.png')
  avatar.possess()
  avatar.yaw.position.set(0, 10, 0)
  game.setBlock([0, 13 , 0], 5)
  game.setBlock([0, 14 , 0], 5)
  game.setBlock([0, 15 , 0], 5)

  setup(game, avatar);
  return game
}

function defaultSetup(game, avatar) {
  var makeFly = fly(game)
  var target = game.controls.target()
  game.flyer = makeFly(target)
  
  // highlight blocks when you look at them, hold <Ctrl> for block placement
  var blockPosPlace, blockPosErase
  var hl = game.highlighter = highlight(game, { color: 0xff0000 })
  hl.on('highlight', function (voxelPos) { blockPosErase = voxelPos })
  hl.on('remove', function (voxelPos) { blockPosErase = null })
  hl.on('highlight-adjacent', function (voxelPos) { blockPosPlace = voxelPos })
  hl.on('remove-adjacent', function (voxelPos) { blockPosPlace = null })

  // toggle between first and third person modes
  window.addEventListener('keydown', function (ev) {
    if (ev.keyCode === 'R'.charCodeAt(0)) avatar.toggle()
  })

  // block interaction stuff, uses highlight data
  var currentMaterial = 1

  game.on('fire', function (target, state) {
    var position = blockPosPlace

    if (position) {
      game.createBlock(position, currentMaterial)
    }
    else {
      position = blockPosErase
      if (position) game.setBlock(position, 0)
    }
  })

  game.on('tick', function() {
    walk.render(target.playerSkin)
    var vx = Math.abs(target.velocity.x)
    var vz = Math.abs(target.velocity.z)
    if (vx > 0.001 || vz > 0.001) walk.stopWalking()
    else walk.startWalking()
  })
}

var startTile = tilebelt.pointToTile(startLon, startLat, 15)
console.log('start', startTile)
getVectorTile(startTile,function(){console.log('complete')})

function getVectorTile(t, done){
    var x = t[0]
    var y = t[1]
    var z = t[2]
    console.log('requesting: %s', x+'/'+y+'/'+z)

    // buildings
    var tileUrl = 'http://tile.openstreetmap.us/vectiles-buildings/{z}/{x}/{y}.json'
    var url = tileUrl.split('{x}').join(x);
    url = url.split('{y}').join(y);
    url = url.split('{z}').join(z);

    var options = {
        url: url,
        encoding: null
    }
    request(options, function(error, response, body) {
        if(error) {
            throw error;
        }
        if (response.statusCode >= 200 && response.statusCode < 300) {
            addBuildings(JSON.parse(body))
        }
    });

    // roads
    var tileUrl = 'http://tile.openstreetmap.us/vectiles-highroad/{z}/{x}/{y}.json'
    var url = tileUrl.split('{x}').join(x);
    url = url.split('{y}').join(y);
    url = url.split('{z}').join(z);

    var options = {
        url: url,
        encoding: null
    }
    request(options, function(error, response, body) {
        if(error) {
            throw error;
        }
        if (response.statusCode >= 200 && response.statusCode < 300) {
            addRoads(JSON.parse(body))
        }
    });
}

function addBuildings(fc) {
    var pixZ = playerZoom
    fc.features.forEach(function(f){
      var tiles = cover.tiles(f.geometry, {min_zoom: pixZ, max_zoom: pixZ})  
      tiles.forEach(function(tile){
        var x =tile[0]-startingPosition[0]
        var y =tile[1]-startingPosition[1]

        for(var i=1; i<6; i++){
          game.setBlock([x, i , y], 3)
          tileHash[x+'/'+i+'/'+y] = 3
        }
      })
    })
}

function addRoads(fc) {
    var pixZ = playerZoom
    fc.features.forEach(function(f){
      f = turf.buffer(f, 0.00278788, 'miles').features[0]
      // draw center of roads
      var tiles = cover.tiles(f.geometry, {min_zoom: pixZ, max_zoom: pixZ})  
      tiles.forEach(function(tile){
        var x =tile[0]-startingPosition[0]
        var y =tile[1]-startingPosition[1]
        game.setBlock([x, 0 , y], 2)
        tileHash[x+'/0/'+y] = 2
      })

      // draw sidewalks
      //console.log(JSON.stringify(turf.linestring(f.geometry.coordinates[0])))
      /*var tiles = cover.tiles(turf.linestring(f.geometry.coordinates[0]).geometry, {min_zoom: pixZ, max_zoom: pixZ})  
      tiles.forEach(function(tile){
        var x = tile[0]-startingPosition[0]
        var y = tile[1]-startingPosition[1]
        game.setBlock([x, 0 , y], 4)
        tileHash[x+'/0/'+y] = 4
      })*/
    })
}