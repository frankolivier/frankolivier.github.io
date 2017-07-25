'use strict';

window.onload = main;	// Startup

// Point object (-1 to 1 range)
function Point(x, y) {
	if (x < -1) x = -1;
	if (y < -1) y = -1;
	if (x > 1) x = 1;
	if (y > 1) y = 1;

	this.x = x;
	this.y = y;
}

function Move(point) { // a new manipulation
	this.point1 = new Point(point.x, point.y);
	this.point2 = new Point(point.x, point.y);

	this.move = function (point) {
		this.point2.x = point.x;
		this.point2.y = point.y;
	}

}

var renderer = new function () {

	var gl;                 // Handle to the context
	var lineprogram;        // Handle to GLSL program that draws lines
	var pictureprogram;     // Handle to GLSL program that draws a picture

	this.texCoordLocation;
	this.texCoordLocation2;

	this.texCoordBuffer;
	this.texCoordBuffer2;

	var moves = new Array;
	var MAXMOVES = 8;
	var currentMove = 0;

	var resolution = 20; // resolution of the mesh

	this.init = function () {
		// Get a context
		var canvas = document.getElementById("webglcanvas");

		try {
			// use antialias:false to make lines more visible
			var gl = this.gl = canvas.getContext("experimental-webgl", { antialias: false, preserveDrawingBuffer: true });
		}
		catch (e) {
			// Workaround for Firefox issue
		}

		if (!this.gl) { document.getElementById("DemoIntroduction").style.display = "block"; return; }

		// Set the viewport size
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;


		// Load the GLSL programs
		try {
			this.lineprogram = loadProgram(gl, getShader(gl, "2d-vertex-shader"), getShader(gl, "black"));
			gl.useProgram(this.lineprogram);

			// look up where the vertex data needs to go.
			this.texCoordLocation2 = gl.getAttribLocation(this.lineprogram, "a_texCoord");
			// provide texture coordinates for the rectangle.
			this.texCoordBuffer2 = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer2);
			// Make a 0,0 to 1,1 triangle mesh, using n = resolution steps

			var q = 0.001; // a fudge factor to ensure that the wireframe lines are rendered inside the canvas boundary

			var r = (1 - q * 2) / resolution;
			var c = new Float32Array(resolution * resolution * 20); //resolution * resolution squares; square = 5 lines; lines = 2 coordinates; coordinate = 2 numbers

			var i = 0;

			for (var xs = 0; xs < resolution; xs++) {
				for (var ys = 0; ys < resolution; ys++) {

					var x = r * xs + q;
					var y = r * ys + q;

					c[i++] = x;
					c[i++] = y;
					c[i++] = x + r;
					c[i++] = y;

					c[i++] = x;
					c[i++] = y + r;
					c[i++] = x + r;
					c[i++] = y;

					c[i++] = x;
					c[i++] = y + r;
					c[i++] = x + r;
					c[i++] = y + r;

					c[i++] = x;
					c[i++] = y;
					c[i++] = x;
					c[i++] = y + r;

					c[i++] = x + r;
					c[i++] = y;
					c[i++] = x + r;
					c[i++] = y + r;


				}
			}

			gl.bufferData(gl.ARRAY_BUFFER, c, gl.STATIC_DRAW);

			gl.enableVertexAttribArray(this.texCoordLocation2);

			gl.vertexAttribPointer(this.texCoordLocation2, 2, gl.FLOAT, false, 0, 0);

		}
		catch (e) {
			log('shader fail');
			return;
		}



		try {
			var vertexshader = getShader(gl, "2d-vertex-shader");
			var fragmentshader = getShader(gl, "2d-fragment-shader");

			this.pictureprogram = loadProgram(gl, vertexshader, fragmentshader);
			gl.useProgram(this.pictureprogram);

			document.getElementById("vertexshadersource").innerText = gl.getShaderSource(vertexshader);
			document.getElementById("fragmentshadersource").innerText = gl.getShaderSource(fragmentshader);


			// look up where the vertex data needs to go.
			this.texCoordLocation = gl.getAttribLocation(this.pictureprogram, "a_texCoord");
			// provide texture coordinates for the rectangle.
			this.texCoordBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);

			var q = 0.001;

			var r = (1 - q * 2) / resolution;
			var c = new Float32Array(resolution * resolution * 12); //2 numbers per coord; three coords per triangle; 2 triagles per square; resolution * resolution squares

			var i = 0;

			for (var xs = 0; xs < resolution; xs++) {
				for (var ys = 0; ys < resolution; ys++) {

					var x = r * xs + q;
					var y = r * ys + q;

					c[i++] = x;
					c[i++] = y;

					c[i++] = x + r;
					c[i++] = y;

					c[i++] = x;
					c[i++] = y + r;

					c[i++] = x + r;
					c[i++] = y;

					c[i++] = x;
					c[i++] = y + r;

					c[i++] = x + r;
					c[i++] = y + r;

				}
			}

			gl.bufferData(gl.ARRAY_BUFFER, c, gl.STATIC_DRAW);

			gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 0, 0);

			gl.enableVertexAttribArray(this.texCoordLocation);

			// Set up uniforms
			this.pictureprogram.u_image = gl.getUniformLocation(this.pictureprogram, "u_image");

			// Set the texture to use
			gl.uniform1i(this.pictureprogram.u_image, 0);

		}
		catch (e) {
			log('shader fail');
			return;
		}

        /*
	    ///////////////////////////////////////////////////////////////////////
	    // look up where the vertex data needs to go.
		var this.texCoordLocation2 = gl.getAttribLocation(program, "a_texCoord");
	    // provide texture coordinates for the rectangle.
		var texCoordBuffer2 = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer2);
	    // Make a 0,0 to 1,1 triangle mesh, using n = resolution steps
		var r = 1 / resolution;

		var rr = 0.005;

		var c = new Float32Array(resolution * resolution * 2 * 3 * 2); //2 numbers per coord; three coords per triangle; 2 triagles per square; resolution * resolution squares
		var i = 0;
		for (var x = 0; x <= 1; x += r) {
		    for (var y = 0; y <= 1; y += r) {
		        c[i++] = x;
		        c[i++] = y;

		        c[i++] = x + rr;
		        c[i++] = y;

		        c[i++] = x;
		        c[i++] = y + rr;

		        c[i++] = x + rr;
		        c[i++] = y;

		        c[i++] = x;
		        c[i++] = y + rr;

		        c[i++] = x + rr;
		        c[i++] = y + rr;

		    }
		}
		gl.bufferData(gl.ARRAY_BUFFER, c, gl.STATIC_DRAW);
		gl.enableVertexAttribArray(this.texCoordLocation2);
		gl.vertexAttribPointer(this.texCoordLocation2, 2, gl.FLOAT, false, 0, 0);
        ////////////////////////////////////////////////////////////////////////
        */

        /*

        */

		this.loadImage();
	}

	this.loadImage = function () {

		var image = new Image();

		image.onload = function () {
			renderer.loadImage2(image);
		}

		image.src = "fo.jpg";

	}

	this.loadImageX = function (dataURL) {
		var image = new Image();

		image.onload = function () {
			renderer.loadImage2(image);
		}

		image.src = dataURL;
	}

	this.loadImage2 = function (image) {

		//convert the image to a square image via the temporary 2d canvas 
		var canvas = document.getElementById("2dcanvas");
		var ctx = canvas.getContext("2d");

		var ll = document.getElementById("2dcanvas").height;

		var x = 0;
		var y = 0;
		var xx = ll;
		var yy = ll;

		ctx.clearRect(0, 0, ll, ll);

		if (image.width < image.height) {
			// change x, xx
			xx = image.width / image.height * ll;
			x = (ll - xx) / 2;
		}
		if (image.width > image.height) {
			// change y, yy
			yy = image.height / image.width * ll;
			y = (ll - yy) / 2;
		}

		ctx.drawImage(image, 0, 0, image.width, image.height, x, y, xx, yy);

		var gl = this.gl;
		var texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);

		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

		// Set the parameters so we can render any size image.
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		// Upload the image into the texture.
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);

		ctx.clearRect(0, 0, ll, ll);

		this.reset();
		//this.render();

	}

	this.modeOff = 0;
	this.modeHint = 1;
	this.modeHint2 = 2;
	this.modeUniform = 3;

	this.canvasMode = this.modeHint;

	this.changeMode = function () {
		if (document.getElementById("showUniforms").checked) {
			this.canvasMode = this.modeUniform;
		}
		else {
			this.canvasMode = this.modeOff;

			var canvas = document.getElementById("2dcanvas");
			var ctx = canvas.getContext("2d");
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		}

	}

	this.render = function () {

		var gl = this.gl;

		var p1 = new Float32Array(MAXMOVES * 2); //x and y
		var p2 = new Float32Array(MAXMOVES * 2); //x and y

		// set up the arrays of uniforms; log
		{
			var index = 0;
			for (var i = 0; i < MAXMOVES; i++) {

				var x1, y1, x2, y2;

				if (moves[i]) {
					x1 = moves[i].point1.x;
					y1 = moves[i].point1.y;
					x2 = moves[i].point2.x;
					y2 = moves[i].point2.y;
				}
				else {
					x1 = 1;
					y1 = 1;
					x2 = 0.9999999;
					y2 = 0.9999999;
				}

				p1[index] = x1;
				p1[index + 1] = y1;
				p2[index] = x2;
				p2[index + 1] = y2;
				index += 2;

			}
		}

		gl.clearColor(1.0, 1.0, 1.0, 0.5);
		gl.clear(this.gl.COLOR_BUFFER_BIT);

		var program;

		// TODO drawElements would be more efficient here

		if (document.getElementById("renderLines").checked) {
			program = this.lineprogram;

			gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer2);

			gl.useProgram(this.lineprogram);

			gl.uniform2fv(gl.getUniformLocation(this.lineprogram, "p1"), p1);
			gl.uniform2fv(gl.getUniformLocation(this.lineprogram, "p2"), p2);

			gl.vertexAttribPointer(this.texCoordLocation2, 2, gl.FLOAT, false, 0, 0);

			gl.enableVertexAttribArray(this.texCoordLocation2);

			gl.drawArrays(gl.LINES, 0, resolution * resolution * 10);
		}
		else {
			program = this.pictureprogram;

			gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);

			gl.useProgram(this.pictureprogram);


			gl.uniform2fv(gl.getUniformLocation(this.pictureprogram, "p1"), p1);
			gl.uniform2fv(gl.getUniformLocation(this.pictureprogram, "p2"), p2);

			gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 0, 0);

			gl.enableVertexAttribArray(this.texCoordLocation);


			gl.drawArrays(gl.TRIANGLES, 0, resolution * resolution * 2 * 3);
		}

		if (this.canvasMode == this.modeHint2) {
			// Draw 'click and drag' instruction
			var canvas = document.getElementById("2dcanvas");
			var ctx = canvas.getContext("2d");

			ctx.clearRect(0, 0, canvas.width, canvas.height);
			this.canvasMode = this.modeOff;
		}

		if (this.canvasMode == this.modeHint) {
			// Draw 'click and drag' instruction
			var canvas = document.getElementById("2dcanvas");
			var ctx = canvas.getContext("2d");

			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.font = '50px Segoe UI';
			ctx.textAlign = 'center';
			ctx.fillStyle = 'red';
			ctx.fillText('click and drag', canvas.width / 2, canvas.height / 2);

			this.canvasMode = this.modeHint2;
		}




		if (this.canvasMode == this.modeUniform) {
			var canvas = document.getElementById("2dcanvas");
			var ctx = canvas.getContext("2d");
			//bugbug - make this faster by caching the previous value and only clearing if needed
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			for (var i = 0; i < MAXMOVES; i++) {
				if (moves[i]) {
					var x1 = (moves[i].point1.x + 1) * canvas.width / 2;
					var y1 = (-moves[i].point1.y + 1) * canvas.height / 2;
					var x2 = (moves[i].point2.x + 1) * canvas.width / 2;
					var y2 = (-moves[i].point2.y + 1) * canvas.height / 2;

					// the raio is used here to show where the pixel started and ended bugbug
					var ratio = 0.3;
					x2 = x1 + (x2 - x1) * ratio;
					y2 = y1 + (y2 - y1) * ratio;

					var radius = 6;

					//ctx.globalAlpha = 0.5;

					ctx.beginPath();

					var grd = ctx.createLinearGradient(x1, y1, x2, y2);
					grd.addColorStop(0, 'pink');
					grd.addColorStop(1, 'red');

					ctx.setLineDash([5, 5]);
					ctx.lineWidth = radius / 2;
					ctx.moveTo(x1, y1);
					ctx.lineTo(x2, y2);
					ctx.strokeStyle = grd;
					ctx.stroke();

					ctx.beginPath();
					ctx.arc(x1, y1, radius, 0, 2 * Math.PI, false);
					ctx.fillStyle = 'pink';
					ctx.fill();

					ctx.beginPath();
					ctx.arc(x2, y2, radius, 0, 2 * Math.PI, false);
					ctx.fillStyle = 'red';
					ctx.fill();




				}
			}
		}

	}

	// (point) is where the 
	this.newMove = function (point) //where the warp starts (-1 to 1 range)
	{
		//currentMove++;
		//currentMove %= MAXMOVES; //Loop back to 0;

		var move = new Move(point);

		moves.unshift(move);

		return move;
	}

	this.reset = function () {
		moves = [];
		this.render();
	}

	this.undo = function () {
		moves.shift();
		this.render();
	}

	this.save = function () {
		var dataURL = document.getElementById("webglcanvas").toDataURL("image/png");

		if (window.navigator.msSaveBlob) {
			var blob = dataURLtoBlob(dataURL);
			window.navigator.msSaveBlob(blob, 'warpedphoto.png');
		}
		else {
			var link = document.createElement("a");
			link.download = 'warpedphoto.jpg';
			link.href = dataURL;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}


	}


}

// getMousePoint
// in - mouse event e
function getMousePoint(e) {
	var x;
	var y;

	if (e.offsetX) {
		x = e.offsetX;
		y = e.offsetY;
	}
	else if (e.layerX) {
		x = e.layerX;
		y = e.layerY;
	}
	else {
		return undefined; //Work around Chrome bugbug
	}

	return normalizedPoint(x, y);
}


var inputHandler = new function () {
	var move; // Pointer to a uniform variable in the renderer object

	this.init = function () {
		var canvas = document.getElementById("2dcanvas");

		canvas.onmousedown = function (e) {
			console.log("onmousedown");
			this.move = renderer.newMove(getMousePoint(e));
		}

		canvas.onmouseup = function (e) {
			console.log("onmouseup");
			this.move = undefined;
			renderer.render();
		}

		canvas.onmouseout = function (e) {
			console.log("onmouseout");
			this.move = undefined;
			renderer.render();
			//move.move(getMousePoint(e));
			/*
			if (bMoving) {

				point2[currentPoint] = getMousePoint(e);
				setVec2PointArray("p2", point2);

				render();

				bMoving = false;

				currentPoint++;
				if (currentPoint == MAXPOINTS) currentPoint = 0;

			}
			*/

		};

		canvas.onmousemove = function (e) {
			console.log("onmousemove");

			var point = getMousePoint(e);

			if (typeof this.move != 'undefined') {
				if (typeof point != 'undefined') {
					this.move.move(point);
				}
				renderer.render();
			}

		};

		canvas.ondragstart = function (e) { //Workaround for Chrome
			console.log("ondragstart");
			e.preventDefault();
		};


	}

}

function temptemp(moves, renderer) {

    /* for (var i = 0; i < 10; i++) {
        alert(demoHandler.getMoves());
    }
    */

	for (var i = 0; i < moves.length; i++) {
		moves[i].point2.x += moves[i].stepx;
		moves[i].point2.y += moves[i].stepy;
		moves[i].step++;

		if (moves[i].step > 600) {

			moves[i].point1.x = Math.random() * 2 - 1;
			moves[i].point1.y = Math.random() * 2 - 1;
			moves[i].point2.x = moves[i].point1.x + 0.001;
			moves[i].point2.y = moves[i].point1.y + 0.001;

			moves[i].step = Math.random() * 20;
			moves[i].stepx = (Math.random() * 0.02 - 0.01) / 4;
			moves[i].stepy = (Math.random() * 0.02 - 0.01) / 4;
		}

	}

	renderer.render();

	console.log(Math.random());

	setTimeout(function () { temptemp(moves, renderer) }, 1000 / 60);
}


var demoHandler = new function () {

	var moves = new Array;

	function randomX() {
		return Math.random() * 2 - 1;
	}


	this.start = function () {
		this.demoMode = true;


		for (var i = 0; i < 4; i++) {
			var temp = new Point(randomX(), randomX());

			var newmove = renderer.newMove(temp);
			newmove.point2.x = temp.x + 0.001;
			newmove.point2.y = temp.y + 0.001;

			newmove.step = 0; //Math.random() * 100;
			newmove.stepx = Math.random() * 0.002 - 0.001;
			newmove.stepy = Math.random() * 0.002 - 0.001;

			moves.unshift(newmove);

			setTimeout(function () { temptemp(moves, renderer) }, 100);

		}



	}


	this.init = function () {

	}
}


// Program starts here
function main() {
	renderer.init();

	//demoHandler.init();
	inputHandler.init();

	demoHandler.init();

	//init2();
}

// Resets the current distortion to 0
function reset(point) {
	point1[currentPoint].x = 1;
	point1[currentPoint].y = 1;
	point2[currentPoint].x = 1.00001;
	point2[currentPoint].y = 1.00001;

	setVec2PointArray("p1", point1);
	setVec2PointArray("p2", point2);
}

function undo() {
	renderer.undo();
}

function reset() {
	renderer.reset();
}

// http://mitgux.com/send-canvas-to-server-as-file-using-ajax
// Convert dataURL to Blob object
function dataURLtoBlob(dataURL) {
	// Decode the dataURL    
	var binary = atob(dataURL.split(',')[1]);
	// Create 8-bit unsigned array
	var array = [];
	for (var i = 0; i < binary.length; i++) {
		array.push(binary.charCodeAt(i));
	}
	// Return our Blob object
	return new Blob([new Uint8Array(array)], { type: 'image/png' });
}

function save() {
	renderer.save();
}

function demo() {
	demoHandler.start();
}


function normalizedPoint(x, y) {
	var canvas = document.getElementById("2dcanvas");
	x = (x / canvas.width) * 2 - 1;
	y = (1 - (y / canvas.height)) * 2 - 1;

	return new Point(x, y);
}



function setVec2(id, a, b) {
	gl.uniform2f(gl.getUniformLocation(program, id), a, b);
}


/*
// a = array of Point
function setVec2PointArray(id, a) {
	var floatarray = new Float32Array(2 * a.length);

	var index = 0;
	for (var i = 0; i < a.length; i++) {
		floatarray[index++] = a[i].x;
		floatarray[index++] = a[i].y;
	}

	gl.uniform2fv(gl.getUniformLocation(program, id), floatarray);
}
*/

// Init continues after image has been loaded
function init2(image) {
	alert("init2");

	//initPoints();

	// Get a context
	var webglcanvas = document.getElementById("webglcanvas");
	gl = webglcanvas.getContext("experimental-webgl", { preserveDrawingBuffer: true });
	if (!gl) { return; }

	// Set the viewport size
	gl.viewportWidth = webglcanvas.width;
	gl.viewportHeight = webglcanvas.height;

	// Load the GLSL programs
	try {
		program = loadProgram(gl, getShader(gl, "2d-vertex-shader"), getShader(gl, "2d-fragment-shader"));
		gl.useProgram(program);
	}
	catch (e) {
		//log('shader fail');
		return;
	}

	// look up where the vertex data needs to go.
	this.texCoordLocation = gl.getAttribLocation(program, "a_texCoord");

	// provide texture coordinates for the rectangle.
	var texCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);

	//Make a 0,0 to 1,1 triangle mesh, using n = resolution steps

	var r = 1 / resolution;

	var c = new Float32Array(resolution * resolution * 2 * 3 * 2); //2 numbers per coord; three coords per triangle; 2 triagles per square; resolution * resolution squares

	var i = 0;
	for (var x = 0; x <= 1; x += r) {
		for (var y = 0; y <= 1; y += r) {
			c[i++] = x;
			c[i++] = y;

			c[i++] = x + r;
			c[i++] = y;

			c[i++] = x;
			c[i++] = y + r;

			c[i++] = x + r;
			c[i++] = y;

			c[i++] = x;
			c[i++] = y + r;

			c[i++] = x + r;
			c[i++] = y + r;

		}
	}

	//bugbug need to reuse existing texture when loading a new one

	gl.bufferData(gl.ARRAY_BUFFER, c, gl.STATIC_DRAW);

	gl.enableVertexAttribArray(this.texCoordLocation);
	gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 0, 0);

	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);

	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

	// Set the parameters so we can render any size image.
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	// Upload the image into the texture.
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

	// Set up uniforms
	program.u_image = gl.getUniformLocation(program, "u_image");

	// Set the texture to use
	gl.uniform1i(program.u_image, 0);

	var canvas = document.getElementById("2dcanvas");

	canvas.onmousedown = function (e) {
		point1[currentPoint] = getMousePoint(e);
		point2[currentPoint] = getMousePoint(e);

		setVec2PointArray("p1", point1);
		setVec2PointArray("p2", point2);

		bMoving = true;
	}

	canvas.onmouseup = function (e) {
		point2[currentPoint] = getMousePoint(e);
		setVec2PointArray("p2", point2);

		render();

		bMoving = false;

		currentPoint++;
		if (currentPoint == MAXPOINTS) currentPoint = 0;
	}

	canvas.onmouseout = function (e) {
		if (bMoving) {

			point2[currentPoint] = getMousePoint(e);
			setVec2PointArray("p2", point2);

			render();

			bMoving = false;

			currentPoint++;
			if (currentPoint == MAXPOINTS) currentPoint = 0;

		}
	};

	canvas.onmousemove = function (e) {
		if (bMoving == true) {
			point2[currentPoint] = getMousePoint(e);
			setVec2PointArray("p2", point2);
			render();
		}
	};

	render();     // Render the initial frame
}

// Adds a string to the log in the web page
function log(result) {
	var resultDiv = document.getElementById("log");
	resultDiv.innerHTML += result + "<br />";
}

// Adds a string to the log in the web page; overwrites everything in the log with the new string
function logi(result) {
	var resultDiv = document.getElementById('log');
	resultDiv.innerHTML = result;
}


// Loads a shader from a script tag
// [in] WebGL context
// [in] id of script element with the shader to load
function getShader(gl, id) {
	var shaderScript = document.getElementById(id);
	if (!shaderScript) {
		return null;
	}

	var str = "";
	var k = shaderScript.firstChild;
	while (k) {
		if (k.nodeType == 3)
			str += k.textContent;
		k = k.nextSibling;
	}

	var shader;
	if (shaderScript.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}

	gl.shaderSource(shader, str);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}


function loadProgram(gl, vertexshader, fragmentshader) {
	var program = gl.createProgram();
	gl.attachShader(program, vertexshader);
	gl.attachShader(program, fragmentshader);

	gl.linkProgram(program);

	// Check the link status
	var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
	if (!linked) {
		// something went wrong with the link
		lastError = gl.getProgramInfoLog(program);
		alert("Error in program linking:" + lastError);

		gl.deleteProgram(program);
		return;
	}
	return program;
};

function handleFileSelect(evt) {

	document.getElementById("openphoto1").style.display = "inline";
	document.getElementById("openphoto2").style.display = "none";

	var files = evt.target.files; // FileList object

	// files is a FileList of File objects. List some properties.
	var file = files[0];

	var reader = new FileReader();

	// Closure to capture the file information.
	reader.onload = function (e) {
		// Render thumbnail.
        /*
        var span = document.createElement('span');
        span.innerHTML = ['<img class="thumb" src="', e.target.result,
                          '" title="', escape(theFile.name), '"/>'].join('');
        document.getElementById('list').insertBefore(span, null);
        */

		renderer.loadImageX(this.result);
	};

	// Read in the image file as a data URL.

	reader.readAsDataURL(file);
}

document.getElementById('files').addEventListener('change', handleFileSelect, false);


function OpenPhoto1() {
	document.getElementById("openphoto1").style.display = "none";
	document.getElementById("openphoto2").style.display = "inline";
}
