import * as THREE from 'three';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
import {EffectComposer} from './vendor/addons/postprocessing/EffectComposer.js';
import {RenderPass} from './vendor/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from './vendor/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from './vendor/addons/postprocessing/OutputPass.js';
import {buildPorousGeometry} from './material-geometry.js';
import {createWorldMotion} from './world-motion.js';
import {createAIChip,createSynthesisVessel,createElectrochemicalCell} from './research-objects.js';
import {createReactionScene} from './reaction-object.js';

const $=id=>document.getElementById(id);
const stage=$('scene'),hero=$('hero'),status=$('viewer-status'),hint=$('interaction-hint');
const pause=$('motion-toggle'),reset=$('reset-view'),explore=$('explore'),closeFocus=$('close-focus');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const stages=[
  {category:'STRUCTURE & INTERFACE',title:'Design the space within.',description:'Shape the pore architecture and its interfaces — where the material meets molecules, ions, and reactions.',label:'PORE ARCHITECTURE',caption:'Geometry · Connectivity · Surface'},
  {category:'ASSEMBLY & FORMATION',title:'Give the architecture form.',description:'Connect nanoscale building blocks into an open framework, with accessible pores and a continuous solid structure.',label:'MATERIAL SYNTHESIS',caption:'Building blocks → Connected framework'},
  {category:'STRUCTURE MEETS FUNCTION',title:'From interfaces to applications.',description:'Explore selective adsorption, catalytic reactions, and electrochemical energy through connected porous interfaces.',label:'APPLICATIONS & PERFORMANCE',caption:'Molecular capture · Catalysis · Energy'},
  {category:'LEARNING & REDESIGN',title:'Learn. Redesign. Discover.',description:'Connect synthesis, structure, and performance to guide the next material design.',label:'AI-GUIDED DISCOVERY',caption:'Design candidates → Next iteration'}
];
const performanceCopy={
  adsorption:{description:'Follow molecular access into the pore network and adsorption at the inner surface.',caption:'Molecular access → Surface adsorption'},
  catalysis:{description:'Trace access to active surfaces, a catalytic encounter, and the release of products.',caption:'Reactant access → Surface reaction → Product release'},
  transport:{description:'Explore how connected pathways let ions move through a nanoporous framework.',caption:'Connected pores → Ion transport'}
};
const KO=(document.documentElement.lang||"").toLowerCase().startsWith("ko");
if(KO){
  Object.assign(stages[0],{category:"구조와 계면",title:"내부 공간을 설계합니다.",description:"기공 구조와 그 계면을 설계합니다. 소재가 분자·이온·반응을 만나는 자리입니다.",label:"기공 구조",caption:"기하 · 연결성 · 표면"});
  Object.assign(stages[1],{category:"조립과 형성",title:"구조에 형태를 줍니다.",description:"나노 빌딩블록을 열린 골격으로 연결합니다. 접근 가능한 기공과 연속된 고체 구조.",label:"소재 합성",caption:"빌딩블록 → 연결된 골격"});
  Object.assign(stages[2],{category:"구조에서 기능으로",title:"계면에서 응용으로.",description:"연결된 다공성 계면에서 선택적 흡착, 촉매 반응, 전기화학 에너지를 탐색합니다.",label:"응용과 성능",caption:"분자 포집 · 촉매 · 에너지"});
  Object.assign(stages[3],{category:"학습과 재설계",title:"배우고, 다시 설계하고, 발견합니다.",description:"합성·구조·성능을 연결해 다음 소재 설계를 이끕니다.",label:"AI 기반 발견",caption:"설계 후보 → 다음 반복"});
  Object.assign(performanceCopy.adsorption,{description:"기공 네트워크로 들어가 내부 표면에 흡착되는 분자의 경로를 따라갑니다.",caption:"분자 접근 → 표면 흡착"});
  Object.assign(performanceCopy.catalysis,{description:"활성 표면으로의 접근, 촉매 반응, 생성물 방출을 따라갑니다.",caption:"반응물 접근 → 표면 반응 → 생성물 방출"});
  Object.assign(performanceCopy.transport,{description:"연결된 기공 경로를 따라 이온이 나노다공 골격을 통과하는 과정을 봅니다.",caption:"연결된 기공 → 이온 수송"});
}
let currentStage=0,currentPerformance='adsorption',onStage=()=>{},onPerformance=()=>{};
function setStage(index,{animateMaterial=true}={}){
  currentStage=index;const entry=stages[index];
  $('stage-number').textContent=String(index+1).padStart(2,'0')+' / 04';
  $('stage-category').textContent=entry.category;$('stage-title').textContent=entry.title;
  $('stage-description').textContent=index===2?performanceCopy[currentPerformance].description:entry.description;
  $('scene-index').textContent=String(index+1).padStart(2,'0');$('scene-label').textContent=entry.label;
  $('material-caption').textContent=index===2?performanceCopy[currentPerformance].caption:entry.caption;
  $('performance-options').hidden=index!==2;
  $('next-stage').innerHTML=index===3?(KO?"설계로 돌아가기":"Return to design")+" <span aria-hidden=\"true\">↻</span>":(KO?"다음: "+["합성","응용","AI 발견"][index]:"Next: "+["Synthesis","Applications","AI discovery"][index])+' <span aria-hidden="true">→</span>';
  document.querySelectorAll('[data-stage]').forEach(button=>{
    if(Number(button.dataset.stage)===index)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
  });
  hero.dataset.stage=String(index);onStage(index,animateMaterial);
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
  const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(45,1,.1,120);
  camera.position.set(0,.1,18);camera.lookAt(0,0,0);
  const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();
  const environment=pmrem.fromScene(room,.055);scene.environment=environment.texture;
  scene.environmentRotation.set(0,.7,.2);room.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xe4e9f5,0x17131c,.75));
  const key=new THREE.DirectionalLight(0xfff6ea,3.0);key.position.set(-4,6,7);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera,{left:-6,right:6,top:7,bottom:-7,near:.5,far:35});key.shadow.bias=-.0005;key.shadow.normalBias=.015;scene.add(key);
  const cyanLight=new THREE.DirectionalLight(0x8fbafa,.65);cyanLight.position.set(-5,-1,0);scene.add(cyanLight);
  const pinkLight=new THREE.DirectionalLight(0xfabbd0,.75);pinkLight.position.set(5,2,-2);scene.add(pinkLight);
  const fill=new THREE.DirectionalLight(0xf4f3ff,1.0);fill.position.set(4,0,6);scene.add(fill);
  const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
  const bloom=new UnrealBloomPass(new THREE.Vector2(800,700),.48,.58,.85);composer.addPass(bloom);composer.addPass(new OutputPass());
  const assembly=new THREE.Group();scene.add(assembly);
  const floating=[];
  function floatObject(group,x,y,z,scale,rotation=[0,0,0]){
    group.scale.setScalar(scale);group.rotation.set(...rotation);scene.add(group);
    const entry={group,x,y,z,scale,rotation,base:new THREE.Vector3(),phase:floating.length*1.73};floating.push(entry);return entry;
  }
  const mainPlacement=floatObject(assembly,-.335,-.225,1.3,.53,[.02,-.22,-.46]);
  mainPlacement.meta={id:'pores',label:'Nanoporous architecture',description:'An open framework. Accessible pores. Interfaces that control function.',stage:0,labelOffset:3.4};
  const surface=new THREE.MeshPhysicalMaterial({color:0x3c92b9,metalness:.24,roughness:.32,transmission:.12,thickness:.55,ior:1.42,clearcoat:.5,clearcoatRoughness:.26,envMapIntensity:.72,transparent:true,opacity:.96});
  const geometry=buildPorousGeometry(spheres);
  const framework=new THREE.Mesh(geometry,surface);framework.castShadow=true;framework.receiveShadow=true;assembly.add(framework);
  const glowMaterial=new THREE.ShaderMaterial({
    uniforms:{intensity:{value:.55},opacity:{value:1},tintA:{value:new THREE.Color(.035,.84,1.4)},tintB:{value:new THREE.Color(.12,.30,1.1)}},
    vertexShader:'varying vec3 vNormal;varying vec3 vView;varying vec3 vPosition;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-p.xyz);vPosition=position;gl_Position=projectionMatrix*p;}',
    fragmentShader:'varying vec3 vNormal;varying vec3 vView;varying vec3 vPosition;uniform float intensity;uniform float opacity;uniform vec3 tintA;uniform vec3 tintB;void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),3.6);vec3 color=mix(tintA,tintB,smoothstep(-2.,2.5,vPosition.x));gl_FragColor=vec4(color*rim*intensity*opacity,1.);}',
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
    edge.uniforms.tintA.value.setRGB(.08,1.1,.44);edge.uniforms.tintB.value.setRGB(.52,1.0,.14);
    const halo=new THREE.Mesh(geo,edge);halo.scale.setScalar(1.003);group.add(halo);return group;
  }
  function researchObject(factory,x,y,z,scale,rotation,meta){
    const asset=factory(THREE),entry=floatObject(asset.group,x,y,z,scale,rotation);
    entry.meta=meta;entry.update=asset.update;return entry;
  }
  researchObject(createAIChip,-.30,.285,-.4,1.00,[.27,.24,-.28],{id:'ai',label:'AI material design',description:'Explore candidate structures and learn from synthesis and performance.',stage:3,labelOffset:1.65});
  researchObject(createSynthesisVessel,.315,.265,-1.2,.95,[.07,-.22,.23],{id:'synthesis',label:'Controlled synthesis',description:'Turn a designed architecture into a connected porous material.',stage:1,labelOffset:1.8});
  researchObject(createElectrochemicalCell,.335,-.22,1.0,1.22,[.13,-.47,.14],{id:'energy',label:'Electrochemical energy',description:'Porous electrodes connect ion transport with interfacial reactions.',stage:2,performance:'transport',labelOffset:1.6});
  researchObject(createReactionScene,.06,-.285,-.8,.87,[.34,-.28,-.08],{id:'catalysis',label:'Molecular catalysis',description:'Reactants reach active sites. Surface reactions release new products.',stage:2,performance:'catalysis',labelOffset:1.1});
  const capture=specimen(cubeGeometry,0x46b481,.38);
  const capturePlacement=floatObject(capture,-.47,.045,-3.6,.35,[.34,.48,-.32]);
  capturePlacement.meta={id:'capture',label:'Selective adsorption',description:'Molecules enter connected pores and bind to their inner surfaces.',stage:2,performance:'adsorption',labelOffset:2.0};
  if(KO){const KM={pores:["나노다공 구조","열린 골격, 접근 가능한 기공, 기능을 결정하는 계면."],ai:["AI 기반 소재 설계","후보 구조를 탐색하고 합성과 성능에서 학습합니다."],synthesis:["제어된 합성","설계된 구조를 연결된 다공성 소재로 만듭니다."],energy:["전기화학 에너지","다공성 전극이 이온 수송과 계면 반응을 잇습니다."],catalysis:["촉매","반응물이 활성 자리에 닿고, 표면 반응이 생성물을 내놓습니다."],capture:["선택적 흡착","분자가 연결된 기공으로 들어가 내부 표면에 결합합니다."]};for(const f of floating){if(f.meta&&KM[f.meta.id]){f.meta.label=KM[f.meta.id][0];f.meta.description=KM[f.meta.id][1];}}}
  const captureMolecules=[];
  for(let i=0;i<6;i++){
    const molecule=new THREE.Mesh(new THREE.SphereGeometry(.13,16,12),new THREE.MeshStandardMaterial({color:0xefa86f,emissive:0xc17342,emissiveIntensity:.35,roughness:.2}));
    capture.add(molecule);captureMolecules.push(molecule);
  }
  capturePlacement.update=(time,activity)=>captureMolecules.forEach((molecule,i)=>{
    const t=(time*.1+i/6)%1,entry=Math.min(t/.72,1);
    molecule.position.set(-2.8+entry*2.2,Math.sin(i*3.1)*1.1,Math.cos(i*2.5)*1.2);
    molecule.scale.setScalar(.9+activity*.22);
  });
  function unitCell(color){
    const group=new THREE.Group(),geo=new THREE.OctahedronGeometry(.75,0);
    const glass=new THREE.Mesh(geo,new THREE.MeshPhysicalMaterial({color,transmission:.7,thickness:.3,roughness:.16,metalness:.12,transparent:true,opacity:.7,ior:1.42,envMapIntensity:.7}));
    group.add(glass);group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color,transparent:true,opacity:.75})));
    return group;
  }
  floatObject(unitCell(0xe8b953),.49,.055,-4,.44,[.2,.6,.3]);
  floatObject(unitCell(0xad72de),-.14,.40,-5,.36,[.1,.4,-.6]);
  floatObject(unitCell(0x76be97),.12,.38,-5,.31,[.1,-.5,.2]);
  const particleMaterial=new THREE.MeshPhysicalMaterial({color:0x39839b,metalness:.22,roughness:.4,clearcoat:.5,transmission:.1,thickness:.45,envMapIntensity:.7,transparent:true,opacity:0});
  const particles=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,3),particleMaterial,spheres.length);
  particles.castShadow=true;particles.receiveShadow=true;assembly.add(particles);const matrixHelper=new THREE.Object3D();
  const updateParticles=spread=>spheres.forEach((s,i)=>{
    matrixHelper.position.set(s.x*spread,s.y*spread,s.z*spread+Math.sin(i*2.3)*(spread-1)*.7);
    matrixHelper.scale.setScalar(s.r*(.84+.16*(2-spread)));matrixHelper.updateMatrix();particles.setMatrixAt(i,matrixHelper.matrix);
  });
  updateParticles(1.22);particles.instanceMatrix.needsUpdate=true;
  const cage=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(6.5,8.1,3.0)),new THREE.LineBasicMaterial({color:0x44aebe,transparent:true,opacity:.28}));assembly.add(cage);
  const probeGroup=new THREE.Group();assembly.add(probeGroup);const probeGeometry=new THREE.SphereGeometry(.067,16,12);
  const cyan=new THREE.Color(.15,1.4,1.65),pink=new THREE.Color(1.65,.16,.9),probeRecords=[];
  for(const [index,path] of paths.entries()){
    const curve=new THREE.CatmullRomCurve3(path.points.map(p=>new THREE.Vector3(...p)),false,'catmullrom',.5);
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(90)),new THREE.LineBasicMaterial({color:0x4890ad,transparent:true,opacity:.14}));probeGroup.add(line);
    const probes=[];for(let j=0;j<3;j++){
      const material=new THREE.MeshBasicMaterial({color:cyan.clone(),transparent:true});const mesh=new THREE.Mesh(probeGeometry,material);probeGroup.add(mesh);probes.push(mesh);
    }probeRecords.push({kind:path.kind,curve,line,probes,index});
  }probeGroup.visible=false;
  const state={paused:reduced.matches,inspect:false,dragging:false,dragId:null,dragX:0,dragY:0,turnX:0,turnY:0,hoverX:0,hoverY:0,zoom:1,time:0,stageTime:4,last:performance.now(),visible:true,stage:0,performance:'adsorption'};
  const motion=createWorldMotion(THREE,{scene,camera,stage,hero,items:floating,reduced,state,onSelect:meta=>{
    if(meta.performance){
      currentPerformance=meta.performance;state.performance=meta.performance;
      document.querySelectorAll('[data-performance]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.performance===meta.performance)));
    }
    setStage(meta.stage,{animateMaterial:false});status.textContent=meta.label+'. '+meta.description;
  }});
  function setPause(value){
    state.paused=value;if(value){state.hoverX=0;state.hoverY=0;}
    pause.setAttribute('aria-pressed',String(value));pause.setAttribute('aria-label',value?'Resume automatic motion':'Pause automatic motion');pause.title=value?'Resume automatic motion':'Pause automatic motion';
    pause.querySelector('svg').innerHTML=value?'<path d="m7 4 8 6-8 6z"/>':'<path d="M7 5v10M13 5v10"/>';
    pause.querySelector('.sr-only').textContent=value?'Resume motion':'Pause motion';status.textContent=value?'Automatic motion paused. Drag or use arrow keys to rotate.':'Automatic motion resumed.';
  }setPause(state.paused);
  onStage=(index,animateMaterial)=>{
    state.stage=animateMaterial?index:0;state.stageTime=animateMaterial&&!reduced.matches?0:4;
    if(animateMaterial)motion.focus(['pores','synthesis',currentPerformance==='transport'?'energy':currentPerformance==='catalysis'?'catalysis':'capture','ai'][index]);
    status.textContent=['Design the pore architecture.','Watch building blocks form a connected framework.','Explore adsorption, catalysis, or ion transport.','Explore candidates and return to a new design.'][index];
  };
  onPerformance=kind=>{state.performance=kind;motion.focus(kind==='transport'?'energy':kind==='catalysis'?'catalysis':'capture');status.textContent=performanceCopy[kind].description;};
  function resize(){
    const rect=stage.getBoundingClientRect();if(!rect.width||!rect.height)return;camera.aspect=rect.width/rect.height;
    const height=11.3;camera.position.z=height/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));camera.updateProjectionMatrix();
    const narrow=rect.width<650;
    for(const item of floating){
      const perspective=(camera.position.z-item.z)/camera.position.z;
      const adjustedX=narrow?item.x*.90:item.x;
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
    status.textContent='Explore the research world. Drag objects or orbit the empty space. Scroll or use plus and minus to zoom. Escape returns.';
  });closeFocus.addEventListener('click',overview);pause.addEventListener('click',()=>setPause(!state.paused));
  function resetView(){state.turnX=0;state.turnY=0;state.hoverX=0;state.hoverY=0;state.zoom=1;motion.reset();status.textContent='Original view restored.';}
  reset.addEventListener('click',resetView);
  stage.addEventListener('wheel',event=>{if(state.inspect){event.preventDefault();state.zoom=THREE.MathUtils.clamp(state.zoom-event.deltaY*.0007,.72,1.35);}},{passive:false});
  stage.addEventListener('keydown',event=>{
    let handled=true;switch(event.key){
      case 'ArrowLeft':state.turnY=Math.max(-.65,state.turnY-.12);break;case 'ArrowRight':state.turnY=Math.min(.65,state.turnY+.12);break;case 'ArrowUp':state.turnX=Math.max(-.35,state.turnX-.1);break;case 'ArrowDown':state.turnX=Math.min(.35,state.turnX+.1);break;
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
      state.stageTime=Math.min(5,state.stageTime+dt);if(!state.paused)state.time+=dt;
      const follow=reduced.matches?1:1-Math.exp(-dt*7);
      camera.zoom=THREE.MathUtils.lerp(camera.zoom,state.zoom,follow);camera.updateProjectionMatrix();
      motion.update(dt,state.time);
      const synthesis=state.stage===1,formation=THREE.MathUtils.smoothstep(state.stageTime,.25,2.8),surfaceTarget=synthesis?formation:.93;
      surface.opacity=THREE.MathUtils.lerp(surface.opacity,surfaceTarget,follow);framework.visible=surface.opacity>.01;surface.depthWrite=surface.opacity>.65;
      glowMaterial.uniforms.opacity.value=surface.opacity;glowMaterial.uniforms.intensity.value=state.stage===2?.68:.52;
      particles.visible=synthesis&&formation<.99;if(particles.visible){particleMaterial.opacity=1-formation;updateParticles(1+(1-formation)*.32);particles.instanceMatrix.needsUpdate=true;}
      cage.visible=false;
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
  status.textContent='Interactive research world ready. Move to change perspective. Drag an object, or select its label to explore.';requestAnimationFrame(render);
}
