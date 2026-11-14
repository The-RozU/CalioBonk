import * as THREE from 'three';

type PlayerState={id:string;name:string;x:number;y:number;z:number;yaw:number};
type Remote={root:THREE.Group;target:THREE.Vector3;yaw:number};
type Packet=
  | {type:'joined';room:string;playerId:string;players:PlayerState[]}
  | {type:'playerJoined';player:PlayerState}
  | {type:'playerLeft';id:string}
  | {type:'move';id:string;x:number;y:number;z:number;yaw:number}
  | {type:'error';message:string};

// GitHub Pages hosts static assets only; a production connection needs its own WSS backend.
function serverAddress():string{
  const configured=(import.meta.env.VITE_MULTIPLAYER_WS as string|undefined)?.trim();
  if(configured){
    if(!/^wss?:\/\//.test(configured))throw Error('Adres serwera musi rozpoczynać się od ws:// lub wss://.');
    if(location.protocol==='https:'&&!configured.startsWith('wss://'))throw Error('Strona HTTPS wymaga połączenia wss://.');
    return configured;
  }
  if(!['localhost','127.0.0.1'].includes(location.hostname))
    throw Error('Test multiplayera jest lokalny. Uruchom npm run dev oraz npm run dev:server. Publiczna strona wymaga hostingu WSS.');
  return 'ws://127.0.0.1:2567';
}

function makeRemote(scene:THREE.Scene,player:PlayerState):Remote{
  const root=new THREE.Group();
  root.name='Współgracz: '+player.name;
  const armor=new THREE.MeshStandardMaterial({color:'#40534a',roughness:.9,flatShading:true});
  const cloth=new THREE.MeshStandardMaterial({color:'#3c6350',roughness:1,flatShading:true});
  const hood=new THREE.MeshStandardMaterial({color:'#213a31',roughness:1,flatShading:true});
  const skin=new THREE.MeshStandardMaterial({color:'#c0aa92',roughness:1});
  const leather=new THREE.MeshStandardMaterial({color:'#3c3028',roughness:1});
  const wood=new THREE.MeshStandardMaterial({color:'#a28c5a',roughness:.75});
  const part=(geometry:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number)=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;root.add(mesh);return mesh;
  };
  part(new THREE.CylinderGeometry(.33,.47,.9,7),cloth,0,.81,0);
  part(new THREE.BoxGeometry(.67,.78,.43),armor,0,1.36,0);
  part(new THREE.ConeGeometry(.43,.7,7),hood,0,2.15,.04);
  part(new THREE.SphereGeometry(.22,7,5),skin,0,1.97,-.04);
  part(new THREE.ConeGeometry(.63,1.45,4,1,true),cloth,0,1.04,.21).rotation.y=Math.PI/4;
  for(const side of [-1,1]){
    part(new THREE.BoxGeometry(.27,.73,.29),leather,.22*side,.39,0);
    part(new THREE.BoxGeometry(.25,.64,.34),armor,.48*side,1.35,-.02);
  }
  const curve=new THREE.CubicBezierCurve3(
    new THREE.Vector3(0,.55,0),new THREE.Vector3(.42,.48,0),
    new THREE.Vector3(.42,-.48,0),new THREE.Vector3(0,-.55,0),
  );
  part(new THREE.TubeGeometry(curve,12,.045,4,false),wood,-.72,.84,-.3);
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
  const ctx=canvas.getContext('2d');
  if(ctx){
    ctx.fillStyle='rgba(6,19,14,.82)';ctx.fillRect(0,0,256,64);
    ctx.fillStyle='#e7dfc0';ctx.font='bold 27px Georgia';ctx.textAlign='center';
    ctx.fillText(player.name,128,42,230);
  }
  const label=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}));
  label.scale.set(2.3,.58,1);label.position.y=2.76;root.add(label);
  root.position.set(player.x,player.y,player.z);root.rotation.y=player.yaw;
  scene.add(root);
  return {root,target:new THREE.Vector3(player.x,player.y,player.z),yaw:player.yaw};
}

function disposeRemote(scene:THREE.Scene,remote:Remote):void{
  scene.remove(remote.root);
  remote.root.traverse(object=>{
    if(object instanceof THREE.Mesh||object instanceof THREE.Sprite){
      if(object instanceof THREE.Mesh)object.geometry.dispose();
      const materials=Array.isArray(object.material)?object.material:[object.material];
      for(const material of materials){
        if(material instanceof THREE.SpriteMaterial)material.map?.dispose();
        material.dispose();
      }
    }
  });
}

export class Multiplayer{
  private socket:WebSocket|null=null;
  private readonly remotes=new Map<string,Remote>();
  private myId='';
  private sendTimer=0;
  private readonly previous=new THREE.Vector3(0,0,4);
  private direction=0;
  roomCode='';
  onStatus:(message:string)=>void=()=>{};
  onPresence:(players:number)=>void=()=>{};
  constructor(private readonly scene:THREE.Scene){}
  get connected():boolean{return !!this.socket&&this.socket.readyState===WebSocket.OPEN&&!!this.roomCode;}
  get remoteCount():number{return this.remotes.size;}

  private addPlayer(data:PlayerState):void{
    if(data.id===this.myId)return;
    let remote=this.remotes.get(data.id);
    if(!remote){remote=makeRemote(this.scene,data);this.remotes.set(data.id,remote);}
    remote.target.set(data.x,data.y,data.z);remote.yaw=data.yaw;
    this.onPresence(this.remotes.size+1);
  }
  private removePlayer(id:string):void{
    const remote=this.remotes.get(id);if(!remote)return;
    disposeRemote(this.scene,remote);this.remotes.delete(id);
    this.onPresence(this.remotes.size+1);
  }
  private clear():void{
    for(const remote of this.remotes.values())disposeRemote(this.scene,remote);
    this.remotes.clear();this.roomCode='';this.myId='';
    this.onPresence(1);
  }
  leave():void{
    const socket=this.socket;this.socket=null;
    if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'leave'}));
    socket?.close();
    this.clear();this.onStatus('Poza pokojem multiplayer.');
  }

  async connect(action:'create'|'join',name:string,room=''):Promise<void>{
    this.leave();
    const url=serverAddress();
    await new Promise<void>((resolve,reject)=>{
      let done=false;
      const socket=new WebSocket(url);this.socket=socket;
      const end=(error?:Error)=>{
        if(done)return;done=true;window.clearTimeout(timeout);
        if(error){socket.close();reject(error);}else resolve();
      };
      const timeout=window.setTimeout(()=>end(Error('Serwer nie odpowiedział. Uruchom npm run dev:server.')),7000);
      socket.onopen=()=>socket.send(JSON.stringify({type:action,name,room:room.trim().toUpperCase()}));
      socket.onmessage=event=>{
        let msg:Packet;
        try{msg=JSON.parse(String(event.data)) as Packet;}catch{return;}
        if(msg.type==='error'){this.onStatus(msg.message);end(Error(msg.message));return;}
        if(msg.type==='joined'){
          this.myId=msg.playerId;this.roomCode=msg.room;
          for(const player of msg.players)this.addPlayer(player);
          this.onPresence(this.remotes.size+1);
          this.onStatus('Połączono! Kod pokoju: '+msg.room);
          end();
        }else if(msg.type==='playerJoined')this.addPlayer(msg.player);
        else if(msg.type==='playerLeft')this.removePlayer(msg.id);
        else if(msg.type==='move'){
          const player=this.remotes.get(msg.id);
          if(player){player.target.set(msg.x,msg.y,msg.z);player.yaw=msg.yaw;}
        }
      };
      socket.onerror=()=>end(Error('Nie udało się połączyć z serwerem.'));
      socket.onclose=()=>{
        if(this.socket!==socket)return;
        this.socket=null;this.clear();this.onStatus('Rozłączono z serwerem.');
        end(Error('Połączenie zostało zamknięte.'));
      };
    });
  }

  update(dt:number,position:THREE.Vector3,sendState:boolean):void{
    for(const remote of this.remotes.values()){
      remote.root.position.lerp(remote.target,Math.min(1,dt*15));
      const delta=Math.atan2(Math.sin(remote.yaw-remote.root.rotation.y),Math.cos(remote.yaw-remote.root.rotation.y));
      remote.root.rotation.y+=delta*Math.min(1,dt*14);
    }
    if(!this.connected||!sendState)return;
    const dx=position.x-this.previous.x,dz=position.z-this.previous.z;
    if(dx*dx+dz*dz>.0001)this.direction=Math.atan2(-dx,-dz);
    this.previous.copy(position);
    this.sendTimer+=dt;
    if(this.sendTimer>=.05){
      this.sendTimer=0;
      this.socket?.send(JSON.stringify({type:'move',x:position.x,y:position.y,z:position.z,yaw:this.direction}));
    }
  }
}
