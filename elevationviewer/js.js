"use strict";

document.addEventListener("DOMContentLoaded", init); // initialization

var canvas = null;		// the canvas we are rendering the map into
var ctx = null;			// the output canvas to render to

var frameCounter = 0;	// the frame being rendered in the output canvas

var worker = null;		// the background worker that'll update the data to draw in the canvas

var above = new Point(166, 355);	// the point on the map we are currently above
//var above = new Point(2, 2);	// the point on the map we are currently above

const tileDimension = 256;	// Tiles are 256 x 256 pixels

var needToRender = true;

function onFrame() {

	if (needToRender === false) { }

	//BUGBUG only render if needed

	ctx.clearRect(0, 0, canvas.width, canvas.height, 100);

	//above.x = 2;
	//above.y = 2;

	{

		ctx.save();

		const tileCount = (canvas.width / tileDimension); // How many tiles should we draw? (1024 / 256 == 4 tiles, + buffer)
		const halfTileCount = tileCount / 2; // How many tiles should we draw? (1024 / 256 == 4 tiles, + buffer)

		{

		}
		const translateX = (above.x - halfTileCount) * tileDimension;
		const translateY = (above.y - halfTileCount) * tileDimension;

		ctx.translate(-translateX, -translateY);

		const lowerX = Math.floor(above.x - halfTileCount);
		const lowerY = Math.floor(above.y - halfTileCount);

		for (var y = lowerY; y < lowerY + tileCount; y++) {
			for (var x = lowerX; x < lowerX + tileCount; x++) {
				ctx.fillText(x + ' , ' + y, x * tileDimension + (tileDimension / 2), y * tileDimension + (tileDimension / 2));
			}

		}

		ctx.restore();

	}
	ctx.fillText(above.x + ' ' + above.y + ' ' + frameCounter, 10, 10);

	ctx.rect(628, 628, 36, 36);
	ctx.stroke();



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

	console.log(above.x + '    ' + above.y);

	needToRender = true;
}

function init() {
	canvas = document.getElementById('outputCanvas');

	ctx = canvas.getContext('2d');

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