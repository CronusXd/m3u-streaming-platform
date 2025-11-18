/**
 * Rota de Proxy de Streams
 * 
 * Faz proxy de URLs HTTP para HTTPS, resolvendo problema de Mixed Content
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

// Lista de domínios permitidos (segurança)
const ALLOWED_DOMAINS = [
  'play.dnsrot.vip',
  'dnsrot.vip',
  // Adicionar outros domínios IPTV aqui
];

/**
 * Valida se URL é de domínio permitido
 */
function isAllowedUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ALLOWED_DOMAINS.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

/**
 * GET /api/stream-proxy
 * 
 * Faz proxy de stream HTTP para HTTPS
 * 
 * Query params:
 * - url: URL do stream (obrigatório)
 * 
 * Exemplo:
 * /api/stream-proxy?url=http://play.dnsrot.vip/live/...
 */
router.get('/stream-proxy', async (req: Request, res: Response) => {
  try {
    const { url } = req.query;

    // Validar URL
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ 
        error: 'URL inválida',
        message: 'Parâmetro "url" é obrigatório' 
      });
    }

    // Validar domínio (segurança)
    if (!isAllowedUrl(url)) {
      console.warn('⚠️ Tentativa de acesso a domínio não permitido:', url);
      return res.status(403).json({ 
        error: 'Domínio não permitido',
        message: 'Este domínio não está na lista de permitidos' 
      });
    }

    console.log('🔄 Proxy stream:', url);

    // Fazer requisição HTTP para o stream
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 30000, // 30 segundos
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
      validateStatus: (status) => status < 500, // Aceitar 4xx
    });

    // Verificar se stream está disponível
    if (response.status >= 400) {
      console.error('❌ Stream não disponível:', response.status, url);
      return res.status(response.status).json({
        error: 'Stream não disponível',
        message: `Servidor retornou status ${response.status}`,
      });
    }

    // Copiar headers importantes
    const contentType = response.headers['content-type'];
    const contentLength = response.headers['content-length'];

    if (contentType) {
      res.set('Content-Type', contentType);
    }
    
    if (contentLength) {
      res.set('Content-Length', contentLength);
    }

    // Headers CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Headers de cache
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    // Fazer pipe do stream
    response.data.pipe(res);

    // Tratar erros no stream
    response.data.on('error', (error: Error) => {
      console.error('❌ Erro no stream:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erro ao transmitir stream' });
      }
    });

    // Log quando stream terminar
    response.data.on('end', () => {
      console.log('✅ Stream finalizado');
    });

  } catch (error: any) {
    console.error('❌ Erro no proxy de stream:', error.message);

    // Não enviar resposta se headers já foram enviados
    if (res.headersSent) {
      return;
    }

    // Tratar erros específicos
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'Servidor indisponível',
        message: 'Não foi possível conectar ao servidor de stream',
      });
    }

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'Timeout',
        message: 'Tempo limite excedido ao conectar ao stream',
      });
    }

    // Erro genérico
    res.status(500).json({
      error: 'Erro no proxy',
      message: 'Erro ao fazer proxy do stream',
    });
  }
});

/**
 * OPTIONS /api/stream-proxy
 * 
 * Suporte para CORS preflight
 */
router.options('/stream-proxy', (req: Request, res: Response) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.status(204).send();
});

export default router;
