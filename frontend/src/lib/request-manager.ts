/**
 * Gerenciador de Requisições
 * Evita chamadas duplicadas e garante que apenas uma requisição por recurso seja feita por vez
 */

class RequestManager {
  private pendingRequests: Map<string, Promise<any>> = new Map();

  /**
   * Executa uma requisição garantindo que não haja duplicatas
   */
  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Se já existe uma requisição em andamento, retorna ela
    if (this.pendingRequests.has(key)) {
      console.log(`⏳ Requisição em andamento: ${key}`);
      return this.pendingRequests.get(key)!;
    }

    // Cria nova requisição
    console.log(`🚀 Nova requisição: ${key}`);
    const promise = fn()
      .finally(() => {
        // Remove da lista quando terminar
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Verifica se uma requisição está em andamento
   */
  isPending(key: string): boolean {
    return this.pendingRequests.has(key);
  }

  /**
   * Limpa todas as requisições pendentes
   */
  clear(): void {
    this.pendingRequests.clear();
  }
}

export const requestManager = new RequestManager();
