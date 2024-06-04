"use strict";

import * as vscode from "vscode";

import AssetCompletion from "./completion/Asset";
import BladeCompletion from "./completion/Blade";
import ConfigCompletion from "./completion/Config";
import EnvCompletion from "./completion/Env";
import GateCompletion from "./completion/Gate";
import MixCompletion from "./completion/Mix";
import Registry from "./completion/Registry";
import RouteCompletion from "./completion/Route";
import TranslationCompletion from "./completion/Translation";
import ViewCompletion from "./completion/View";
import LinkProvider from "./link/LinkProvider";
// import HoverProvider from "./HoverProvider";
import { info } from "console";
import EloquentCompletion from "./completion/Eloquent";
import InertiaCompletion from "./completion/Inertia";
import ValidationCompletion from "./completion/Validation";
import { hasWorkspace, projectPathExists } from "./support/project";

function shouldActivate(): boolean {
    if (!hasWorkspace()) {
        return false;
    }

    if (!projectPathExists("artisan")) {
        return false;
    }

    return true;
}

export function activate(context: vscode.ExtensionContext) {
    console.log("Activating Laravel Extension...");

    if (!shouldActivate()) {
        return;
    }

    info("Started");

    console.log("Laravel VS Code Started...");

    const LANGUAGES = [
        { scheme: "file", language: "php" },
        { scheme: "file", language: "blade" },
        { scheme: "file", language: "laravel-blade" },
    ];

    const TRIGGER_CHARACTERS = ["'", '"'];

    const delegatedProviders = [
        ConfigCompletion,
        RouteCompletion,
        ViewCompletion,
        TranslationCompletion,
        MixCompletion,
        EnvCompletion,
        GateCompletion,
        AssetCompletion,
        InertiaCompletion,
    ];

    const delegatedRegistry = new Registry();

    delegatedProviders.forEach((provider) => {
        delegatedRegistry.registerProvider(new provider());
    });

    const eloquentRegistry = new Registry();
    eloquentRegistry.registerProvider(new EloquentCompletion());

    const validationRegistry = new Registry();
    validationRegistry.registerProvider(new ValidationCompletion());

    // let hover = vscode.languages.registerHoverProvider(
    //     LANGUAGES,
    //     new HoverProvider(),
    // );

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            LANGUAGES,
            delegatedRegistry,
            ...TRIGGER_CHARACTERS,
        ),
        vscode.languages.registerCompletionItemProvider(
            LANGUAGES,
            eloquentRegistry,
            ...TRIGGER_CHARACTERS.concat([">"]),
        ),
        vscode.languages.registerCompletionItemProvider(
            LANGUAGES,
            validationRegistry,
            ...TRIGGER_CHARACTERS.concat(["|"]),
        ),
        vscode.languages.registerCompletionItemProvider(
            LANGUAGES,
            new BladeCompletion(),
            "@",
        ),
        vscode.languages.registerDocumentLinkProvider(
            LANGUAGES,
            new LinkProvider(),
        ),
        // hover,
    );
}

export function deactivate() {}
