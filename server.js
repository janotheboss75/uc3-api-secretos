if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ override: false, quiet: true });
}

const express = require('express');
const _ = require('lodash');
const app = express();

function validarApiKey(valor, mensaje) {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new Error(mensaje);
  }
  return valor;
}

async function cargarApiKey() {
  if (process.env.SECRET_SOURCE !== 'vault') {
    return validarApiKey(process.env.API_KEY, 'Falta API_KEY (entorno o Codespaces secret)');
  }

  const { VAULT_ADDR, VAULT_TOKEN } = process.env;
  if (!VAULT_ADDR || !VAULT_TOKEN) {
    throw new Error('Falta VAULT_ADDR o VAULT_TOKEN');
  }

  let body;
  try {
    const endpoint = VAULT_ADDR.replace(/\/+$/, '') + '/v1/secret/data/api-segura';
    const res = await fetch(endpoint, {
      headers: { 'X-Vault-Token': VAULT_TOKEN },
      redirect: 'error',
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) {
      throw new Error();
    }
    body = await res.json();
  } catch {
    throw new Error('Boveda no disponible');
  }

  return validarApiKey(body?.data?.data?.API_KEY, 'Falta API_KEY en la boveda');
}

cargarApiKey().then((API_KEY) => {
  app.get('/api/datos', (req, res) => {
    if (req.headers['x-api-key'] !== API_KEY) {
      return res.status(401).json({ error: 'no autorizado' });
    }
    return res.json({ ok: true, lodash: _.VERSION });
  });
  app.listen(3000, () => console.log('API lista en puerto 3000'));
}).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
