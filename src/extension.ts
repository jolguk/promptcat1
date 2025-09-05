import * as vscode from 'vscode';

interface FavouritePrompt {
    prompt: string;
    response: string;
    timestamp: number;
}

const FAVOURITES_KEY = 'copilotPromptFavourites';

function getWebviewHtml(favourites: FavouritePrompt[]): string {
    const itemsHtml = favourites.length === 0
        ? '<p>No favourites yet.</p>'
        : favourites.map((fav, idx) => `
            <div style="border:1px solid #ccc; margin:8px; padding:8px;">
                <strong>Prompt #${idx + 1}</strong><br>
                <b>Prompt:</b> <pre>${fav.prompt}</pre>
                <b>Response:</b> <pre>${fav.response}</pre>
                <button onclick="removeFavourite(${idx})">Remove</button>
            </div>
        `).join('');
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Copilot Prompt Favourites</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        pre { background: #f4f4f4; padding: 6px; border-radius: 4px; }
        button { margin-top: 6px; }
    </style>
</head>
<body>
    <h2>Copilot Prompt Favourites</h2>
    ${itemsHtml}
    <script>
        const vscode = acquireVsCodeApi();
        function removeFavourite(index) {
            vscode.postMessage({ command: 'remove', index });
        }
    </script>
</body>
</html>`;
}

export function activate(context: vscode.ExtensionContext) {
    // Command: Show favourites in a webview
    context.subscriptions.push(
        vscode.commands.registerCommand('copilot-prompt-favourites.showFavouritesWebview', () => {
            const panel = vscode.window.createWebviewPanel(
                'copilotPromptFavouritesWebview',
                'Copilot Prompt Favourites',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );
            const favourites: FavouritePrompt[] = context.globalState.get(FAVOURITES_KEY, []);
            panel.webview.html = getWebviewHtml(favourites);
            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(async message => {
                if (message.command === 'remove' && typeof message.index === 'number') {
                    favourites.splice(message.index, 1);
                    await context.globalState.update(FAVOURITES_KEY, favourites);
                    panel.webview.html = getWebviewHtml(favourites);
                }
            });
        })
    );
    console.log('Copilot Prompt Favourites extension is now active!');

    // Command: Hello World
    context.subscriptions.push(
        vscode.commands.registerCommand('copilot-prompt-favourites.helloWorld', () => {
            vscode.window.showInformationMessage('Hello World from Copilot Prompt Favourites!');
        })
    );

    // Command: Favourite a prompt/response
    context.subscriptions.push(
        vscode.commands.registerCommand('copilot-prompt-favourites.favouritePrompt', async (...args) => {
            let prompt: string | undefined;
            let response: string | undefined;
            if (args && args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string') {
                prompt = args[0];
                response = args[1];
            } else {
                prompt = await vscode.window.showInputBox({ prompt: 'Enter the Copilot prompt to favourite' });
                if (!prompt) { return; }
                response = await vscode.window.showInputBox({ prompt: 'Enter the Copilot response to favourite' });
                if (!response) { return; }
            }
            const favourites: FavouritePrompt[] = context.globalState.get(FAVOURITES_KEY, []);
            favourites.push({ prompt, response, timestamp: Date.now() });
            await context.globalState.update(FAVOURITES_KEY, favourites);
            vscode.window.showInformationMessage('Prompt and response favourited!');
        })
    );

    // Command: View favourites
    context.subscriptions.push(
        vscode.commands.registerCommand('copilot-prompt-favourites.viewFavourites', async (...args) => {
            const favourites: FavouritePrompt[] = context.globalState.get(FAVOURITES_KEY, []);
            let result: string;
            if (favourites.length === 0) {
                result = 'No favourited prompts yet.';
                vscode.window.showInformationMessage(result);
                return result;
            }
            // If an index is provided, return that favourite directly
            if (args && args.length === 1 && typeof args[0] === 'number') {
                const idx = args[0];
                if (idx >= 0 && idx < favourites.length) {
                    const fav = favourites[idx];
                    result = `Prompt: ${fav.prompt}\nResponse: ${fav.response}`;
                    vscode.window.showInformationMessage(result);
                    return result;
                } else {
                    result = 'Invalid favourite index.';
                    vscode.window.showInformationMessage(result);
                    return result;
                }
            }
            // Otherwise, show quick pick and return selected
            const items = favourites.map((fav, idx) => ({
                label: `Prompt #${idx + 1}`,
                description: fav.prompt,
                detail: fav.response
            }));
            const selected = await vscode.window.showQuickPick(items, { placeHolder: 'Select a favourite to view details' });
            if (selected) {
                result = `Prompt: ${selected.description}\nResponse: ${selected.detail}`;
                vscode.window.showInformationMessage(result);
                return result;
            }
            result = 'No favourite selected.';
            vscode.window.showInformationMessage(result);
            return result;
        })
    );

    // Command: Remove favourite
    context.subscriptions.push(
        vscode.commands.registerCommand('copilot-prompt-favourites.removeFavourite', async () => {
            let favourites: FavouritePrompt[] = context.globalState.get(FAVOURITES_KEY, []);
            if (favourites.length === 0) {
                vscode.window.showInformationMessage('No favourited prompts to remove.');
                return;
            }
            const items = favourites.map((fav, idx) => ({
                label: `Prompt #${idx + 1}`,
                description: fav.prompt,
                detail: fav.response
            }));
            const selected = await vscode.window.showQuickPick(items, { placeHolder: 'Select a favourite to remove' });
            if (selected) {
                const index = items.findIndex(item => item.label === selected.label);
                favourites.splice(index, 1);
                await context.globalState.update(FAVOURITES_KEY, favourites);
                vscode.window.showInformationMessage('Favourite removed.');
            }
        })
    );
}

export function deactivate() {}