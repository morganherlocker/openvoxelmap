var cover = require('tile-cover');
var turf = require('turf');
var flatten = require('geojson-flatten')
var normalize = require('geojson-normalize')

var materials = ['#8BA870', '#5E5E5E', '#f5f5dc', '#E8E8E8', '#0ff', '#AD664C', '#99ccff', '#575757', '#4A7023', '#488214', 
'#aaaaaa', '#EEB4B4', '#EEE9E9',// 11-13
'#ffffcc','#e0f2f6','#efe8d5','#e8efd5','#ebe3cb', // 14 - 18
'#5C3317', //19
'#fff', '#f00', //20-21
'#C0C0C0', '#F5F5F5', //22-23
'#f2f8ff' //24
];

function building (fc, start) {
  var voxels = [];
  fc.features.forEach(function(f){
    var color = getRandomInt(14, 18);
    var roofColor = getRandomInt(11, 13);
    var height = getRandomInt(5,10);
    var walls = turf.linestring(f.geometry.coordinates[0]);
    var windowProbablility = getRandomInt(3, 7);
    cover.tiles(walls.geometry, {min_zoom: start[2], max_zoom: start[2]}).forEach(function(tile){
      for(var i=1; i<height; i++){
        if(!(i%3 === 0 && (tile[0]%windowProbablility === 0 || tile[1]%windowProbablility === 0))) 
          voxels.push([tile[0]-start[0], i, tile[1]-start[1], color]);
        else voxels.push([tile[0]-start[0], i, tile[1]-start[1], 24]);
      }
    });
    cover.tiles(f.geometry, {min_zoom: start[2], max_zoom: start[2]}).forEach(function(tile){
        voxels.push([tile[0]-start[0], 0+height, tile[1]-start[1], roofColor]);
    });

    try {
      cover.tiles(turf.buffer(f, -0.001, 'miles').features[0].geometry, {min_zoom: start[2], max_zoom: start[2]}).forEach(function(tile){
          voxels.push([tile[0]-start[0], 1+height, tile[1]-start[1], roofColor]);
      });
    } catch(e){}
    try {
      cover.tiles(turf.buffer(f, -0.002, 'miles').features[0].geometry, {min_zoom: start[2], max_zoom: start[2]}).forEach(function(tile){
          voxels.push([tile[0]-start[0], 2+height, tile[1]-start[1], roofColor]);
      });
    } catch(e){}
    try {
      cover.tiles(turf.buffer(f, -0.003, 'miles').features[0].geometry, {min_zoom: start[2], max_zoom: start[2]}).forEach(function(tile){
          voxels.push([tile[0]-start[0], 3+height, tile[1]-start[1], roofColor]);
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
      voxels.push([tile[0]-start[0], -1, tile[1]-start[1], 7]);
      voxels.push([tile[0]-start[0], 0, tile[1]-start[1], -1]);
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
  var radius = 0.004;
  var units = 'miles';

  var polys = turf.featurecollection(fc.features.map(function(line){
    return turf.buffer(line, radius, units).features[0]
  }))
  polys = normalize(turf.merge(polys));

  polys.features.forEach(function(multipoly){
    // floors
    cover.tiles(multipoly.geometry, {min_zoom: start[2], max_zoom: start[2]}).forEach(function(tile){
      voxels.push([tile[0]-start[0], -5, tile[1]-start[1], 8]);
    });

    // walls
    multipoly.geometry.coordinates.forEach(function(polyCoords){
      polyCoords.forEach(function(ring){
        cover.tiles(turf.linestring(ring).geometry, {min_zoom: start[2], max_zoom: start[2]}).forEach(function(tile){
          for(var i=1; i<5; i++){
            voxels.push([tile[0]-start[0], 0-i, tile[1]-start[1], 20]);
          }
        });
      })
    })
  })

  fc = normalize(fc)
  fc.features.forEach(function(line){
    var first = turf.point(line.geometry.coordinates[0]);
    cover.tiles(first.geometry, {min_zoom: start[2], max_zoom: start[2]}).forEach(function(tile){
      // poll
      for(var i=1; i<4; i++){
        voxels.push([tile[0]-start[0], i, tile[1]-start[1], 20]);
      }
      voxels.push([tile[0]-start[0], 4, tile[1]-start[1], 21]);

      for(var i=1; i<= 7; i++){
        // entrance
        voxels.push([tile[0]-start[0]+i, 0, tile[1]-start[1], -1]);
        voxels.push([tile[0]-start[0]+i, 1, tile[1]-start[1], -1]);
        // rails
        voxels.push([tile[0]-start[0]+i, 1, tile[1]-start[1]+1, 20]);
        voxels.push([tile[0]-start[0]+i, 1, tile[1]-start[1]-1, 20]);
        // steps
        for(var k=1; k<= i; k++){
          voxels.push([tile[0]-start[0]+i, (-6)+k, tile[1]-start[1], 23]);
          voxels.push([tile[0]-start[0]+i, (-6)+k, tile[1]-start[1]+1, 22]);
          voxels.push([tile[0]-start[0]+i, (-6)+k, tile[1]-start[1]-1, 22]);
        }
      }
    });
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
    var sampleNum = Math.round(0.01 * tiles.length);
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
        voxels.push([tile[0]-start[0], i, tile[1]-start[1], 19]);
      }
      //leaves
      for(var j = Math.round(height/3)*(-1); j<=Math.round(height/3); j++) {
        for(var k = Math.round(height/3)*(-1); k<=Math.round(height/3); k++) {
          if(Math.random() > 0.5) voxels.push([tile[0]-start[0]+j, height, tile[1]-start[1]+k, 9]);
          if(Math.random() > 0.2) voxels.push([tile[0]-start[0]+j, height+1, tile[1]-start[1]+k, 9]);
          if(Math.random() > 0.3) voxels.push([tile[0]-start[0]+j, height+2, tile[1]-start[1]+k, 9]);
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