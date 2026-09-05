import { providerRegistry } from '../server/providers/ProviderRegistry';
import { validateAndSanitizeUrl } from '../server/middleware/security';

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      code: 'METHOD_NOT_ALLOWED',
      message: 'Method Not Allowed',
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { url } = body || {};

    const validation = validateAndSanitizeUrl(url);
    if (!validation.valid || !validation.normalizedUrl) {
      return res.status(400).json({
        success: false,
        code: validation.errorReason || 'INVALID_URL',
        message: "That doesn't look like a valid link. Please check the URL and try again.",
      });
    }

    const targetUrl = validation.normalizedUrl;
    const provider = providerRegistry.getProviderForUrl(targetUrl);
    const metadata = await provider.analyzeUrl(targetUrl);

    return res.status(200).json({
      success: true,
      media: metadata,
    });
  } catch (error: any) {
    console.error('[API Analyze Error]:', error);
    return res.status(500).json({
      success: false,
      code: error?.code || 'SERVER_ERROR',
      message: error?.message || 'Failed to extract media details from URL.',
    });
  }
}
