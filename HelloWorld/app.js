"use strict";

// bugbug use require

// https://en.wikipedia.org/wiki/Web_Mercator
// http://mike.teczno.com/notes/osm-us-terrain-layer/foreground.html
// https://www.mapbox.com/blog/3d-terrain-threejs/

// bugbug feature detect webgl, fetch, web workers

document.addEventListener("DOMContentLoaded", init); // initialization

var canvas = null;		// the canvas we are rendering the map into
var ctx = null;			// the output canvas to render to

var frameCounter = 0;	// the frame being rendered in the output canvas

var worker = null;		// the background worker that'll update the data to draw in the canvas

var above = new Point(166, 355);	// the point on the map we are currently above
//var above = new Point(2, 2);	// the point on the map we are currently above

const projectionDimension = 256;	// Web Mercator is 256 x 256 tiles

const tileDimension = 256;	// Tiles are 256 x 256 pixels

var needToRender = true;

var cachedTiles = [];

function getTileId(x, y) {
	return x + y * tileDimension;
}

function makeTile(x, y, image) {
	return {
		id: getTileId(x, y),
		x: x,
		y: y,
		image: image
	};
}

function checkId(tile) {
	return tile.id == this;
}

function getTile(x, y) {
	// bugbug enforce [0 - 256][0 - 256]
	const id = getTileId(x, y);

	var tile = cachedTiles.find(checkId, id);

	if (tile === undefined) {
		if (cachedTiles.length > 1000) {
			cachedTiles.shift();
		}

			var tile = makeTile(x, y, null);
			cachedTiles.push(tile);

			console.log('requesting ' + x + ' ' + y);

			//const url = 'https://tile.mapzen.com/mapzen/terrain/v1/terrarium/10/' + x + '/' + y + '.png?api_key=mapzen-JcyHAc8'

			const url = 'http://tile.stamen.com/terrain/10/'+x+'/'+y+'.png'
			fetch(url)
				.then(response => response.blob())
				.then(blob => createImageBitmap(blob))
				.then(image => tile.image = image)


		

		return null;
	}
	else {
		if (null == tile.image) {
			//console.log('Found ...... tile! cache size = ' + cachedTiles.length);
			return null;

		}
		else {
			//console.log('Found cached tile! cache size = ' + cachedTiles.length);
			return tile;
		}
	}
}

function onFrame() {

	if (needToRender === false) { }

	//BUGBUG only render if needed

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	//above.x = 2;
	//above.y = 2;

	{

		ctx.save();

		const tileCount = (canvas.width / tileDimension) + 1; // How many tiles should we draw? (1024 / 256 == 4 tiles, + buffer)
		const halfTileCount = tileCount / 2; // How many tiles should we draw? (1024 / 256 == 4 tiles, + buffer)

		{

		}

		const translateX = (above.x - halfTileCount) * tileDimension;
		const translateY = (above.y - halfTileCount) * tileDimension;
		ctx.translate(-translateX, -translateY);

		const lowerX = Math.floor(above.x - halfTileCount);
		const lowerY = Math.floor(above.y - halfTileCount);

		for (var y = lowerY; y <= lowerY + tileCount; y++) {
			for (var x = lowerX; x <= lowerX + tileCount; x++) {

				var text = 'blank';

				const tile = getTile(x, y);
				if (null == tile) {
					text = 'no cached tile';
				}
				else {
					ctx.drawImage(tile.image, x * tileDimension, y * tileDimension);
					/*
					ctx.save();
					ctx.beginPath();
					ctx.rect(x * tileDimension, y * tileDimension, tileDimension, tileDimension);
                	ctx.stroke();
					ctx.restore();
					*/

				}

				//ctx.fillText(text + ' ' + x + ' , ' + y, x * tileDimension + (tileDimension / 2), y * tileDimension + (tileDimension / 2));
			}

		}

		ctx.restore();

	}

	ctx.fillText(above.x + ' ' + above.y + ' ' + frameCounter, 10, 10);

	//ctx.rect(628, 628, 36, 36);
	//ctx.stroke();



	/*
		if (worker.needsWork == true)
		{
			worker.postMessage('Hello World ' + frameCounter); // Send data to our worker.
			worker.needsWork = false;
		}
	*/
	// Start exit
	frameCounter++;

	needToRender = false;
	window.requestAnimationFrame(onFrame);
}

function panningUpdate(point) {

	//above 100, 200

	//below 400
	const scale = tileDimension; //canvas.width / ;  //bugbug should be based on canvas size / tile dimension?

	above.x += point.x / scale; // minus, as we are panning BUGBUG move to Panning.js?
	above.y += point.y / scale; // BUGBUG convert point to a true object

	//console.log(above.x + '    ' + above.y);

	needToRender = true;
}

function onWindowResize()
{
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	console.log(canvas.width + ' <<<>>> ' + canvas.height);
}

function init() {
	canvas = document.getElementById('outputCanvas');
	ctx = canvas.getContext('2d');

    window.addEventListener("resize", onWindowResize);
    onWindowResize();

	Panning.init(canvas, panningUpdate);
	/*
		worker = new Worker('worker.js');
		worker.needsWork = true;
	
		worker.addEventListener('message', function(e) {
			console.log('Worker said: ', e.data + 'current frame = ' + above.x + ' ' + above.y + ' '+ frameCounter);
			worker.needsWork = true;
		}, false);
	*/
	onFrame();
}