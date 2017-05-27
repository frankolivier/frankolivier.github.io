"use strict";

// https://en.wikipedia.org/wiki/Web_Mercator
// http://mike.teczno.com/notes/osm-us-terrain-layer/foreground.html
// https://www.mapbox.com/blog/3d-terrain-threejs/

// bugbug feature detect webgl, fetch, web workers

// bugbug http://www.thunderforest.com/maps/landscape/


document.addEventListener("DOMContentLoaded", init); // initialization

var frameCounter = 0;	// the frame being rendered in the output canvas
var totalFrameTime = 0;

var user = new THREE.Vector3(330, 0.5, 722.7);	// the point on the map we are currently above
var friend;    // the other person in VR with us

var friendData = new THREE.Vector3(10, 10, 10);
var friendPointerData = new THREE.Vector3(10, 10, 10);
var friendPointerQuaternion = new THREE.Quaternion(0, 0, 0, 1);

const tileDimension = 256;	// Tiles are 256 x 256 pixels

var terrainTiles;	  // Tiles.js instance for elevation data
var mapTiles;		  // Tiles.js instance for color values

const zoomLevel = 11; // The zoom level of the slippy map we're using

var peer;
var conn;	//connection to the client

var myID;
var friendID;

function checkKey(e) {

	const step = 0.05;

	e = e || window.event;

	if (e.keyCode == '38') {
		// up arrow
		user.z -= step; // minus, as we are panning BUGBUG move to Panning.js?
	}
	else if (e.keyCode == '40') {
		// down arrow		     	
		user.z += step; // minus, as we are panning BUGBUG move to Panning.js?

	}
	else if (e.keyCode == '37') {
		// left arrow
		user.x -= step; // minus, as we are panning BUGBUG move to Panning.js?

	}
	else if (e.keyCode == '39') {
		// right arrow	
		user.x += step; // minus, as we are panning BUGBUG move to Panning.js?
	}
	else if (e.keyCode == '71') {
		// q
		user.y += step;
	}
	else if (e.keyCode == '65') {
		// e
		user.y -= step;
	}


}
document.onkeydown = checkKey;



/// three js
var scene, camera, renderer;
var controls;
var effect; // the webvr renderer
var geometry, material, mesh;
var terrainTexture, mapTexture;

var cylinder;  // the cursor / pointer we're drawing for the gamepad

var friendPointer;	//Mesh; our friend's pointer



function isMobile() {
	return (navigator.userAgent.toLowerCase().indexOf('mob') != -1);
}

function initThree() {

	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
	camera.lookAt(new THREE.Vector3(0, -0.5, -1));

	{
		var geometry = new THREE.CylinderGeometry(0.01, 0.01, 100, 4); //bugbug top and bottom are swapped?
		geometry.rotateX(0.25 * 2 * Math.PI);
		var material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
		cylinder = new THREE.Mesh(geometry, material);
	}
	scene.add(cylinder);

	{
		var geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 4); //bugbug top and bottom are swapped?
		//geometry.rotateX(0.25 * 2 * Math.PI);
		var material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
		friend = new THREE.Mesh(geometry, material);
	}
	scene.add(friend);

	{
		var geometry = new THREE.CylinderGeometry(0.01, 0.01, 100, 4); //bugbug top and bottom are swapped?
		geometry.rotateX(0.25 * 2 * Math.PI);
		var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
		friendPointer = new THREE.Mesh(geometry, material);
	}
	scene.add(friendPointer);

	var meshComplexity = isMobile() ? 100 : 512;

	geometry = new THREE.PlaneGeometry(8, 8, meshComplexity, meshComplexity);
	terrainTexture = new THREE.Texture(terrainCanvas);
	mapTexture = new THREE.Texture(mapCanvas);

	/*
		// make textures smaller for mobile
		if (isMobile())
		{
			const canvasSize = 512;
			terrainCanvas.width = canvasSize;
			terrainCanvas.height = canvasSize;
			mapCanvas.width = canvasSize;
			mapCanvas.height = canvasSize;
	
		}
	*/

	var vertexShader = "varying vec2 v; uniform sampler2D terrainTexture; varying float distance; void main()	{ " +
		"v = uv; vec4 q = texture2D(terrainTexture, uv) * 256.0; " +
		"float elevation = q.r * 256.0 + q.g + q.b / 256.0 - 32768.0; " +
		"elevation = clamp(elevation, 0.0, 10000.0); " +
		"elevation = elevation / 10000.0; " +
		"vec3 p = position;" +
		"if ((v.x < 0.1)||(v.x > 0.9)||(v.y < 0.1)||(v.y > 0.9)){" +
		"p.x *= 100.0; " +
		"p.y *= 100.0; " +
		"p.z = 0.0; " +
		//"}"+
		"}else{" +
		"p.z += elevation; " +
		"}" +
		"gl_Position = projectionMatrix * modelViewMatrix * vec4(p.x, p.y, p.z, 1.0 ); " +
		"distance = length(gl_Position); }";

	var fragmentShader = "varying vec2 v; " +
		"uniform sampler2D mapTexture; " +
		"varying float distance; " +
		"void main() { " +
		"  float fogStrength = smoothstep(2.0, 4.0, distance);" +
		"  gl_FragColor = mix(texture2D(mapTexture, v), vec4(1.0, 1.0, 1.0, 1.0), fogStrength); " +

		"  float hazeStrength = smoothstep(10.0, 100.0, distance);" +
		"  gl_FragColor = mix(gl_FragColor, vec4(135.0 / 256.0, 206.0 / 256.0, 1.0, 1.0), hazeStrength); " +

		//"  gl_FragColor.r = 135.0 / 255.0; "+
		//"  gl_FragColor.g = 206.0 / 255.0; "+
		//"  gl_FragColor.b = 250.0 / 255.0; " +
		"}";

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




	const vrCanvas = document.getElementById('vrCanvas');
	renderer = new THREE.WebGLRenderer({ canvas: vrCanvas, preserveDrawingBuffer: true }); //bugbug this might kill mobile perf?



	renderer.setClearColor(0x87ceff, 1);

	controls = new THREE.VRControls(camera);
	controls.standing = false;

	effect = new THREE.VREffect(renderer);

	renderer.setSize(document.body.clientWidth, document.body.clientHeight);
	//bugbug setsize for vr display

	const vrButton = document.getElementById('vrButton');

	vrButton.onclick = function () {

		effect.isPresenting ? effect.exitPresent() : effect.requestPresent();

	};

	renderer.setPixelRatio(window.devicePixelRatio);

	window.addEventListener("resize", onWindowResize);
	onWindowResize();

}

function sendFriend() {

	var t1 = window.performance.now();
	if (!!conn) {
		var data = {};
		data.x = user.x;
		data.z = user.z;
		data.y = user.y;

		data.px = user.x + cylinder.position.x; //bugbug need to put this in global coordinate space...
		data.py = user.y + cylinder.position.y;
		data.pz = user.z + cylinder.position.z;

		data.qx = cylinder.quaternion.x;
		data.qy = cylinder.quaternion.y;
		data.qz = cylinder.quaternion.z;
		data.qw = cylinder.quaternion.w;

		conn.send(data);
		//bugbug maybe send timestamp as well?
	}

	window.setTimeout(sendFriend, 250);

}

function handleController() {
	// Handle controller input

	try {



		var gamepads = navigator.getGamepads();

		for (var i = 0; i < gamepads.length; ++i) {
			var controller = gamepads[i];

			if (controller != null) {
				// id = Daydream Controller bugbug

				if (controller.pose.hasPosition == true) {
					try {
						cylinder.position.x = controller.pose.position[0];
						cylinder.position.y = controller.pose.position[1];
						cylinder.position.z = controller.pose.position[2];
					}
					catch (e) {

					}

				}
				else {
					cylinder.position.x = camera.position.x - 0.1; //bugbug
					cylinder.position.y = camera.position.y - 0.1;
					cylinder.position.z = camera.position.z - 0.1;
				}


				var quaternion = new THREE.Quaternion().fromArray(controller.pose.orientation);
				cylinder.setRotationFromQuaternion(quaternion);

				var vector = new THREE.Vector3(0, 0, -1);
				vector.applyQuaternion(quaternion);

				//bugbug sometime position is not availalbe?
				//cylinder.position.set(mesh.position);

				var pressed = controller.buttons[0].pressed;

				if (pressed == true) {
					var input = controller.axes[1];

					if (controller.id == "Daydream Controller") {
						input *= -1;	// for some reason the daydream controller values are swapped?
					}

					const scale = 0.05;

					user.x += vector.x * input * scale;
					user.z += vector.z * input * scale;
					user.y += vector.y * input * scale;
				}



			}

		}

	}
	catch (e) {

	}
}

function renderScene() {

	var t1 = window.performance.now();

	handleController();

	terrainTiles.render(Math.floor(user.x), Math.floor(user.z));
	mapTiles.render(Math.floor(user.x), Math.floor(user.z));
	mapTexture.needsUpdate = mapTiles.checkUpdate();
	terrainTexture.needsUpdate = terrainTiles.checkUpdate();

	const m = 8 / 8; // mesh size / 8 tiles
	mesh.position.x = (-user.x % 1) * m;
	mesh.position.z = (-user.z % 1) * m;
	mesh.position.y = user.y * -1;

	controls.update();	// update HMD head position
	friend.position.x = friendData.x - user.x;
	friend.position.z = friendData.z - user.z;
	friend.position.y = friendData.y - user.y;

	friendPointer.position.x = friendPointerData.x - user.x;
	friendPointer.position.z = friendPointerData.z - user.z;
	friendPointer.position.y = friendPointerData.y - user.y;
	friendPointer.setRotationFromQuaternion(friendPointerQuaternion);


	effect.render(scene, camera);

	frameCounter++;

	var t2 = window.performance.now();

	totalFrameTime += (t2 - t1);

	effect.requestAnimationFrame(renderScene);

}



function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);
}

function long2tile(lon, zoom) { return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))); }
function lat2tile(lat, zoom) { return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }

let geocoder = null;


function geocodeAddress() {
	if (geocoder === null) geocoder = new google.maps.Geocoder()

	var address = document.getElementById('address').value;
	geocoder.geocode({ 'address': address }, function (results, status) {
		if (status === 'OK') {
			console.log('in  ' + results[0].geometry.location.lat() + ' ' + results[0].geometry.location.lng());

			user.x = long2tile(results[0].geometry.location.lng(), zoomLevel); //bugbug put zoom (10) in a var
			user.z = lat2tile(results[0].geometry.location.lat(), zoomLevel); //bugbug put zoom (10) in a var


			console.log('out ' + user.x + ' ' + user.z);


		} else {
			///bugbug alert('Geocode was not successful for the following reason: ' + status);
		}
	});
}

function initMap() {
	document.getElementById('geoControls').addEventListener('submit', function (e) {
		geocodeAddress();
		e.preventDefault();
	});
}

function incomingMessageHandler(data) {
	friendData.x = data.x;
	friendData.y = data.y;
	friendData.z = data.z;

	friendPointerData.x = data.px;
	friendPointerData.y = data.py;
	friendPointerData.z = data.pz;

	friendPointerQuaternion.x = data.qx;
	friendPointerQuaternion.y = data.qy;
	friendPointerQuaternion.z = data.qz;
	friendPointerQuaternion.w = data.qw;

	console.log("[incoming ]" + friendData.x + " " + friendData.y + " " + friendData.z);
}

function init() {



	/*
		worker = new Worker('worker.js');
		worker.needsWork = true;
	
		worker.addEventListener('message', function(e) {
			console.log('Worker said: ', e.data + 'current frame = ' + user.x + ' ' + user.z + ' '+ frameCounter);
			worker.needsWork = true;
		}, false);
	*/


	//SSL
	//If you'd like to display these map tiles on a website that requires HTTPS, use our tile SSL endpoint by replacing http://tile.stamen.com with https://stamen-tiles.a.ssl.fastly.net. Multiple subdomains can be also be used: https://stamen-tiles-{S}.a.ssl.fastly.net
	//JavaScript can be loaded from https://stamen-maps.a.ssl.fastly.net/js/tile.stamen.js.
	//If you need protocol-agnostic URLs, use //stamen-tiles-{s}.a.ssl.fastly.net/, as that endpoint will work for both SSL and non-SSL connections.


	const mapCanvas = document.getElementById('mapCanvas');
	mapTiles = new Tiles('https://stamen-tiles.a.ssl.fastly.net/terrain/' + zoomLevel + '/%x%/%y%.png', mapCanvas, 256, false, '#ffffff');

	const terrainCanvas = document.getElementById('terrainCanvas');
	terrainTiles = new Tiles('https://tile.mapzen.com/mapzen/terrain/v1/terrarium/' + zoomLevel + '/%x%/%y%.png?api_key=mapzen-JcyHAc8', terrainCanvas, 256, false, '#00000000');


	initThree();

	peer = new Peer({
		id: 'frankodev',
		debug: 3,
		host: 'thawing-depths-36140.herokuapp.com',
		port: 443,
		secure: true,
	});

	peer.on('open', function (id) {
		console.log('My peer ID is: ' + id);

		peer.on('connection', function (connX) {
			conn = connX;
			conn.on('data', incomingMessageHandler);
		});
	});

	document.getElementById('connect').addEventListener('click', function () {
		var peerID = document.getElementById('peerID').value;
		conn = peer.connect(peerID);
		conn.on('open', function () {
			///conn.send('hi!');
		});
		conn.on('data', incomingMessageHandler);

		/*
		conn.on('data', function (data) {
			// Will print 'hi!'
			console.log(data);
		});
		*/
	});


	sendFriend();


	renderScene();


	//	terrainTiles.render(user.x, user.z);
	//mapTiles.render(user.x, user.z);

}