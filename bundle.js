
import * as THREE from './module/build/three.module.js';
import {SkeletonUtils} from './module/jsm/utils/SkeletonUtils.js';
import {FBXLoader} from './module/jsm/loaders/FBXLoader.js';
import Stats from './module/jsm/libs/stats.module.js';
import {Tools} from './module/jsm/main/tools.js';
import {Terrain} from './module/jsm/main/Terrain.js?1';
import {TextureAtlasCreator} from './module/jsm/main/TextureAtlasCreator.js';
import {FirstPersonControls} from './module/jsm/main/FirstPersonControls.js';
import {InventoryBar} from './module/jsm/main/InventoryBar.js';
import {AssetLoader} from './module/jsm/main/AssetLoader.js?3';

var canvas,renderer,scene,camera,stats,raycaster,
  gameState,world,cube,FPC,socket,
  playerObject,materials,parameters;


var al=new AssetLoader()
$.get(`assets/assetLoader.json?${Tools.uuidv4()}`,function (assets){
  al.load(assets,function (){
    console.log("AssetLoader: done loading!")
    init()
    animate()
  },al)
})

function init(){
  //basic setups
    canvas = document.querySelector('#c');
    renderer = new THREE.WebGLRenderer({
      canvas,
      PixelRatio:window.devicePixelRatio
    });
    scene = new THREE.Scene();
    scene.background = new THREE.Color("lightblue");
    camera = new THREE.PerspectiveCamera(75, 2, 0.1, 1000);
    camera.rotation.order = "YXZ"
    camera.position.set(26, 26, 26)

    
    var ambientLight = new THREE.AmbientLight(0xcccccc);
    scene.add(ambientLight);
    var directionalLight = new THREE.DirectionalLight(0x333333, 2);
    directionalLight.position.set(1, 1, 0.5).normalize();
    scene.add(directionalLight);
    raycaster = new THREE.Raycaster();
    var fbxl = new FBXLoader();
    gameState="menu";
  

  //Snowflakes
    var geometry = new THREE.BufferGeometry();
    var vertices = [];
    materials=[]
    var sprite1 = al.get("snowflake1")
    var sprite2 = al.get("snowflake2")
    var sprite3 = al.get("snowflake3")
    var sprite4 = al.get("snowflake4")
    var sprite5 = al.get("snowflake5")
    for ( var i = 0; i < 100; i ++ ) {
      var x = Math.random() * 2000 - 1000;
      var y = Math.random() * 2000 - 1000;
      var z = Math.random() * 2000 - 1000;
      vertices.push( x, y, z );
    }
    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
    parameters = [
      [[ 1.0, 0.2, 0.5 ], sprite2, 20 ],
      [[ 0.95, 0.1, 0.5 ], sprite3, 15 ],
      [[ 0.90, 0.05, 0.5 ], sprite1, 10 ],
      [[ 0.85, 0, 0.5 ], sprite5, 8 ],
      [[ 0.80, 0, 0.5 ], sprite4, 5 ]
    ];
    for ( var i = 0; i < parameters.length; i ++ ) {
      var color = parameters[ i ][ 0 ];
      var sprite = parameters[ i ][ 1 ];
      var size = parameters[ i ][ 2 ];
      materials[ i ] = new THREE.PointsMaterial( { size: size, map: sprite, blending: THREE.AdditiveBlending, depthTest: false, transparent: true } );
      materials[ i ].color.setHSL( color[ 0 ], color[ 1 ], color[ 2 ] );
      var particles = new THREE.Points( geometry, materials[ i ] );
      particles.rotation.x = Math.random() * 6;
      particles.rotation.y = Math.random() * 6;
      particles.rotation.z = Math.random() * 6;
      scene.add( particles );
    }
    for ( var i = 0; i < materials.length; i ++ ) {
      materials[ i ].map = parameters[ i ][ 1 ];
      materials[ i ].needsUpdate = true;
    }


  //Clouds
    var clouds=al.get("clouds");
    clouds.scale.x=0.1
    clouds.scale.y=0.1
    clouds.scale.z=0.1
    clouds.position.y=100
    scene.add( clouds );


  //Ghast1
    var ghast=al.get("ghastF")
    const texturex1 = al.get("ghast")
    texturex1.magFilter = THREE.NearestFilter;
    ghast.children[1].material.map=texturex1
    

    ghast.children[0].children[0].scale.set(0.01,0.01,0.01)
    ghast.children[1].material.color=new THREE.Color( 0xffffff );
    var mat=ghast.children[1].material.clone()
    scene.add(ghast)
  //Ghast2
    
    const ghast2=SkeletonUtils.clone(ghast);
    const texturex2 = al.get("ghastS")
    texturex2.magFilter = THREE.NearestFilter;

    ghast2.children[1].material=mat
    ghast2.children[1].material.map=texturex2
    ghast2.position.set(3,0,0)
    scene.add(ghast2)


  //Player
    var playerObject=al.get("player")
    var texturex = al.get("steve")
    texturex.magFilter = THREE.NearestFilter;
    playerObject.children[1].scale.set(1,1,1)
    playerObject.children[1].position.set(25,25,25)
    playerObject.children[0].material.map=texturex
    playerObject.children[0].material.color=new THREE.Color( 0xffffff );
    playerObject.children[1].scale.set(0.5,0.5,0.5)
  

  //Setup world
    var worldMaterial=new THREE.MeshLambertMaterial({
      side: 0
    })    
    world = new Terrain({
      textureMaterial: worldMaterial,
      textureRows: 27,
      textureCols: 27,
      cellSize: 16,
      scene:scene
    })
    world.textureAtlasMapping=al.get("textureMappingJson")
    

  //Load Custom blocks models
    var blocks=al.get("blocks")
    world.blocks=blocks
    var modelsNumber=0;
    var modelsLoaded=0;
    var modelsToLoad=[];
    Object.keys(blocks).forEach(function (p){
      if(!blocks[p].isBlock && p!=0){
        var modelPath=`assets/models/${blocks[p].model}`;
        modelsNumber++;
        modelsToLoad.push(blocks[p])
      }
    })
    for(var i=0;i<modelsToLoad.length;i++){
      (function () {
        var block=modelsToLoad[i];
        fbxl.load( `assets/models/${block.model}`, function ( object ) {
          var geometry=object.children[0].geometry;
          if(block.name=="anvil"){
            geometry.rotateX(-Math.PI/2)
            geometry.translate(0,0.17,0)
            geometry.translate(0,-0.25,0)
          }
          world.saveModel(geometry,block.name)
          modelsLoaded++;
          if(modelsLoaded==modelsNumber){
            console.log("Custom blocks models loaded!")
          }
        });
      })();
    }


  //animated Texture Atlas
    var textureAtlasX = al.get("textureAtlasX")
    var textureMappingX = al.get("textureMappingX")

    var atlasCreator=new TextureAtlasCreator({
      textureX:textureAtlasX,
      textureMapping:textureMappingX
    })
    var savedTextures=[]
    for(var i=0;i<10;i++){
      var t=atlasCreator.gen(i).toDataURL();
      var tekstura=new THREE.TextureLoader().load(t);
      tekstura.magFilter = THREE.NearestFilter;
      savedTextures.push(tekstura)
    }
    var tickq=0;

    setInterval(function (){
      tickq++;
      var tekst=savedTextures[tickq%9];
      worldMaterial.map=tekst

      worldMaterial.map.needsUpdate=true;
    },100)
  

  //Socket io setup
    socket=io.connect("http://localhost:35565");
    socket.on("connect",()=>{
      console.log("Połączono z serverem!")
    })
    socket.on("blockUpdate",function (block){
      world.setVoxel(...block)
    })

  //Socket.io players
    var playersx={}
    socket.on("playerUpdate",function (players){
      var sockets={};
      Object.keys(players).forEach(function (p){
        sockets[p]=true;
        if(playersx[p]==undefined && p!=socket.id){
          playersx[p]=SkeletonUtils.clone(playerObject);
          scene.add(playersx[p])
        }
        try{
          playersx[p].children[1].position.set(players[p].x,players[p].y-0.5,players[p].z)
          playersx[p].children[1].children[0].children[0].children[0].children[2].rotation.x=players[p].xyaw;
          playersx[p].children[1].children[0].rotation.z=players[p].zyaw
        }catch(e){}
      })
      Object.keys(playersx).forEach(function (p){
        if(sockets[p]==undefined){
          scene.remove(playersx[p]);
          delete playersx[p]
        }
      })
    })

  //Socket.io first world load
    socket.on("firstLoad",function (v){
      console.log("Otrzymano pakiet świata!")
      // console.log(v)
      world.replaceWorld(v,world)
      $(".initLoading").css("display","none")
      stats = new Stats();
      stats.showPanel(0);
      document.body.appendChild(stats.dom);
    })
  

  //Inventory Bar
    var inv_bar = new InventoryBar({
      boxSize: 60,
      boxes: 9,
      padding: 4,
      div: ".inventoryBar",
      activeBox: 1
    })
    inv_bar.setBox(1,"assets/images/grass_block.png")
    inv_bar.setBox(2,"assets/images/stone.png")
    inv_bar.setBox(3,"assets/images/oak_planks.png")
    inv_bar.setBox(4,"assets/images/smoker.gif")
    inv_bar.setBox(5,"assets/images/anvil.png")
    inv_bar.setBox(6,"assets/images/brick.png")
    inv_bar.setBox(7,"assets/images/furnace.png")
    inv_bar.setBox(8,"assets/images/bookshelf.png")
    inv_bar.setBox(9,"assets/images/tnt.png")
    inv_bar.setFocusOnly(1)
    $(window).on('wheel', function (event) {
      if (event.originalEvent.deltaY < 0) {
        inv_bar.moveBoxPlus()
      } else {
        inv_bar.moveBoxMinus()
      }
    })


  //First Person Controls
    FPC = new FirstPersonControls({
      canvas: document.getElementById("c"),
      camera,
      micromove: 0.3
    })
    function updatePosition(e) {
      FPC.camera.rotation.x -= FPC.degtorad(e.movementY / 10)
      FPC.camera.rotation.y -= FPC.degtorad(e.movementX / 10)
      if (FPC.radtodeg(FPC.camera.rotation.x) < -90) {
        FPC.camera.rotation.x = FPC.degtorad(-90)
      }
      if (FPC.radtodeg(FPC.camera.rotation.x) > 90) {
        FPC.camera.rotation.x = FPC.degtorad(90)
      }
    }
    function lockChangeAlert() {
      if (document.pointerLockElement === canvas || document.mozPointerLockElement === canvas) {
        document.addEventListener("mousemove", updatePosition, false);
        $(".gameMenu").css("display", "none")
        gameState="game"
      } else {
        document.removeEventListener("mousemove", updatePosition, false);
        $(".gameMenu").css("display", "block")
        gameState="menu"
      }
    }
    document.addEventListener('pointerlockchange', lockChangeAlert, false);
    document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
    $(document).keydown(function (z) {
      FPC.keys[z.keyCode] = true;
      inv_bar.directBoxChange(z)
    })
    $(document).keyup(function (z) {
      delete FPC.keys[z.keyCode];
    })
    $(".gameOn").click(function () {
      FPC.lockPointer()
    })
  

  //Raycast cube
    var geometry = new THREE.BoxGeometry(1, 1, 1);
    var material = new THREE.MeshBasicMaterial({
      color: 0x00ff00
    });
    var edges = new THREE.EdgesGeometry(geometry);
    cube = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 0.5
    }));
    scene.add(cube);

  //jquery events
    $(document).mousedown(function (e) {
      if (gameState=="game") {
        const start = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
        const end = new THREE.Vector3().set(0,0, 1).unproject(camera);
        const intersection = world.intersectsRay(start, end);
        if (e.which == 1) {
          var voxelId=0;
        } else {
          var voxelId=inv_bar.activeBox;
        }
        if(intersection){
          const pos = intersection.position.map((v, ndx) => {
            return v + intersection.normal[ndx] * (voxelId > 0 ? 0.5 : -0.5);
          });
          // world.setVoxel(...pos, voxelId);
          socket.emit("blockUpdate",[...pos,voxelId])
        }
      }
    })
}






function animate() {
  try{stats.begin();}catch(e){}
  render()
  try{stats.end();}catch(e){}
  
  requestAnimationFrame(animate)
}


function render() {
  var time = Date.now() * 0.00005;
  for ( var i = 0; i < scene.children.length; i ++ ) {
    var object = scene.children[ i ];
    if ( object instanceof THREE.Points ) {
      object.rotation.y = time * ( i < 4 ? i + 1 : - ( i + 1 ) );
    }
  }
  for ( var i = 0; i < materials.length; i ++ ) {
    var color = parameters[ i ][ 0 ];
    var h = ( 360 * ( color[ 0 ] + time ) % 360 ) / 360;
    materials[ i ].color.setHSL( h, color[ 1 ], color[ 2 ] );
  }


  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }
    
  if (gameState=="game") {
    socket.emit("playerUpdate",{
      x:camera.position.x,
      y:camera.position.y,
      z:camera.position.z,
      xyaw:-camera.rotation.x,
      zyaw:camera.rotation.y+Math.PI
    })
    FPC.camMicroMove()

  }
  renderer.render(scene, camera);
  world.updateCells(world)
  

  const start = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
  const end = new THREE.Vector3().set(0,0, 1).unproject(camera);
  const intersection = world.intersectsRay(start, end);
  if(intersection){
    const pos = intersection.position.map((v, ndx) => {
      return v + intersection.normal[ndx] * -0.5;
    });
    pos[0]=Math.floor(pos[0])
    pos[1]=Math.floor(pos[1])
    pos[2]=Math.floor(pos[2])
    cube.position.set(...pos)
    // console.log(pos)
    cube.visible=true;
  }else{
    cube.visible=false;
  }
}