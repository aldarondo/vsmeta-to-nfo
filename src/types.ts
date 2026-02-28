export interface ConvertOptions {
    dryRun?: boolean;
    overwrite?: boolean;
    verbose?: boolean;
}

export interface ConvertResult {
    status: 'SUCCESS' | 'WARN' | 'SKIP' | 'ERROR';
    nfoPath?: string;
    message: string;
}
