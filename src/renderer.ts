import * as THREE from "three";
import {
  Disposable,
  Updateable,
  Resizeable,
  BaseRenderer,
  Event,
  Components
} from "@thatopen-platform/components-beta";


export class TestRenderer extends BaseRenderer {
 
  enabled = true;
 
  container: HTMLElement;

  three: THREE.WebGLRenderer;

  protected _canvas: HTMLCanvasElement;
  protected _parameters?: Partial<THREE.WebGLRendererParameters>;
  protected _resizeObserver: ResizeObserver | null = null;
  
  protected onContainerUpdated = new Event();

  private _resizing = false;

  constructor(
    components: Components,
    container: HTMLElement,
    parameters?: Partial<THREE.WebGLRendererParameters>,
  ) {
    super(components);

    this.container = container;
    this._parameters = parameters;    
    
    this.three = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      ...parameters,
    });

    this.three.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.setupRenderer();
    this.setupEvents(true);
    this.resize();

    this._canvas = this.three.domElement;

    const context = this.three.getContext();
    const { canvas } = context;
    canvas.addEventListener("webglcontextlost", this.onContextLost, false);
    canvas.addEventListener("webglcontextrestored", this.onContextBack, false);    
  }

  /** {@link Updateable.update} */
  update() {
    if (!this.enabled || !this.currentWorld) return;
    this.onBeforeUpdate.trigger(this);
    const scene = this.currentWorld.scene.three;
    const camera = this.currentWorld.camera.three;      
    this.three.render(scene, camera);
    // if (scene instanceof THREE.Scene) {
    //   this._renderer2D.render(scene, camera);
    // }    
    this.onAfterUpdate.trigger(this);
  }

  /** {@link Disposable.dispose} */
  dispose() {
    this.enabled = false;
    this.setupEvents(false);
    this.three.domElement.remove();
    this.three.forceContextLoss();
    this.three.dispose();
    // this._renderer2D.domElement.remove();
    this.onResize.reset();
    this.onAfterUpdate.reset();
    this.onBeforeUpdate.reset();
    this.onDisposed.trigger();
    this.onDisposed.reset();
  }

  /** {@link Resizeable.getSize}. */
  getSize() {
    return new THREE.Vector2(
      this.three.domElement.clientWidth,
      this.three.domElement.clientHeight,
    );
  }

  /** {@link Resizeable.resize} */
  resize = (size?: THREE.Vector2) => {
    if (this._resizing) return;
    this._resizing = true;
    this.onContainerUpdated.trigger();
    const width = size ? size.x : this.container.clientWidth;
    const height = size ? size.y : this.container.clientHeight;
    this.three.setSize(width, height);
    // this._renderer2D.setSize(width, height);
    this.onResize.trigger(new THREE.Vector2(width, height));    
    this._resizing = false;
  };

  setupEvents(active: boolean) {
    const dom = this.three.domElement.parentElement;
    if (!dom) {
      throw new Error("This renderer needs to have an HTML container!");
    }

    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }

    window.removeEventListener("resize", this.resizeEvent);

    if (active) {
      this._resizeObserver = new ResizeObserver(this.resizeEvent);
      this._resizeObserver.observe(dom);
      window.addEventListener("resize", this.resizeEvent);
    }
  }

  private resizeEvent = () => {
    this.resize();
  };

  private setupRenderer() {
    this.three.localClippingEnabled = true;
    if (this.container) {
      this.container.appendChild(this.three.domElement);
    }
    this.onContainerUpdated.trigger();
  }

  private onContextLost = (event: any) => {
    event.preventDefault();
    this.enabled = false;
  };

  private onContextBack = () => {
    this.three.setRenderTarget(null);
    this.three.dispose();
    this.three = new THREE.WebGLRenderer({
      canvas: this._canvas,
      antialias: true,
      alpha: true,
      ...this._parameters,
    });
    this.enabled = true;
  };
}
