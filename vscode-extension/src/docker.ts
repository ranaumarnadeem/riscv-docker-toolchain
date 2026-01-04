import * as vscode from 'vscode';
import { spawn, exec } from 'child_process';
import * as path from 'path';
import { parseGccErrors } from './errorParser';

export interface BuildOptions {
    arch: string;
    opt: string;
    bare: boolean;
    cflags?: string;
}

export interface CommandResult {
    success: boolean;
    stdout: string;
    stderr: string;
    error?: string;
}

export class DockerRunner {
    private outputChannel: vscode.OutputChannel;
    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor(diagnosticCollection: vscode.DiagnosticCollection) {
        this.outputChannel = vscode.window.createOutputChannel('RISC-V Toolchain');
        this.diagnosticCollection = diagnosticCollection;
    }

    private getDockerImage(): string {
        const config = vscode.workspace.getConfiguration('riscv-toolchain');
        return config.get('dockerImage', 'ranaumarnadeem/riscv-toolchain');
    }

    private getWorkspaceRoot(): string | undefined {
        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length > 0) {
            return folders[0].uri.fsPath;
        }
        return undefined;
    }

    private getDockerPath(filePath: string): string {
        // Convert Windows path to Docker-compatible format
        let dockerPath = filePath;
        if (process.platform === 'win32') {
            // Convert C:\Users\... to /c/Users/... for Docker
            if (dockerPath.length >= 2 && dockerPath[1] === ':') {
                const drive = dockerPath[0].toLowerCase();
                dockerPath = `/${drive}${dockerPath.slice(2)}`;
            }
            dockerPath = dockerPath.replace(/\\/g, '/');
        }
        return dockerPath;
    }

    async checkDockerRunning(): Promise<boolean> {
        return new Promise((resolve) => {
            exec('docker info', (error) => {
                resolve(!error);
            });
        });
    }

    async showDockerNotRunningError(): Promise<void> {
        const action = await vscode.window.showErrorMessage(
            '🐳 Docker is not running',
            {
                modal: false,
                detail: 'The RISC-V Toolchain requires Docker to compile code.\n\nPlease start Docker Desktop and try again.'
            },
            'Open Docker Desktop',
            'Install Docker',
            'Retry'
        );

        if (action === 'Open Docker Desktop') {
            // Try to open Docker Desktop
            if (process.platform === 'win32') {
                exec('start "" "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"');
            } else if (process.platform === 'darwin') {
                exec('open -a Docker');
            } else {
                exec('systemctl --user start docker-desktop 2>/dev/null || docker-desktop &');
            }
        } else if (action === 'Install Docker') {
            vscode.env.openExternal(vscode.Uri.parse('https://www.docker.com/products/docker-desktop/'));
        } else if (action === 'Retry') {
            const running = await this.checkDockerRunning();
            if (!running) {
                this.showDockerNotRunningError();
            }
        }
    }

    async runDockerCommand(args: string[], workDir: string): Promise<CommandResult> {
        // Check if Docker is running
        const dockerRunning = await this.checkDockerRunning();
        if (!dockerRunning) {
            await this.showDockerNotRunningError();
            return {
                success: false,
                stdout: '',
                stderr: '',
                error: 'Docker is not running'
            };
        }

        const dockerPath = this.getDockerPath(workDir);
        const image = this.getDockerImage();

        const dockerArgs = [
            'run', '--rm',
            '-v', `${dockerPath}:/src`,
            '-w', '/src',
            image,
            'rv',
            ...args
        ];

        return new Promise((resolve) => {
            let stdout = '';
            let stderr = '';

            const proc = spawn('docker', dockerArgs, {
                cwd: workDir,
                shell: true
            });

            proc.stdout.on('data', (data) => {
                const text = data.toString();
                stdout += text;
                this.outputChannel.append(text);
            });

            proc.stderr.on('data', (data) => {
                const text = data.toString();
                stderr += text;
                this.outputChannel.append(text);
            });

            proc.on('close', (code) => {
                resolve({
                    success: code === 0,
                    stdout,
                    stderr
                });
            });

            proc.on('error', (err) => {
                resolve({
                    success: false,
                    stdout,
                    stderr,
                    error: err.message
                });
            });
        });
    }

    async build(filePath: string, options: BuildOptions): Promise<CommandResult> {
        this.outputChannel.clear();
        this.outputChannel.show();
        this.diagnosticCollection.clear();

        const workDir = this.getWorkspaceRoot() || path.dirname(filePath);
        const relativePath = path.relative(workDir, filePath).replace(/\\/g, '/');

        const args = ['build', relativePath, '--arch', options.arch, '--opt', options.opt];
        
        if (options.bare) {
            args.push('--bare');
        }

        if (options.cflags) {
            args.push('--cflags', options.cflags);
        }

        this.outputChannel.appendLine(`Building ${relativePath}...`);
        this.outputChannel.appendLine(`Architecture: ${options.arch}, Optimization: ${options.opt}, Bare-metal: ${options.bare}`);
        this.outputChannel.appendLine('─'.repeat(60));

        const result = await this.runDockerCommand(args, workDir);

        // Parse GCC errors and show diagnostics
        if (!result.success) {
            const diagnostics = parseGccErrors(result.stderr + result.stdout, workDir);
            for (const [uri, diags] of diagnostics) {
                this.diagnosticCollection.set(uri, diags);
            }
        }

        if (result.success) {
            vscode.window.showInformationMessage('✅ Build successful!');
        } else if (!result.error?.includes('Docker is not running')) {
            vscode.window.showErrorMessage('❌ Build failed. Check output for details.');
        }

        return result;
    }

    async dump(filePath: string, grep?: string): Promise<CommandResult> {
        this.outputChannel.clear();
        this.outputChannel.show();

        const workDir = this.getWorkspaceRoot() || path.dirname(filePath);
        const relativePath = path.relative(workDir, filePath).replace(/\\/g, '/');

        const args = ['dump', relativePath];
        if (grep) {
            args.push('--grep', grep);
        }

        this.outputChannel.appendLine(`Disassembling ${relativePath}...`);
        if (grep) {
            this.outputChannel.appendLine(`Filtering for: ${grep}`);
        }
        this.outputChannel.appendLine('─'.repeat(60));

        return this.runDockerCommand(args, workDir);
    }

    async bin(filePath: string, output?: string): Promise<CommandResult> {
        this.outputChannel.clear();
        this.outputChannel.show();

        const workDir = this.getWorkspaceRoot() || path.dirname(filePath);
        const relativePath = path.relative(workDir, filePath).replace(/\\/g, '/');

        const args = ['bin', relativePath];
        if (output) {
            args.push('-o', output);
        }

        this.outputChannel.appendLine(`Converting ${relativePath} to binary...`);
        this.outputChannel.appendLine('─'.repeat(60));

        const result = await this.runDockerCommand(args, workDir);

        if (result.success) {
            vscode.window.showInformationMessage('✅ Binary created successfully!');
        }

        return result;
    }

    getOutputChannel(): vscode.OutputChannel {
        return this.outputChannel;
    }
}
