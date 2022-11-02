import * as vscode from 'vscode';
import { appendFile, readFileSync, writeFileSync } from 'fs';
import http = require('http');
import https = require('https');


export function activate(context: vscode.ExtensionContext) {

	let _modID: number | null = null;
	let _apiToken: string | null = null;

	let disposable = vscode.commands.registerCommand('warzonemodhelper.UploadMod', () => {
		//console.log("rootPath=" + vscode.workspace.rootPath);

		let editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage("You must have a document open");
			return;
		}

		let openFile = editor.document.fileName.replaceAll('\\', '/');
		console.log("openFile=" + openFile);
		let rootDir = everythingBeforeLast(openFile, '/');
		console.log("rootDir=" + rootDir);


		vscode.workspace.findFiles('**').then(dirs => {
			console.log('got ' + dirs.length + " files");

			let files: any[] = [];

			dirs.forEach(pathObj => {
				let path = removeFromStartOfString(pathObj.path, '/');

				if (path.startsWith(rootDir)) {
					console.log('File = ' + path);
					let buf = readFileSync(path);
					let contents = buf.toString('base64');

					files.push({
						path: removeFromStartOfString(path, rootDir + "/"),
						content: contents
					});


				}
			});

			let json = { files: files };

			//console.log(JSON.stringify(json));

			prompt("Please enter the Mod ID for " + rootDir, _modID == null ? null : _modID.toString(), false, modIDStr => {
				console.log("ModID = " + modIDStr);
				if (modIDStr === null) {
					return;
				}
				_modID = parseInt(modIDStr);

				prompt("Please enter your API Token.  You can get this from warzone.com/API/GetAPIToken  (keep it secret from others!)", _apiToken, true, newApiToken => {
					if (newApiToken === null) {
						return;
					}

					_apiToken = newApiToken;

					let opts = {
						'hostname': "www.warzone.com",
						'method': 'POST',
						'path': '/API/UpdateMod?ModID=' + _modID + "&APIToken=" + encodeURIComponent(_apiToken)
					};
					let req = https.request(opts, (r: http.IncomingMessage) => {
						r.on('data', data => {

							console.log("data: " + data);

							let ret = JSON.parse(data);

							if (ret.error) {
								vscode.window.showErrorMessage("The following error occured during request:\n" + ret.error);
							} else if (ret.success !== undefined) {
								vscode.window.showInformationMessage("Mod updated successfully");
							} else {
								vscode.window.showErrorMessage("UpdateMod failed with output: " + ret);
							}

						});
						r.on('end', (): void => {
							console.log('Response has ended');
						});
						r.on('error', (err): void => {
							vscode.window.showErrorMessage("The following error occured during request:\n" + err);
						});
					});
					req.write(JSON.stringify(json));
					req.end();
					console.log("made request");
				});
			});



		});

	});

	context.subscriptions.push(disposable);
}

export function deactivate() { }

function prompt(label: string, defValue: string | null, concealText: boolean, callback: (input: string) => void) {
	let options = {
		prompt: label,
		value: defValue === null ? "" : defValue,
		password: concealText
	};

	vscode.window.showInputBox(options).then(value => {
		if (!value) { return; }
		console.log("showInputBox returned  = " + value);
		callback(value);
	});

}

function everythingBeforeLast(haystack: string, needle: string): string {
	let i = haystack.lastIndexOf(needle);

	if (i === -1) { throw Error(needle + " not found in " + haystack); }

	return haystack.substring(0, i);
}

function removeFromStartOfString(str: string, remove: string): string {
	if (!str.startsWith(remove)) {
		throw Error(str + " does not start with " + remove);
	}

	return str.substring(remove.length);
}