import { ConvertResult } from './types.js';

export function getResultMessage(result: ConvertResult): string {
    return `[${result.status}] ${result.message}`;
}

export function logConvertResult(result: ConvertResult) {
    const msg = getResultMessage(result);
    if (result.status === 'ERROR') {
        console.error(msg);
    } else if (result.status === 'WARN') {
        console.warn(msg);
    } else {
        console.log(msg);
    }
}
