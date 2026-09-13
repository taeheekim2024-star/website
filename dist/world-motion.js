// Pointer-led camera movement and a damped return for individually held objects.
export function springStep(position,velocity,target,dt,stiffness=32,damping=8.5){
  const steps=Math.max(1,Math.ceil(dt/(1/120))),h=dt/steps;
  for(let i=0;i<steps;i++){
    velocity+=(stiffness*(target-position)-damping*velocity)*h;
    position+=velocity*h;
  }
  return [position,velocity];
}

export function createWorldMotion(THREE,{scene,camera,stage,hero,items,reduced,state,onSelect}){
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(9,9),worldPoint=new THREE.Vector3();
  const plane=new THREE.Plane(),normal=new THREE.Vector3(),pickOffset=new THREE.Vector3();
  const layer=document.getElementById('world-topics');
  let hovered=null,held=null,selected=null,inside=false,lastPick=0,moved=0;
  let viewport={width:1,height:1};
  for(const item of items){
    item.offset=new THREE.Vector3();item.velocity=new THREE.Vector3();item.target=new THREE.Vector3();
    item.spin=new THREE.Vector2();item.activity=0;item.focus=0;
    item.group.traverse(child=>{child.userData.worldItem=item;});
    if(item.meta){
      const button=document.createElement('button');button.type='button';button.className='world-topic';
      button.dataset.world=item.meta.id;button.setAttribute('aria-pressed','false');
      const title=document.createElement('span');title.textContent=item.meta.label;
      const description=document.createElement('small');description.textContent=item.meta.description;
      button.append(title,description);layer.appendChild(button);item.button=button;
      button.addEventListener('click',()=>select(item));
      button.addEventListener('pointerenter',()=>{hovered=item;});
      button.addEventListener('pointerleave',()=>{hovered=null;});
      button.addEventListener('focus',()=>{hovered=item;});
      button.addEventListener('blur',()=>{hovered=null;});
    }
  }
  function select(item){
    selected=selected===item?null:item;
    for(const entry of items)entry.button?.setAttribute('aria-pressed',String(entry===selected));
    if(selected)onSelect(selected.meta);
  }
  function coordinates(event){
    const rect=stage.getBoundingClientRect();viewport={width:rect.width,height:rect.height};
    pointer.set((event.clientX-rect.left)/rect.width*2-1,-((event.clientY-rect.top)/rect.height*2-1));
    inside=Math.abs(pointer.x)<=1&&Math.abs(pointer.y)<=1;
    state.hoverX=inside?pointer.x:0;state.hoverY=inside?pointer.y:0;
  }
  function pick(){
    if(!inside)return null;
    ray.setFromCamera(pointer,camera);
    const hits=ray.intersectObjects(items.map(item=>item.group),true);
    return hits.find(hit=>{let node=hit.object;while(node){if(!node.visible)return false;node=node.parent;}return hit.object.material?.visible!==false&&(hit.object.material?.opacity??1)>.08;})?.object.userData.worldItem||null;
  }
  hero.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch'&&!state.dragging)return;
    coordinates(event);
    if(state.dragging)return;
    if(event.target.closest?.('.world-topic'))return;
    if(performance.now()-lastPick>70){lastPick=performance.now();hovered=pick();}
  });
  hero.addEventListener('pointerleave',()=>{if(!state.dragging){inside=false;hovered=null;state.hoverX=0;state.hoverY=0;}});
  stage.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    coordinates(event);held=pick();
    // A one-finger swipe outside the expanded world still scrolls the page.
    if(event.pointerType==='touch'&&!state.inspect){held=null;return;}
    state.dragging=true;state.dragId=event.pointerId;state.dragX=event.clientX;state.dragY=event.clientY;moved=0;
    stage.setPointerCapture(event.pointerId);stage.focus({preventScroll:true});
    if(held){
      camera.getWorldDirection(normal);plane.setFromNormalAndCoplanarPoint(normal,held.group.position);
      ray.setFromCamera(pointer,camera);ray.ray.intersectPlane(plane,worldPoint);
      pickOffset.copy(held.group.position).sub(worldPoint);held.velocity.set(0,0,0);
    }
  });
  stage.addEventListener('pointermove',event=>{
    if(!state.dragging||event.pointerId!==state.dragId)return;
    const dx=event.clientX-state.dragX,dy=event.clientY-state.dragY;moved+=Math.abs(dx)+Math.abs(dy);coordinates(event);
    if(held){
      ray.setFromCamera(pointer,camera);
      if(ray.ray.intersectPlane(plane,worldPoint)){
        held.target.copy(worldPoint).add(pickOffset).sub(held.base);held.target.clampLength(0,4.5);
        held.spin.x=THREE.MathUtils.clamp(held.spin.x+dy*.004,-.7,.7);
        held.spin.y=THREE.MathUtils.clamp(held.spin.y+dx*.005,-1,1);
      }
    }else{
      state.turnY=THREE.MathUtils.clamp(state.turnY+dx*.0025,-.65,.65);
      state.turnX=THREE.MathUtils.clamp(state.turnX+dy*.002,-.35,.35);
    }
    state.dragX=event.clientX;state.dragY=event.clientY;
  });
  function release(event){
    if(!state.dragging)return;
    if(event.type==='pointerup'&&moved<7&&held?.meta)select(held);
    if(held)held.target.set(0,0,0);
    held=null;state.dragging=false;state.dragId=null;
  }
  ['pointerup','pointercancel','lostpointercapture'].forEach(name=>stage.addEventListener(name,release));

  // A real perspective plane: its cells move consistently with the camera.
  const floorMaterial=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{cursor:{value:new THREE.Vector3()},energy:{value:0}},
    vertexShader:'varying vec3 world;void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
    fragmentShader:`varying vec3 world;uniform vec3 cursor;uniform float energy;
      float grid(vec2 uv){vec2 width=max(fwidth(uv),vec2(.0001));vec2 cell=abs(fract(uv-.5)-.5)/width;return 1.-min(min(cell.x,cell.y),1.);}
      void main(){float fine=grid(world.xz/.9);float major=grid(world.xz/4.5);
      float depth=1.-smoothstep(4.,44.,-world.z);float side=1.-smoothstep(9.,27.,abs(world.x));
      float spot=exp(-distance(world.xz,cursor.xz)*.65)*energy;
      vec3 color=mix(vec3(.13,.24,.31),vec3(.20,.60,.68),spot*.6);
      float alpha=(fine*.21+major*.13+spot*fine*.22)*depth*side;
      gl_FragColor=vec4(color,alpha);}`
  });
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(110,110),floorMaterial);
  floor.rotation.x=-Math.PI/2;floor.position.set(0,-3.9,-25);scene.add(floor);
  const floorPlane=new THREE.Plane(new THREE.Vector3(0,1,0),3.9);
  const shadowMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
    uniforms:{opacity:{value:.17}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 vUv;uniform float opacity;void main(){float d=length((vUv-.5)*2.);gl_FragColor=vec4(.025,.04,.065,exp(-d*d*5.)*opacity*(1.-smoothstep(.6,1.,d)));}'});
  for(const item of items.filter(item=>item.meta)){
    const shadow=new THREE.Mesh(new THREE.PlaneGeometry(5,5),shadowMaterial.clone());shadow.rotation.x=-Math.PI/2;
    scene.add(shadow);item.shadow=shadow;
  }
  const projected=new THREE.Vector3();
  return {
    focus(id){
      selected=items.find(item=>item.meta?.id===id)||null;
      for(const item of items)item.button?.setAttribute('aria-pressed',String(item===selected));
    },
    reset(){
      held=null;hovered=null;selected=null;state.dragging=false;state.dragId=null;
      items.forEach(item=>{item.target.set(0,0,0);item.spin.set(0,0);item.button?.setAttribute('aria-pressed','false');});
    },
    update(dt,time){
      const follow=reduced.matches?1:1-Math.exp(-dt*4.2);
      const cameraX=state.hoverX*1.35+state.turnY*2.0,cameraY=.1+state.hoverY*.70-state.turnX*1.4;
      camera.position.x=THREE.MathUtils.lerp(camera.position.x,cameraX,follow);
      camera.position.y=THREE.MathUtils.lerp(camera.position.y,cameraY,follow);
      camera.lookAt(state.turnY*.25,state.hoverY*.05,0);camera.updateMatrixWorld();
      stage.classList.toggle('holding-object',!!held);stage.classList.toggle('over-object',!!hovered);
      for(const item of items){
        const active=item===held||item===hovered||item===selected;
        item.activity=THREE.MathUtils.lerp(item.activity,active?1:0,follow);
        for(const axis of ['x','y','z']){
          if(reduced.matches){item.offset[axis]=item.target[axis];item.velocity[axis]=0;}
          else [item.offset[axis],item.velocity[axis]]=springStep(item.offset[axis],item.velocity[axis],item.target[axis],dt,item===held?100:32,item===held?18:8.5);
        }
        const amplitude=item.z>0?.16:.10;
        item.group.position.copy(item.base).add(item.offset);
        item.group.position.y+=Math.sin(time*.62+item.phase)*amplitude;
        item.group.position.x+=Math.cos(time*.37+item.phase)*amplitude*.42;
        const tiltX=item.rotation[0]+Math.sin(time*.27+item.phase)*.075+item.spin.x-state.hoverY*.12;
        const tiltY=item.rotation[1]+Math.sin(time*.23+item.phase)*.18+item.spin.y+state.hoverX*.20;
        item.group.rotation.x=THREE.MathUtils.lerp(item.group.rotation.x,tiltX,follow);
        item.group.rotation.y=THREE.MathUtils.lerp(item.group.rotation.y,tiltY,follow);
        item.group.rotation.z=item.rotation[2]+Math.sin(time*.31+item.phase)*.045;
        if(item!==held){item.spin.multiplyScalar(Math.exp(-dt*1.8));}
        const baseScale=item.scale*(stage.clientWidth<650?.62:1);
        item.group.scale.setScalar(baseScale*(1+item.activity*.065));
        item.update?.(time,item.activity);
        if(item.shadow){
          item.shadow.position.set(item.group.position.x,-3.88,item.group.position.z);
          item.shadow.scale.setScalar(.6+baseScale*.8);item.shadow.material.uniforms.opacity.value=.11;
        }
        if(item.button){
          projected.copy(item.group.position);projected.y-=item.meta.labelOffset*baseScale;
          projected.project(camera);
          item.button.style.left='clamp(110px, '+((projected.x*.5+.5)*100)+'%, calc(100% - 110px))';item.button.style.top=((-projected.y*.5+.5)*100)+'%';
          item.button.classList.toggle('active',active);
          item.button.hidden=projected.z>1||Math.abs(projected.x)>1.1||Math.abs(projected.y)>1.1;
        }
      }
      if(inside){ray.setFromCamera(pointer,camera);if(ray.ray.intersectPlane(floorPlane,worldPoint))floorMaterial.uniforms.cursor.value.lerp(worldPoint,follow);}
      floorMaterial.uniforms.energy.value=THREE.MathUtils.lerp(floorMaterial.uniforms.energy.value,inside?.9:0,follow);
    }
  };
}
