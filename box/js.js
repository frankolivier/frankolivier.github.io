'use strict';

document.addEventListener("DOMContentLoaded", getVRDisplays, false);

var canvas;
var gl;
var program;
var vertexBuffer;
var indicesBuffer;
var textureCoordsBuffer;

var vrDisplay = null;
var frameData = null;

//TODO remove texture coord stuff

//const numberOfFramesToSample = 1200;
//var frameTimes = [numberOfFramesToSample];

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


function getProgram(gl, vertexshader, fragmentshader) {
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

	gl.useProgram(program);


	return program;
};


function getBuffer(data, shaderName, itemSize) {
	var buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

	buffer.itemSize = itemSize;
	buffer.count = data.length / buffer.itemSize;

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

	buffer.shaderReference = gl.getAttribLocation(program, shaderName);

	gl.enableVertexAttribArray(buffer.shaderReference);

	return buffer;
}

function init() {

	//set canvas to correct size
	var leftEye = vrDisplay.getEyeParameters("left");
	var rightEye = vrDisplay.getEyeParameters("right");

	canvas.width = Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2;
	canvas.height = Math.max(leftEye.renderHeight, rightEye.renderHeight);


	gl.viewport(0, 0, canvas.width, canvas.height);

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	//gl.enable(gl.DEPTH_TEST);

	// Shaders
	var vertexShader = getShader(gl, 'vertex-shader');
	var fragmentShader = getShader(gl, 'fragment-shader');
	program = getProgram(gl, vertexShader, fragmentShader);

	// Buffers
	var cubeVertices = [
		1, -1, 1,
		-1, -1, 1,
		-1, 1, 1,

		1, 1, 1,
		-1, -1, -1,
		1, -1, -1,

		1, 1, -1,
		-1, 1, -1,
		1, 1, -1,

		1, 1, 1,
		-1, 1, 1,
		-1, 1, -1,

		-1, -1, -1,
		-1, -1, 1,
		1, -1, 1,

		1, -1, -1,
		1, -1, -1,
		1, -1, 1,

		1, 1, 1,
		1, 1, -1,
		-1, -1, 1,

		-1, -1, -1,
		-1, 1, -1,
		-1, 1, 1
	];
	vertexBuffer = getBuffer(cubeVertices, 'aVertexPosition', 3);
	gl.vertexAttribPointer(vertexBuffer.shaderReference, vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

	indicesBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);

	indicesBuffer.itemSize = 1;
	indicesBuffer.count = 36;

	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 2, 1, 0, 3, 2, 4, 6, 5, 4, 7, 6, 8, 10, 9, 8, 11, 10, 12, 14, 13, 12, 15, 14, 16, 18, 17, 16, 19, 18, 20, 22, 21, 20, 23, 22]), gl.STATIC_DRAW);

	frameData = new VRFrameData();

}

function setMat4(id, a, b) {
	var location = gl.getUniformLocation(program, id);
	if (location == null) {
		console.log('Shader location not found');
	}

	gl.uniformMatrix4fv(location, a, b);
}

function drawGeometry() {

	gl.drawElements(gl.TRIANGLES, indicesBuffer.count, gl.UNSIGNED_SHORT, 0);

}

function onVRFrame() {

	var t0 = performance.now();

	vrDisplay.requestAnimationFrame(onVRFrame);

	gl.clear(gl.COLOR_BUFFER_BIT);

	var leftPM;
	var leftVM;
	var rightPM;
	var rightVM;

	vrDisplay.getFrameData(frameData);

	leftPM = frameData.leftProjectionMatrix;
	leftVM = frameData.leftViewMatrix;
	rightPM = frameData.rightProjectionMatrix;
	rightVM = frameData.rightViewMatrix;

	// The video cube effect only works is the eye location is 0,0,0
	// Change the model view matrix to move the eye perspective to 0,0,0

/*
	leftVM[12] = 0;
	leftVM[13] = 0;
	leftVM[14] = 0;

	rightVM[12] = 0;
	rightVM[13] = 0;
	rightVM[14] = 0;
*/

	// Render to the left eye’s view to the left half of the canvas
	gl.viewport(0, 0, canvas.width * 0.5, canvas.height);
	setMat4('uPMatrix', false, leftPM);
	setMat4('uMVMatrix', false, leftVM);
	drawGeometry();


	// Render to the right eye’s view to the right half of the canvas
	gl.viewport(canvas.width * 0.5, 0, canvas.width * 0.5, canvas.height);
	setMat4('uPMatrix', false, rightPM);
	setMat4('uMVMatrix', false, rightVM);
	drawGeometry();

	// Indicate that we are ready to present the rendered frame to the VRDisplay
	//bugbug vrDisplay.submitFrame();

	try{
		vrDisplay.submitFrame();
		throw new Error("Something bad happened.")

	}
	catch (e)
	{
		console.log(e);
	}

	

}


function getVRDisplays() {
	if (navigator.getVRDisplays) {
		navigator.getVRDisplays().then(function (displays) {
			if (displays.length > 0) {
				vrDisplay = displays[0];

				// Pose test
				var pose = vrDisplay.getPose();
				console.log(pose);
				console.log(pose.orientation);
				console.log(pose.position);


			}
			else {
				console.log("NO HMD FOUND");
			}
		})
	}
	else {
		console.log("WEBVR NOT SUPPORTED, FAKING IT");
		vrDisplay = FakeWebVR.getVRDisplay();
	}



}

function enterVR() {
	document.getElementById('startButton').style.display = 'none';

	canvas = document.getElementById('webglcanvas');
	gl = canvas.getContext("experimental-webgl", {
		alpha: false,
		preserveDrawingBuffer: true,
		depth: false,
		stencil: false,
		antialias: false,
		premultipliedAlpha: true
	});

	/*
	vrDisplay.requestPresent([{ source: canvas }]).then(function () {
		init();
		vrDisplay.requestAnimationFrame(onVRFrame);
	});
	*/

		init();
		vrDisplay.requestAnimationFrame(onVRFrame);



}
