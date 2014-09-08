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
//var request = require('corslite')
var VectorTile = require('vector-tile')
var config = require('./config.json')
//var zlibjs = require('zlibjs')
var tileUrl = 'https://a.tiles.mapbox.com/v4/mapbox.mapbox-streets-v6-dev/{z}/{x}/{y}.vector.pbf?access_token='+config.token;

var playerZoom = 25;
var startLon = -77.036388;
var startLat = 38.900646;
var startingPosition = tilebelt.pointToTile(startLon, startLat, playerZoom);

module.exports = function(opts, setup) {
  setup = setup || defaultSetup
  var defaults = {
    generate: function(x,y,z){
      if(y === 0){
        return 1
      } else{
        return 0
      }
    },
    chunkDistance: 2,
    chunkSize: 16,
    materials: ['#fff', '#000'],
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
  var avatar = createPlayer(opts.playerSkin || 'koala.png')
  avatar.possess()
  avatar.yaw.position.set(0, 5, 0)

  setup(game, avatar)
  getVectorTileFeatures(function(){
    console.log('OK')
  })
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

function getVectorTileFeatures(done){
  var position = {};
  position.x = Math.round(game.controls.target().position.x)+startingPosition[0];
  position.z = Math.round(game.controls.target().position.z)+startingPosition[1];
 
  //get parent twice to go from z17 to z15
  var tileToLoad = [position.x, position.z, playerZoom]
  while(tileToLoad[2] > 15){
    tileToLoad = tilebelt.getParent(tileToLoad);
  }

  var url = 'http://127.0.0.1:3000/'+tileToLoad[0]
  url += '/'+tileToLoad[1]
  url += '/15'
  console.log(url)
  request(url, function(err, vt, body){
    console.log(body)
    done(body)
  })
}








