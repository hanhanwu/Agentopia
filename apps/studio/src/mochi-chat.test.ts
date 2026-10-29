import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestMochi } from './mochi-chat.ts';
afterEach(()=>vi.unstubAllGlobals());
describe('Mochi client contract',()=>{
  it('sends only the conversation request and accepts a bounded reply',async()=>{
    const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({session_id:'synthetic-session-reference',reply:'Example reply.'})));vi.stubGlobal('fetch',fetcher);
    const signal=new AbortController().signal;
    await expect(requestMochi({export_id:'synthetic-export-reference'},signal)).resolves.toEqual({session_id:'synthetic-session-reference',reply:'Example reply.'});
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({export_id:'synthetic-export-reference'});
  });
  it('does not surface upstream diagnostic text',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('PRIVATE_SENTINEL',{status:502})));
    await expect(requestMochi({export_id:'synthetic-export-reference'},new AbortController().signal)).rejects.toThrow('Mochi could not reply. Try again.');
  });
});
