import { Request, Response, NextFunction } from 'express';
import { validateAndSanitizeUrl } from '../middleware/security';
import { providerRegistry } from '../providers/ProviderRegistry';

export async function analyzeController(req: Request, res: Response, next: NextFunction) {
  try {
    const { url } = req.body || {};

    // Server-side URL validation & SSRF protection
    const validation = validateAndSanitizeUrl(url);
    if (!validation.valid || !validation.normalizedUrl) {
      const err: any = new Error(validation.errorReason || 'INVALID_URL');
      err.code = validation.errorReason || 'INVALID_URL';
      err.statusCode = 400;
      throw err;
    }

    const targetUrl = validation.normalizedUrl;

    // Get matching provider
    const provider = providerRegistry.getProviderForUrl(targetUrl);

    // Extract metadata
    const metadata = await provider.analyzeUrl(targetUrl);

    res.json({
      success: true,
      media: metadata,
    });
  } catch (error) {
    next(error);
  }
}
