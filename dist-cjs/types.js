"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIAdapterError = void 0;
/**
 * Error types
 */
class AIAdapterError extends Error {
    provider;
    cause;
    constructor(message, provider, cause) {
        super(message);
        this.provider = provider;
        this.cause = cause;
        this.name = 'AIAdapterError';
    }
}
exports.AIAdapterError = AIAdapterError;
