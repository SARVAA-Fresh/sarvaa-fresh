import { readFileSync } from 'fs';
import { join } from 'path';
import * as ts from 'typescript';

const ACCOUNT_MODELS = new Set(['admin', 'user']);
const ACCOUNT_IDENTITY = /admin|customer|user|account|credential|auth/i;
const PROVISIONING_ACTION =
  /create|seed|provision|bootstrap|ensure|upsert|setup|initialize/i;
const CREDENTIAL_FIELD =
  /^(?:password(?:hash)?|passphrase|credentials?|(?:access|refresh)?token|secret)$/i;

function parseSeed(source: string): ts.SourceFile {
  return ts.createSourceFile(
    'seed.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

function hasDirectAccountModelReference(sourceFile: ts.SourceFile): boolean {
  let found = false;

  function visit(node: ts.Node): void {
    if (
      (ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        ACCOUNT_MODELS.has(node.name.text)) ||
      (ts.isElementAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.argumentExpression &&
        ts.isStringLiteral(node.argumentExpression) &&
        ACCOUNT_MODELS.has(node.argumentExpression.text))
    ) {
      found = true;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return found;
}

function hasAccountProvisioningImport(sourceFile: ts.SourceFile): boolean {
  return sourceFile.statements.some((statement) => {
    if (!ts.isImportDeclaration(statement)) return false;

    const moduleName = ts.isStringLiteral(statement.moduleSpecifier)
      ? statement.moduleSpecifier.text
      : '';
    const clause = statement.importClause;
    if (!clause) return false;

    const importedNames: string[] = [];
    if (clause.name) importedNames.push(clause.name.text);

    if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
      importedNames.push(clause.namedBindings.name.text);
    } else if (
      clause.namedBindings &&
      ts.isNamedImports(clause.namedBindings)
    ) {
      for (const element of clause.namedBindings.elements) {
        importedNames.push((element.propertyName ?? element.name).text);
        importedNames.push(element.name.text);
      }
    }

    return importedNames.some(
      (name) =>
        (ACCOUNT_IDENTITY.test(name) && PROVISIONING_ACTION.test(name)) ||
        (ACCOUNT_IDENTITY.test(moduleName) &&
          PROVISIONING_ACTION.test(name)) ||
        (PROVISIONING_ACTION.test(moduleName) &&
          ACCOUNT_IDENTITY.test(name)),
    );
  });
}

function hasHardCodedCredentialField(sourceFile: ts.SourceFile): boolean {
  let found = false;

  function visit(node: ts.Node): void {
    if (
      ts.isPropertyAssignment(node) &&
      CREDENTIAL_FIELD.test(node.name.getText(sourceFile).replace(/['"]/g, '')) &&
      ts.isStringLiteral(node.initializer)
    ) {
      found = true;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return found;
}

describe('Prisma seed safety', () => {
  const seedSource = readFileSync(
    join(process.cwd(), 'prisma', 'seed.ts'),
    'utf8',
  );
  const seedFile = parseSeed(seedSource);

  it('does not access account models or import account-provisioning helpers', () => {
    expect(hasDirectAccountModelReference(seedFile)).toBe(false);
    expect(hasAccountProvisioningImport(seedFile)).toBe(false);
  });

  it('detects direct account-model access and account-provisioning imports', () => {
    expect(
      hasDirectAccountModelReference(
        parseSeed('database.admin.create({ data: {} });'),
      ),
    ).toBe(true);
    expect(
      hasAccountProvisioningImport(
        parseSeed(
          "import { provision } from './account-provisioning'; provision();",
        ),
      ),
    ).toBe(true);
    expect(
      hasAccountProvisioningImport(
        parseSeed(
          "import { createDemoCustomer } from './helpers'; createDemoCustomer();",
        ),
      ),
    ).toBe(true);
  });

  it('does not define hard-coded authentication credentials', () => {
    expect(hasHardCodedCredentialField(seedFile)).toBe(false);
    expect(
      hasHardCodedCredentialField(
        parseSeed("const account = { password: 'placeholder' };"),
      ),
    ).toBe(true);
  });

  it('retains the development catalog and inventory seeding paths', () => {
    expect(seedSource).toMatch(/async function seedCategories/);
    expect(seedSource).toMatch(/async function seedProductWithVariantAndInventory/);
    expect(seedSource).toMatch(/prisma\.inventory\.create/);
    expect(seedSource).toMatch(/seedCategories\(\)/);
    expect(seedSource).toMatch(/seedProductsForCategory\(category\)/);
  });
});
