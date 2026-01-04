import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
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
                    await this._handleSelectFile(message.fileType);
                    break;
                case 'openFolder':
                    await this._handleOpenFolder();
                    break;
                case 'getFiles':
                    await this._sendFileTree();
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
                case 'selectFileFromTree':
                    this._sendToWebview({
                        command: 'fileSelected',
                        file: message.file,
                        fileName: path.basename(message.file)
                    });
                    break;
            }
        });

        // Send files when view becomes visible
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this._sendActiveFile();
                this._sendSettings();
                this._sendFileTree();
            }
        });

        // Update when active editor changes
        vscode.window.onDidChangeActiveTextEditor(() => {
            if (this._view?.visible) {
                this._sendActiveFile();
            }
        });

        // Watch for file changes
        const watcher = vscode.workspace.createFileSystemWatcher('**/*.{c,cpp,cc,h,hpp,elf,bin,S,s}');
        watcher.onDidCreate(() => this._sendFileTree());
        watcher.onDidDelete(() => this._sendFileTree());
        watcher.onDidChange(() => this._sendFileTree());
    }

    private async _handleBuild(message: any) {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            this._sendToWebview({
                command: 'buildComplete',
                success: false,
                output: 'No workspace folder open'
            });
            return;
        }

        // Create output directories
        const outputDir = message.outputDir || 'build';
        const logDir = message.logDir || 'logs';
        const outputPath = path.join(workspaceRoot, outputDir);
        const logPath = path.join(workspaceRoot, logDir);

        try {
            if (!fs.existsSync(outputPath)) {
                fs.mkdirSync(outputPath, { recursive: true });
            }
            if (message.saveLogs && !fs.existsSync(logPath)) {
                fs.mkdirSync(logPath, { recursive: true });
            }
        } catch (e) {
            // Continue even if directory creation fails
        }

        const options: BuildOptions = {
            arch: message.arch,
            opt: message.opt,
            bare: message.bare,
            cflags: message.cflags,
            outputDir: outputDir,
            linkerScript: message.linkerScript,
            startupScript: message.startupScript,
            verbose: message.verboseLog
        };

        this._sendToWebview({ command: 'buildStarted' });

        const result = await this._dockerRunner.build(message.file, options);

        // Save logs if enabled
        if (message.saveLogs) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const logFile = path.join(logPath, `build-${timestamp}.log`);
            try {
                fs.writeFileSync(logFile, result.stdout + result.stderr);
            } catch (e) {
                // Ignore log write errors
            }
        }

        this._sendToWebview({
            command: 'buildComplete',
            success: result.success,
            output: result.stdout + result.stderr
        });

        // Refresh file tree to show new ELF
        this._sendFileTree();
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

        // Refresh file tree to show new binary
        this._sendFileTree();
    }

    private async _handleSelectFile(fileType?: string) {
        let filters: { [key: string]: string[] };
        
        if (fileType === 'elf') {
            filters = { 'ELF Files': ['elf'] };
        } else if (fileType === 'source') {
            filters = { 'C/C++ Source': ['c', 'cpp', 'cc', 'cxx'] };
        } else {
            filters = {
                'All Supported': ['c', 'cpp', 'cc', 'cxx', 'elf', 'bin', 'S', 's'],
                'C/C++ Source': ['c', 'cpp', 'cc', 'cxx'],
                'ELF Files': ['elf'],
                'Binary Files': ['bin'],
                'Assembly': ['S', 's']
            };
        }

        const files = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectMany: false,
            filters
        });

        if (files && files.length > 0) {
            this._sendToWebview({
                command: 'fileSelected',
                file: files[0].fsPath,
                fileName: path.basename(files[0].fsPath)
            });
        }
    }

    private async _handleOpenFolder() {
        const folders = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Open Folder'
        });

        if (folders && folders.length > 0) {
            await vscode.commands.executeCommand('vscode.openFolder', folders[0]);
        }
    }

    private async _sendFileTree() {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            this._sendToWebview({
                command: 'fileTree',
                files: [],
                noWorkspace: true
            });
            return;
        }

        const files = await this._scanDirectory(workspaceRoot);
        this._sendToWebview({
            command: 'fileTree',
            files,
            workspaceRoot
        });
    }

    private async _scanDirectory(dir: string, relativePath: string = ''): Promise<any[]> {
        const entries: any[] = [];
        const validExtensions = ['.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.elf', '.bin', '.S', '.s'];

        try {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                // Skip hidden folders and node_modules
                if (item.startsWith('.') || item === 'node_modules' || item === 'out') {
                    continue;
                }

                const fullPath = path.join(dir, item);
                const relPath = path.join(relativePath, item);
                
                try {
                    const stat = fs.statSync(fullPath);
                    
                    if (stat.isDirectory()) {
                        const children = await this._scanDirectory(fullPath, relPath);
                        if (children.length > 0) {
                            entries.push({
                                name: item,
                                path: fullPath,
                                relativePath: relPath,
                                type: 'folder',
                                children
                            });
                        }
                    } else {
                        const ext = path.extname(item).toLowerCase();
                        if (validExtensions.includes(ext) || validExtensions.includes(path.extname(item))) {
                            entries.push({
                                name: item,
                                path: fullPath,
                                relativePath: relPath,
                                type: this._getFileType(ext)
                            });
                        }
                    }
                } catch (e) {
                    // Skip files we can't access
                }
            }
        } catch (e) {
            // Skip directories we can't read
        }

        // Sort: folders first, then by name
        return entries.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });
    }

    private _getFileType(ext: string): string {
        switch (ext.toLowerCase()) {
            case '.c':
            case '.cpp':
            case '.cc':
            case '.cxx':
                return 'source';
            case '.h':
            case '.hpp':
                return 'header';
            case '.elf':
                return 'elf';
            case '.bin':
                return 'binary';
            case '.s':
                return 'assembly';
            default:
                return 'file';
        }
    }

    private _sendActiveFile() {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const doc = editor.document;
            const ext = path.extname(doc.fileName).toLowerCase();
            if (['.c', '.cpp', '.cc', '.cxx', '.elf', '.bin', '.s'].includes(ext)) {
                this._sendToWebview({
                    command: 'activeFile',
                    file: doc.uri.fsPath,
                    fileName: path.basename(doc.fileName)
                });
            }
        }
    }

    private _saveSettings(message: any) {
        this._context.workspaceState.update('riscv-arch', message.arch);
        this._context.workspaceState.update('riscv-opt', message.opt);
        this._context.workspaceState.update('riscv-bare', message.bare);
        this._context.workspaceState.update('riscv-outputDir', message.outputDir);
        this._context.workspaceState.update('riscv-logDir', message.logDir);
        this._context.workspaceState.update('riscv-verboseLog', message.verboseLog);
        this._context.workspaceState.update('riscv-saveLogs', message.saveLogs);
        this._context.workspaceState.update('riscv-linkerScript', message.linkerScript);
        this._context.workspaceState.update('riscv-startupScript', message.startupScript);
        this._context.workspaceState.update('riscv-automationScript', message.automationScript);
    }

    private _sendSettings() {
        const config = vscode.workspace.getConfiguration('riscv-toolchain');
        this._sendToWebview({
            command: 'settings',
            arch: this._context.workspaceState.get('riscv-arch', config.get('defaultArch', '32imac')),
            opt: this._context.workspaceState.get('riscv-opt', config.get('defaultOptimization', 'O2')),
            bare: this._context.workspaceState.get('riscv-bare', config.get('bareMetal', false)),
            outputDir: this._context.workspaceState.get('riscv-outputDir', ''),
            logDir: this._context.workspaceState.get('riscv-logDir', ''),
            verboseLog: this._context.workspaceState.get('riscv-verboseLog', false),
            saveLogs: this._context.workspaceState.get('riscv-saveLogs', false),
            linkerScript: this._context.workspaceState.get('riscv-linkerScript', ''),
            startupScript: this._context.workspaceState.get('riscv-startupScript', ''),
            automationScript: this._context.workspaceState.get('riscv-automationScript', '')
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
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-sideBar-background);
            padding: 8px;
        }
        .section { margin-bottom: 12px; }
        .section-title {
            font-weight: 600;
            margin-bottom: 6px;
            color: var(--vscode-foreground);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .section-title .refresh-btn {
            background: none;
            border: none;
            color: var(--vscode-foreground);
            cursor: pointer;
            opacity: 0.7;
            font-size: 12px;
        }
        .section-title .refresh-btn:hover { opacity: 1; }
        
        /* File Tree Styles */
        .file-tree {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            max-height: 200px;
            overflow-y: auto;
            font-size: 12px;
        }
        .file-tree-empty {
            padding: 12px;
            text-align: center;
            color: var(--vscode-descriptionForeground);
        }
        .file-tree-empty button {
            margin-top: 8px;
            padding: 6px 12px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .tree-item {
            display: flex;
            align-items: center;
            padding: 4px 8px;
            cursor: pointer;
            gap: 6px;
        }
        .tree-item:hover { background: var(--vscode-list-hoverBackground); }
        .tree-item.selected { background: var(--vscode-list-activeSelectionBackground); }
        .tree-item.folder { font-weight: 500; }
        .tree-item .icon { width: 16px; text-align: center; }
        .tree-item .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tree-children { padding-left: 16px; }
        .tree-children.collapsed { display: none; }
        
        /* Selected File Display */
        .selected-file {
            display: flex;
            gap: 8px;
            align-items: center;
            margin-bottom: 8px;
        }
        .file-name {
            flex: 1;
            padding: 6px 8px;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            color: var(--vscode-input-foreground);
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .file-name.placeholder {
            color: var(--vscode-input-placeholderForeground);
            font-style: italic;
        }
        .browse-btn {
            padding: 6px 10px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
        }
        .browse-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
        
        /* Form elements */
        label {
            display: block;
            margin-bottom: 4px;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }
        select, input[type="text"] {
            width: 100%;
            padding: 5px 8px;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            color: var(--vscode-input-foreground);
            font-size: 12px;
            margin-bottom: 6px;
        }
        select:focus, input:focus { outline: 1px solid var(--vscode-focusBorder); }
        .checkbox-row {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 6px;
        }
        .checkbox-row input[type="checkbox"] { width: auto; margin: 0; }
        .checkbox-row label { margin: 0; cursor: pointer; }
        
        /* Buttons */
        .button-group { display: flex; gap: 6px; flex-wrap: wrap; }
        .btn {
            flex: 1;
            min-width: 60px;
            padding: 7px 10px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
        }
        .btn-primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .btn-primary:hover { background: var(--vscode-button-hoverBackground); }
        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        
        /* Filter */
        .filter-row { display: flex; gap: 6px; margin-bottom: 8px; }
        .filter-row input { flex: 1; margin: 0; }
        
        /* Collapsible */
        .collapsible {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            margin-bottom: 8px;
        }
        .collapsible-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 10px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 500;
            user-select: none;
        }
        .collapsible-header:hover { background: var(--vscode-list-hoverBackground); }
        .collapsible-header .arrow {
            font-size: 10px;
            transition: transform 0.2s;
        }
        .collapsible.open .arrow { transform: rotate(90deg); }
        .collapsible-content {
            display: none;
            padding: 8px 10px;
            border-top: 1px solid var(--vscode-input-border);
        }
        .collapsible.open .collapsible-content { display: block; }
        .adv-row { margin-bottom: 8px; }
        .adv-row label { font-size: 10px; margin-bottom: 2px; }
        .adv-row input[type="text"] { margin-bottom: 0; font-size: 11px; }
        .adv-hint { font-size: 9px; color: var(--vscode-descriptionForeground); margin-top: 2px; }
        
        /* Status */
        .status {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 8px;
            border-radius: 4px;
            margin-bottom: 8px;
            font-size: 11px;
        }
        .status.success { background: rgba(40, 167, 69, 0.1); color: var(--vscode-charts-green); }
        .status.error { background: rgba(220, 53, 69, 0.1); color: var(--vscode-errorForeground); }
        .status.building { background: rgba(0, 122, 204, 0.1); color: var(--vscode-textLink-foreground); }
        .spinner {
            width: 12px; height: 12px;
            border: 2px solid transparent;
            border-top-color: currentColor;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .hidden { display: none !important; }
        
        /* Tabs for file types */
        .file-tabs {
            display: flex;
            gap: 2px;
            margin-bottom: 6px;
        }
        .file-tab {
            padding: 4px 8px;
            font-size: 10px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }
        .file-tab.active {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
    </style>
</head>
<body>
    <div class="section">
        <div class="section-title">
            Files
            <button class="refresh-btn" id="refreshBtn" title="Refresh">&#8635;</button>
        </div>
        <div class="file-tabs">
            <button class="file-tab active" data-filter="all">All</button>
            <button class="file-tab" data-filter="source">Source</button>
            <button class="file-tab" data-filter="elf">ELF</button>
            <button class="file-tab" data-filter="binary">Binary</button>
        </div>
        <div class="file-tree" id="fileTree">
            <div class="file-tree-empty">Loading...</div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Selected File</div>
        <div class="selected-file">
            <div class="file-name placeholder" id="fileName">Click a file above</div>
            <button class="browse-btn" id="browseBtn">...</button>
        </div>
        <input type="hidden" id="filePath" value="">
    </div>

    <div class="section">
        <div class="section-title">Build Settings</div>
        <label for="arch">Architecture</label>
        <select id="arch">
            <optgroup label="32-bit">
                <option value="32i">32i</option>
                <option value="32im">32im</option>
                <option value="32ima">32ima</option>
                <option value="32imac" selected>32imac</option>
                <option value="32imafc">32imafc</option>
                <option value="32imafdc">32imafdc</option>
            </optgroup>
            <optgroup label="64-bit">
                <option value="64i">64i</option>
                <option value="64im">64im</option>
                <option value="64imac">64imac</option>
                <option value="64imafdc">64imafdc</option>
            </optgroup>
            <optgroup label="Custom">
                <option value="32imc_zba_zbb">32imc_zba_zbb</option>
                <option value="64imac_zba">64imac_zba</option>
            </optgroup>
        </select>

        <label for="opt">Optimization</label>
        <select id="opt">
            <option value="O0">O0 - Debug</option>
            <option value="O2" selected>O2 - Standard</option>
            <option value="O3">O3 - Aggressive</option>
            <option value="Os">Os - Size</option>
        </select>

        <div class="checkbox-row">
            <input type="checkbox" id="bare">
            <label for="bare">Bare-metal</label>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Actions</div>
        <div class="button-group">
            <button class="btn btn-primary" id="buildBtn">Build</button>
            <button class="btn btn-secondary" id="dumpBtn">Dump</button>
            <button class="btn btn-secondary" id="binBtn">Binary</button>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Filter (Dump)</div>
        <div class="filter-row">
            <input type="text" id="grep" placeholder="clz, mul, amo...">
        </div>
    </div>

    <div id="statusContainer" class="hidden">
        <div class="status" id="status">
            <span id="statusIcon"></span>
            <span id="statusText"></span>
        </div>
    </div>

    <div class="section">
        <div class="collapsible" id="advancedSettings">
            <div class="collapsible-header" onclick="toggleAdvanced()">
                <span>Advanced Settings</span>
                <span class="arrow">></span>
            </div>
            <div class="collapsible-content">
                <div class="adv-row">
                    <label for="outputDir">Output Directory</label>
                    <input type="text" id="outputDir" placeholder="build (default)">
                    <div class="adv-hint">ELF, binary, and dump files location</div>
                </div>
                <div class="adv-row">
                    <label for="logDir">Log Directory</label>
                    <input type="text" id="logDir" placeholder="logs (default)">
                    <div class="adv-hint">Build logs and verbose output</div>
                </div>
                <div class="adv-row">
                    <div class="checkbox-row">
                        <input type="checkbox" id="verboseLog">
                        <label for="verboseLog">Verbose Logging</label>
                    </div>
                </div>
                <div class="adv-row">
                    <div class="checkbox-row">
                        <input type="checkbox" id="saveLogs">
                        <label for="saveLogs">Save Build Logs</label>
                    </div>
                </div>
                <div class="adv-row">
                    <label for="linkerScript">Linker Script Path</label>
                    <input type="text" id="linkerScript" placeholder="Optional (.ld)">
                </div>
                <div class="adv-row">
                    <label for="startupScript">Startup Script Path</label>
                    <input type="text" id="startupScript" placeholder="Optional (crt0.S)">
                </div>
                <div class="adv-row">
                    <label for="automationScript">Automation Script</label>
                    <input type="text" id="automationScript" placeholder="Optional (Makefile, .sh, .bat)">
                    <div class="adv-hint">Custom build/automation script</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        // Elements
        const fileTree = document.getElementById('fileTree');
        const fileName = document.getElementById('fileName');
        const filePath = document.getElementById('filePath');
        const browseBtn = document.getElementById('browseBtn');
        const refreshBtn = document.getElementById('refreshBtn');
        const arch = document.getElementById('arch');
        const opt = document.getElementById('opt');
        const bare = document.getElementById('bare');
        const grep = document.getElementById('grep');
        const buildBtn = document.getElementById('buildBtn');
        const dumpBtn = document.getElementById('dumpBtn');
        const binBtn = document.getElementById('binBtn');
        const statusContainer = document.getElementById('statusContainer');
        const status = document.getElementById('status');
        const statusIcon = document.getElementById('statusIcon');
        const statusText = document.getElementById('statusText');
        const fileTabs = document.querySelectorAll('.file-tab');
        
        // Advanced settings elements
        const outputDir = document.getElementById('outputDir');
        const logDir = document.getElementById('logDir');
        const verboseLog = document.getElementById('verboseLog');
        const saveLogs = document.getElementById('saveLogs');
        const linkerScript = document.getElementById('linkerScript');
        const startupScript = document.getElementById('startupScript');
        const automationScript = document.getElementById('automationScript');

        let currentFilter = 'all';
        let allFiles = [];
        let workspaceRoot = '';
        
        // Toggle advanced settings
        function toggleAdvanced() {
            document.getElementById('advancedSettings').classList.toggle('open');
        }
        window.toggleAdvanced = toggleAdvanced;

        // Request files and settings on load
        vscode.postMessage({ command: 'getFiles' });
        vscode.postMessage({ command: 'getSettings' });

        // File tab filters
        fileTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                fileTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentFilter = tab.dataset.filter;
                renderFileTree(allFiles);
            });
        });

        refreshBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'getFiles' });
        });

        browseBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'selectFile' });
        });

        // Render file tree
        function renderFileTree(files) {
            if (!files || files.length === 0) {
                fileTree.innerHTML = '<div class="file-tree-empty">No files found<br><button onclick="openFolder()">Open Folder</button></div>';
                return;
            }

            const filtered = filterFiles(files);
            if (filtered.length === 0) {
                fileTree.innerHTML = '<div class="file-tree-empty">No matching files</div>';
                return;
            }

            fileTree.innerHTML = renderTreeItems(filtered);
            
            // Add click handlers
            fileTree.querySelectorAll('.tree-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const path = item.dataset.path;
                    const type = item.dataset.type;
                    
                    if (type === 'folder') {
                        const children = item.nextElementSibling;
                        if (children && children.classList.contains('tree-children')) {
                            children.classList.toggle('collapsed');
                            const icon = item.querySelector('.icon');
                            icon.textContent = children.classList.contains('collapsed') ? '+' : '-';
                        }
                    } else {
                        // Select file
                        fileTree.querySelectorAll('.tree-item').forEach(i => i.classList.remove('selected'));
                        item.classList.add('selected');
                        vscode.postMessage({ command: 'selectFileFromTree', file: path });
                    }
                });
            });
        }

        function filterFiles(files) {
            if (currentFilter === 'all') return files;
            
            return files.reduce((acc, file) => {
                if (file.type === 'folder') {
                    const children = filterFiles(file.children);
                    if (children.length > 0) {
                        acc.push({ ...file, children });
                    }
                } else if (
                    (currentFilter === 'source' && (file.type === 'source' || file.type === 'header')) ||
                    (currentFilter === 'elf' && file.type === 'elf') ||
                    (currentFilter === 'binary' && file.type === 'binary')
                ) {
                    acc.push(file);
                }
                return acc;
            }, []);
        }

        function renderTreeItems(files, level = 0) {
            return files.map(file => {
                const icon = getFileIcon(file.type);
                if (file.type === 'folder') {
                    return \`
                        <div class="tree-item folder" data-path="\${file.path}" data-type="folder">
                            <span class="icon">-</span>
                            <span class="name">\${file.name}</span>
                        </div>
                        <div class="tree-children">\${renderTreeItems(file.children, level + 1)}</div>
                    \`;
                } else {
                    return \`
                        <div class="tree-item" data-path="\${file.path}" data-type="\${file.type}">
                            <span class="icon">\${icon}</span>
                            <span class="name">\${file.name}</span>
                        </div>
                    \`;
                }
            }).join('');
        }

        function getFileIcon(type) {
            switch(type) {
                case 'source': return 'C';
                case 'header': return 'H';
                case 'elf': return 'E';
                case 'binary': return 'B';
                case 'assembly': return 'S';
                default: return '*';
            }
        }

        function openFolder() {
            vscode.postMessage({ command: 'openFolder' });
        }

        // Build handlers
        buildBtn.addEventListener('click', () => {
            if (!filePath.value) {
                showStatus('error', 'X', 'No file selected');
                return;
            }
            if (!filePath.value.match(/\\.(c|cpp|cc|cxx)$/i)) {
                showStatus('error', 'X', 'Select a C/C++ source file');
                return;
            }
            saveSettings();
            vscode.postMessage({
                command: 'build',
                file: filePath.value,
                arch: arch.value,
                opt: opt.value,
                bare: bare.checked,
                outputDir: outputDir.value || 'build',
                logDir: logDir.value || 'logs',
                verboseLog: verboseLog.checked,
                saveLogs: saveLogs.checked,
                linkerScript: linkerScript.value,
                startupScript: startupScript.value,
                automationScript: automationScript.value
            });
        });

        dumpBtn.addEventListener('click', () => {
            let elfPath = filePath.value;
            if (!elfPath) {
                showStatus('error', 'X', 'No file selected');
                return;
            }
            
            // If source file selected, find corresponding ELF
            if (elfPath.match(/\\.(c|cpp|cc|cxx)$/i)) {
                const baseName = elfPath.split(/[\\\\/]/).pop().replace(/\\.(c|cpp|cc|cxx)$/i, '');
                const dir = elfPath.substring(0, elfPath.lastIndexOf(elfPath.includes('/') ? '/' : '\\\\'));
                const outDir = outputDir.value || 'build';
                elfPath = dir + (elfPath.includes('/') ? '/' : '\\\\') + outDir + (elfPath.includes('/') ? '/' : '\\\\') + baseName + '.elf';
            }
            
            vscode.postMessage({
                command: 'dump',
                file: elfPath,
                grep: grep.value || undefined
            });
        });

        binBtn.addEventListener('click', () => {
            let elfPath = filePath.value;
            if (!elfPath) {
                showStatus('error', 'X', 'No file selected');
                return;
            }
            
            // If source file selected, find corresponding ELF
            if (elfPath.match(/\\.(c|cpp|cc|cxx)$/i)) {
                const baseName = elfPath.split(/[\\\\/]/).pop().replace(/\\.(c|cpp|cc|cxx)$/i, '');
                const dir = elfPath.substring(0, elfPath.lastIndexOf(elfPath.includes('/') ? '/' : '\\\\'));
                const outDir = outputDir.value || 'build';
                elfPath = dir + (elfPath.includes('/') ? '/' : '\\\\') + outDir + (elfPath.includes('/') ? '/' : '\\\\') + baseName + '.elf';
            }
            
            vscode.postMessage({
                command: 'bin',
                file: elfPath
            });
        });

        function saveSettings() {
            vscode.postMessage({
                command: 'saveSettings',
                arch: arch.value,
                opt: opt.value,
                bare: bare.checked,
                outputDir: outputDir.value || 'build',
                logDir: logDir.value || 'logs',
                verboseLog: verboseLog.checked,
                saveLogs: saveLogs.checked,
                linkerScript: linkerScript.value,
                startupScript: startupScript.value,
                automationScript: automationScript.value
            });
        }

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
                case 'fileTree':
                    allFiles = message.files || [];
                    workspaceRoot = message.workspaceRoot || '';
                    if (message.noWorkspace) {
                        fileTree.innerHTML = '<div class="file-tree-empty">No folder open<br><button onclick="openFolder()">Open Folder</button></div>';
                    } else {
                        renderFileTree(allFiles);
                    }
                    break;
                case 'activeFile':
                case 'fileSelected':
                    filePath.value = message.file;
                    fileName.textContent = message.fileName || message.file.split(/[\\\\/]/).pop();
                    fileName.classList.remove('placeholder');
                    break;
                case 'settings':
                    arch.value = message.arch;
                    opt.value = message.opt;
                    bare.checked = message.bare;
                    outputDir.value = message.outputDir || '';
                    logDir.value = message.logDir || '';
                    verboseLog.checked = message.verboseLog || false;
                    saveLogs.checked = message.saveLogs || false;
                    linkerScript.value = message.linkerScript || '';
                    startupScript.value = message.startupScript || '';
                    automationScript.value = message.automationScript || '';
                    break;
                case 'buildStarted':
                    showStatus('building', '', 'Building...');
                    setButtonsDisabled(true);
                    break;
                case 'buildComplete':
                    if (message.success) {
                        showStatus('success', '[OK]', 'Build successful!');
                    } else {
                        showStatus('error', '[X]', 'Build failed');
                    }
                    setButtonsDisabled(false);
                    break;
                case 'dumpStarted':
                case 'binStarted':
                    showStatus('building', '', 'Processing...');
                    setButtonsDisabled(true);
                    break;
                case 'dumpComplete':
                case 'binComplete':
                    if (message.success) {
                        showStatus('success', '[OK]', 'Done!');
                    } else {
                        showStatus('error', '[X]', 'Failed');
                    }
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
