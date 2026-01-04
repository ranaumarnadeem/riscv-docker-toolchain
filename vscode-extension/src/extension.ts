import * as vscode from 'vscode';
import { SidebarProvider } from './sidebarProvider';
import { DockerRunner } from './docker';

let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
    console.log('RISC-V Toolchain extension activated');

    // Create diagnostic collection for GCC errors
    diagnosticCollection = vscode.languages.createDiagnosticCollection('riscv-gcc');
    context.subscriptions.push(diagnosticCollection);

    // Create Docker runner
    const dockerRunner = new DockerRunner(diagnosticCollection);

    // Update workspace root when folders change
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            dockerRunner.updateWorkspaceRoot();
        })
    );

    // Register sidebar provider
    const sidebarProvider = new SidebarProvider(context.extensionUri, dockerRunner, context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'riscv-toolchain.sidebar',
            sidebarProvider
        )
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('riscv-toolchain.build', async () => {
            const file = getActiveFile();
            if (file) {
                const config = vscode.workspace.getConfiguration('riscv-toolchain');
                await dockerRunner.build(file, {
                    arch: config.get('defaultArch', '32imac'),
                    opt: config.get('defaultOptimization', 'O2'),
                    bare: config.get('bareMetal', false)
                });
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('riscv-toolchain.dump', async () => {
            const file = await selectElfFile();
            if (file) {
                await dockerRunner.dump(file);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('riscv-toolchain.bin', async () => {
            const file = await selectElfFile();
            if (file) {
                await dockerRunner.bin(file);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('riscv-toolchain.selectFile', async () => {
            const files = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectMany: false,
                filters: { 'C/C++ Source': ['c', 'cpp', 'cc', 'cxx'] }
            });
            if (files && files.length > 0) {
                return files[0].fsPath;
            }
            return undefined;
        })
    );
}

function getActiveFile(): string | undefined {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const doc = editor.document;
        if (doc.languageId === 'c' || doc.languageId === 'cpp') {
            return doc.uri.fsPath;
        }
    }
    return undefined;
}

async function selectElfFile(): Promise<string | undefined> {
    const files = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectMany: false,
        filters: { 'ELF Files': ['elf'] },
        defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri
    });
    if (files && files.length > 0) {
        return files[0].fsPath;
    }
    return undefined;
}

export function deactivate() {
    if (diagnosticCollection) {
        diagnosticCollection.dispose();
    }
}
