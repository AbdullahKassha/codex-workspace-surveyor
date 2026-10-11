import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { fileURLToPath } from 'node:url';

type Message={event:'owner'|'attached'|'ready'|'relaunch'|'refused';url?:string};
const validUrl=(url:unknown):url is string=>typeof url==='string'&&/^http:\/\/127\.0\.0\.1:[0-9]{1,5}\/#([a-f0-9]{64})$/.test(url);
export class SessionBroker {
  #child:ChildProcessWithoutNullStreams;#pending:{resolve:(m:Message)=>void;reject:()=>void;timer:NodeJS.Timeout}|undefined;
  #buffer='';#failed=false;#url:string|undefined;#stop:Promise<void>|undefined;#exited:Promise<void>;
  private constructor(executable:string,private readonly onRelaunch:()=>void,private readonly onLost:()=>void){
    this.#child=spawn(executable,['-NoLogo','-NoProfile','-NonInteractive','-File',fileURLToPath(new URL('../../../test/support/session-pipe-helper.ps1',import.meta.url))],
      {shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});
    this.#child.stderr.on('data',()=>{});
    this.#exited=new Promise(resolve=>{this.#child.once('close',()=>{this.#fail();resolve();});this.#child.once('error',()=>{this.#fail();resolve();});});
    this.#child.stdin.on('error',()=>{this.#fail();});
    this.#child.stdout.setEncoding('utf8');this.#child.stdout.on('data',(chunk:string)=>{
      this.#buffer+=chunk;if(Buffer.byteLength(this.#buffer)>4096){this.#fail();return;}
      let index:number;while((index=this.#buffer.indexOf('\n'))>=0){const line=this.#buffer.slice(0,index);this.#buffer=this.#buffer.slice(index+1);
        try{const message=JSON.parse(line) as Message;
          if(message.event==='relaunch'&&this.#url&&!this.#failed){this.onRelaunch();this.#write({event:'reply',url:this.#url});}
          else if(this.#pending&&['owner','attached','ready'].includes(message.event)){
            const pending=this.#pending;this.#pending=undefined;clearTimeout(pending.timer);pending.resolve(message);
          }else{this.#fail();}
        }catch{this.#fail();}
      }
    });
  }
  #fail():void{if(this.#failed)return;this.#failed=true;if(this.#pending){clearTimeout(this.#pending.timer);this.#pending.reject();this.#pending=undefined;}
    this.#child.stdin.end();if(this.#url&&!this.#stop)this.onLost();}
  #write(value:object):void{if(this.#failed)throw new Error('Session coordination refused');this.#child.stdin.write(JSON.stringify(value)+'\n');}
  #read():Promise<Message>{return new Promise((resolve,reject)=>{
    if(this.#failed||this.#pending){reject(new Error('Session coordination refused'));return;}
    this.#pending={resolve,reject:()=>reject(new Error('Session coordination refused')),timer:setTimeout(()=>{this.#fail();},6500)};
  });}
  static async start(executable:string,scope:string,onRelaunch:()=>void,onLost:()=>void,channel='main'):
    Promise<{kind:'owner';broker:SessionBroker}|{kind:'attached';url:string}>{
    if(!/^[a-f0-9]{64}$/.test(scope)||!/^(main|[a-f0-9]{64})$/.test(channel))throw new Error('Session coordination refused');
    const broker=new SessionBroker(executable,onRelaunch,onLost);
    try{const response=broker.#read();broker.#write({version:1,scope,channel});const message=await response;
      if(message.event==='owner')return {kind:'owner',broker};
      if(message.event==='attached'&&validUrl(message.url)){await broker.stop();return {kind:'attached',url:message.url};}
      throw new Error('Session coordination refused');
    }catch{await broker.stop();throw new Error('Session coordination refused');}
  }
  async ready(url:string):Promise<void>{if(!validUrl(url))throw new Error('Session coordination refused');
    const response=this.#read();this.#url=url;this.#write({event:'ready',url});if((await response).event!=='ready')throw new Error('Session coordination refused');}
  stop():Promise<void>{return this.#stop??=Promise.resolve().then(async()=>{this.#child.stdin.end();await this.#exited;});}
}
