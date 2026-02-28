import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logConvertResult, getResultMessage } from '../src/logger.js';
import { ConvertResult } from '../src/types.js';

describe('logger', () => {
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should format result message correctly', () => {
        const result: ConvertResult = { status: 'SUCCESS', message: 'test' };
        expect(getResultMessage(result)).toBe('[SUCCESS] test');
    });

    it('should log SUCCESS via console.log', () => {
        const result: ConvertResult = { status: 'SUCCESS', message: 'test' };
        logConvertResult(result);
        expect(console.log).toHaveBeenCalledWith('[SUCCESS] test');
    });

    it('should log SKIP via console.log', () => {
        const result: ConvertResult = { status: 'SKIP', message: 'skip message' };
        logConvertResult(result);
        expect(console.log).toHaveBeenCalledWith('[SKIP] skip message');
    });

    it('should log WARN via console.warn', () => {
        const result: ConvertResult = { status: 'WARN', message: 'warn message' };
        logConvertResult(result);
        expect(console.warn).toHaveBeenCalledWith('[WARN] warn message');
    });

    it('should log ERROR via console.error', () => {
        const result: ConvertResult = { status: 'ERROR', message: 'error message' };
        logConvertResult(result);
        expect(console.error).toHaveBeenCalledWith('[ERROR] error message');
    });
});
