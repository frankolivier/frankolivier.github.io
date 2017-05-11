"use strict";

// bugbug use require

// https://en.wikipedia.org/wiki/Web_Mercator
// http://mike.teczno.com/notes/osm-us-terrain-layer/foreground.html
// https://www.mapbox.com/blog/3d-terrain-threejs/
//bugbug todo				renderer.setPixelRatio( window.devicePixelRatio );


// bugbug feature detect webgl, fetch, web workers

document.addEventListener("DOMContentLoaded", init); // initialization

//var terrainCanvas = null;		// the canvas we are rendering the map into
//var ctx = null;			// the output canvas to render to

var frameCounter = 0;	// the frame being rendered in the output canvas

var totalFrameTime = 0;

var worker = null;		// the background worker that'll update the data to draw in the canvas

var above = new Point(322, 722);	// the point on the map we are currently above
//var above = new Point(2, 2);	// the point on the map we are currently above

const projectionDimension = 256;	// Web Mercator is 256 x 256 tiles

const tileDimension = 256;	// Tiles are 256 x 256 pixels


var terrainTiles;	// Tiles.js instance
var mapTiles;	// Tiles.js instance

var renderedX = -1;
var renderedY = -1;

const zoomLevel = 11;

function checkKey(e) {

	const step = 0.1;

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
	else if (e.keyCode == '71') {
		// q
		mesh.position.y -= 100;
	}
	else if (e.keyCode == '65') {
		// e
		mesh.position.y += 100;
	}


}
document.onkeydown = checkKey;



/// three js
var scene, camera, renderer;

var controls;


var effect; // the webvr renderer

var geometry, material, mesh;
var terrainTexture, mapTexture;

var cylinder;

function isMobile()
{
	return (navigator.userAgent.toLowerCase().indexOf('mob') != -1);
}

function initThree() {

	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);

	var geometry = new THREE.CylinderGeometry(1, 1, 100, 4); //bugbug top and bottom are swapped?
	geometry.rotateX(0.25 * 2 * Math.PI);
	var material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
	cylinder = new THREE.Mesh(geometry, material);
		
	scene.add(cylinder);


	//var vertexShader = "varying vec2 vuv; void main()	{ vuv = uv; gl_Position =  projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }";
	//var fragmentShader = "varying vec2 vuv; uniform sampler2D texture; void main() { vec4 q = texture2D(texture, vuv) * 256.0; float w = (q.r * 256.0 + q.g + q.b / 256.0) - 32768.0; w = w / 4096.0; gl_FragColor = vec4(w, w, w, 0.5);}";

	var meshComplexity = isMobile() ? 100 : 512;

	geometry = new THREE.PlaneGeometry(2048, 2048, meshComplexity, meshComplexity);
	terrainTexture = new THREE.Texture(terrainCanvas);
	mapTexture = new THREE.Texture(mapCanvas);


	var vertexShader = "varying vec2 v; uniform sampler2D terrainTexture; varying float distance; void main()	{ " +
					   "v = uv; vec4 q = texture2D(terrainTexture, uv) * 256.0; float elevation = q.r * 256.0 + q.g + q.b / 256.0 - 32768.0; "+
					   "elevation = clamp(elevation, 0.0, 10000.0); " +
					   "elevation = elevation / 25.0; " +
					   "gl_Position = projectionMatrix * modelViewMatrix * vec4( position.x, position.y, position.z + elevation, 1.0 ); distance = clamp(length(gl_Position) / 3000.0, 0.0, 1.0); }";
	var fragmentShader = "varying vec2 v; uniform sampler2D mapTexture; varying float distance; void main() { gl_FragColor = mix(texture2D(mapTexture, v), vec4(1.0, 1.0, 1.0, 1.0), distance); gl_FragColor.a = 0.5; }";

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

	mesh.lookAt(new THREE.Vector3(0, 1, 0));

	scene.add(mesh);


	mesh.position.y = -500;


	renderer = new THREE.WebGLRenderer();

	renderer.setClearColor(0xffffff, 1);

	controls = new THREE.VRControls(camera);
	controls.standing = false;
	controls.scale = 1000;

	effect = new THREE.VREffect(renderer);

	renderer.setSize(document.body.clientWidth * 0.9, document.body.clientHeight * 0.9);

	document.body.appendChild(renderer.domElement);

	const vrButton = document.getElementById('vrButton');

	vrButton.onclick = function () {

		effect.isPresenting ? effect.exitPresent() : effect.requestPresent();

	};

}


function animateThree() {

	var t1 = window.performance.now();

	effect.requestAnimationFrame(animateThree);

	terrainTiles.render(Math.floor(above.x), Math.floor(above.y));
	mapTiles.render(Math.floor(above.x), Math.floor(above.y));

	const m = 256; // 2048 / 8 tiles
	mesh.position.x = (-above.x % 1) * m;
	mesh.position.z = (-above.y % 1) * m;


	controls.update();

	if (mapTiles.updating || terrainTiles.updating || renderedX != above.x || renderedY != above.y) {
		terrainTexture.needsUpdate = true;  // bugbug only if needed
		mapTexture.needsUpdate = true;  // bugbug only if needed
		renderedX = above.x;
		renderedY = above.y;
	}

	//mesh.rotation.z += 0.001;
	//mesh.rotation.y += 0.02;


	//bugbug need to query hasorientation?s

	// Handle controller input


	var gamepads = navigator.getGamepads();

	for (var i = 0; i < gamepads.length; ++i) {
		var controller = gamepads[i];


		if (controller != null) {
			// id = Daydream Controller bugbug

			if (controller.pose.hasPosition == true)
			{
				const pscale = 1000;
				cylinder.position.x = controller.pose.position[0] * pscale;
				cylinder.position.y = controller.pose.position[1] * pscale;
				cylinder.position.z = controller.pose.position[2] * pscale;
			}
			else
			{
				cylinder.position.x = camera.position.x - 100;
				cylinder.position.y = camera.position.y - 100;
				cylinder.position.z = camera.position.z - 100;
			}

			var quaternion = new THREE.Quaternion().fromArray(controller.pose.orientation);
			cylinder.setRotationFromQuaternion(quaternion);

			var vector = new THREE.Vector3(0, 0, -1);
			vector.applyQuaternion(quaternion);

			//bugbug sometime position is not availalbe?




			//cylinder.position.set(mesh.position);


			var pressed = controller.buttons[0].pressed;

			if (pressed == true) {

				///console.log("camera at" + camera.position.x + " " + camera.position.y + " " + camera.position.z)
				///console.log("controller at" + controller.pose.position.x + " " + controller.pose.position.y + " " + controller.pose.position.z)

				var scale = 0.05 * controller.axes[1];
				above.x += vector.x * scale;
				above.y += vector.z * scale;

				mesh.position.y -= vector.y * 25 * controller.axes[1]


			}



		}

	}


	/*
		linegeometry.vertices[0] = mesh.position;
		linegeometry.vertices[1] = mesh.position;
		linegeometry.vertices[1].x -= 1000;
		linegeometry.vertices[1].y -= 1000;
		linegeometry.vertices[1].z -= 1000;
		linegeometry.verticesNeedUpdate = true;
	*/

	//renderer.render(scene, camera);
	effect.render(scene, camera);

	frameCounter++;

	var t2 = window.performance.now();

	totalFrameTime += (t2 - t1);


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


}



function onWindowResize() {
	//terrainCanvas.width = window.innerWidth;
	//terrainCanvas.height = window.innerHeight;

	//console.log(terrainCanvas.width + ' <<<>>> ' + terrainCanvas.height);
	//renderer.setSize(window.innerWidth, window.innerHeight);
}

function long2tile(lon, zoom) { return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))); }
function lat2tile(lat, zoom) { return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }

function geocodeAddress(geocoder) {
	var address = document.getElementById('address').value;
	geocoder.geocode({ 'address': address }, function (results, status) {
		if (status === 'OK') {
			console.log('in  ' + results[0].geometry.location.lat() + ' ' + results[0].geometry.location.lng());

			above.x = long2tile(results[0].geometry.location.lng(), zoomLevel); //bugbug put zoom (10) in a var
			above.y = lat2tile(results[0].geometry.location.lat(), zoomLevel); //bugbug put zoom (10) in a var


			console.log('out ' + above.x + ' ' + above.y);


		} else {
			///bugbug alert('Geocode was not successful for the following reason: ' + status);
		}
	});
}

function initMap() {
	var geocoder = new google.maps.Geocoder();

	document.getElementById('submit').addEventListener('click', function () {
		geocodeAddress(geocoder);
	});
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


	//SSL
	//If you'd like to display these map tiles on a website that requires HTTPS, use our tile SSL endpoint by replacing http://tile.stamen.com with https://stamen-tiles.a.ssl.fastly.net. Multiple subdomains can be also be used: https://stamen-tiles-{S}.a.ssl.fastly.net
	//JavaScript can be loaded from https://stamen-maps.a.ssl.fastly.net/js/tile.stamen.js.
	//If you need protocol-agnostic URLs, use //stamen-tiles-{s}.a.ssl.fastly.net/, as that endpoint will work for both SSL and non-SSL connections.


	const mapCanvas = document.getElementById('mapCanvas');
	mapTiles = new Tiles('https://stamen-tiles.a.ssl.fastly.net/terrain/'+zoomLevel+'/%x%/%y%.png', mapCanvas, 256, false);

	const terrainCanvas = document.getElementById('terrainCanvas');
	terrainTiles = new Tiles('https://tile.mapzen.com/mapzen/terrain/v1/terrarium/'+zoomLevel+'/%x%/%y%.png?api_key=mapzen-JcyHAc8', terrainCanvas, 256, false);

	Panning.init(mapCanvas, panningUpdate);

	initThree();

	///initMap();

	animateThree();


	//	terrainTiles.render(above.x, above.y);
	//mapTiles.render(above.x, above.y);

}