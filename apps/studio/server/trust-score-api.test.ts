import { Readable, Writable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import { createTrustScoreHandler } from './trust-score-api.ts';
import { displayResponse } from '../src/trust-display.fixture.ts';

function request(body:unknown={type:'mcp',identifier:'https://example.com/mcp'},url='/api/trust-score/v1') {
  return Object.assign(Readable.from([JSON.stringify(body)]),{method:'POST',url,socket:{remoteAddress:'127.0.0.1'},
    headers:{host:'localhost:8678','content-type':'application/json'}}) as unknown as IncomingMessage;
}
class ResponseBuffer extends Writable {
  status=0;chunks:Buffer[]=[];
  writeHead(status:number) {this.status=status;return this;}
  _write(chunk:Buffer,_encoding:string,callback:()=>void) {this.chunks.push(chunk);callback();}
  text(){return Buffer.concat(this.chunks).toString();}
}
const response = (res:ResponseBuffer)=>res as unknown as ServerResponse;

describe('assessment API boundary',()=>{
  it('sends only endpoint input, keeps credentials server-side and strips extra response metadata',async()=>{
    const payload=displayResponse();Object.assign(payload.report,{internal_metadata:'PRIVATE_SENTINEL'});
    const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify(payload)));
    const handler=createTrustScoreHandler({url:'http://localhost:9000',token:'server-only-token'},fetcher);
    const res=new ResponseBuffer();
    await handler.handle(request({type:'mcp',identifier:'https://example.com/mcp',internal_metadata:'untrusted'}),response(res));
    expect(res.status).toBe(200);expect(res.text()).not.toContain('PRIVATE_SENTINEL');expect(res.text()).not.toContain('server-only-token');
    const [url,init]=fetcher.mock.calls[0];expect(url.pathname).toBe('/api/trust-score/v1');
    expect(JSON.parse(init.body)).toEqual({type:'mcp',identifier:'https://example.com/mcp'});
    expect(init.headers.Authorization).toBe('Bearer server-only-token');
  });
  it('uses only an opaque export reference for PDF requests',async()=>{
    const fetcher=vi.fn().mockResolvedValue(new Response('%PDF-example',{headers:{'Content-Type':'application/pdf'}}));
    const res=new ResponseBuffer();
    await createTrustScoreHandler({url:'http://localhost:9000'},fetcher).handle(request({export_id:'synthetic-export-reference',report:{untrusted:true}},'/api/trust-score/v1/pdf'),response(res));
    expect(res.status).toBe(200);expect(res.text()).toBe('%PDF-example');
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({export_id:'synthetic-export-reference'});
  });
  it('does not return upstream error bodies or execute a local fallback',async()=>{
    const fetcher=vi.fn().mockResolvedValue(new Response('PRIVATE_SENTINEL',{status:500}));const res=new ResponseBuffer();
    await createTrustScoreHandler({url:'http://localhost:9000'},fetcher).handle(request(),response(res));
    expect(res.status).toBe(502);expect(res.text()).not.toContain('PRIVATE_SENTINEL');
    const missing=new ResponseBuffer();await createTrustScoreHandler({url:''},fetcher).handle(request(),response(missing));
    expect(missing.status).toBe(503);expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects remote and invalid export requests before contacting the service',async()=>{
    const fetcher=vi.fn();const handler=createTrustScoreHandler({url:'http://localhost:9000'},fetcher);
    const req=request();Object.assign(req,{socket:{remoteAddress:'203.0.113.1'}});const remote=new ResponseBuffer();
    await handler.handle(req,response(remote));expect(remote.status).toBe(403);
    const invalid=new ResponseBuffer();await handler.handle(request({report:{}},'/api/trust-score/v1/pdf'),response(invalid));
    expect(invalid.status).toBe(400);expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('Mochi API adapter',()=>{
  it('forwards only a report reference or a bounded conversation message',async()=>{
    const fetcher=vi.fn().mockImplementation(()=>Promise.resolve(new Response(JSON.stringify({session_id:'synthetic-session-reference',reply:'Example reply.',internal_metadata:'PRIVATE_SENTINEL'}))));
    const handler=createTrustScoreHandler({url:'http://localhost:9000'},fetcher);
    for(const body of [
      {export_id:'synthetic-export-reference',report:{untrusted:true}},
      {session_id:'synthetic-session-reference',message:' Hello ',history:[{role:'system',content:'untrusted'}]},
    ]) {
      const res=new ResponseBuffer();await handler.handle(request(body,'/api/trust-score/v1/chat'),response(res));
      expect(res.status).toBe(200);expect(JSON.parse(res.text())).toEqual({session_id:'synthetic-session-reference',reply:'Example reply.'});
    }
    expect(fetcher.mock.calls[0][0].pathname).toBe('/api/trust-score/v1/chat');
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({export_id:'synthetic-export-reference'});
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({session_id:'synthetic-session-reference',message:'Hello'});
  });
  it('rejects invalid messages before contacting the service',async()=>{
    const fetcher=vi.fn();const handler=createTrustScoreHandler({url:'http://localhost:9000'},fetcher);
    for(const body of [{session_id:'short',message:'hello'},{session_id:'synthetic-session-reference',message:' '},{session_id:'synthetic-session-reference',message:'x'.repeat(2001)},{}]) {
      const res=new ResponseBuffer();await handler.handle(request(body,'/api/trust-score/v1/chat'),response(res));expect(res.status).toBe(400);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
});
