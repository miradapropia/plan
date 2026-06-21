// Netlify Function: proxy to Anthropic API with streaming to avoid inactivity timeouts.
// Streaming keeps bytes flowing so Netlify doesn't kill the connection on long generations
// (large PDFs + high max_tokens). Uses the Lambda streaming response format.

const https = require('https');

// Netlify supports streaming responses via the awslambda.streamifyResponse wrapper.
// We detect it; if unavailable (older runtime), we fall back to a buffered response.
const hasStreaming = typeof awslambda !== 'undefined' && awslambda.streamifyResponse;

const ANTHROPIC_HOST = 'api.anthropic.com';
const ANTHROPIC_PATH = '/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

function buildUpstreamOptions(bodyLength){
  return {
    hostname: ANTHROPIC_HOST,
    path: ANTHROPIC_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
      'Content-Length': bodyLength
    },
    timeout: 120000
  };
}

// ---- Streaming handler (preferred) ----
async function streamingHandler(event, responseStream){
  // Validate API key
  if(!process.env.ANTHROPIC_API_KEY){
    responseStream.write(JSON.stringify({
      error:{type:'config_error', message:'ANTHROPIC_API_KEY no está configurada en netlify.'}
    }));
    responseStream.end();
    return;
  }

  let parsed;
  try{
    parsed = JSON.parse(event.body);
  }catch(e){
    responseStream.write(JSON.stringify({error:{message:'Invalid JSON in request body'}}));
    responseStream.end();
    return;
  }

  // Force streaming on the upstream call
  parsed.stream = true;
  const body = JSON.stringify(parsed);

  await new Promise((resolve) => {
    const req = https.request(buildUpstreamOptions(Buffer.byteLength(body)), (res) => {
      res.on('data', (chunk) => {
        try { responseStream.write(chunk); } catch(_){}
      });
      res.on('end', () => { try { responseStream.end(); } catch(_){} resolve(); });
    });
    req.on('error', (err) => {
      try {
        responseStream.write(`event: error\ndata: ${JSON.stringify({error:{message:'upstream error: '+err.message}})}\n\n`);
        responseStream.end();
      } catch(_){}
      resolve();
    });
    req.on('timeout', () => { req.destroy(); try { responseStream.end(); } catch(_){} resolve(); });
    req.write(body);
    req.end();
  });
}

// ---- Buffered fallback handler ----
async function bufferedHandler(event){
  if(event.httpMethod === 'OPTIONS'){
    return {statusCode:204, headers:cors(), body:''};
  }
  if(event.httpMethod !== 'POST'){
    return {statusCode:405, headers:cors(), body:JSON.stringify({error:{message:'Method Not Allowed'}})};
  }
  if(!process.env.ANTHROPIC_API_KEY){
    return {statusCode:500, headers:cors(), body:JSON.stringify({error:{type:'config_error', message:'ANTHROPIC_API_KEY no está configurada en netlify.'}})};
  }
  let parsed;
  try { parsed = JSON.parse(event.body); }
  catch(e){ return {statusCode:400, headers:cors(), body:JSON.stringify({error:{message:'Invalid JSON'}})}; }

  delete parsed.stream; // buffered mode: no streaming
  const body = JSON.stringify(parsed);

  return new Promise((resolve) => {
    const req = https.request(buildUpstreamOptions(Buffer.byteLength(body)), (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({statusCode:res.statusCode, headers:cors(), body:data}));
    });
    req.on('error', err => resolve({statusCode:502, headers:cors(), body:JSON.stringify({error:{type:'upstream_error', message:'No se pudo conectar con anthropic: '+err.message}})}));
    req.on('timeout', () => { req.destroy(); resolve({statusCode:504, headers:cors(), body:JSON.stringify({error:{type:'timeout', message:'La api tardó demasiado.'}})}); });
    req.write(body);
    req.end();
  });
}

function cors(){
  return {
    'Content-Type':'application/json',
    'Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Headers':'Content-Type',
    'Access-Control-Allow-Methods':'POST, OPTIONS'
  };
}

if(hasStreaming){
  exports.handler = awslambda.streamifyResponse(async (event, responseStream, context) => {
    const httpMethod = event.requestContext?.http?.method || event.httpMethod;
    if(httpMethod === 'OPTIONS' || httpMethod === 'GET'){
      responseStream.end();
      return;
    }
    await streamingHandler(event, responseStream);
  });
} else {
  exports.handler = bufferedHandler;
}
