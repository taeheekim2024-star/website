import * as THREE from 'three';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
import {EffectComposer} from './vendor/addons/postprocessing/EffectComposer.js';
import {RenderPass} from './vendor/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from './vendor/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from './vendor/addons/postprocessing/OutputPass.js';
import {buildPorousGeometry} from './material-geometry.js';

const $=id=>document.getElementById(id);
const stage=$('scene'),hero=$('hero'),status=$('viewer-status'),hint=$('interaction-hint');
const pause=$('motion-toggle'),reset=$('reset-view'),explore=$('explore'),closeFocus=$('close-focus');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const stages=[
  {category:'STRUCTURE & INTERFACE',title:'Design the space within.',description:'Shape the pore architecture and its interfaces — where the material meets molecules, ions, and reactions.',label:'PORE ARCHITECTURE',caption:'Geometry · Connectivity · Surface'},
  {category:'ASSEMBLY & FORMATION',title:'Give the architecture form.',description:'Connect nanoscale building blocks into an open framework, with accessible pores and a continuous solid structure.',label:'MATERIAL SYNTHESIS',caption:'Building blocks → Connected framework'},
  {category:'STRUCTURE MEETS FUNCTION',title:'See the interface at work.',description:'Explore molecular adsorption, catalytic encounters, and ion transport through the porous material.',label:'PERFORMANCE EXPLORATION',caption:'Molecular access · Surface interactions'},
  {category:'LEARNING & REDESIGN',title:'Learn. Redesign. Discover.',description:'Connect synthesis, structure, and performance to guide the next material design.',label:'AI-GUIDED DISCOVERY',caption:'Design candidates → Next iteration'}
];
const performanceCopy={
  adsorption:{description:'Follow molecular access into the pore network and adsorption at the inner surface.',caption:'Molecular access → Surface adsorption'},
  catalysis:{description:'Trace access to active surfaces, a catalytic encounter, and the release of products.',caption:'Reactant access → Surface reaction → Product release'},
  transport:{description:'Explore how connected pathways let ions move through a nanoporous framework.',caption:'Connected pores → Ion transport'}
};
let currentStage=0,currentPerformance='adsorption',onStage=()=>{},onPerformance=()=>{};
function setStage(index){
  currentStage=index;const entry=stages[index];
  $('stage-number').textContent=String(index+1).padStart(2,'0')+' / 04';
  $('stage-category').textContent=entry.category;$('stage-title').textContent=entry.title;
  $('stage-description').textContent=index===2?performanceCopy[currentPerformance].description:entry.description;
  $('scene-index').textContent=String(index+1).padStart(2,'0');$('scene-label').textContent=entry.label;
  $('material-caption').textContent=index===2?performanceCopy[currentPerformance].caption:entry.caption;
  $('performance-options').hidden=index!==2;
  $('next-stage').innerHTML=index===3?'Return to design <span aria-hidden="true">↻</span>':'Next: '+['Synthesis','Performance','AI discovery'][index]+' <span aria-hidden="true">→</span>';
  document.querySelectorAll('[data-stage]').forEach(button=>{
    if(Number(button.dataset.stage)===index)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
  });
  hero.dataset.stage=String(index);onStage(index);
}
document.querySelectorAll('[data-stage]').forEach(button=>button.addEventListener('click',()=>setStage(Number(button.dataset.stage))));
$('next-stage').addEventListener('click',()=>setStage((currentStage+1)%4));
document.querySelectorAll('[data-performance]').forEach(button=>button.addEventListener('click',()=>{
  currentPerformance=button.dataset.performance;
  document.querySelectorAll('[data-performance]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
  $('stage-description').textContent=performanceCopy[currentPerformance].description;
  $('material-caption').textContent=performanceCopy[currentPerformance].caption;onPerformance(currentPerformance);
}));

let renderer;
try{
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden','true');stage.appendChild(renderer.domElement);
  const load=async url=>{const response=await fetch(url);if(!response.ok)throw new Error('Material assets unavailable');return response.json();};
  const [data,paths,cube]=await Promise.all([load('./assets/particle-data.json'),load('./assets/probe-paths.json'),load('./assets/porous-cube.json')]);
  initialize(data.spheres,paths.paths,cube);
}catch(error){
  console.error('Material viewer:',error);stage.classList.remove('ready');
  if(renderer)renderer.domElement.style.display='none';
  hint.textContent='3D is unavailable in this browser. Reference image shown.';status.textContent=hint.textContent;
  [pause,reset,explore].forEach(button=>button.disabled=true);
}

function initialize(spheres,paths,cubeData){
  const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(32,1,.1,80);
  camera.position.set(0,.1,18);camera.lookAt(0,0,0);
  const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();
  const environment=pmrem.fromScene(room,.055);scene.environment=environment.texture;
  scene.environmentRotation.set(0,.7,.2);room.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0x8cc9e3,0x081020,.52));
  const key=new THREE.DirectionalLight(0xa9efff,2.3);key.position.set(-4,6,7);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera,{left:-6,right:6,top:7,bottom:-7,near:.5,far:35});key.shadow.bias=-.0005;key.shadow.normalBias=.015;scene.add(key);
  const cyanLight=new THREE.DirectionalLight(0x12dbf9,2.8);cyanLight.position.set(-5,-1,0);scene.add(cyanLight);
  const pinkLight=new THREE.DirectionalLight(0xea25b6,2.0);pinkLight.position.set(5,2,-2);scene.add(pinkLight);
  const fill=new THREE.DirectionalLight(0xd7d7ed,.5);fill.position.set(4,0,6);scene.add(fill);
  const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
  const bloom=new UnrealBloomPass(new THREE.Vector2(800,700),.48,.58,.85);composer.addPass(bloom);composer.addPass(new OutputPass());
  const assembly=new THREE.Group();scene.add(assembly);
  const floating=[];
  function floatObject(group,x,y,z,scale,rotation=[0,0,0]){
    group.scale.setScalar(scale);group.rotation.set(...rotation);scene.add(group);
    const entry={group,x,y,z,scale,rotation,base:new THREE.Vector3(),phase:floating.length*1.73};floating.push(entry);return entry;
  }
  const mainPlacement=floatObject(assembly,-.34,-.24,2,.70,[.02,-.22,-.46]);
  const surface=new THREE.MeshPhysicalMaterial({color:0x427e99,metalness:.28,roughness:.35,transmission:.12,thickness:.55,ior:1.42,clearcoat:.5,clearcoatRoughness:.26,envMapIntensity:.58,transparent:true,opacity:.96});
  const geometry=buildPorousGeometry(spheres);
  const framework=new THREE.Mesh(geometry,surface);framework.castShadow=true;framework.receiveShadow=true;assembly.add(framework);
  const glowMaterial=new THREE.ShaderMaterial({
    uniforms:{intensity:{value:.55},opacity:{value:1}},
    vertexShader:'varying vec3 vNormal;varying vec3 vView;varying vec3 vPosition;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-p.xyz);vPosition=position;gl_Position=projectionMatrix*p;}',
    fragmentShader:'varying vec3 vNormal;varying vec3 vView;varying vec3 vPosition;uniform float intensity;uniform float opacity;void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),3.6);vec3 cyan=vec3(.035,.84,1.4);vec3 pink=vec3(1.1,.04,.66);vec3 color=mix(cyan,pink,smoothstep(-2.,2.5,vPosition.x));gl_FragColor=vec4(color*rim*intensity*opacity,1.);}',
    transparent:true,blending:THREE.AdditiveBlending,depthWrite:false
  });
  const glow=new THREE.Mesh(geometry,glowMaterial);glow.scale.setScalar(1.002);assembly.add(glow);
  const cubeGeometry=new THREE.BufferGeometry();
  cubeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(cubeData.positions,3));
  cubeGeometry.setAttribute('normal',new THREE.Float32BufferAttribute(cubeData.normals,3));cubeGeometry.setIndex(cubeData.indices);cubeGeometry.computeBoundingSphere();
  function specimen(geo,color,glowStrength=.40){
    const group=new THREE.Group();const mat=surface.clone();mat.color.set(color);mat.opacity=.96;mat.roughness=.29;mat.metalness=.23;mat.transmission=.20;
    const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
    const edge=glowMaterial.clone();edge.uniforms=THREE.UniformsUtils.clone(glowMaterial.uniforms);edge.uniforms.intensity.value=glowStrength;
    const halo=new THREE.Mesh(geo,edge);halo.scale.setScalar(1.003);group.add(halo);return group;
  }
  floatObject(specimen(cubeGeometry,0x376e9f,.57),.345,-.255,1.2,1.12,[.22,-.45,.22]);
  floatObject(specimen(cubeGeometry,0x56528f,.42),-.305,.285,-2.5,.53,[.34,.48,-.32]);
  floatObject(specimen(geometry,0x1c686f,.35),.335,.30,-1.7,.24,[.2,-.4,.75]);
  floatObject(specimen(geometry,0x313a86,.2),-.485,.035,-4.0,.27,[-.6,.5,.6]);
  floatObject(specimen(cubeGeometry,0x394983,.28),.50,-.35,-2.3,.57,[.2,.6,-.2]);
  function unitCell(color){
    const group=new THREE.Group(),geo=new THREE.OctahedronGeometry(.75,0);
    const glass=new THREE.Mesh(geo,new THREE.MeshPhysicalMaterial({color,transmission:.7,thickness:.3,roughness:.16,metalness:.12,transparent:true,opacity:.7,ior:1.42,envMapIntensity:.7}));
    group.add(glass);group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color,transparent:true,opacity:.75})));
    return group;
  }
  floatObject(unitCell(0x529bb2),.46,.145,-4,.48,[.2,.6,.3]);
  floatObject(unitCell(0x7275a5),-.14,.40,-5,.36,[.1,.4,-.6]);
  floatObject(unitCell(0x5568ac),.08,-.34,-3,.42,[.1,-.5,.2]);
  floatObject(unitCell(0x4c8b99),-.43,-.44,-4,.38,[.2,.7,.4]);
  const floorGrid=new THREE.GridHelper(65,65,0x173242,0x101e2d);floorGrid.position.set(0,-5.2,-12);floorGrid.material.transparent=true;floorGrid.material.opacity=.18;scene.add(floorGrid);
  const particleMaterial=new THREE.MeshPhysicalMaterial({color:0x39839b,metalness:.22,roughness:.4,clearcoat:.5,transmission:.1,thickness:.45,envMapIntensity:.7,transparent:true,opacity:0});
  const particles=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,3),particleMaterial,spheres.length);
  particles.castShadow=true;particles.receiveShadow=true;assembly.add(particles);const matrixHelper=new THREE.Object3D();
  const updateParticles=spread=>spheres.forEach((s,i)=>{
    matrixHelper.position.set(s.x*spread,s.y*spread,s.z*spread+Math.sin(i*2.3)*(spread-1)*.7);
    matrixHelper.scale.setScalar(s.r*(.84+.16*(2-spread)));matrixHelper.updateMatrix();particles.setMatrixAt(i,matrixHelper.matrix);
  });
  updateParticles(1.22);particles.instanceMatrix.needsUpdate=true;
  const cage=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(6.5,8.1,3.0)),new THREE.LineBasicMaterial({color:0x44aebe,transparent:true,opacity:.28}));assembly.add(cage);
  const candidateMaterial=new THREE.MeshPhysicalMaterial({color:0x378da1,metalness:.25,roughness:.45,transparent:true,opacity:.13,depthWrite:false,envMapIntensity:.5});
  const candidates=new THREE.Group();assembly.add(candidates);
  [-1,1].forEach((sign,i)=>{
    const mesh=new THREE.Mesh(geometry,candidateMaterial);mesh.scale.set(.30,.28+i*.025,.36);
    mesh.position.set(sign*3.1,sign*1.55,-.75);mesh.rotation.set(.15,sign*.35,sign*-.18);candidates.add(mesh);
  });candidates.visible=false;
  const choiceCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-3.1,-1.55,-.7),new THREE.Vector3(-3,-3.7,-.4),new THREE.Vector3(.2,-4.2,.2),new THREE.Vector3(3.6,-2,.1),new THREE.Vector3(3.1,1.55,-.7)]);
  const choiceLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(choiceCurve.getPoints(90)),new THREE.LineDashedMaterial({color:0x8ad8e6,transparent:true,opacity:.2,dashSize:.12,gapSize:.15}));choiceLine.computeLineDistances();assembly.add(choiceLine);choiceLine.visible=false;
  const choiceMarker=new THREE.Mesh(new THREE.SphereGeometry(.06,16,12),new THREE.MeshBasicMaterial({color:new THREE.Color(1.7,.28,1.0)}));assembly.add(choiceMarker);choiceMarker.visible=false;
  const probeGroup=new THREE.Group();assembly.add(probeGroup);const probeGeometry=new THREE.SphereGeometry(.067,16,12);
  const cyan=new THREE.Color(.15,1.4,1.65),pink=new THREE.Color(1.65,.16,.9),probeRecords=[];
  for(const [index,path] of paths.entries()){
    const curve=new THREE.CatmullRomCurve3(path.points.map(p=>new THREE.Vector3(...p)),false,'catmullrom',.5);
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(90)),new THREE.LineBasicMaterial({color:0x4890ad,transparent:true,opacity:.14}));probeGroup.add(line);
    const probes=[];for(let j=0;j<3;j++){
      const material=new THREE.MeshBasicMaterial({color:cyan.clone(),transparent:true});const mesh=new THREE.Mesh(probeGeometry,material);probeGroup.add(mesh);probes.push(mesh);
    }probeRecords.push({kind:path.kind,curve,line,probes,index});
  }probeGroup.visible=false;
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(30,20),new THREE.ShadowMaterial({opacity:.22}));ground.rotation.x=-Math.PI/2;ground.position.y=-4.45;ground.receiveShadow=true;scene.add(ground);
  const state={paused:reduced.matches,inspect:false,dragging:false,dragId:null,dragX:0,dragY:0,turnX:0,turnY:0,hoverX:0,hoverY:0,zoom:1,time:0,stageTime:4,last:performance.now(),visible:true,stage:0,performance:'adsorption'};
  const stageRotations=[[.02,-.22],[.08,.1],[-.05,-.16],[.04,0]];
  function setPause(value){
    state.paused=value;if(value){state.hoverX=0;state.hoverY=0;}
    pause.setAttribute('aria-pressed',String(value));pause.setAttribute('aria-label',value?'Resume automatic motion':'Pause automatic motion');pause.title=value?'Resume automatic motion':'Pause automatic motion';
    pause.querySelector('svg').innerHTML=value?'<path d="m7 4 8 6-8 6z"/>':'<path d="M7 5v10M13 5v10"/>';
    pause.querySelector('.sr-only').textContent=value?'Resume motion':'Pause motion';status.textContent=value?'Automatic motion paused. Drag or use arrow keys to rotate.':'Automatic motion resumed.';
  }setPause(state.paused);
  onStage=index=>{
    state.stage=index;state.stageTime=reduced.matches?4:0;state.turnX=0;state.turnY=0;state.zoom=1;
    status.textContent=['Design the pore architecture.','Watch building blocks form a connected framework.','Explore adsorption, catalysis, or ion transport.','Explore candidates and return to a new design.'][index];
  };
  onPerformance=kind=>{state.performance=kind;status.textContent=performanceCopy[kind].description;};
  function resize(){
    const rect=stage.getBoundingClientRect();if(!rect.width||!rect.height)return;camera.aspect=rect.width/rect.height;
    const height=11.3;camera.position.z=height/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));camera.updateProjectionMatrix();
    const narrow=rect.width<650;
    for(const item of floating){
      const perspective=(camera.position.z-item.z)/camera.position.z;
      const adjustedX=narrow?item.x*1.10:item.x;
      item.base.set(adjustedX*height*camera.aspect*perspective,item.y*height*perspective,item.z);
      item.group.position.copy(item.base);item.group.scale.setScalar(item.scale*(narrow?.62:1));
    }
    renderer.setSize(rect.width,rect.height,false);composer.setSize(rect.width,rect.height);
  }new ResizeObserver(resize).observe(stage);resize();
  const overview=()=>{state.inspect=false;hero.classList.remove('inspecting');explore.setAttribute('aria-expanded','false');explore.focus({preventScroll:true});};
  explore.setAttribute('aria-expanded','false');explore.setAttribute('aria-controls','material');
  explore.addEventListener('click',()=>{
    state.inspect=true;hero.classList.add('inspecting');explore.setAttribute('aria-expanded','true');stage.focus({preventScroll:true});
    if(innerWidth<=700)hero.scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});
    status.textContent='Expanded structure. Drag to rotate. Scroll or use plus and minus to zoom. Escape returns.';
  });closeFocus.addEventListener('click',overview);pause.addEventListener('click',()=>setPause(!state.paused));
  function resetView(){state.turnX=0;state.turnY=0;state.hoverX=0;state.hoverY=0;state.zoom=1;status.textContent='Original view restored.';}
  reset.addEventListener('click',resetView);
  document.addEventListener('pointermove',event=>{
    if(state.dragging||event.pointerType==='touch')return;const rect=hero.getBoundingClientRect();
    state.hoverX=THREE.MathUtils.clamp((event.clientX-rect.left)/rect.width*2-1,-1,1)*.19;
    state.hoverY=THREE.MathUtils.clamp((event.clientY-rect.top)/rect.height*2-1,-1,1)*.11;
  });hero.addEventListener('pointerleave',()=>{if(!state.dragging){state.hoverX=0;state.hoverY=0;}});
  stage.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;state.dragging=true;state.dragId=event.pointerId;state.dragX=event.clientX;state.dragY=event.clientY;stage.setPointerCapture(event.pointerId);stage.focus({preventScroll:true});
  });stage.addEventListener('pointermove',event=>{
    if(!state.dragging||event.pointerId!==state.dragId)return;state.turnY+=(event.clientX-state.dragX)*.007;
    state.turnX=THREE.MathUtils.clamp(state.turnX+(event.clientY-state.dragY)*.006,-1.4,1.4);state.dragX=event.clientX;state.dragY=event.clientY;
  });const release=()=>{state.dragging=false;state.dragId=null;};['pointerup','pointercancel','lostpointercapture'].forEach(name=>stage.addEventListener(name,release));
  stage.addEventListener('wheel',event=>{if(state.inspect){event.preventDefault();state.zoom=THREE.MathUtils.clamp(state.zoom-event.deltaY*.0007,.72,1.35);}},{passive:false});
  stage.addEventListener('keydown',event=>{
    let handled=true;switch(event.key){
      case 'ArrowLeft':state.turnY-=.15;break;case 'ArrowRight':state.turnY+=.15;break;case 'ArrowUp':state.turnX=Math.max(-1.4,state.turnX-.12);break;case 'ArrowDown':state.turnX=Math.min(1.4,state.turnX+.12);break;
      case '+':case '=':state.zoom=Math.min(1.35,state.zoom+.07);break;case '-':state.zoom=Math.max(.72,state.zoom-.07);break;case ' ':setPause(!state.paused);break;case 'Home':resetView();break;default:handled=false;
    }if(handled)event.preventDefault();
  });document.addEventListener('keydown',event=>{if(event.key==='Escape'&&state.inspect)overview();});reduced.addEventListener('change',event=>setPause(event.matches));
  document.addEventListener('visibilitychange',()=>{state.visible=!document.hidden;state.last=performance.now();});
  new IntersectionObserver(entries=>{state.visible=entries[0].isIntersecting&&!document.hidden;},{threshold:.01}).observe(stage);
  renderer.domElement.addEventListener('webglcontextlost',event=>{
    event.preventDefault();stage.classList.remove('ready');hint.textContent='3D rendering paused. Reload to restore the model.';status.textContent=hint.textContent;[pause,reset,explore].forEach(button=>button.disabled=true);
  });
  function render(now){
    const dt=Math.min((now-state.last)/1000,.05);state.last=now;
    if(state.visible){
      state.stageTime=Math.min(5,state.stageTime+dt);if(!state.paused&&!state.dragging)state.time+=dt;
      const follow=reduced.matches?1:1-Math.exp(-dt*7),rotation=stageRotations[state.stage];
      assembly.rotation.x=THREE.MathUtils.lerp(assembly.rotation.x,rotation[0]+state.turnX+state.hoverY,follow);
      assembly.rotation.y=THREE.MathUtils.lerp(assembly.rotation.y,rotation[1]+state.turnY+state.hoverX+Math.sin(state.time*.18)*.13,follow);
      assembly.rotation.z=mainPlacement.rotation[2]+Math.sin(state.time*.3)*.018;
      for(const item of floating){
        const depth=item.z>0?1.4:.65;
        item.group.position.x=THREE.MathUtils.lerp(item.group.position.x,item.base.x+state.hoverX*depth,follow);
        item.group.position.y=THREE.MathUtils.lerp(item.group.position.y,item.base.y+Math.sin(state.time*.43+item.phase)*.085-state.hoverY*depth*.65,follow);
        if(item.group!==assembly){
          item.group.rotation.x=THREE.MathUtils.lerp(item.group.rotation.x,item.rotation[0]+state.hoverY*.9+state.turnX*.25,follow);
          item.group.rotation.y=THREE.MathUtils.lerp(item.group.rotation.y,item.rotation[1]+state.hoverX*1.3+state.turnY*.35+Math.sin(state.time*.25+item.phase)*.13,follow);
          item.group.rotation.z=item.rotation[2]+Math.sin(state.time*.35+item.phase)*.035;
        }
      }
      camera.zoom=THREE.MathUtils.lerp(camera.zoom,state.zoom,follow);camera.updateProjectionMatrix();
      const synthesis=state.stage===1,formation=THREE.MathUtils.smoothstep(state.stageTime,.25,2.8),surfaceTarget=synthesis?formation:.93;
      surface.opacity=THREE.MathUtils.lerp(surface.opacity,surfaceTarget,follow);framework.visible=surface.opacity>.01;surface.depthWrite=surface.opacity>.65;
      glowMaterial.uniforms.opacity.value=surface.opacity;glowMaterial.uniforms.intensity.value=state.stage===2?.68:.52;
      particles.visible=synthesis&&formation<.99;if(particles.visible){particleMaterial.opacity=1-formation;updateParticles(1+(1-formation)*.32);particles.instanceMatrix.needsUpdate=true;}
      cage.visible=false;
      candidates.visible=state.stage===3;choiceLine.visible=state.stage===3;choiceMarker.visible=state.stage===3;
      if(state.stage===3)choiceMarker.position.copy(choiceCurve.getPoint((state.time*.055)%1));
      probeGroup.visible=state.stage===2;
      if(probeGroup.visible){for(const record of probeRecords){
        const visible=record.kind===state.performance;record.line.visible=visible;
        for(const [j,probe] of record.probes.entries()){
          probe.visible=visible;if(!visible)continue;const phase=(state.time*.092+j/3+record.index*.173)%1,t=record.kind==='adsorption'?Math.min(1,phase*1.28):phase;
          probe.position.copy(record.curve.getPoint(t));
          const reaction=record.kind==='catalysis'?THREE.MathUtils.smoothstep(t,.42,.57):record.kind==='adsorption'?THREE.MathUtils.smoothstep(t,.82,1):0;
          probe.material.color.copy(cyan).lerp(pink,reaction);probe.material.opacity=THREE.MathUtils.smoothstep(phase,0,.06)*(1-THREE.MathUtils.smoothstep(phase,.92,1));
        }
      }}composer.render();
    }requestAnimationFrame(render);
  }
  assembly.rotation.set(.02,-.22,mainPlacement.rotation[2]);cage.visible=false;composer.render();stage.classList.add('ready');stage.dataset.particles=String(spheres.length);
  status.textContent='Interactive research process ready. Choose a stage and drag the structure to explore.';requestAnimationFrame(render);
}
