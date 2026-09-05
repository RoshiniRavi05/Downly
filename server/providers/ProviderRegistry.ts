import { MediaProvider } from './MediaProvider';
import { YouTubeProvider } from './YouTubeProvider';
import { InstagramProvider } from './InstagramProvider';

export class ProviderRegistry {
  private providers: MediaProvider[] = [];

  constructor() {
    // Register default platform providers
    this.register(new YouTubeProvider());
    this.register(new InstagramProvider());
  }

  public register(provider: MediaProvider): void {
    this.providers.push(provider);
  }

  /**
   * Finds the appropriate MediaProvider registered to handle the URL.
   */
  public getProviderForUrl(url: string): MediaProvider {
    for (const provider of this.providers) {
      if (provider.canHandle(url)) {
        return provider;
      }
    }

    const err: any = new Error('No provider handles this URL');
    err.code = 'UNSUPPORTED_PLATFORM';
    throw err;
  }
}

export const providerRegistry = new ProviderRegistry();
