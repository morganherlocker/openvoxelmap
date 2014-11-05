voxel-openstreetmap
===================

Work in progress implementation of https://gist.github.com/morganherlocker/dab817600918f7e32407

The general idea is to create a walkable voxel openstreetmap world at ~1 meter resolution.


#Process
```sh
# DC
node process/process.js --bbox=-77.03665316104889,38.90377902232378,-77.0346200466156,38.90565756719343 

# larger DC
node process/process.js --bbox=-77.05329895019531,38.89664427352471,-77.02325820922852,38.91634762833962

# charleston, sc
node process/process.js --bbox=-79.93553102016449,32.773496033412975,-79.93417918682098,32.77452442019409

# charleston large
node process/process.js --bbox=-79.9365234375,32.77212032198862,-79.9306869506836,32.776811185047144
```

#running

```sh
git clone https://github.com/morganherlocker/voxel-openstreetmap.git
cd voxel-openstreetmap
```

create a config.json file that looks like this:

```json
{
	"token": "<my mapbox gl token>"
}
```

```sh
npm install
```

```sh
npm start
```

```sh
npm run serve
```

open your browser to 127.0.0.1:8080