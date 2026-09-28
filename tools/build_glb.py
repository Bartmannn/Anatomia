"""Konwersja STL z BodyParts3D do jednego pliku models/kregoslup.glb.

Użycie:  python tools/build_glb.py <folder_z_plikami_stl> [plik_wyjściowy]
Wymaga: numpy.  Źródło STL: https://github.com/Kevin-Mattheus-Moerman/BodyParts3D
(assets/BodyParts3D_data/stl). Licencja modeli: CC BY-SA 2.1 JP.
Kroki: zmiana układu osi (Z w górę -> Y w górę), skala mm -> 0,01, scalenie
wierzchołków, wygładzone normalne, kwantyzacja (KHR_mesh_quantization).
"""
import numpy as np, json, struct, os, sys
SRC=os.path.join(sys.argv[1] if len(sys.argv)>1 else 'bodyparts3d/stl','')
OUT=sys.argv[2] if len(sys.argv)>2 else 'models/kregoslup.glb'
V=[('C1','FMA12519'),('C2','FMA12520'),('C3','FMA12521'),('C4','FMA12522'),('C5','FMA12523'),('C6','FMA12524'),('C7','FMA12525'),
('Th1','FMA9165'),('Th2','FMA9187'),('Th3','FMA9209'),('Th4','FMA9248'),('Th5','FMA9922'),('Th6','FMA9945'),('Th7','FMA9968'),('Th8','FMA9991'),('Th9','FMA10014'),('Th10','FMA10037'),('Th11','FMA10059'),('Th12','FMA10081'),
('L1','FMA13072'),('L2','FMA13073'),('L3','FMA13074'),('L4','FMA13075'),('L5','FMA13076'),('S','FMA16202')]
D=[('C2','FMA25058'),('C3','FMA13896'),('C4','FMA13897'),('C5','FMA13898'),('C6','FMA13899'),('C7','FMA13900'),
('Th1','FMA10458'),('Th2','FMA13495'),('Th3','FMA13500'),('Th4','FMA13501'),('Th5','FMA13502'),('Th6','FMA13503'),('Th7','FMA13504'),('Th8','FMA13505'),('Th9','FMA13506'),('Th10','FMA13507'),('Th11','FMA13508'),('Th12','FMA13509'),
('L1','FMA16033'),('L2','FMA16034'),('L3','FMA16035'),('L4','FMA16036'),('L5','FMA16037')]
parts=[(k,f,'bone') for k,f in V]+[('D_'+k,f,'disc') for k,f in D]
def load(fid):
    d=open(SRC+fid+'.stl','rb').read(); n=int.from_bytes(d[80:84],'little')
    t=np.frombuffer(d[84:84+n*50],dtype=np.dtype([('n','<f4',3),('v','<f4',(3,3)),('a','<u2')]))
    v=t['v'].reshape(-1,3).astype(np.float64)
    # BodyParts3D: x, y (+ posterior), z (up), mm  -> three: x, y=z, z=-y ; scale 0.01
    v=np.stack([v[:,0],v[:,2],-v[:,1]],1)*0.01
    u,inv=np.unique(np.round(v,5),axis=0,return_inverse=True)
    f=inv.reshape(-1,3)
    f=f[(f[:,0]!=f[:,1])&(f[:,1]!=f[:,2])&(f[:,0]!=f[:,2])]
    # winding: STL CCW outward; our axis map (x,z,-y) is a rotation (det +1) so winding kept
    fn=np.cross(u[f[:,1]]-u[f[:,0]],u[f[:,2]]-u[f[:,0]])
    nrm=np.zeros_like(u)
    for i in range(3): np.add.at(nrm,f[:,i],fn)
    nrm/=np.linalg.norm(nrm,axis=1,keepdims=True)+1e-12
    return u,f,nrm
allv=[]; data=[]
for k,fid,kind in parts:
    u,f,n=load(fid); data.append((k,fid,kind,u,f,n)); allv.append(u)
allv=np.concatenate(allv); center=(allv.min(0)+allv.max(0))/2; center[1]=(allv.min(0)[1]+allv.max(0)[1])/2
print('bounds',allv.min(0)-center,allv.max(0)-center)
buf=bytearray(); views=[]; accs=[]; meshes=[]; nodes=[]
def add(b,target):
    while len(buf)%4: buf.append(0)
    off=len(buf); buf.extend(b); views.append({'buffer':0,'byteOffset':off,'byteLength':len(b),'target':target}); return len(views)-1
tris=0
for k,fid,kind,u,f,n in data:
    u=u-center; lo=u.min(0); hi=u.max(0); mid=(lo+hi)/2; half=(hi-lo)/2+1e-9
    q=np.round((u-mid)/half*32767).clip(-32767,32767).astype('<i2')
    q4=np.zeros((len(q),4),'<i2'); q4[:,:3]=q   # pad to 4-byte stride
    nq=np.zeros((len(n),4),'i1'); nq[:,:3]=np.round(n*127).clip(-127,127)
    idx=f.astype('<u2' if len(u)<65536 else '<u4')
    pv=add(q4.tobytes(),34962); views[pv]['byteStride']=8
    nv=add(nq.tobytes(),34962); views[nv]['byteStride']=4
    iv=add(idx.tobytes(),34963)
    a0=len(accs); accs.append({'bufferView':pv,'componentType':5122,'normalized':True,'count':len(u),'type':'VEC3','min':[int(x) for x in q.min(0)],'max':[int(x) for x in q.max(0)]})
    accs.append({'bufferView':nv,'componentType':5120,'normalized':True,'count':len(u),'type':'VEC3'})
    accs.append({'bufferView':iv,'componentType':5123 if idx.dtype==np.dtype('<u2') else 5125,'count':idx.size,'type':'SCALAR'})
    meshes.append({'name':k,'primitives':[{'attributes':{'POSITION':a0,'NORMAL':a0+1},'indices':a0+2}]})
    nodes.append({'name':k,'mesh':len(meshes)-1,'translation':[float(x) for x in mid],'scale':[float(x) for x in half],'extras':{'fma':fid,'kind':kind}})
    tris+=len(f)
while len(buf)%4: buf.append(0)
gltf={'asset':{'version':'2.0','generator':'Anatomia build_glb.py','copyright':'BodyParts3D, (c) The Database Center for Life Science, CC BY-SA 2.1 JP. Converted/processed by Anatomia (CC BY-SA 2.1 JP).'},
'extensionsUsed':['KHR_mesh_quantization'],'extensionsRequired':['KHR_mesh_quantization'],
'scene':0,'scenes':[{'nodes':list(range(len(nodes)))}],'nodes':nodes,'meshes':meshes,'accessors':accs,'bufferViews':views,'buffers':[{'byteLength':len(buf)}]}
j=json.dumps(gltf,separators=(',',':')).encode(); j+=b' '*((4-len(j)%4)%4)
out=struct.pack('<III',0x46546C67,2,12+8+len(j)+8+len(buf))+struct.pack('<II',len(j),0x4E4F534A)+j+struct.pack('<II',len(buf),0x004E4942)+bytes(buf)
open(OUT,'wb').write(out)
print('tris',tris,'size MB',len(out)/1e6)
