import { notFound } from "@src/diagnostic";
import AutocompleteResult from "@src/parser/AutocompleteResult";
import { getControllers } from "@src/repositories/controllers";
import { getRoutes } from "@src/repositories/routes";
import { detectedRange, detectInDoc } from "@src/support/parser";
import { wordMatchRegex } from "@src/support/patterns";
import { facade } from "@src/support/util";
import * as vscode from "vscode";
import { DetectResult, LinkProvider } from "..";

const toFind = {
    class: facade("Route"),
    method: [
        "get",
        "post",
        "patch",
        "put",
        "delete",
        "options",
        "any",
        "match",
        "fallback",
        "addRoute",
        "newRoute",
    ],
};

const isCorrectIndexForMethod = (item: DetectResult, index: number) => {
    const indices: Record<string, number> = {
        fallback: 0,
        match: 2,
        newRoute: 2,
        addRoute: 2,
    };

    return index === (indices[item.method] ?? 1);
};

export const linkProvider: LinkProvider = (doc: vscode.TextDocument) => {
    return detectInDoc<vscode.DocumentLink, "string">(
        doc,
        toFind,
        getRoutes,
        ({ param, item, index }) => {
            if (!isCorrectIndexForMethod(item, index)) {
                return null;
            }

            const route = getRoutes().items.find(
                (route) => route.action === param.value,
            );

            if (!route || !route.filename || !route.line) {
                return null;
            }

            return new vscode.DocumentLink(
                detectedRange(param),
                vscode.Uri.file(route.filename).with({
                    fragment: `L${route.line}`,
                }),
            );
        },
    );
};

export const diagnosticProvider = (
    doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> => {
    return detectInDoc<vscode.Diagnostic, "string">(
        doc,
        toFind,
        getRoutes,
        ({ param, item, index }) => {
            if (!isCorrectIndexForMethod(item, index)) {
                return null;
            }

            const action = param.value;

            if (!action.includes("@")) {
                // Intelliphense can take it from here
                return null;
            }

            const route = getRoutes().items.find((r) => r.action === action);

            if (route) {
                return null;
            }

            return notFound(
                "Controller/Method",
                param.value,
                detectedRange(param),
                "controllerAction",
            );
        },
    );
};

export const completionProvider = {
    tags() {
        return toFind;
    },

    provideCompletionItems(
        result: AutocompleteResult,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext,
    ): vscode.CompletionItem[] {
        if (result.currentParamIsArray()) {
            return [];
        }

        const indexMapping = {
            match: 2,
        };

        // @ts-ignore
        const index = indexMapping[result.func()] ?? 1;

        if (!result.isParamIndex(index)) {
            return [];
        }

        return getControllers()
            .items.filter(
                (controller) =>
                    typeof controller === "string" && controller.length > 0,
            )
            .map((controller: string) => {
                let completionItem = new vscode.CompletionItem(
                    controller,
                    vscode.CompletionItemKind.Enum,
                );

                completionItem.range = document.getWordRangeAtPosition(
                    position,
                    wordMatchRegex,
                );

                return completionItem;
            });
    },
};
