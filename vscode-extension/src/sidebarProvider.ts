import * as vscode from 'vscode';
import { DockerRunner, BuildOptions } from './docker';

export class SidebarProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private _extensionUri: vscode.Uri;
    private _dockerRunner: DockerRunner;
    private _context: vscode.ExtensionContext;

    constructor(
        extensionUri: vscode.Uri,
        dockerRunner: DockerRunner,
        context: vscode.ExtensionContext
    ) {
        this._extensionUri = extensionUri;
        this._dockerRunner = dockerRunner;
        this._context = context;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlContent(webviewView.webview);

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'build':
                    await this._handleBuild(message);
                    break;
                case 'dump':
                    await this._handleDump(message);
                    break;
                case 'bin':
                    await this._handleBin(message);
                    break;
                case 'selectFile':
                    await this._handleSelectFile();
                    break;
                case 'getActiveFile':
                    this._sendActiveFile();
                    break;
                case 'saveSettings':
                    this._saveSettings(message);
                    break;
                case 'getSettings':
                    this._sendSettings();
                    break;
            }
        });

        // Send active file when view becomes visible
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this._sendActiveFile();
                this._sendSettings();
            }
        });

        // Update when active editor changes
        vscode.window.onDidChangeActiveTextEditor(() => {
            if (this._view?.visible) {
                this._sendActiveFile();
            }
        });
    }

    private async _handleBuild(message: any) {
        const options: BuildOptions = {
            arch: message.arch,
            opt: message.opt,
            bare: message.bare,
            cflags: message.cflags
        };

        this._sendToWebview({ command: 'buildStarted' });

        const result = await this._dockerRunner.build(message.file, options);

        this._sendToWebview({
            command: 'buildComplete',
            success: result.success,
            output: result.stdout + result.stderr
        });
    }

    private async _handleDump(message: any) {
        this._sendToWebview({ command: 'dumpStarted' });

        const result = await this._dockerRunner.dump(message.file, message.grep);

        this._sendToWebview({
            command: 'dumpComplete',
            success: result.success,
            output: result.stdout + result.stderr
        });
    }

    private async _handleBin(message: any) {
        this._sendToWebview({ command: 'binStarted' });

        const result = await this._dockerRunner.bin(message.file);

        this._sendToWebview({
            command: 'binComplete',
            success: result.success,
            output: result.stdout + result.stderr
        });
    }

    private async _handleSelectFile() {
        const files = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectMany: false,
            filters: {
                'C/C++ Source': ['c', 'cpp', 'cc', 'cxx'],
                'ELF Files': ['elf'],
                'All Files': ['*']
            }
        });

        if (files && files.length > 0) {
            this._sendToWebview({
                command: 'fileSelected',
                file: files[0].fsPath
            });
        }
    }

    private _sendActiveFile() {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const doc = editor.document;
            if (doc.languageId === 'c' || doc.languageId === 'cpp') {
                this._sendToWebview({
                    command: 'activeFile',
                    file: doc.uri.fsPath,
                    fileName: doc.fileName.split(/[\\/]/).pop()
                });
            }
        }
    }

    private _saveSettings(message: any) {
        this._context.workspaceState.update('riscv-arch', message.arch);
        this._context.workspaceState.update('riscv-opt', message.opt);
        this._context.workspaceState.update('riscv-bare', message.bare);
    }

    private _sendSettings() {
        const config = vscode.workspace.getConfiguration('riscv-toolchain');
        this._sendToWebview({
            command: 'settings',
            arch: this._context.workspaceState.get('riscv-arch', config.get('defaultArch', '32imac')),
            opt: this._context.workspaceState.get('riscv-opt', config.get('defaultOptimization', 'O2')),
            bare: this._context.workspaceState.get('riscv-bare', config.get('bareMetal', false))
        });
    }

    private _sendToWebview(message: any) {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }

    private _getHtmlContent(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RISC-V Toolchain</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-sideBar-background);
            padding: 12px;
        }
        .section {
            margin-bottom: 16px;
        }
        .section-title {
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--vscode-foreground);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .file-picker {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        .file-name {
            flex: 1;
            padding: 6px 8px;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            color: var(--vscode-input-foreground);
            font-size: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .file-name.placeholder {
            color: var(--vscode-input-placeholderForeground);
            font-style: italic;
        }
        .browse-btn {
            padding: 6px 12px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        .browse-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        label {
            display: block;
            margin-bottom: 4px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        select, input[type="text"] {
            width: 100%;
            padding: 6px 8px;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            color: var(--vscode-input-foreground);
            font-size: 12px;
            margin-bottom: 8px;
        }
        select:focus, input:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }
        .checkbox-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
        }
        .checkbox-row input[type="checkbox"] {
            width: auto;
            margin: 0;
        }
        .checkbox-row label {
            margin: 0;
            cursor: pointer;
        }
        .button-group {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .btn {
            flex: 1;
            min-width: 70px;
            padding: 8px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        .btn-primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .btn-primary:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .filter-row {
            display: flex;
            gap: 8px;
        }
        .filter-row input {
            flex: 1;
            margin: 0;
        }
        .filter-row button {
            padding: 6px 12px;
        }
        .output-container {
            margin-top: 12px;
        }
        .output {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 8px;
            font-family: var(--vscode-editor-font-family);
            font-size: 11px;
            line-height: 1.4;
            max-height: 300px;
            overflow-y: auto;
            white-space: pre-wrap;
            word-break: break-all;
        }
        .output.success {
            border-color: var(--vscode-charts-green);
        }
        .output.error {
            border-color: var(--vscode-errorForeground);
        }
        .status {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px;
            border-radius: 4px;
            margin-bottom: 12px;
            font-size: 12px;
        }
        .status.success {
            background: rgba(40, 167, 69, 0.1);
            color: var(--vscode-charts-green);
        }
        .status.error {
            background: rgba(220, 53, 69, 0.1);
            color: var(--vscode-errorForeground);
        }
        .status.building {
            background: rgba(0, 122, 204, 0.1);
            color: var(--vscode-textLink-foreground);
        }
        .spinner {
            width: 14px;
            height: 14px;
            border: 2px solid transparent;
            border-top-color: currentColor;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .hidden {
            display: none !important;
        }
    </style>
</head>
<body>
    <div class="section">
        <div class="section-title">Source File</div>
        <div class="file-picker">
            <div class="file-name placeholder" id="fileName">No file selected</div>
            <button class="browse-btn" id="browseBtn">Browse</button>
        </div>
        <input type="hidden" id="filePath" value="">
    </div>

    <div class="section">
        <div class="section-title">Build Settings</div>
        <label for="arch">Architecture</label>
        <select id="arch">
            <optgroup label="32-bit">
                <option value="32i">32i - Base integer</option>
                <option value="32im">32im - + Multiply</option>
                <option value="32ima">32ima - + Atomic</option>
                <option value="32imac" selected>32imac - + Compressed</option>
                <option value="32imafc">32imafc - + Float</option>
                <option value="32imafdc">32imafdc - + Double</option>
            </optgroup>
            <optgroup label="64-bit">
                <option value="64i">64i - Base integer</option>
                <option value="64im">64im - + Multiply</option>
                <option value="64ima">64ima - + Atomic</option>
                <option value="64imac">64imac - + Compressed</option>
                <option value="64imafc">64imafc - + Float</option>
                <option value="64imafdc">64imafdc - + Double</option>
            </optgroup>
            <optgroup label="Custom">
                <option value="32imc_zba_zbb">32imc_zba_zbb - Bit manipulation</option>
                <option value="64imac_zba">64imac_zba - Address gen</option>
            </optgroup>
        </select>

        <label for="opt">Optimization</label>
        <select id="opt">
            <option value="O0">O0 - None (debug)</option>
            <option value="O1">O1 - Basic</option>
            <option value="O2" selected>O2 - Standard</option>
            <option value="O3">O3 - Aggressive</option>
            <option value="Os">Os - Size</option>
            <option value="Oz">Oz - Aggressive size</option>
        </select>

        <div class="checkbox-row">
            <input type="checkbox" id="bare">
            <label for="bare">Bare-metal (no libc)</label>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Actions</div>
        <div class="button-group">
            <button class="btn btn-primary" id="buildBtn">🔨 Build</button>
            <button class="btn btn-secondary" id="dumpBtn">📄 Dump</button>
            <button class="btn btn-secondary" id="binBtn">💾 Binary</button>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Filter (for Dump)</div>
        <div class="filter-row">
            <input type="text" id="grep" placeholder="e.g., clz, mul, amo...">
        </div>
    </div>

    <div id="statusContainer" class="hidden">
        <div class="status" id="status">
            <span id="statusIcon"></span>
            <span id="statusText"></span>
        </div>
    </div>

    <div class="output-container">
        <div class="section-title">Output</div>
        <div class="output" id="output">Ready. Select a .c file and click Build.</div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        // Elements
        const fileName = document.getElementById('fileName');
        const filePath = document.getElementById('filePath');
        const browseBtn = document.getElementById('browseBtn');
        const arch = document.getElementById('arch');
        const opt = document.getElementById('opt');
        const bare = document.getElementById('bare');
        const grep = document.getElementById('grep');
        const buildBtn = document.getElementById('buildBtn');
        const dumpBtn = document.getElementById('dumpBtn');
        const binBtn = document.getElementById('binBtn');
        const output = document.getElementById('output');
        const statusContainer = document.getElementById('statusContainer');
        const status = document.getElementById('status');
        const statusIcon = document.getElementById('statusIcon');
        const statusText = document.getElementById('statusText');

        // Request active file and settings on load
        vscode.postMessage({ command: 'getActiveFile' });
        vscode.postMessage({ command: 'getSettings' });

        // Event handlers
        browseBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'selectFile' });
        });

        buildBtn.addEventListener('click', () => {
            if (!filePath.value) {
                showStatus('error', '❌', 'No file selected');
                return;
            }
            saveSettings();
            vscode.postMessage({
                command: 'build',
                file: filePath.value,
                arch: arch.value,
                opt: opt.value,
                bare: bare.checked
            });
        });

        dumpBtn.addEventListener('click', () => {
            // For dump, use ELF file (replace .c with .elf in build/)
            let elfPath = filePath.value;
            if (elfPath.endsWith('.c') || elfPath.endsWith('.cpp')) {
                const baseName = elfPath.split(/[\\/]/).pop().replace(/\\.(c|cpp)$/, '');
                elfPath = elfPath.replace(/[^\\/]+$/, 'build/' + baseName + '.elf');
            }
            vscode.postMessage({
                command: 'dump',
                file: elfPath,
                grep: grep.value || undefined
            });
        });

        binBtn.addEventListener('click', () => {
            let elfPath = filePath.value;
            if (elfPath.endsWith('.c') || elfPath.endsWith('.cpp')) {
                const baseName = elfPath.split(/[\\/]/).pop().replace(/\\.(c|cpp)$/, '');
                elfPath = elfPath.replace(/[^\\/]+$/, 'build/' + baseName + '.elf');
            }
            vscode.postMessage({
                command: 'bin',
                file: elfPath
            });
        });

        // Save settings when changed
        function saveSettings() {
            vscode.postMessage({
                command: 'saveSettings',
                arch: arch.value,
                opt: opt.value,
                bare: bare.checked
            });
        }

        arch.addEventListener('change', saveSettings);
        opt.addEventListener('change', saveSettings);
        bare.addEventListener('change', saveSettings);

        // Show status
        function showStatus(type, icon, text) {
            statusContainer.classList.remove('hidden');
            status.className = 'status ' + type;
            statusIcon.innerHTML = type === 'building' ? '<div class="spinner"></div>' : icon;
            statusText.textContent = text;
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'activeFile':
                case 'fileSelected':
                    filePath.value = message.file;
                    fileName.textContent = message.fileName || message.file.split(/[\\/]/).pop();
                    fileName.classList.remove('placeholder');
                    break;
                case 'settings':
                    arch.value = message.arch;
                    opt.value = message.opt;
                    bare.checked = message.bare;
                    break;
                case 'buildStarted':
                    showStatus('building', '', 'Building...');
                    output.textContent = 'Building...';
                    output.className = 'output';
                    setButtonsDisabled(true);
                    break;
                case 'buildComplete':
                    if (message.success) {
                        showStatus('success', '✅', 'Build successful!');
                        output.className = 'output success';
                    } else {
                        showStatus('error', '❌', 'Build failed');
                        output.className = 'output error';
                    }
                    output.textContent = message.output || 'No output';
                    setButtonsDisabled(false);
                    break;
                case 'dumpStarted':
                case 'binStarted':
                    showStatus('building', '', 'Processing...');
                    setButtonsDisabled(true);
                    break;
                case 'dumpComplete':
                case 'binComplete':
                    statusContainer.classList.add('hidden');
                    output.textContent = message.output || 'No output';
                    output.className = 'output' + (message.success ? ' success' : ' error');
                    setButtonsDisabled(false);
                    break;
            }
        });

        function setButtonsDisabled(disabled) {
            buildBtn.disabled = disabled;
            dumpBtn.disabled = disabled;
            binBtn.disabled = disabled;
        }
    </script>
</body>
</html>`;
    }
}
