import * as THREE from "three";
import * as OBC from "@thatopen-platform/components-beta";
import { TestRenderer } from "./renderer";
import Stats from "stats.js";
import { ViewHelper } from "./helper/viewHelper";

async function main() {
  // Set up scene

  const components = new OBC.Components();
  const viewCubeComponents = new OBC.Components();
  const worlds = components.get(OBC.Worlds);
  const viewCubeWorlds = viewCubeComponents.get(OBC.Worlds);
  const container = document.getElementById("container") as HTMLDivElement;
  const viewCubeContainer = document.getElementById("viewHelper") as HTMLDivElement;
  const world = worlds.create<
    OBC.SimpleScene,
    OBC.SimpleCamera,
    TestRenderer
  >();
  const viewCubeWorld = viewCubeWorlds.create<
    OBC.SimpleScene,
    OBC.SimpleCamera,
    TestRenderer
  >();

  world.scene = new OBC.SimpleScene(components);
  viewCubeWorld.scene = new OBC.SimpleScene(components);
  world.renderer = new TestRenderer(components, container);
  viewCubeWorld.renderer = new TestRenderer(viewCubeComponents, viewCubeContainer);
  world.camera = new OBC.SimpleCamera(components);
  viewCubeWorld.camera = world.camera;
 
  components.init();

  world.scene.setup();
  viewCubeWorld.scene.setup();  
  const _viewHelper = new ViewHelper(viewCubeWorld.camera.currentWorld?.camera.three, viewCubeContainer);

  // world.camera.three.far = 10000;

  world.scene.three.add(new THREE.AxesHelper());

  world.camera.three.far = 10000;

  // Get fragments model

  // prettier-ignore
  const workerUrl = "./worker.mjs";
  const fragments = components.get(OBC.FragmentsManager);
  fragments.init(workerUrl);

  // LOAD MODEL

  async function loadModel(
    url: string,
    id = url,
    transform = new THREE.Vector3()
  ) {
    const fetched = await fetch(url);
    const buffer = await fetched.arrayBuffer();

    const model = await fragments.core.load(buffer, {
      modelId: id,
      camera: world.camera.three,
    });

    model.object.position.add(transform);
    world.scene.three.add(model.object);
  }

  loadModel("/medium_test.frag");

  // Scene update

  world.camera.controls.addEventListener("control", () => {
    fragments.core.update();    
  });

  viewCubeContainer.addEventListener( 'pointerup', ( event ) => {
    event.stopPropagation();    
    _viewHelper.handleClick( event );
    _viewHelper?.render(viewCubeWorld?.renderer?.currentWorld?.renderer);    
  });

  viewCubeContainer.addEventListener( 'pointerdown', function ( event ) {
    event.stopPropagation();
  });

  const stats = new Stats();
  stats.showPanel(2);
  document.body.append(stats.dom);
  stats.dom.style.left = "0px";
  stats.dom.style.zIndex = "unset";
  world.renderer.onBeforeUpdate.add(() => {
    stats.begin();
  });
  world.renderer.onAfterUpdate.add(() => {      
      _viewHelper?.render(viewCubeWorld?.renderer?.currentWorld?.renderer);
      if (_viewHelper?.animating){        
        world.camera.controls.enabled = false
        _viewHelper?.update(0.01); 
        const position = _viewHelper.editorCamera.position
        const outTarget = _viewHelper.selectedTargetPosition.clone() 
        world.camera.controls.setLookAt(position.x, position.y, position.z, 
          outTarget.x, outTarget.y, outTarget.z)
        world.camera.controls.zoomTo(_viewHelper.editorCamera.zoom, false);    
        world.camera.controls.normalizeRotations()
        world.camera.controls.enabled = true

        world.renderer?.three.render(world.scene.three, world.camera.controls.camera);                
      } 
      stats.end();      
    });  
}

main();
