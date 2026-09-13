export function createReactionScene(THREE){
  const group=new THREE.Group();
  const metal=new THREE.MeshPhysicalMaterial({color:0x934552,metalness:.46,roughness:.24,clearcoat:1});
  const surface=new THREE.MeshPhysicalMaterial({color:0xe77d69,metalness:.30,roughness:.25,clearcoat:.8});
  const substrate=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,.18,64),metal);
  substrate.position.y=-.52;group.add(substrate);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(1.19,.025,12,64),new THREE.MeshStandardMaterial({color:0xffb090,emissive:0xdc6e49,emissiveIntensity:.5,metalness:.4,roughness:.2}));
  rim.rotation.x=Math.PI/2;rim.position.y=-.42;group.add(rim);
  const grainGeometry=new THREE.SphereGeometry(.16,20,14);
  for(let x=-3;x<=3;x++)for(let z=-3;z<=3;z++){
    if(x*x+z*z>10)continue;
    const grain=new THREE.Mesh(grainGeometry,surface);grain.position.set(x*.3,-.31,z*.3);group.add(grain);
  }
  const active=new THREE.Mesh(new THREE.SphereGeometry(.22,24,16),new THREE.MeshStandardMaterial({color:0xe8b972,emissive:0xb87929,emissiveIntensity:.45,metalness:.55,roughness:.21}));
  active.position.set(0,-.21,0);group.add(active);
  const molecules=[];
  const a=new THREE.Color(0xffd884),b=new THREE.Color(0xf17cc0);
  for(let i=0;i<4;i++){
    const molecule=new THREE.Group(),material=new THREE.MeshPhysicalMaterial({color:a,roughness:.14,metalness:.12,clearcoat:1});
    for(let j=0;j<2;j++){const atom=new THREE.Mesh(new THREE.SphereGeometry(j===0?.13:.095,20,14),material);atom.position.x=j===0?-.08:.10;molecule.add(atom);}
    group.add(molecule);molecules.push({molecule,material});
  }
  return {group,update(time,activity){
    for(const [i,{molecule,material}] of molecules.entries()){
      const t=(time*.105+i*.25)%1;
      // Approach, dwell at an active surface, then depart as a product.
      const hold=t<.46?t/.46:t<.62?1:1-(t-.62)/.38;
      molecule.position.set(t<.62?-1.5*(1-hold):1.5*(1-hold),.08+1.25*(1-hold),Math.sin(i*2.4)*.40);
      molecule.rotation.set(time*.22+i,time*.31,Math.sin(time*.4+i)*.3);
      material.color.copy(a).lerp(b,THREE.MathUtils.smoothstep(t,.49,.63));
    }
    active.material.emissiveIntensity=.4+activity*.5+Math.sin(time*2.2)*.12;
    rim.material.emissiveIntensity=.35+activity*.7;
  }};
}
