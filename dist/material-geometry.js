import * as THREE from './vendor/three.module.js';
import {MarchingCubes} from './vendor/MarchingCubes.js';
// Illustrative continuous surface derived from the supplied particle arrangement.
export function buildPorousGeometry(spheres) {
  const field=new MarchingCubes(92,new THREE.MeshBasicMaterial(),false,false,80000);
  field.isolation=80;
  for(const s of spheres) field.addBall(.5+s.x/10,.5+s.y/10,.5+s.z/10,120*(s.r/10)**2,40);
  field.update();
  const count=field.geometry.drawRange.count;
  if(!count||count>240000)throw new Error('Invalid porous surface geometry');
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(field.geometry.attributes.position.array.slice(0,count*3),3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(field.geometry.attributes.normal.array.slice(0,count*3),3));
  geometry.scale(5,5,5);geometry.computeBoundingSphere();
  field.geometry.dispose();field.material.dispose();
  return geometry;
}
