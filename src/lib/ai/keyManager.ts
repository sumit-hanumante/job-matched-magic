
import { AIKeyConfig, AIProvider } from './types';

class AIKeyManager {
  private keys: Map<AIProvider, AIKeyConfig[]> = new Map();
  private currentIndexMap: Map<AIProvider, number> = new Map();

  addKey(config: AIKeyConfig) {
    const existingKeys = this.keys.get(config.provider) || [];
    existingKeys.push({
      ...config,
      requestCount: 0,
      lastUsed: new Date()
    });
    this.keys.set(config.provider, existingKeys);
  }

  async getNextAvailableKey(provider: AIProvider): Promise<string | null> {
    const keys = this.keys.get(provider) || [];
    if (keys.length === 0) return null;

    let currentIndex = this.currentIndexMap.get(provider) || 0;
    const startIndex = currentIndex;

    do {
      const key = keys[currentIndex];
      if (this.isKeyAvailable(key)) {
        this.currentIndexMap.set(provider, (currentIndex + 1) % keys.length);
        key.requestCount++;
        key.lastUsed = new Date();
        return key.key;
      }
      currentIndex = (currentIndex + 1) % keys.length;
    } while (currentIndex !== startIndex);

    return null;
  }

  private isKeyAvailable(config: AIKeyConfig): boolean {
    const today = new Date();
    const keyDate = new Date(config.lastUsed);
    
    // Reset counter if it's a new day
    if (keyDate.getDate() !== today.getDate() || 
        keyDate.getMonth() !== today.getMonth() || 
        keyDate.getFullYear() !== today.getFullYear()) {
      config.requestCount = 0;
      return true;
    }

    return config.requestCount < config.dailyLimit;
  }

  resetCounters() {
    this.keys.forEach(keySet => {
      keySet.forEach(key => {
        key.requestCount = 0;
        key.lastUsed = new Date();
      });
    });
  }
}

export const keyManager = new AIKeyManager();
