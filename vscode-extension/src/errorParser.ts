import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Parse GCC error/warning output and convert to VS Code diagnostics
 * 
 * GCC format: filename:line:column: error|warning: message
 * Example: examples/test.c:10:5: error: 'undefined_var' undeclared
 */
export function parseGccErrors(
    output: string,
    workDir: string
): Map<vscode.Uri, vscode.Diagnostic[]> {
    const diagnosticsMap = new Map<vscode.Uri, vscode.Diagnostic[]>();

    // Match GCC error format: file:line:col: type: message
    const errorRegex = /^(.+?):(\d+):(\d+):\s*(error|warning|note):\s*(.+)$/gm;

    let match;
    while ((match = errorRegex.exec(output)) !== null) {
        const [, file, lineStr, colStr, severity, message] = match;
        
        // Skip internal compiler errors or system headers
        if (file.startsWith('/usr/') || file.startsWith('<')) {
            continue;
        }

        const line = parseInt(lineStr, 10) - 1; // VS Code is 0-indexed
        const col = parseInt(colStr, 10) - 1;

        // Resolve file path
        let filePath = file;
        if (!path.isAbsolute(file)) {
            filePath = path.join(workDir, file);
        }

        const uri = vscode.Uri.file(filePath);
        
        // Map GCC severity to VS Code severity
        let diagnosticSeverity: vscode.DiagnosticSeverity;
        switch (severity) {
            case 'error':
                diagnosticSeverity = vscode.DiagnosticSeverity.Error;
                break;
            case 'warning':
                diagnosticSeverity = vscode.DiagnosticSeverity.Warning;
                break;
            case 'note':
                diagnosticSeverity = vscode.DiagnosticSeverity.Information;
                break;
            default:
                diagnosticSeverity = vscode.DiagnosticSeverity.Error;
        }

        const range = new vscode.Range(
            new vscode.Position(line, col),
            new vscode.Position(line, col + 1)
        );

        const diagnostic = new vscode.Diagnostic(
            range,
            message,
            diagnosticSeverity
        );
        diagnostic.source = 'riscv-gcc';

        // Add to map
        const existing = diagnosticsMap.get(uri) || [];
        existing.push(diagnostic);
        diagnosticsMap.set(uri, existing);
    }

    // Also catch linker errors (ld)
    const linkerRegex = /^(.+?):(\d+):\s*(.+?error.+)$/gim;
    while ((match = linkerRegex.exec(output)) !== null) {
        const [, file, lineStr, message] = match;
        
        if (file.startsWith('/usr/') || file.includes('.o:')) {
            continue;
        }

        const line = parseInt(lineStr, 10) - 1;
        
        let filePath = file;
        if (!path.isAbsolute(file)) {
            filePath = path.join(workDir, file);
        }

        const uri = vscode.Uri.file(filePath);
        
        const range = new vscode.Range(
            new vscode.Position(line, 0),
            new vscode.Position(line, 100)
        );

        const diagnostic = new vscode.Diagnostic(
            range,
            message.trim(),
            vscode.DiagnosticSeverity.Error
        );
        diagnostic.source = 'riscv-ld';

        const existing = diagnosticsMap.get(uri) || [];
        existing.push(diagnostic);
        diagnosticsMap.set(uri, existing);
    }

    return diagnosticsMap;
}
