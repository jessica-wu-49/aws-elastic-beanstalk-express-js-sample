const request = require('supertest');
const http = require('http');
const app = require('../app'); 

describe('GET /', function () {
  let server;
  before(() => { server = http.createServer(app); });
  after(() => { if (server && server.close) server.close(); });

  it('responds with 200 and HTML', async () => {
    const res = await request(server).get('/');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const ct = res.headers['content-type'] || '';
    if (!/html/i.test(ct)) throw new Error(`Expected HTML content-type, got: ${ct}`);
    if (!res.text || res.text.length < 10) throw new Error('Expected non-empty body');
  });
});
