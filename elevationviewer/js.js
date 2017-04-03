"use strict";

document.addEventListener("DOMContentLoaded", init); // initialization

var ctx = null;			// the output canvas to render to
var frameCounter = 0;	// the frame being rendered in the output canvas

var worker = null;		// the background worker that'll update the data to draw in the canvas

function onFrame() {
	ctx.clearRect(0, 0, 100, 100);
    ctx.fillText(frameCounter, 10, 10);

	if (worker.needsWork == true)
	{
	    worker.postMessage('Hello World ' + frameCounter); // Send data to our worker.
		worker.needsWork = false;
	}

	// Start exit
	frameCounter++;
	window.requestAnimationFrame(onFrame);
}

function panningUpdate(point)
{
	console.log (point.x + '    ' + point.y);
}

function init() {
	var canvas = document.getElementById('outputCanvas');
	
	ctx = canvas.getContext('2d');

	Panning.init(canvas, panningUpdate);

    worker = new Worker('worker.js');
	worker.needsWork = true;

	worker.addEventListener('message', function(e) {
		console.log('Worker said: ', e.data + 'current frame = ' + frameCounter);
		worker.needsWork = true;
	}, false);

	onFrame();
}