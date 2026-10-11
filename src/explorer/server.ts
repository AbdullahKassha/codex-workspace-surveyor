import { createServer, type Server } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { ExplorerSnapshot, type ExplorerData } from './model.js';
import { clientCode, explorerHtml, explorerCss, reusableClientCode, reusableExplorerHtml } from './view.js';
import { ExplorerSession } from './session.js';

export type LocalExplorer = Readonly<{url:string;close:()=>Promise<void>;closed:Promise<void>}>;
export async function serveLocalExplorer(snapshot:ExplorerSnapshot):Promise<LocalExplorer> {
  let data:ExplorerData|undefined=snapshot.take();if(!data)throw new Error('Explorer unavailable');
  const token=randomBytes(32).toString('hex');let base='',host='',timer:NodeJS.Timeout|undefined;
  let resolveClosed!:()=>void;const closed=new Promise<void>(resolve=>{resolveClosed=resolve;});
  let closing:Promise<void>|undefined;
  const close=():Promise<void>=>{
    if(closing)return closing;data=undefined;clearTimeout(timer);
    closing=new Promise<void>(resolve=>{server.close(()=>{resolveClosed();resolve();});server.closeAllConnections();});return closing;
  };
  const server:Server=createServer({maxHeaderSize:8192,headersTimeout:5000,requestTimeout:5000},(req,res)=>{
    // No request/value logging. A secret never appears in a request URL.
    res.setHeader('Cache-Control','no-store');res.setHeader('Pragma','no-cache');res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cross-Origin-Resource-Policy','same-origin');
    res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    const reject=(code=403)=>{res.writeHead(code);res.end('Local session refused');req.resume();};
    if(req.headers.host!==host||req.socket.remoteAddress!=='127.0.0.1'||
      (req.headers.origin!==undefined&&req.headers.origin!==base)||
      (req.headers['sec-fetch-site']!==undefined&&!['same-origin','none'].includes(String(req.headers['sec-fetch-site']))))return reject();
    if((req.headers['content-length']!==undefined&&req.headers['content-length']!=='0')||req.headers['transfer-encoding']!==undefined)return reject();
    const authenticated=()=>{const value=req.headers['x-surveyor-session'];return typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)&&timingSafeEqual(Buffer.from(value),Buffer.from(token));};
    if(req.url==='/snapshot'&&req.method==='GET'){
      if(!authenticated()||!data)return reject();res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));return;
    }
    if(req.url==='/close'&&req.method==='POST'){
      if(!authenticated()||req.headers.origin!==base)return reject();res.once('finish',()=>{void close();});res.end('closed');return;
    }
    if(req.method!=='GET')return reject(405);
    const asset=req.url==='/'?[explorerHtml,'text/html']:req.url==='/client.js'?[clientCode,'text/javascript']:req.url==='/style.css'?[explorerCss,'text/css']:undefined;
    if(!asset)return reject(404);res.setHeader('Content-Type',asset[1]!+'; charset=utf-8');res.end(asset[0]);
  });
  server.on('clientError',(_error,socket)=>socket.destroy());
  try{await new Promise<void>((resolve,reject)=>{const failed=()=>reject(new Error('Explorer unavailable'));
    server.once('error',failed);server.listen(0,'127.0.0.1',()=>{server.off('error',failed);resolve();});});}
  catch{data=undefined;server.close();throw new Error('Explorer unavailable');}
  server.on('error',()=>{void close();});
  const address=server.address();if(!address||typeof address==='string'){await close();throw new Error('Explorer unavailable');}
  host='127.0.0.1:'+address.port;base='http://'+host;
  timer=setTimeout(()=>{void close();},10*60*1000);timer.unref();
  return Object.freeze({url:base+'/#'+token,close,closed});
}

// Separate interface preserves the accepted one-use server and fallback entries.
export async function serveReusableExplorer(session:ExplorerSession):Promise<LocalExplorer>{
  const token=randomBytes(32).toString('hex');let host='',base='',closing:Promise<void>|undefined;
  let resolveClosed!:()=>void;const closed=new Promise<void>(resolve=>{resolveClosed=resolve;});
  const streams=new Set<import('node:http').ServerResponse>();
  const close=():Promise<void>=>closing??=(async()=>{
    await session.close();unsubscribe();for(const stream of streams)stream.end();streams.clear();
    await new Promise<void>(resolve=>{server.close(()=>resolve());server.closeAllConnections();});resolveClosed();
  })();
  const send=(res:import('node:http').ServerResponse)=>{
    if(!res.write(JSON.stringify(session.state())+'\n')){streams.delete(res);res.destroy();}
  };
  const unsubscribe=session.subscribe(()=>{for(const res of streams)send(res);if(session.state().phase==='closed')void close();});
  const server=createServer({maxHeaderSize:8192,headersTimeout:5000,requestTimeout:5000},(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('Pragma','no-cache');res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cross-Origin-Resource-Policy','same-origin');
    res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    const reject=(code=403)=>{res.writeHead(code);res.end('Local session refused');req.resume();};
    if(req.headers.host!==host||req.socket.remoteAddress!=='127.0.0.1'||
      (req.headers.origin!==undefined&&req.headers.origin!==base)||
      (req.headers['sec-fetch-site']!==undefined&&!['same-origin','none'].includes(String(req.headers['sec-fetch-site'])))||
      (req.headers['content-length']!==undefined&&req.headers['content-length']!=='0')||req.headers['transfer-encoding']!==undefined)return reject();
    const asset=req.url==='/'?[reusableExplorerHtml,'text/html']:req.url==='/client.js'?[reusableClientCode,'text/javascript']:req.url==='/style.css'?[explorerCss,'text/css']:undefined;
    if(asset&&req.method==='GET'){res.setHeader('Content-Type',asset[1]!+'; charset=utf-8');res.end(asset[0]);return;}
    const credential=req.headers['x-surveyor-session'];
    if(typeof credential!=='string'||!/^[a-f0-9]{64}$/.test(credential)||!timingSafeEqual(Buffer.from(credential),Buffer.from(token)))return reject();
    if(req.method==='POST'){
      if(req.headers.origin!==base)return reject();
      if(req.url==='/close'){void session.close();res.once('finish',()=>{void close();});res.end('closing');return;}
      if(['closing','closed'].includes(session.state().phase))return reject(410);
      if(req.url==='/refresh'){const result=session.refresh();res.writeHead(result==='accepted'?202:409);res.end(result);return;}
      if(req.url==='/cancel'){session.cancel();res.end('cancelling');return;}
      if(req.url==='/activity'){session.touch();res.end('active');return;}
      return reject(404);
    }
    if(req.method!=='GET')return reject(405);
    if(['closing','closed'].includes(session.state().phase))return reject(410);
    res.setHeader('Content-Type','application/json; charset=utf-8');
    if(req.url==='/snapshot'){res.end(JSON.stringify(session.snapshot()));return;}
    if(req.url==='/state'){res.end(JSON.stringify(session.state()));return;}
    if(req.url==='/events'){
      if(streams.size>=8)return reject(429);streams.add(res);req.on('close',()=>{streams.delete(res);});send(res);return;
    }
    return reject(404);
  });
  server.maxConnections=32;server.on('clientError',(_error,socket)=>socket.destroy());
  try{await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>{server.removeAllListeners('error');resolve();});});}
  catch{unsubscribe();await session.close();server.close();throw new Error('Session unavailable');}
  server.on('error',()=>{void close();});
  const address=server.address();if(!address||typeof address==='string'){await close();throw new Error('Session unavailable');}
  host='127.0.0.1:'+address.port;base='http://'+host;return Object.freeze({url:base+'/#'+token,close,closed});
}
