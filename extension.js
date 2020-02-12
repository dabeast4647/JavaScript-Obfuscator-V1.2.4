// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const JavaScriptObfuscator = require('javascript-obfuscator');
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	
	let JSObfuscatorOutputChannel;
	let settings = vscode.workspace.getConfiguration().get("jsobfuscator");

	let _getAllFilesFromFolder = function(dir) {

		let filesystem = require("fs");
		let results = [];

		filesystem.readdirSync(dir).forEach(function(file) {

			file = dir + '/' + file;
			let stat = filesystem.statSync(file);

			if (stat && stat.isDirectory()) {
				results = results.concat(_getAllFilesFromFolder(file))
			} else {
				results.push(file);
			}

		});
		return results;
	};

	let _JSCodeToObfuscator = function(text) {
		let obfuscationResult = JavaScriptObfuscator.obfuscate(
			text,
			settings['javascript-obfuscator']
		);

		return obfuscationResult.getObfuscatedCode();
	}

	let doObfuscateFile = function(filePath) {
		if (typeof(filePath) === 'object') {
			filePath = filePath.fileName;
		}
		
		let text = fs.readFileSync(filePath).toString('utf-8');

		let outName = filePath;

		if (settings.changeExtension != "") {
			outName = filePath.split('.');
			const ext = outName.pop();
			outName.push(settings.changeExtension);
			outName = outName.join('.');
		}

		fs.writeFile(outName, _JSCodeToObfuscator(text), function(err) {
			if (err) {
				JSObfuscatorOutputChannel.appendLine('Error writing to file: ' + outName);
				JSObfuscatorOutputChannel.appendLine(err.message);
				return vscode.window.showErrorMessage('Invalid Exception.');
			}
		});
	};

	let disposable = vscode.commands.registerCommand('jsobfuscator.obfuscateWorkspace', function() {

		let JSObfuscatorOutputChannel = vscode.window.createOutputChannel("jsobfuscator");
		JSObfuscatorOutputChannel.clear();

		JSObfuscatorOutputChannel.appendLine('Obfuscating process started');

		let currentFile;

		try {
			if (typeof vscode.workspace.workspaceFolders === 'undefined' || vscode.workspace.workspaceFolders.length == 0) {
				return vscode.window.showInformationMessage("Open a folder or workspace... (File -> Open Folder)");
			}

			let ignoreMinFiles = vscode.workspace.getConfiguration().get('jsobfuscator.ignoreMinFiles');
			let subPathInWorkspace = "/" + vscode.workspace.getConfiguration().get('jsobfuscator.subPathInWorkspace');
			let ignoreFile = vscode.workspace.getConfiguration().get('jsobfuscator.ignoreFile');

			let ignoreFileArray = ignoreFile.split(",");
			const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath + subPathInWorkspace;

			let filePath = _getAllFilesFromFolder(workspacePath);

			for (let i = 0; i < filePath.length; i++) {
				currentFile = filePath[i];

				let currentFileName = filePath[i].split("/");
				currentFileName = currentFileName[currentFileName.length -1];

				// check settings and if we are supposed to ignore .min.js files skip this file 
				// if the current file name is supposed to be ignored skip this file
				if ((ignoreMinFiles && filePath[i].search(".min.js") != -1) || ignoreFileArray.indexOf(currentFileName) != -1) {
					continue;
				}

				let nameSplitted = filePath[i].split(".");

				if (nameSplitted[nameSplitted.length - 1] == 'js') {
					doObfuscateFile(filePath[i]);
				}
			}

			return vscode.window.showInformationMessage('All Scripts Obfuscated.');
		} catch (error) {
			JSObfuscatorOutputChannel.appendLine('Error while working with: ' + currentFile);
			JSObfuscatorOutputChannel.appendLine(error.stack);
			JSObfuscatorOutputChannel.appendLine(error);
			return vscode.window.showErrorMessage('Invalid Exception.');
		}
	});

	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('jsobfuscator.obfuscateFile', function() {
		const active = vscode.window.activeTextEditor;
		if (!active || !active.document) return;
		if (active.document.isUntitled) return vscode.window.setStatusBarMessage(
			"File must be saved before it can be obfuscated",
			5000);
		return doObfuscateFile(active.document);
	});
	context.subscriptions.push(disposable);

	disposable = vscode.workspace.onDidChangeConfiguration(() => {
		settings = vscode.workspace.getConfiguration().get("jsobfuscator");
	});
	context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() { 

}

module.exports = {
	activate,
	deactivate
}