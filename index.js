var createGame = require('voxel-engine');
var highlight = require('voxel-highlight');
var player = require('voxel-player');
var voxel = require('voxel');
var extend = require('extend');
var fly = require('voxel-fly');
var walk = require('voxel-walk');
var tilebelt = require('tilebelt');
var cover = require('tile-cover');
var request = require('browser-request');
var VectorTile = require('vector-tile').VectorTile;
var Pbf = require('pbf');
var turf = require('turf');
var render = require('./render');

var tileUrl = 'https://b.tiles.mapbox.com/v4/mapbox.mapbox-streets-v6/{z}/{x}/{y}.vector.pbf?access_token=pk.eyJ1IjoibW9yZ2FuaGVybG9ja2VyIiwiYSI6Ii1zLU4xOWMifQ.FubD68OEerk74AYCLduMZQ';
var tileZoom = 15;
var playerZoom = 24;
var tilesLoaded = {};
var start = window.location.search
  .split('?')
  .join('')
  .split('/')
  .map(function(c){return parseFloat(c);});

if(!start[0] || !start[1]) {
  window.location = '/';
}

var startLon = start[0];
var startLat = start[1];
var startTile = tilebelt.pointToTile(startLon, startLat, tileZoom);
var startPlayerTile = tilebelt.pointToTile(startLon, startLat, playerZoom);

var tileHash = {};

module.exports = function(opts, setup) {
  setup = setup || defaultSetup;
  var defaults = {
    generate: function(x,y,z){
      //if(y === 0) return 1
      if(tileHash[x+'/'+y+'/'+z]) {
        if(tileHash[x+'/'+y+'/'+z]>0) return tileHash[x+'/'+y+'/'+z];
        else return 0;
      } else if(y === 0){
        return 1;
      } 
    },
    chunkDistance: 3,
    materials: render.materials,
    materialFlatColor: true,
    worldOrigin: [0, 0, 0],
    controls: { discreteFire: true }
  };

  opts = extend({}, defaults, opts || {});
  var game = createGame(opts);
  var container = opts.container || document.body;
  window.game = game;
  game.appendTo(container);
  if (game.notCapable()) return game;
  
  var createPlayer = player(game);
  var avatar = createPlayer(opts.playerSkin || 'player.png');
  avatar.possess();
  avatar.yaw.position.set(0, 10, 0);
  game.setBlock([0, 13 , 0], 5);
  game.setBlock([0, 14 , 0], 5);
  game.setBlock([0, 15 , 0], 5);

  setup(game, avatar);
  return game;
};

function defaultSetup(game, avatar) {
  var makeFly = fly(game);
  var target = game.controls.target();
  game.flyer = makeFly(target);
  
  // highlight blocks when you look at them, hold <Ctrl> for block placement
  var blockPosPlace, blockPosErase;
  var hl = game.highlighter = highlight(game, { color: 0xff0000 });
  hl.on('highlight', function (voxelPos) { blockPosErase = voxelPos; });
  hl.on('remove', function (voxelPos) { blockPosErase = null; });
  hl.on('highlight-adjacent', function (voxelPos) { blockPosPlace = voxelPos; });
  hl.on('remove-adjacent', function (voxelPos) { blockPosPlace = null; });

  // toggle between first and third person modes
  window.addEventListener('keydown', function (ev) {
    if (ev.keyCode === 'R'.charCodeAt(0)) avatar.toggle();
  });

  // block interaction stuff, uses highlight data
  var currentMaterial = 1;

  game.on('fire', function (target, state) {
    var position = blockPosPlace;

    if (position) {
      game.createBlock(position, currentMaterial);
    }
    else {
      position = blockPosErase;
      if (position) game.setBlock(position, 0);
    }
  });

  game.on('tick', function() {
    //walk.render(target.playerSkin);
    var vx = Math.abs(target.velocity.x);
    var vz = Math.abs(target.velocity.z);
    if (vx > 0.001 || vz > 0.001) walk.stopWalking();
    else walk.startWalking();
  });

  game.voxels.on('missingChunk', function(chunk){
    //console.log(chunk)
  });

  //game.on('renderChunk', function(chunk) {})
}

getVectorTile(startTile, startPlayerTile, function(){console.log('complete');});

function getVectorTile(t, done){
  var x = t[0];
  var y = t[1];
  var z = t[2];
  console.log('requesting: %s', x+'/'+y+'/'+z);


  // select vector tile
  var url = tileUrl.split('{x}').join(x);
  url = url.split('{y}').join(y);
  url = url.split('{z}').join(z);

  getArrayBuffer(url, function(err, data) { 
    var vt = new VectorTile(new Pbf(new Uint8Array(data)));
    var layers = Object.keys(vt.layers);

    layers.forEach(function(layer){
      if(render[layer]) {
        var fc = turf.featurecollection([]);
        for(var i = 0; i < vt.layers[layer].length; i++){
          fc.features.push(vt.layers[layer].feature(i).toGeoJSON(x,y,z));
        }
        var voxels = render[layer](fc, startPlayerTile);
          voxels.forEach(function(v){
            if(tileHash[v[0]+'/'+v[1]+'/'+v[2]] !== -1){
              game.setBlock([v[0], v[1], v[2]], v[3]);
              tileHash[v[0]+'/'+v[1]+'/'+v[2]] = v[3];
            }
          });
      } else console.log(layer);
    });
  });
}

function getArrayBuffer(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onerror = function(e) {
        callback(e);
    };
    xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
            callback(null, xhr.response);
        } else {
            callback(new Error(xhr.statusText));
        }
    };
    xhr.send();
    return xhr;
}