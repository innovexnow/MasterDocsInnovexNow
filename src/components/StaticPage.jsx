import { createElement, useEffect, useMemo } from 'react';
import parse, {
  attributesToProps,
  domToReact,
  Element,
} from 'html-react-parser';

const eventAttributes = {
  onclick: 'onClick',
  onchange: 'onChange',
  oninput: 'onInput',
  onsubmit: 'onSubmit',
  onkeydown: 'onKeyDown',
  onkeyup: 'onKeyUp',
};

const voidElements = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

function invokeLegacy(expression, event) {
  const statements = expression
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    if (statement === 'return false') {
      event.preventDefault();
      continue;
    }
    if (statement === 'event.stopPropagation()') {
      event.stopPropagation();
      continue;
    }

    const call = statement.match(/^([A-Za-z_$][\w$]*)\((.*)\)$/);
    if (!call) continue;
    const [, name, rawArgument] = call;
    const handler = window[name];
    if (typeof handler !== 'function') continue;

    const argument = rawArgument.trim();
    if (!argument) handler();
    else if (argument === 'event') handler(event);
    else if (argument === 'this') handler(event.currentTarget);
    else if (argument.includes("document.getElementById('sqlSchema')")) {
      handler(document.getElementById('sqlSchema')?.textContent ?? '');
    } else {
      const quoted = argument.match(/^(['"])([\s\S]*)\1$/);
      if (quoted) handler(quoted[2]);
    }
  }
}

function createParserOptions() {
  const options = {
    replace(node) {
      if (!(node instanceof Element)) return undefined;
      const legacyEvents = Object.keys(eventAttributes).filter(
        (attribute) => node.attribs?.[attribute],
      );
      const opensExternally =
        node.name === 'a' && node.attribs?.target === '_blank';
      const isEditable = node.attribs?.contenteditable === 'true';
      if (!legacyEvents.length && !opensExternally && !isEditable) {
        return undefined;
      }

      const attributes = { ...node.attribs };
      const props = attributesToProps(attributes);
      for (const attribute of legacyEvents) {
        const expression = attributes[attribute];
        delete props[eventAttributes[attribute]];
        delete props[attribute];
        props[eventAttributes[attribute]] = (event) =>
          invokeLegacy(expression, event);
      }
      if (opensExternally) props.rel = 'noopener noreferrer';
      if (isEditable) props.suppressContentEditableWarning = true;

      return createElement(
        node.name,
        props,
        voidElements.has(node.name)
          ? undefined
          : domToReact(node.children, options),
      );
    },
  };
  return options;
}

export default function StaticPage({ markup, script, styles }) {
  const content = useMemo(() => {
    const browserEquivalentMarkup = markup
      .replace(/(<table[^>]*>)(\s*<tr)/gi, '$1<tbody>$2')
      .replace(/(<\/tr>\s*)(<\/table>)/gi, '$1</tbody>$2');
    return parse(browserEquivalentMarkup, createParserOptions());
  }, [markup]);

  useEffect(() => {
    const legacyScript = document.createElement('script');
    legacyScript.src = script;
    legacyScript.dataset.legacyPage = script;
    document.body.appendChild(legacyScript);

    return () => legacyScript.remove();
  }, [script]);

  return (
    <>
      <style>{styles}</style>
      {content}
    </>
  );
}
