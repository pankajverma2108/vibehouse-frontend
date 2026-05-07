#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const ROOT_DIRS = ["app", "components"];
const JSX_EXTENSIONS = new Set([".tsx", ".jsx"]);
const VISIBLE_PROP_NAMES = new Set(["title", "description", "label", "text", "heading", "helperText"]);
const LOADING_REGEX = /\bLoading\b/;

/** @typedef {{ filePath: string; line: number; column: number; snippet: string }} Violation */

/** @type {Violation[]} */
const violations = [];

function toUnixPath(value) {
  return value.split(path.sep).join("/");
}

function normalizeSnippet(value) {
  return value.replace(/\s+/g, " ").trim();
}

function getLineAndColumn(sourceFile, node) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return { line: line + 1, column: character + 1 };
}

function addViolation(sourceFile, node, text) {
  const snippet = normalizeSnippet(text);
  if (!snippet || !LOADING_REGEX.test(snippet)) {
    return;
  }

  const { line, column } = getLineAndColumn(sourceFile, node);
  violations.push({
    filePath: toUnixPath(path.relative(process.cwd(), sourceFile.fileName)),
    line,
    column,
    snippet,
  });
}

function getJsxAttributeText(initializer, sourceFile) {
  if (!initializer) {
    return null;
  }

  if (ts.isStringLiteral(initializer)) {
    return initializer.text;
  }

  if (ts.isJsxExpression(initializer) && initializer.expression) {
    if (ts.isStringLiteralLike(initializer.expression) || ts.isNoSubstitutionTemplateLiteral(initializer.expression)) {
      return initializer.expression.text;
    }

    return initializer.expression.getText(sourceFile);
  }

  return null;
}

function expressionHasLoadingStringLiteral(expression) {
  let found = false;

  function walk(node) {
    if (found) {
      return;
    }

    if ((ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) && LOADING_REGEX.test(node.text)) {
      found = true;
      return;
    }

    ts.forEachChild(node, walk);
  }

  walk(expression);
  return found;
}

function hasSrOnlyClass(attributes, sourceFile) {
  for (const property of attributes.properties) {
    if (!ts.isJsxAttribute(property)) {
      continue;
    }

    const name = property.name.getText(sourceFile);
    if (name !== "className" && name !== "class") {
      continue;
    }

    const value = getJsxAttributeText(property.initializer, sourceFile);
    if (value && value.includes("sr-only")) {
      return true;
    }
  }

  return false;
}

function inspectVisibleProps(attributes, sourceFile, srOnlyContext) {
  if (srOnlyContext) {
    return;
  }

  for (const property of attributes.properties) {
    if (!ts.isJsxAttribute(property)) {
      continue;
    }

    const name = property.name.getText(sourceFile);
    if (!VISIBLE_PROP_NAMES.has(name)) {
      continue;
    }

    const initializer = property.initializer;
    if (!initializer) {
      continue;
    }

    if (ts.isStringLiteral(initializer) && LOADING_REGEX.test(initializer.text)) {
      addViolation(sourceFile, initializer, initializer.text);
      continue;
    }

    if (ts.isJsxExpression(initializer) && initializer.expression) {
      if ((ts.isStringLiteralLike(initializer.expression) || ts.isNoSubstitutionTemplateLiteral(initializer.expression)) && LOADING_REGEX.test(initializer.expression.text)) {
        addViolation(sourceFile, initializer.expression, initializer.expression.text);
        continue;
      }

      if (expressionHasLoadingStringLiteral(initializer.expression)) {
        addViolation(sourceFile, initializer.expression, initializer.expression.getText(sourceFile));
      }
    }
  }
}

function visitNode(node, sourceFile, srOnlyContext) {
  if (ts.isJsxElement(node)) {
    const nextSrOnlyContext = srOnlyContext || hasSrOnlyClass(node.openingElement.attributes, sourceFile);
    inspectVisibleProps(node.openingElement.attributes, sourceFile, nextSrOnlyContext);
    for (const child of node.children) {
      visitNode(child, sourceFile, nextSrOnlyContext);
    }
    return;
  }

  if (ts.isJsxSelfClosingElement(node)) {
    const nextSrOnlyContext = srOnlyContext || hasSrOnlyClass(node.attributes, sourceFile);
    inspectVisibleProps(node.attributes, sourceFile, nextSrOnlyContext);
    return;
  }

  if (ts.isJsxFragment(node)) {
    for (const child of node.children) {
      visitNode(child, sourceFile, srOnlyContext);
    }
    return;
  }

  if (ts.isJsxText(node) && !srOnlyContext && LOADING_REGEX.test(node.getText(sourceFile))) {
    addViolation(sourceFile, node, node.getText(sourceFile));
    return;
  }

  if (ts.isJsxExpression(node) && !srOnlyContext && node.expression) {
    if ((ts.isStringLiteralLike(node.expression) || ts.isNoSubstitutionTemplateLiteral(node.expression)) && LOADING_REGEX.test(node.expression.text)) {
      addViolation(sourceFile, node.expression, node.expression.text);
      return;
    }
  }

  ts.forEachChild(node, (child) => visitNode(child, sourceFile, srOnlyContext));
}

function collectFiles(dirPath, target) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      collectFiles(absolute, target);
      continue;
    }

    const extension = path.extname(entry.name);
    if (JSX_EXTENSIONS.has(extension)) {
      target.push(absolute);
    }
  }
}

function scanFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const extension = path.extname(filePath);
  const scriptKind = extension === ".jsx" ? ts.ScriptKind.JSX : ts.ScriptKind.TSX;
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind);
  visitNode(sourceFile, sourceFile, false);
}

/** @type {string[]} */
const files = [];
for (const rootDir of ROOT_DIRS) {
  collectFiles(path.join(process.cwd(), rootDir), files);
}

for (const file of files) {
  scanFile(file);
}

if (violations.length > 0) {
  violations.sort((a, b) => {
    if (a.filePath !== b.filePath) {
      return a.filePath.localeCompare(b.filePath);
    }
    if (a.line !== b.line) {
      return a.line - b.line;
    }
    return a.column - b.column;
  });

  console.error("Visible Loading copy is not allowed in app/components (except inside sr-only nodes).\n");

  for (const violation of violations) {
    console.error(`- ${violation.filePath}:${violation.line}:${violation.column} -> ${violation.snippet}`);
  }

  process.exit(1);
}

console.log("No visible Loading copy found outside sr-only contexts.");
