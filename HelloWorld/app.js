"use strict";

// TODO Add location to URL when focus changes away from content
// TODO Allow HMD rotate in WebVR
// TODO add back 8k mode for Edge

document.addEventListener("DOMContentLoaded", init); // main init

// autoflying mode
let flying = false;
let flyingVector = new THREE.Vector3(0, 0, 0);

let windowIsActive = true;
window.addEventListener('xfocus', () => { windowIsActive = true })
window.addEventListener('xblur', () => { if (flying===false) { windowIsActive = false } })

// the (slippy tile) location on the map (x, z) we are currently above (y)
let user = new THREE.Vector3(331.02, 1.55, 722.992);

const tileDimension = 256;	// Slippy map tiles are 256 x 256 pixels
let terrainTiles;	  		// Tiles.js instance for elevation data
let mapTiles;		 		// Tiles.js instance for pixel color values

// The zoom level of the slippy map we're using
const mapZoom = 11;
const terrainZoom = 11; 
// TODO we can use a lower texture resolution & higher zoom for terrain and save memory, GPU bandwidth
// The terrain texture only has to match the mesh complexity (currenyly 512x512 )

let zFactor = 1;
let mapSize;

let coolPlaces = [
{
	// calgary
	lat: 51.00792117737652,
	long: -113.72016281041633,
	altitude: 0.7,
	x: 0.5192160218387453,
	y: 1.111386550103285,
	z: -0.13997011027038148
},{
	// baja
	lat: 32.57489142452417,
	long: -117.55620298853591,
	altitude: 0.35,
	x: -0.4672378333309644,
	y: 0.9604801073466033,
	z: -0.6192929382362446

},{
	// everest
	lat: 28.981259082440634,
	long: 86.8987579332611,
	altitude: 0.2,
	x: 0.04412079812160909,
	y: 0.407682868650855,
	z: -0.9120570342810701
},{
	// taranaki
	lat: -39.497514052713164,
	long: 173.26214310553706,
	altitude: 0.2,
	x: -1.03636448474885,
	y: 0.9688781772202125,
	z: 0.1943444831548005
},{
	// kilimanjaro
	lat: -3.388293006768995,
	long: 37.694583068492136,
	altitude: 0.3,
	x: 0.7298929322802403,
	y: 0.6943702114948183,
	z: 0.30518774187903275
},{
	// denali
	lat: 63.5339147484756,
	long: -149.00247516698886,
	altitude: 0.75,
	x: 0.38637821825866064,
	y: 0.8868423401837369,
	z: -0.2534216567554871
},
{
	// grand canyon
	lat: 36.309510819387796 ,
	long: -111.11374090546788,
	altitude: 0.4,
	x: 0.665384046849869,
	y: 0.7443277479452758,
	z: -0.05692340323983429
},
{
	// fractal lake
	lat: 23.722306617661523,
	long: 32.964605191783505,
	altitude: 0.2,
	x: 0.14156320405053108,
	y: 0.8650418997772855,
	z: -0.4813131734002848
},
{
	// cape town
	lat: -34.42967306621232,
	long: 18.680925276611077,
	altitude: 0.2,
	x: -0.1216409382680244,
	y: 0.6663093574533964,
	z: 0.7356869730444578
},
{
	// mt fuji
	lat: 35.338586760120926,
	long: 138.8921871397833,
	altitude: 0.15,
	x: 0.9005882030186811,
	y: 0.4006935633615168,
	z: -0.16848013789237243
}
];

function setFlyMode(setting) {
	if (setting === true) {
		flyingVector.x = flyingVector.y = 0;
		flyingVector.z = -0.003;
		flyingVector.applyQuaternion(camera.quaternion);
		flyingVector.y = 0; // don't lose altitude
		// BUGBUG TODO Normalize the vector so that we alway fly at a constant speed
		flying = true;
	}
	else {
		flyingVector.x = flyingVector.y = flyingVector.z = 0;
		flying = false;
	}
}

function GotoRandomCoolPlace() {
	let p = coolPlaces[Math.floor(Math.random() * coolPlaces.length)];

	//p.lat = Math.random() * 170 - 85;
	//p.long = Math.random() * 360 - 180;
	
	const radLad = p.lat  * (Math.PI / 180);

	let metersPerPixel = (156543.03 * Math.cos(radLad) / Math.pow(2, mapZoom));

	zFactor = 10000 / (metersPerPixel * canvasComplexity / mesh.geometry.parameters.width);
		
	material.uniforms.zFactor.value = zFactor; // * mesh.geometry.parameters.width;

	//zFactor = 28000;
	//material.uniforms.zFactor = zFactor;
	


	user.z = lat2tile(p.lat, mapZoom);
	user.x = long2tile(p.long, mapZoom);
	user.y = p.altitude;

	camera.position.x = p.x;
	camera.position.y = p.y;
	camera.position.z = p.z;
	camera.lookAt(new THREE.Vector3(0, 0, 0));

	setFlyMode(true);
}

function handleKey(e) {

	const step = 0.05;
	let vector = new THREE.Vector3(0, 0, 0);
	e = e || window.event;

	switch (e.key) {
		case 'f': //flying
			setFlyMode(!flying);
			break;
		case 'Up':
		case 'ArrowUp':
			vector.z = -step;
			setFlyMode(false);
			break;
		case 'Down':
		case 'ArrowDown':
			vector.z = step;
			setFlyMode(false);
			break;
		case 'Left':
		case 'ArrowLeft':
			vector.x = -step;
			setFlyMode(false);
			break;
		case 'Right':
		case 'ArrowRight':
			vector.x = step;
			setFlyMode(false);
			break;
		case '[':
		case 'PageDown':
			user.y -= step;
			setFlyMode(false);
			break;
		case 'PageUp':
		case ']':
			user.y += step;
			setFlyMode(false);
			break;
		case '1':
			// Dump location data to console so that we can add a cool place
			console.log(tile2lat(user.z, mapZoom) + ' ' + tile2long(user.x, mapZoom));
			console.log(user.y);
			console.log(camera.position.x + ' ' + camera.position.y + ' ' + camera.position.z);
			break;
		case '2':
		case 'r':
		case 'R':
			GotoRandomCoolPlace();
			break;
		default:
	}

	vector.applyQuaternion(camera.quaternion);
	user.x += vector.x;
	user.z += vector.z;

	// TODO To avoid 'janky' key movement, add an animation system 
}

/// three js:
let scene, camera, renderer;
let vrControls;
let orbitControls;
let effect; // the webvr renderer
let geometry, material, mesh;

let terrainTexture;
let mapTexture;

let laserPointer;  // the cursor / pointer we're drawing for the gamepad

function long2tile(lon, zoom) { return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))); }
function lat2tile(lat, zoom) {
	let f = Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180);
	return (Math.floor((1 - Math.log(f) / Math.PI) / 2 * Math.pow(2, zoom)));
}

function tile2long(x, z) { return (x / Math.pow(2, z) * 360 - 180); }
function tile2lat(y, z) { let n = Math.PI - 2 * Math.PI * y / Math.pow(2, z); return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))); }

function isMobile() {
	return (navigator.userAgent.toLowerCase().indexOf('mob') != -1);
}

let moving = false;
let downTime = 0;
function orbitMouseDown() {
	moving = true;
	downTime = window.performance.now();
}

function orbitMouseUp() {
	downTime = 0;
	moving = false;
}

// TODO move all desktop/mobile complexity const to a struct
let canvasComplexity;

function handleController() {
	// Handle controller input

	let hasPointerHardware = false;

	try {

		let gamepads = navigator.getGamepads();

		for (let i = 0; i < gamepads.length; ++i) {
			let controller = gamepads[i];

			if (controller != null) {

				if (controller.pose.hasPosition == true) {
					try {
						laserPointer.position.x = controller.pose.position[0];
						laserPointer.position.y = controller.pose.position[1];
						laserPointer.position.z = controller.pose.position[2];
					}
					catch (e) {

					}

				}
				else {
					//laserPointer.position.x = camera.position.x + 0.1; //bugbug
					laserPointer.position.y = camera.position.y - 0.2;
					//laserPointer.position.z = camera.position.z - 0.1;
				}

				let quaternion = new THREE.Quaternion().fromArray(controller.pose.orientation);
				laserPointer.setRotationFromQuaternion(quaternion);

				hasPointerHardware = true;

				let vector = new THREE.Vector3(0, 0, -1);
				vector.applyQuaternion(quaternion);

				let pressed = controller.buttons[0].pressed;

				if (pressed == true) {
					let input = controller.axes[1];

					if (controller.id == "Daydream Controller") {
						input *= -1;	// for some reason the daydream controller values are swapped?
					}

					const scale = 0.01;

					user.x += vector.x * input * scale;
					user.z += vector.z * input * scale;
					user.y += vector.y * input * scale;
				}



			}

		}

	}
	catch (e) {

	}

	laserPointer.visible = hasPointerHardware;

}

function renderFrame() {

	effect.requestAnimationFrame(renderFrame);

	// Save power and performance by not rendering when window is in the background
	if (!windowIsActive) return;

	user.add(flyingVector);

	handleController();

	const fx = user.x;
	const fz = user.z;

	const longtitude = tile2long(fx, mapZoom);
	const latitude = tile2lat(fz, mapZoom);

	terrainTiles.render(longtitude, latitude);
	{
		material.uniforms.terrainTextureOffset.value.x = terrainTiles.getNormalizedOffsetX();
		material.uniforms.terrainTextureOffset.value.y = terrainTiles.getNormalizedOffsetY();
		material.uniforms.terrainTextureOffset.value.needsUpdate = true;

		let tile = terrainTiles.getRenderTile();
		if (!!tile) {
			terrainTexture.update(tile.image, tile.drawX, tile.drawY);
		}
	}

	mapTiles.render(longtitude, latitude);
	{
		// TODO optimize
		material.uniforms.mapTextureOffset.value.x = mapTiles.getNormalizedOffsetX();
		material.uniforms.mapTextureOffset.value.y = mapTiles.getNormalizedOffsetY();
		material.uniforms.mapTextureOffset.value.needsUpdate = true;

		let tile = mapTiles.getRenderTile();
		if (!!tile) {
			mapTexture.update(tile.image, tile.drawX, tile.drawY);
		}



	}

	const m = geometry.parameters.width / (canvasComplexity / tileDimension); // mesh size / n tiles

	const offsetX = ((-1 * (user.x % 1) + 0.5));
	const offsetZ = ((-1 * (user.z % 1) + 0.5));

	mesh.position.x = offsetX * m;
	mesh.position.z = offsetZ * m;
	mesh.position.y = user.y * -1;

	material.uniforms.mapPosition.value.x = 0.5 - offsetX / (canvasComplexity / tileDimension);
	material.uniforms.mapPosition.value.y = 0.5 - offsetZ / (canvasComplexity / tileDimension);
	material.uniforms.mapPosition.value.needsUpdate = true;

	/*
		disable moving to do some performance tests
		if (true == moving) {
			if (window.performance.now() - downTime > 1000) {
				// wait 1000ms before moving forward
				// this gives the user time to turn the camera
				let vector = new THREE.Vector3(0, 0, -0.001);
				vector.applyQuaternion(orbitControls.object.quaternion);
				user.add(vector);
			}
		}
	*/
	vrControls.update();	// update HMD head position

	// Shouldn't flying to high or too low...
	//if (user.y < 0.1) user.y = 0.1;
	//if (user.y > 2) user.y = 2;
	// BUGBUG TODO move this to keyboard handler? Avoid jank

	effect.render(scene, camera);

}

// Resize the WebGL canvas when the window size changes
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

let geocoder;
function geocodeAddress() {
	geocoder = new google.maps.Geocoder()

	let address = document.getElementById('address').value;
	geocoder.geocode({ 'address': address }, function (results, status) {
		if (status === 'OK') {

			user.x = long2tile(results[0].geometry.location.lng(), mapZoom);
			user.z = lat2tile(results[0].geometry.location.lat() - 0.152, mapZoom); // south... to put object in view

			renderer.domElement.focus();

		} else {
			// Geocode was not successful for reason = status
		}
	});
}

// Main initialization
function init() {

	// Set up maps

	scene = new THREE.Scene();

	renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('vrCanvas'), preserveDrawingBuffer: true }); //bugbug this might kill mobile perf?
	renderer.setClearColor(0x87ceff, 1);

	effect = new THREE.VREffect(renderer);

	//redundant renderer.setSize(document.body.clientWidth, document.body.clientHeight);
	renderer.setPixelRatio(window.devicePixelRatio);

	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
	camera.lookAt(new THREE.Vector3(0, -0.5, -1));

	{
		let pointerGeometry = new THREE.CylinderGeometry(0.01, 0.01, 100, 4); //bugbug top and bottom are swapped?
		pointerGeometry.rotateX(0.25 * 2 * Math.PI);
		let pointerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
		laserPointer = new THREE.Mesh(pointerGeometry, pointerMaterial);
	}
	scene.add(laserPointer);

	let meshComplexity = isMobile() ? 128 : 512;
	canvasComplexity = isMobile() ? 2048 : 4096;
 	mapSize = 10;

	geometry = new THREE.PlaneGeometry(mapSize, mapSize, meshComplexity, meshComplexity);

	terrainTiles = new Tiles('https://tile.mapzen.com/mapzen/terrain/v1/terrarium/%zoom%/%x%/%y%.png?api_key=mapzen-JcyHAc8', canvasComplexity, terrainZoom);
	mapTiles = new Tiles('https://b.tiles.mapbox.com/v4/mapbox.satellite/%zoom%/%x%/%y%.pngraw?access_token=pk.eyJ1IjoiZnJhbmtvbGl2aWVyIiwiYSI6ImNqMHR3MGF1NTA0Z24ycW81dXR0dDIweDMifQ.SoQ9aqIfdOheISIYRqgR7w', canvasComplexity, mapZoom);

	const gl = renderer.context;

	let vertexShader =
		"varying vec2 vUV; " +
		"uniform sampler2D terrainTexture;" +
		"uniform vec2 terrainTextureOffset; " +
		"uniform float zFactor; " +		
		"varying float vDistance; " +
		"void main() { " +
		"  vUV = vec2(uv.x, 1.0 - uv.y); vec4 s = texture2D(terrainTexture, vUV + terrainTextureOffset) * 256.0; " +
		"  float elevation = s.r * 256.0 + s.g + s.b / 256.0 - 32768.0; " +
		"  elevation = clamp(elevation, 0.0, 10000.0); " +					// Clamp to sea level and Everest
		"  elevation = elevation / 10000.0; " +  
		"  elevation = elevation * zFactor; " +   							// TODO change this based on latitude 
		//"  elevation = elevation / 14000.0; " +   							// TODO change this based on latitude 
		"  vec3 p = position;" + 												// 'position' is a built-in three.js construct
		"  p.z += elevation; " +
		"  gl_Position = projectionMatrix * modelViewMatrix * vec4(p.x, p.y, p.z, 1.0 ); " +
		"  vDistance = distance(gl_Position.xyz, vec3(0.0, 0.0, 0.0));" +
		"}";

	let fragmentShader =
		"varying vec2 vUV; " +
		"uniform sampler2D mapTexture; " +
		"uniform vec2 mapTextureOffset; " +
		"uniform vec2 mapPosition; " +
		"varying float hazeStrength; " +
		"varying float vDistance;" +
		"void main() { " +
		"  gl_FragColor = texture2D(mapTexture, vUV + mapTextureOffset); " +
		"  if (vDistance < 0.8) {" + // Blur texture if close to the camera
		"  gl_FragColor += texture2D(mapTexture, vUV + mapTextureOffset + vec2(1.0 / " + canvasComplexity + ".0, 1.0 / " + canvasComplexity + ".0)); " +
		//"  gl_FragColor.r += 1.0;" +
		"  gl_FragColor /= 2.0;" +
		"  }" +
        "  float fDistance = distance(mapPosition, vUV);" + 
		"  float hazeStrength = smoothstep(0.25, 0.46, fDistance);" + //TODO tileCount / 8 * 7.5
		//" hazeStrength = 0.0; " +
		"  gl_FragColor = mix(gl_FragColor, vec4(135.0 / 256.0, 206.0 / 256.0, 1.0, 1.0), hazeStrength); " +
		//"  gl_FragColor = mix(gl_FragColor, vec4(1.0, 1.0, 1.0, 1.0), hazeStrength); " +

		//"	{" +
		//" gl_FragColor.r = 1.0;" +
		//" gl_FragColor.g = 1.0;" +
		//" gl_FragColor.b = 1.0;" +
		//"	}" +
		"}";


	terrainTexture = new UpdatableTexture();
	terrainTexture.setRenderer(renderer);
	terrainTexture.minFilter = THREE.NearestFilter;
	terrainTexture.magFilter = THREE.NearestFilter;
	terrainTexture.wrapS = THREE.RepeatWrapping;
	terrainTexture.wrapT = THREE.RepeatWrapping;
	terrainTexture.anisotropy = 1;
	terrainTexture.generateMipmaps = false;

	mapTexture = new UpdatableTexture();
	mapTexture.setRenderer(renderer);
	mapTexture.minFilter = THREE.LinearMipMapLinearFilter;
	mapTexture.magFilter = THREE.LinearFilter;
	mapTexture.wrapS = THREE.RepeatWrapping;
	mapTexture.wrapT = THREE.RepeatWrapping;
	mapTexture.generateMipmaps = true;
	mapTexture.anisotropy = 1; //renderer.getMaxAnisotropy();

	mapTexture.flipY = false;



	material = new THREE.ShaderMaterial({
		uniforms: {
			terrainTexture: { type: 't', value: terrainTexture },
			terrainTextureOffset: { value: new THREE.Vector2() },
			zFactor: { type: 'f', value: 1.0 },
			mapTexture: { type: 't', value: mapTexture },
			mapTextureOffset: { value: new THREE.Vector2() },
			mapPosition: { value: new THREE.Vector2() }
		},
		vertexShader: vertexShader,
		fragmentShader: fragmentShader
	});

	mesh = new THREE.Mesh(geometry, material);

	mesh.lookAt(new THREE.Vector3(0, 1, 0));

	scene.add(mesh);

	vrControls = new THREE.VRControls(camera);
	vrControls.standing = false;

	// non-VR controls
	orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
	orbitControls.maxPolarAngle = Math.PI * 0.7;
	orbitControls.minDistance = 0.1;
	orbitControls.maxDistance = 10;
	orbitControls.enableKeys = false;

	orbitControls.autoRotate = true;
	orbitControls.autoRotateSpeed = 0.03;
	orbitControls.enableDamping = true;
	orbitControls.dampingFactor = 0.1;
	orbitControls.rotateSpeed = 0.1;
	orbitControls.maxPolarAngle = Math.PI / 2 - .04;
	//orbitControls.target.set(0, 5, 0);

	orbitControls.update();

	renderer.domElement.addEventListener("mousedown", orbitMouseDown);
	renderer.domElement.addEventListener("mouseup", orbitMouseUp);
	renderer.domElement.addEventListener("mouseout", orbitMouseUp);
	renderer.domElement.addEventListener("touchstart", orbitMouseDown);
	renderer.domElement.addEventListener("touchend", orbitMouseUp);

	document.getElementById('vrButton').onclick = function () {
		if (window.VRDisplay === undefined) {
			renderer.domElement.webkitRequestFullscreen();
		}
		else {
			effect.isPresenting ? effect.exitPresent() : effect.requestPresent();

		}
	};

	effect.render(scene, camera); // Need to call this at least once to init texture system

	terrainTexture.setSize(canvasComplexity, canvasComplexity);
	mapTexture.setSize(canvasComplexity, canvasComplexity);

	window.addEventListener("resize", onWindowResize);
	onWindowResize();

	document.onkeydown = handleKey;

	document.getElementById('address').onkeydown = function (e) {
		e.stopPropagation();
	};

	renderer.domElement.onclick = function (e) { renderer.domElement.focus() };

	document.getElementById('geoControls').addEventListener('submit', function (e) {
		geocodeAddress();
		e.preventDefault();
	});

	GotoRandomCoolPlace();

	renderFrame();	// Start main rendering loop
}