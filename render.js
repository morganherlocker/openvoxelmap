var cover = require('tile-cover');
var turf = require('turf');

var materials = ['#8BA870', '#5E5E5E', '#f5f5dc', '#E8E8E8', '#0ff', '#AD664C', '#99ccff', '#575757', '#4A7023', '#488214', '#aaaaaa',
'#ffffcc','#e0f2f6','#efe8d5','#e8efd5','#ebe3cb' // 12 - 16
];

function building (fc, start) {
  var voxels = [];
  fc.features.forEach(function(f){
    var color = getRandomInt(12, 16);
    var height = getRandomInt(5,10);
    var walls = turf.linestring(f.geometry.coordinates[0]);
    cover.tiles(walls.geometry, {min_zoom: start[2], max_zoom: start[2]}).forEach(function(tile){
      for(var i=1; i<height; i++){
        voxels.push([tile[0]-start[0], i, tile[1]-start[1], color]);
      }
    });
    cover.tiles(f.geometry, {min_zoom: start[2], max_zoom: start[2]}).forEach(function(tile){
        voxels.push([tile[0]-start[0], 0+height, tile[1]-start[1], 11]);
    });

    try {
      cover.tiles(turf.buffer(f, -0.001, 'miles').features[0].geometry, {min_zoom: start[2], max_zoom: start[2]}).forEach(function(tile){
          voxels.push([tile[0]-start[0], 1+height, tile[1]-start[1], 11]);
      });
    } catch(e){}
    try {
      cover.tiles(turf.buffer(f, -0.002, 'miles').features[0].geometry, {min_zoom: start[2], max_zoom: start[2]}).forEach(function(tile){
          voxels.push([tile[0]-start[0], 2+height, tile[1]-start[1], 11]);
      });
    } catch(e){}
    try {
      cover.tiles(turf.buffer(f, -0.003, 'miles').features[0].geometry, {min_zoom: start[2], max_zoom: start[2]}).forEach(function(tile){
          voxels.push([tile[0]-start[0], 3+height, tile[1]-start[1], 11]);
      });
    } catch(e){}
  });
  return voxels;
}

function water (fc, start) {
  var voxels = [];
  fc.features.forEach(function(f){
    var tiles = cover.tiles(f.geometry, {min_zoom: start[2], max_zoom: start[2]});
    tiles.forEach(function(tile){
      voxels.push([tile[0]-start[0], 0, tile[1]-start[1], 7]);
    });
  });
  return voxels;
}

function road (fc, start) {
  var voxels = [];
  fc.features.forEach(function(f){
    f = turf.buffer(f, 0.002, 'miles').features[0];
    cover.tiles(f.geometry, {min_zoom: start[2], max_zoom: start[2]}).forEach(function(tile){
      voxels.push([tile[0]-start[0], 0, tile[1]-start[1], 2]);
    });
  });
  return voxels;
}

function bridge (fc, start) {
  var voxels = [];
  fc.features.forEach(function(f){
    f = turf.buffer(f, 0.001, 'miles').features[0];
    cover.tiles(f.geometry, {min_zoom: start[2], max_zoom: start[2]}).forEach(function(tile){
      voxels.push([tile[0]-start[0], 1, tile[1]-start[1], 6]);
    });
  });
  return voxels;
}

function tunnel (fc, start) {
  var voxels = [];
  var radius = 0.003;
  var units = 'miles';
  fc.features.forEach(function (line){
    var lineBuffers = turf.featurecollection([]);
    //break line into segments
    var segments = [];
    for(var i = 0; i < line.geometry.coordinates.length-1; i++) {
      segments.push([line.geometry.coordinates[i], line.geometry.coordinates[i+1]]);
    }

    for(var i = 0; i < segments.length; i++) {
      var bottom = turf.point([segments[i][0][0], segments[i][0][1]]);
      var top = turf.point([segments[i][1][0], segments[i][1][1]]);

      var direction = turf.bearing(bottom, top);

      var bottomLeft = turf.destination(bottom, radius, direction - 90, units);
      var bottomRight = turf.destination(bottom, radius, direction + 90, units);
      var topLeft = turf.destination(top, radius, direction - 90, units);
      var topRight = turf.destination(top, radius, direction + 90, units);

      var poly = turf.polygon([[
          bottomLeft.geometry.coordinates, 
          topLeft.geometry.coordinates,
          topRight.geometry.coordinates, 
          bottomRight.geometry.coordinates,
          bottomLeft.geometry.coordinates,
        ]]);
      var leftLine = turf.linestring([
          bottomLeft.geometry.coordinates, 
          topLeft.geometry.coordinates
        ]);
      var rightLine = turf.linestring([
          bottomRight.geometry.coordinates, 
          topRight.geometry.coordinates
        ]);

      cover.tiles(poly.geometry, {min_zoom: start[2], max_zoom: start[2]}).forEach(function(tile){
        voxels.push([tile[0]-start[0], 5, tile[1]-start[1], 8]);
      });
      cover.tiles(rightLine.geometry, {min_zoom: start[2], max_zoom: start[2]}).forEach(function(tile){
        for(var i=1; i<5; i++){
          voxels.push([tile[0]-start[0], i, tile[1]-start[1], 8]);
        }
      });
      cover.tiles(leftLine.geometry, {min_zoom: start[2], max_zoom: start[2]}).forEach(function(tile){
        for(var i=1; i<5; i++){
          voxels.push([tile[0]-start[0], i, tile[1]-start[1], 8]);
        }
      });
    }
  });

  return voxels;
}

function landuse (fc, start) {
  var voxels = [];
  fc.features.forEach(function(f){
    var tiles = cover.tiles(f.geometry, {min_zoom: start[2], max_zoom: start[2]});
    tiles.forEach(function(tile){
      voxels.push([tile[0]-start[0], 0, tile[1]-start[1], 10]);
    });

    // add a tree on randomly sampled tiles
    var sampleNum = Math.round(0.005 * tiles.length);
    var shuffledTiles = tiles.slice(0), i = tiles.length, min = i - sampleNum, temp, index;
    while (i-- > min) {
        index = Math.floor((i + 1) * Math.random());
        temp = shuffledTiles[index];
        shuffledTiles[index] = shuffledTiles[i];
        shuffledTiles[i] = temp;
    }
    var tileSamples = shuffledTiles.slice(min);
    tileSamples.forEach(function(tile){
      // trunk
      var height = getRandomInt(3,7);
      for(var i=1; i<height; i++){
        voxels.push([tile[0]-start[0], i, tile[1]-start[1], 6]);
      }
      //leaves
      for(var j = Math.round(height/3)*(-1); j<=Math.round(height/3); j++) {
        for(var k = Math.round(height/3)*(-1); k<=Math.round(height/3); k++) {
          voxels.push([tile[0]-start[0]+j, height, tile[1]-start[1]+k, 9]);
          voxels.push([tile[0]-start[0]+j, height+1, tile[1]-start[1]+k, 9]);
          voxels.push([tile[0]-start[0]+j, height+2, tile[1]-start[1]+k, 9]);
        }
      }
    });
  });
  return voxels;
}

module.exports = {
  building: building,
  water: water,
  road: road,
  bridge: bridge,
  tunnel: tunnel,
  landuse: landuse,
  materials: materials
};


function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}