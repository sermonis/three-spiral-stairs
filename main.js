import * as THREE from './libs/node_modules/three/build/three.module.js';
import * as dat from './libs/dat.gui.module.js';
import { OrbitControls } from './libs/node_modules/three/examples/jsm/controls/OrbitControls.js';

var renderer;

var scene;

var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(150, 100, 0);

var controls;

//funkciją visko paruošimui, sukuriamas nustatymų GUI ir surenderinamas vieną kartą pagal default nustatymus viskas
function init() {
	var options = {
        Spindulys: 25,
		Laiptai: 20,
        Kampas: 180
      };
	var gui = new dat.GUI();
	//Kiekvieną kart baigus keist nustatymus iš naujo surenderinama scena
	gui.add(options, 'Spindulys', -200, 200).listen().onFinishChange(() => {render(options)});
	gui.add(options, 'Laiptai', 0, 50).listen().onFinishChange(() => {render(options)});
	gui.add(options, 'Kampas', 0, 1080).listen().onFinishChange(() => {render(options)});
	render(options);
}

function render(options) {
	document.getElementById("webgl-output").innerHTML = ''; //ištrinam prieš tai buvusius objektus
	
	//Sukuriam sceną, renderį ir kameros valdymą
	scene = new THREE.Scene();
	renderer = new THREE.WebGLRenderer();
	renderer.setClearColor(new THREE.Color(0x000000));
	renderer.setSize(window.innerWidth, window.innerHeight);
	controls = new OrbitControls( camera, renderer.domElement );
	
	//Pridedam Ambient šviesą
	const light = new THREE.AmbientLight( 0x404040, 3 ); // soft white light
	scene.add( light );
	
	//Pridedam Spotlight šviesą
	const spotLight = new THREE.SpotLight( 0xffffff);
	spotLight.position.set( 0, 80, 0 );
	spotLight.angle = Math.PI/4;
	spotLight.castShadow = true;
	scene.add( spotLight );
	
	//Konstantos valdymui
	const STAIR_QUANTITY = options.Laiptai;
	const PIVOT_RADIUS = options.Spindulys;
	const STAIRCASE_ROTATION = options.Kampas;
	const STARTING_HEIGHT = 50;
	
	// sukuriam laiptelį
	var step = createStep();
	
	//sukuriam laiptelio veidrodinę versiją
	var stepMirrored = step.clone();
	stepMirrored.position.x -= 20;
	stepMirrored.rotation.y += -1 * Math.PI;
	stepMirrored.position.y += 1;
	
	//sukuriam konstrukcijų ir turėklo medžiagą
	const construction_material = new THREE.MeshPhongMaterial({color:0x979997});
	
	//Sukuriam cilindrą einantį iš laiptelio apačios
	var geometry = new THREE.CylinderGeometry( 1, 1, STARTING_HEIGHT/STAIR_QUANTITY + 1, 32 );
	var cylinder = new THREE.Mesh( geometry, construction_material );
	cylinder.position.add(getCenterPoint(step));
	cylinder.position.y -= (STARTING_HEIGHT/STAIR_QUANTITY + 1)/2
	
	//Pridedam cilindrą prie abiejų laiptelių versijų
	step.attach(cylinder.clone());
	stepMirrored.attach(cylinder);
	
	//Sukuriam turėklo cilindrą
	var geometry = new THREE.CylinderGeometry( 1, 1, 20, 32 );
	var cylinder = new THREE.Mesh( geometry, construction_material );
	cylinder.position.x -= 1;
	cylinder.position.y += 10
	
	//Pridedam turėklo cilindrą šalia laiptelių
	step.attach(cylinder.clone());
	stepMirrored.attach(cylinder);
	
	//Nustatom laiptelių pradinį aukštį
	step.position.y = STARTING_HEIGHT - 1;
	stepMirrored.position.y = STARTING_HEIGHT;
	
	//Apskaičiuojam koks bus pasukimas tarp kiekvieno laiptelio
	var rotation = STAIRCASE_ROTATION / 180 / STAIR_QUANTITY * Math.PI;
	if (PIVOT_RADIUS < 0) { //Jei sukimosi ašis kitoj pusėj, sukam į priešingą pusę
		rotation = STAIRCASE_ROTATION / 180 / STAIR_QUANTITY * -Math.PI;
	}
	
	//sukuriam ašį aplink kurį suksim laiptelius
	var pivot = new THREE.Group();
	pivot.position.x -= PIVOT_RADIUS; //Pastumiam ašį pagal nustatymus
	
	//Pridedam pirmą laiptelį
	var all_steps = [];
	var clone = step.clone(); //Sukuriam laiptelio kloną
	scene.add(clone); //Pridedam pirmą laiptelį į sceną
	all_steps.push(clone); //Pridedam į masyvą išsisaugojimui
	
	//Nuleidžiam laiptelius
	stepMirrored.position.y -= STARTING_HEIGHT/STAIR_QUANTITY; 
	step.position.y -= STARTING_HEIGHT/STAIR_QUANTITY;
	//step.position.y -= STARTING_HEIGHT/STAIR_QUANTITY/2;
	
	//Vykdom ciklą sukurti likusiems laipteliams, kartu su konstrukcijų, bei turėklų cilindrais.
	for (var i = 1; i < STAIR_QUANTITY ; i++) {
		
		if(i%2==0) { //Pasirenkam kurią laiptelio versiją naudosim
			clone = step.clone();
		} else {
			clone = stepMirrored.clone()
		}

		pivot.add(clone) //Pririšam naują laiptelį prie ašies
		clone.position.sub(pivot.position); //Sunormalizuojam naujo laiptelio vietą, nes ji pasikeitė pridėjus pririšus prie ašies
		pivot.rotateY(rotation); //Pasukam ašį, kartu ir laiptelį aplink jį
		scene.attach(clone); //Pririšam laiptelį atgal prie scenos, t.y. atrišam šį naują laiptelį nuo ašies, kad nebesisuktų
		scene.add(clone); //Pridedam laiptelį į sceną
		all_steps.push(clone); //Išsisaugom laiptelį
		
		//Numažinam laiptelių aukštį
		stepMirrored.position.y -= STARTING_HEIGHT/STAIR_QUANTITY;
		step.position.y -= STARTING_HEIGHT/STAIR_QUANTITY;
	}
	
	//Sukuriam konstrukciją tarp antro aukšto ir pirmo laiptelio
	geometry = new THREE.BoxGeometry(2, 2, 8);
	var cube = new THREE.Mesh( geometry, construction_material );
	cube.position.add(all_steps[0].position);
	cube.position.x -= 10;
	cube.position.z += 4;
	cube.position.y -= 1; 
	scene.add(cube);
	
	//Ciklas sukurti stačiakampes konstrukcijas tarp laiptelių
	for (var i = 0; i < STAIR_QUANTITY - 1 ; i++) {
		//Iš išsisaugotų laiptelių pasiėmam laiptelio konstrukcijos cilindrą ir nustatom stačiakampio pirmo šono poziciją
		var position1 = new THREE.Vector3(0,0,0);
		all_steps[i].children[0].getWorldPosition(position1);
		position1.y -= (STARTING_HEIGHT/STAIR_QUANTITY + 1 + 2) / 2;
		
		//Iš išsisaugotų laiptelių pasiėmam sekančio laiptelio konstrukcijos cilindro viršų ir nustatom stačiakampio antro šono poziciją
		var position2 = new THREE.Vector3(0,0,0);
		all_steps[i + 1].children[0].getWorldPosition(position2);
		position2.y += (STARTING_HEIGHT/STAIR_QUANTITY ) / 2;
		
		//Susikuriam vektorių tarp šių pozicijų
		var p1_to_p2 = position2.clone();
		p1_to_p2.sub(position1);
		
		//Pagal pozicijų vektorių nustatom kokiu kampu reikės pasukti stačiakampį
		var boxRotation = new THREE.Vector3(0,0,-1).angleTo(p1_to_p2.clone());
		if (p1_to_p2.x > 0) {
			boxRotation = -boxRotation;
		};
		//Pagal pozicijų atstumą nustatom, kokio ilgio turės būti stačiakampis
		var length = position1.distanceTo(position2);
		
		//sukuriam stačiakampį
		geometry = new THREE.BoxGeometry(2, 2, length);
		var cube = new THREE.Mesh( geometry, construction_material );
		
		//nustumiam stačiakampį į reikiamą poziciją
		cube.position.add(position1);
		cube.position.z -= length/2 - 1;
		
		//sukuriam ašį pirmoje pozicijoje ir pasukam stačiakampį aplink ją, kad susijungtų su kitu laiptu
		var box_pivot = new THREE.Group();
		box_pivot.position.add(position1.clone());
		box_pivot.attach(cube);
		box_pivot.rotateY(boxRotation);
		scene.attach(cube);
		
		//Pridedam stačiakampį į sceną
		scene.add( cube );
	}
	
	//Ciklas surinkti visų turėklų cilindrų viršutinius taškus
	var points = [];
	for (var i = 0; i < STAIR_QUANTITY ; i++) {
		var position = new THREE.Vector3(0,0,0);
		all_steps[i].children[1].getWorldPosition(position);
		position.y += 10;
		points.push(position);
	}

	//Sukuriam turėklą pagal cilindrų taškus
	const curve = new THREE.SplineCurve3(points);
	const tubeGeometry = new THREE.TubeGeometry(curve);
	var tube = new THREE.Mesh( tubeGeometry, construction_material );
	scene.add(tube);
	
	//Sukuriam grindų medžiagą
	var planeMaterial = new THREE.MeshLambertMaterial({color: 0x330000});
	
	//Sukuriam pirmo aukšto grindis
	var planeGeometry = new THREE.PlaneGeometry(300, 300);
	var plane = new THREE.Mesh(planeGeometry, planeMaterial);
	plane.rotation.x = -0.5 * Math.PI;
	plane.position.set(15, 0, 0);
	scene.add(plane);
	
	//sukuriam antro aukšto mažą platformą
	planeGeometry = new THREE.PlaneGeometry(50, 40);
	var plane = new THREE.Mesh(planeGeometry, planeMaterial);
	plane.rotation.x = -0.5 * Math.PI;
	plane.position.set(10, STARTING_HEIGHT, 24);
	scene.add(plane);

	
	// Pridedam surenderintą vaizdą prie html, kad pavaizduot viską
	document.getElementById("webgl-output").appendChild(renderer.domElement);

	// surenderinam sceną
	renderer.render(scene, camera);
}

//Funkcija laipteliui sukurti
function createStep() {
	//apsibrėžiam laiptelio formą
	const length = 20, width = 8; //apsibrėžiam išmatavimų konstantas
	const shape = new THREE.Shape();
	shape.moveTo( 0, -width/2 ); // Pradinis taško plotis minuse, kad laiptelio geometrinė pozicija, būtų laiptelio šono centre
	shape.lineTo( 0, width/2 );
	shape.lineTo( length, width/2);
	shape.lineTo( length, -width/2 * 0.2 );
	shape.bezierCurveTo( length*0.75, -width/2, length*0.25, -width/2, 0, -width/2);

	const extrudeSettings = {
		steps: 2,
		bevelEnabled: false,
		depth: 1,
		curveSegments: 8
	};

	//sukuriam laiptelį, pagal apsibrėžtą formą
	const geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
	var stepMaterial = new THREE.MeshLambertMaterial();
	const texture = new THREE.TextureLoader().load( "textures/wood.jpg" );
	texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set( 1, 0.25 );
	stepMaterial.map = texture;
	const mesh = new THREE.Mesh( geometry, stepMaterial ) ;
	mesh.rotation.x = -0.5 * Math.PI;
	mesh.rotation.z = Math.PI;
	mesh.position.x += length;
	return mesh;
}

//funkcija rasti objekto geometrinį centrą
function getCenterPoint(mesh) {
    var middle = new THREE.Vector3();
    var geometry = mesh.geometry;

	//apskaičiuojam objekto kraštus
    geometry.computeBoundingBox();

	//pagal kraštus nustatom kur yra objekto centras
    middle.x = (geometry.boundingBox.max.x + geometry.boundingBox.min.x) / 2;
    middle.y = (geometry.boundingBox.max.y + geometry.boundingBox.min.y) / 2;
    middle.z = (geometry.boundingBox.max.z + geometry.boundingBox.min.z) / 2;

    return middle;
}

//funkcija animacijai, šiuo atveju, judėjimui aplink sceną
function animate() {

	requestAnimationFrame( animate );

	// required if controls.enableDamping or controls.autoRotate are set to true
	controls.update();

	renderer.render( scene, camera );

}

init();
animate();