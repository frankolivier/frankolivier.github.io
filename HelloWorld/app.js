"use strict";

// bugbug use require

// https://en.wikipedia.org/wiki/Web_Mercator
// http://mike.teczno.com/notes/osm-us-terrain-layer/foreground.html
// https://www.mapbox.com/blog/3d-terrain-threejs/

// bugbug feature detect webgl, fetch, web workers

document.addEventListener("DOMContentLoaded", init); // initialization

//var terrainCanvas = null;		// the canvas we are rendering the map into
//var ctx = null;			// the output canvas to render to

var frameCounter = 0;	// the frame being rendered in the output canvas

var worker = null;		// the background worker that'll update the data to draw in the canvas

var above = new Point(166, 355);	// the point on the map we are currently above
//var above = new Point(2, 2);	// the point on the map we are currently above

const projectionDimension = 256;	// Web Mercator is 256 x 256 tiles

const tileDimension = 256;	// Tiles are 256 x 256 pixels


var terrainTiles;	// Tiles.js instance
var mapTiles;	// Tiles.js instance

var renderedX = -1;
var renderedY = -1;

function checkKey(e) {

<<<<<<< HEAD
	const step = 0.1;
=======
	const step = 1;
>>>>>>> origin/master

	e = e || window.event;

	if (e.keyCode == '38') {
		// up arrow
		above.y -= step; // minus, as we are panning BUGBUG move to Panning.js?
	}
	else if (e.keyCode == '40') {
		// down arrow		     	
		above.y += step; // minus, as we are panning BUGBUG move to Panning.js?

	}
	else if (e.keyCode == '37') {
		// left arrow
		above.x -= step; // minus, as we are panning BUGBUG move to Panning.js?

	}
	else if (e.keyCode == '39') {
		// right arrow	
		above.x += step; // minus, as we are panning BUGBUG move to Panning.js?

	}

}
document.onkeydown = checkKey;



/// three js
var scene, camera, renderer;

var controls;


var effect; // the webvr renderer

var geometry, material, mesh;
var terrainTexture, mapTexture;

function initThree() {

	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
	//camera.position.z = 1000;

	geometry = new THREE.PlaneGeometry(5000, 5000, 100, 100);

	terrainTexture = new THREE.Texture(terrainCanvas);
	mapTexture = new THREE.Texture(mapCanvas);


	//var vertexShader = "varying vec2 vuv; void main()	{ vuv = uv; gl_Position =  projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }";
	//var fragmentShader = "varying vec2 vuv; uniform sampler2D texture; void main() { vec4 q = texture2D(texture, vuv) * 256.0; float w = (q.r * 256.0 + q.g + q.b / 256.0) - 32768.0; w = w / 4096.0; gl_FragColor = vec4(w, w, w, 0.5);}";

	var vertexShader = "varying vec2 v; uniform sampler2D terrainTexture; void main()	{ v = uv; vec4 q = texture2D(terrainTexture, uv) * 256.0; float w = q.r * 256.0 + q.g + q.b / 256.0 - 32768.0; w = w / 4096.0 ; gl_Position = projectionMatrix * modelViewMatrix * vec4( position.x, position.y, position.z + w * 300.0, 1.0 ); }";
	var fragmentShader = "varying vec2 v; uniform sampler2D mapTexture; void main() { gl_FragColor = texture2D(mapTexture, v); }";

	var material = new THREE.ShaderMaterial({
		uniforms: {
			terrainTexture: { type: 't', value: terrainTexture },
			mapTexture: { type: 't', value: mapTexture }
		},
		vertexShader: vertexShader,
		fragmentShader: fragmentShader
	});

	//material = new THREE.MeshBasicMaterial( { color: 0x777777, wireframe: true } );

	mesh = new THREE.Mesh(geometry, material);

	mesh.lookAt(new THREE.Vector3(0, 1, 1));

	scene.add(mesh);


	mesh.position.z = -1000;


	renderer = new THREE.WebGLRenderer();

	controls = new THREE.VRControls( camera );
<<<<<<< HEAD
	controls.standing = false;
	controls.scale = 1000;

=======
	controls.standing = true;
>>>>>>> origin/master

	effect = new THREE.VREffect(renderer);

	renderer.setSize(document.body.clientWidth * 0.9, document.body.clientHeight * 0.9);

	document.body.appendChild(renderer.domElement);

<<<<<<< HEAD
	const vrButton = document.getElementById('vrButton');

	vrButton.onclick = function () {
=======
	renderer.domElement.onclick = function () {
>>>>>>> origin/master

		effect.isPresenting ? effect.exitPresent() : effect.requestPresent();

	};

}

function animateThree() {

	effect.requestAnimationFrame(animateThree);
<<<<<<< HEAD

	terrainTiles.render(above.x, above.y);
	mapTiles.render(above.x, above.y);

	controls.update();

=======

	terrainTiles.render(above.x, above.y);
	mapTiles.render(above.x, above.y);

	controls.update();

>>>>>>> origin/master
	if (mapTiles.updating || terrainTiles.updating || renderedX!=above.x || renderedY!=above.y )
	{
		terrainTexture.needsUpdate = true;  // bugbug only if needed
		mapTexture.needsUpdate = true;  // bugbug only if needed
		renderedX = above.x;
		renderedY = above.y;
	}

	//mesh.rotation.z += 0.001;
	//mesh.rotation.y += 0.02;




	//renderer.render(scene, camera);
	effect.render(scene, camera);

	frameCounter++;

}
/// three js


/*
function onFrame() {




	//BUGBUG only render if needed

	//


	//ctx.rect(628, 628, 36, 36);
	//ctx.stroke();




		if (worker.needsWork == true)
		{
			worker.postMessage('Hello World ' + frameCounter); // Send data to our worker.
			worker.needsWork = false;
		}

	// Start exit


}
*/

function panningUpdate(point) {

	//above 100, 200

	//below 400
	const scale = tileDimension;

	above.x += point.x / scale; // minus, as we are panning BUGBUG move to Panning.js?
	above.y += point.y / scale; // BUGBUG convert point to a true object

	//console.log(above.x + '    ' + above.y);

}


function onWindowResize() {
	//terrainCanvas.width = window.innerWidth;
	//terrainCanvas.height = window.innerHeight;

	//console.log(terrainCanvas.width + ' <<<>>> ' + terrainCanvas.height);
	//renderer.setSize(window.innerWidth, window.innerHeight);
}


function init() {

	window.addEventListener("resize", onWindowResize);
	//onWindowResize();

	/*
		worker = new Worker('worker.js');
		worker.needsWork = true;
	
		worker.addEventListener('message', function(e) {
			console.log('Worker said: ', e.data + 'current frame = ' + above.x + ' ' + above.y + ' '+ frameCounter);
			worker.needsWork = true;
		}, false);
	*/

	const mapCanvas = document.getElementById('mapCanvas');
	mapTiles = new Tiles('http://tile.stamen.com/terrain/10/%x%/%y%.png', mapCanvas, 256);

	const terrainCanvas = document.getElementById('terrainCanvas');
	terrainTiles = new Tiles('https://tile.mapzen.com/mapzen/terrain/v1/terrarium/10/%x%/%y%.png?api_key=mapzen-JcyHAc8', terrainCanvas, 256);

	Panning.init(mapCanvas, panningUpdate);

	initThree();

	animateThree();


//	terrainTiles.render(above.x, above.y);
	//mapTiles.render(above.x, above.y);

}