const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const files = [
  "TransportDealerDashboard.js",
  "TransportDealerOrders.js",
  "TransportDealerAccount.js",
  "TransportDealerReviews.js",
  "TransportDealerEarnings.js",
  "TransportDealerMessages.js",
  "TransportDealerPayments.js",
  "TransportDealerRequests.js",
  "TransportDealerVehicles.js",
  "TransportDealerActiveTrips.js",
  "TransportDealerServiceArea.js",
  "TransportDealerNotifications.js",
  "TransportDealerVehicleDetails.js"
];

const basePath = path.join(__dirname, '../src/transport-dealer');
let extractedStrings = [];

files.forEach(fileName => {
  const filePath = path.join(basePath, fileName);
  if (!fs.existsSync(filePath)) {
    console.log("Missing:", fileName);
    return;
  }
  
  let code = fs.readFileSync(filePath, 'utf-8');
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });
  } catch (err) {
    console.error("Parse error on", fileName, err);
    return;
  }

  let hasUseTranslationImport = false;
  let componentName = null;
  
  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.source.value === 'react-i18next') {
        hasUseTranslationImport = true;
      }
    },
    ExportDefaultDeclaration(path) {
      const decl = path.node.declaration;
      if (t.isFunctionDeclaration(decl) || t.isCallExpression(decl)) {
          // just marking this logic
      }
    }
  });

  if (!hasUseTranslationImport) {
    const importDecl = t.importDeclaration(
      [t.importSpecifier(t.identifier('useTranslation'), t.identifier('useTranslation'))],
      t.stringLiteral('react-i18next')
    );
    ast.program.body.unshift(importDecl);
  }

  let insideComponent = false;

  traverse(ast, {
    FunctionDeclaration(path) {
      if (path.parent.type === "ExportDefaultDeclaration" || (path.node.id && path.node.id.name.startsWith("TransportDealer"))) {
        let block = path.node.body;
        if (block.type === 'BlockStatement') {
          // Check if const { t } = useTranslation(); exists
          let hasT = false;
          block.body.forEach(stmt => {
            if (stmt.type === 'VariableDeclaration' && stmt.declarations[0].id.type === 'ObjectPattern') {
              if (stmt.declarations[0].init && stmt.declarations[0].init.callee && stmt.declarations[0].init.callee.name === 'useTranslation') {
                hasT = true;
              }
            }
          });
          if (!hasT) {
            const hookCall = t.variableDeclaration('const', [
              t.variableDeclarator(
                t.objectPattern([
                  t.objectProperty(t.identifier('t'), t.identifier('t'), false, true)
                ]),
                t.callExpression(t.identifier('useTranslation'), [])
              )
            ]);
            block.body.unshift(hookCall);
          }
        }
      }
    },
    JSXText(path) {
      const text = path.node.value.trim();
      if (text.length > 0 && /[a-zA-Z]/.test(text)) {
        // Skip texts that are just symbols or numbers
        extractedStrings.push(text);
        
        const jsxExpr = t.jsxExpressionContainer(
          t.callExpression(t.identifier('t'), [t.stringLiteral(text)])
        );
        path.replaceWith(jsxExpr);
      }
    },
    JSXAttribute(path) {
      const name = path.node.name.name;
      if (['placeholder', 'title', 'label'].includes(name) && path.node.value && path.node.value.type === 'StringLiteral') {
        const text = path.node.value.value.trim();
        if (text.length > 0 && /[a-zA-Z]/.test(text)) {
          extractedStrings.push(text);
          path.node.value = t.jsxExpressionContainer(
            t.callExpression(t.identifier('t'), [t.stringLiteral(text)])
          );
        }
      }
    }
  });

  const output = generate(ast, {}, code);
  fs.writeFileSync(filePath, output.code, 'utf-8');
  console.log("Processed", fileName);
});

fs.writeFileSync(path.join(__dirname, 'extracted_strings.json'), JSON.stringify([...new Set(extractedStrings)], null, 2));
console.log("Done.");
