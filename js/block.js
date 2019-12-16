import { forEach, isEmptyString } from './common';

/**
 * Mapping block-type to corresponding html tag.
 */
const blockTypesMapping: Object = {
  unstyled: 'span',
  'header-one': 'h1',
  'header-two': 'h2',
  'header-three': 'h3',
  'header-four': 'h4',
  'header-five': 'h5',
  'header-six': 'h6',
  'unordered-list-item': 'ul',
  'ordered-list-item': 'ol',
  blockquote: 'blockquote',
  code: 'pre',
};

const inlineStylesMap: Object = {
  BOLD: '<span style="font-weight: bold;">{$}</span>',
  ITALIC: '<em>{$}</em>',
  UNDERLINE: '<u>{$}</u>',
  STRIKETHROUGH: '<del>{$}</del>',
  CODE: '<code>{$}</code>',
  SUPERSCRIPT: '<sup>{$}</sup>',
  SUBSCRIPT: '<sub>{$}</sub>',
  UNBOLD: '<span style="font-weight: normal;">{$}</span>',
  UNITALIC: '<span style="font-style: normal;">{$}</span>',
};

const defaultStylesMap: Object = {
  unstyled: 'display: block;',
};

const listSpecificStylesMap: Object = {
  'text-align-center': 'margin-left: auto; margin-right: auto;',
  'text-align-left': 'margin-right: auto; margin-left: 0;',
  'text-align-right': 'margin-right: 0; margin-left: auto;',
};

const getAlignment = (key, value) => listSpecificStylesMap[`${key}-${value}`] || '';

export function getListBlockStyle(data: Object): string {
  let styles = '';
  forEach(data, (key, value) => {
    if (value) {
      styles += `${key}:${value};${getAlignment(key, value)}`;
    }
  });
  return styles;
}

export function getListBlockClass(data: Object): string {
  let classNames = '';
  if (data && data['unordered-list']) {
    classNames += data['unordered-list'];
  }
  return classNames;
}

/**
 * Function will return HTML tag for a block.
 */
export function getBlockTag(type: string): string {
  return type && blockTypesMapping[type];
}

/**
 * Function will return style string for a block.
 */
export function getBlockStyle(data: Object): string {
  let styles = '';
  forEach(data, (key, value) => {
    if (value) {
      styles += `${key}:${value};`;
    }
  });
  return styles;
}

/**
 * The function returns an array of hashtag-sections in blocks.
 * These will be areas in block which have hashtags applicable to them.
 */
function getHashtagRanges(blockText: string, hashtagConfig: Object): Array<Object> {
  const sections = [];
  if (hashtagConfig) {
    let counter = 0;
    let startIndex = 0;
    let text = blockText;
    const trigger = hashtagConfig.trigger || '#';
    const separator = hashtagConfig.separator || ' ';
    for (;text.length > 0 && startIndex >= 0;) {
      if (text[0] === trigger) {
        startIndex = 0;
        counter = 0;
        text = text.substr(trigger.length);
      } else {
        startIndex = text.indexOf(separator + trigger);
        if (startIndex >= 0) {
          text = text.substr(startIndex + (separator + trigger).length);
          counter += startIndex + separator.length;
        }
      }
      if (startIndex >= 0) {
        const endIndex =
          text.indexOf(separator) >= 0
            ? text.indexOf(separator)
            : text.length;
        const hashtag = text.substr(0, endIndex);
        if (hashtag && hashtag.length > 0) {
          sections.push({
            offset: counter,
            length: hashtag.length + trigger.length,
            type: 'HASHTAG',
          });
        }
        counter += trigger.length;
      }
    }
  }
  return sections;
}

/**
 * The function returns an array of entity-sections in blocks.
 * These will be areas in block which have same entity or no entity applicable to them.
 */
function getSections(
  block: Object,
  hashtagConfig: Object
): Array<Object> {
  const sections = [];
  let lastOffset = 0;
  let sectionRanges = block.entityRanges.map((range) => {
    const { offset, length, key } = range;
    return {
      offset,
      length,
      key,
      type: 'ENTITY',
    };
  });
  sectionRanges = sectionRanges.concat(getHashtagRanges(block.text, hashtagConfig));
  sectionRanges = sectionRanges.sort((s1, s2) => s1.offset - s2.offset);
  sectionRanges.forEach((r) => {
    if (r.offset > lastOffset) {
      sections.push({
        start: lastOffset,
        end: r.offset,
      });
    }
    sections.push({
      start: r.offset,
      end: r.offset + r.length,
      entityKey: r.key,
      type: r.type,
    });
    lastOffset = r.offset + r.length;
  });
  if (lastOffset < block.text.length) {
    sections.push({
      start: lastOffset,
      end: block.text.length,
    });
  }
  return sections;
}

/**
 * Function to check if the block is an atomic entity block.
 */
function isAtomicEntityBlock(block: Object): boolean {
  if ((block.entityRanges.length > 0 && isEmptyString(block.text)) ||
    block.type === 'atomic') {
    return true;
  }
  return false;
}

/**
 * The function will return array of inline styles applicable to the block.
 */
function getStyleArrayForBlock(block: Object): Object {
  const { text, inlineStyleRanges } = block;
  const inlineStyles = {
    BOLD: new Array(text.length),
    ITALIC: new Array(text.length),
    UNDERLINE: new Array(text.length),
    UNBOLD: new Array(text.length),
    UNITALIC: new Array(text.length),
    STRIKETHROUGH: new Array(text.length),
    CODE: new Array(text.length),
    SUPERSCRIPT: new Array(text.length),
    SUBSCRIPT: new Array(text.length),
    COLOR: new Array(text.length),
    BGCOLOR: new Array(text.length),
    FONTSIZE: new Array(text.length),
    FONTFAMILY: new Array(text.length),
    length: text.length,
  };
  if (inlineStyleRanges && inlineStyleRanges.length > 0) {
    inlineStyleRanges.forEach((range) => {
      const offset = range.offset;
      const length = offset + range.length;
      for (let i = offset; i < length; i += 1) {
        if (range.style.indexOf('color-') === 0) {
          inlineStyles.COLOR[i] = range.style.substring(6);
        } else if (range.style.indexOf('bgcolor-') === 0) {
          inlineStyles.BGCOLOR[i] = range.style.substring(8);
        } else if (range.style.indexOf('fontsize-') === 0) {
          inlineStyles.FONTSIZE[i] = range.style.substring(9);
        } else if (range.style.indexOf('fontfamily-') === 0) {
          inlineStyles.FONTFAMILY[i] = range.style.substring(11);
        } else if (inlineStyles[range.style]) {
          inlineStyles[range.style][i] = true;
        }
      }
    });
  }
  return inlineStyles;
}

/**
 * The function will return inline style applicable at some offset within a block.
 */
export function getStylesAtOffset(inlineStyles: Object, offset: number): Object {
  const styles = {};
  if (inlineStyles.COLOR[offset]) {
    styles.COLOR = inlineStyles.COLOR[offset];
  }
  if (inlineStyles.BGCOLOR[offset]) {
    styles.BGCOLOR = inlineStyles.BGCOLOR[offset];
  }
  if (inlineStyles.FONTSIZE[offset]) {
    styles.FONTSIZE = inlineStyles.FONTSIZE[offset];
  }
  if (inlineStyles.FONTFAMILY[offset]) {
    styles.FONTFAMILY = inlineStyles.FONTFAMILY[offset];
  }
  if (inlineStyles.UNITALIC[offset]) {
    styles.UNITALIC = true;
  }
  if (inlineStyles.UNBOLD[offset]) {
    styles.UNBOLD = true;
  }
  if (inlineStyles.UNDERLINE[offset]) {
    styles.UNDERLINE = true;
  }
  if (inlineStyles.ITALIC[offset]) {
    styles.ITALIC = true;
  }
  if (inlineStyles.BOLD[offset]) {
    styles.BOLD = true;
  }
  if (inlineStyles.STRIKETHROUGH[offset]) {
    styles.STRIKETHROUGH = true;
  }
  if (inlineStyles.CODE[offset]) {
    styles.CODE = true;
  }
  if (inlineStyles.SUBSCRIPT[offset]) {
    styles.SUBSCRIPT = true;
  }
  if (inlineStyles.SUPERSCRIPT[offset]) {
    styles.SUPERSCRIPT = true;
  }
  return styles;
}

/**
 * Function returns true for a set of styles if the value of these styles at an offset
 * are same as that on the previous offset.
 */
export function sameStyleAsPrevious(
  inlineStyles: Object,
  styles: Array<string>,
  index: number,
): boolean {
  let sameStyled = true;
  if (index > 0 && index < inlineStyles.length) {
    styles.forEach((style) => {
      sameStyled = sameStyled && inlineStyles[style][index] === inlineStyles[style][index - 1];
    });
  } else {
    sameStyled = false;
  }
  return sameStyled;
}

/**
 * Function returns html for text depending on inline style tags applicable to it.
 */
export function addInlineStyleMarkup(style: string, content: string): string {
  return (inlineStylesMap[style] || '{$}').replace(/\{\$\}/, content);
}

/**
 * The function returns text for given section of block after doing required character replacements.
 */
function getSectionText(text: Array<string>): string {
  if (text && text.length > 0) {
    const chars = text.map((ch) => {
      switch (ch) {
        case '\n':
          return '<br>';
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        default:
          return ch;
      }
    });
    return chars.join('');
  }
  return '';
}

/**
 * Function returns html for text depending on inline style tags applicable to it.
 */
export function addStylePropertyMarkup(styles: Object, text: string): string {
  if (styles && (styles.COLOR || styles.BGCOLOR || styles.FONTSIZE || styles.FONTFAMILY)) {
    let styleString = 'style="';
    if (styles.COLOR) {
      styleString += `color: ${styles.COLOR.replace(/ /g, '')};`;
    }
    if (styles.BGCOLOR) {
      styleString += `background-color: ${styles.BGCOLOR.replace(/ /g, '')};`;
    }
    if (styles.FONTSIZE) {
      styleString += `font-size: ${styles.FONTSIZE}px;`;
    }
    if (styles.FONTFAMILY) {
      styleString += `font-family: ${styles.FONTFAMILY};`;
    }
    styleString += '"';
    return `<span ${styleString}>${text}</span>`;
  }
  return text;
}

/**
 * Function will return markup for Entity.
 */
function getEntityMarkup(
  entityMap: Object,
  entityKey: number,
  text: string,
  customEntityTransform: Function
): string {
  const entity = entityMap[entityKey];
  if (typeof customEntityTransform === 'function') {
    const html = customEntityTransform(entity, text);
    if (html) {
      return html;
    }
  }
  if (entity.type === 'MENTION') {
    return `<a href="${entity.data.url}" class="wysiwyg-mention" data-mention data-value="${entity.data.value}">${text}</a>`;
  }
  if (entity.type === 'LINK') {
    const targetOption = entity.data.targetOption || '_self';
    return `<a href="${entity.data.url}" class="ui-link" target="${targetOption}">${text}</a>`;
  }
  if (entity.type === 'IMAGE') {
    return `<img src="${entity.data.src}" alt="${entity.data.alt}" style="float:${entity.data.alignment || 'none'};height: ${entity.data.height};width: ${entity.data.width}"/>`;
  }
  if (entity.type === 'EMBEDDED_LINK') {
    return `<iframe width="${entity.data.width}" height="${entity.data.height}" src="${entity.data.src}" frameBorder="0"></iframe>`;
  }
  return text;
}

/**
 * For a given section in a block the function will return a further list of sections,
 * with similar inline styles applicable to them.
 */
function getInlineStyleSections(
  block: Object,
  styles: Array<string>,
  start: number,
  end: number,
): Array<Object> {
  const styleSections = [];
  const { text } = block;
  if (text.length > 0) {
    const inlineStyles = getStyleArrayForBlock(block);
    let section;
    for (let i = start; i < end; i += 1) {
      if (i !== start && sameStyleAsPrevious(inlineStyles, styles, i)) {
        section.text.push(text[i]);
        section.end = i + 1;
      } else {
        section = {
          styles: getStylesAtOffset(inlineStyles, i),
          text: [text[i]],
          start: i,
          end: i + 1,
        };
        styleSections.push(section);
      }
    }
  }
  return styleSections;
}

/**
 * Replace leading blank spaces by &nbsp;
 */
export function trimLeadingZeros(sectionText: string): string {
  if (sectionText) {
    let replacedText = sectionText;
    for (let i = 0; i < replacedText.length; i += 1) {
      if (sectionText[i] === ' ') {
        replacedText = replacedText.replace(' ', '&nbsp;');
      } else {
        break;
      }
    }
    return replacedText;
  }
  return sectionText;
}

/**
 * Replace trailing blank spaces by &nbsp;
 */
export function trimTrailingZeros(sectionText: string): string {
  if (sectionText) {
    let replacedText = sectionText;
    for (let i = replacedText.length - 1; i >= 0; i -= 1) {
      if (replacedText[i] === ' ') {
        replacedText = `${replacedText.substring(0, i)}&nbsp;${replacedText.substring(i + 1)}`;
      } else {
        break;
      }
    }
    return replacedText;
  }
  return sectionText;
}

/**
 * The method returns markup for section to which inline styles
 * like BOLD, ITALIC, UNDERLINE, STRIKETHROUGH, CODE, SUPERSCRIPT, SUBSCRIPT are applicable.
 */
function getStyleTagSectionMarkup(styleSection: Object): string {
  const { styles, text } = styleSection;
  let content = getSectionText(text);
  forEach(styles, (style, value) => {
    content = addInlineStyleMarkup(style, content, value);
  });
  return content;
}


/**
 * The method returns markup for section to which inline styles
 like color, background-color, font-size are applicable.
 */
function getInlineStyleSectionMarkup(block: Object, styleSection: Object): string {
  const styleTagSections = getInlineStyleSections(
    block, ['UNBOLD', 'UNITALIC', 'BOLD', 'ITALIC', 'UNDERLINE', 'STRIKETHROUGH', 'CODE', 'SUPERSCRIPT', 'SUBSCRIPT'], styleSection.start, styleSection.end,
  );
  let styleSectionText = '';
  styleTagSections.forEach((stylePropertySection) => {
    styleSectionText += getStyleTagSectionMarkup(stylePropertySection);
  });
  styleSectionText = addStylePropertyMarkup(styleSection.styles, styleSectionText)
  return styleSectionText;
}

/*
* The method returns markup for an entity section.
* An entity section is a continuous section in a block
* to which same entity or no entity is applicable.
*/
function getSectionMarkup(
  block: Object,
  entityMap: Object,
  section: Object,
  customEntityTransform: Function
): string {
  const entityInlineMarkup = [];
  const inlineStyleSections = getInlineStyleSections(
    block,
    ['COLOR', 'BGCOLOR', 'FONTSIZE', 'FONTFAMILY'],
    section.start,
    section.end,
  );
  inlineStyleSections.forEach((styleSection) => {
    entityInlineMarkup.push(getInlineStyleSectionMarkup(block, styleSection));
  });
  let sectionText = entityInlineMarkup
    .map((item) => {
      const match = item.match(/color:\s?var\(--(.*?)\)/);
      return match ? item.replace('style=', `class="text-${match[1]}" style=`) : item;
    })
    .join('');
  if (section.type === 'ENTITY') {
    if (section.entityKey !== undefined && section.entityKey !== null) {
      sectionText = getEntityMarkup(entityMap, section.entityKey, sectionText, customEntityTransform);
    }
  } else if (section.type === 'HASHTAG') {
    sectionText = `<a href="${sectionText}" class="wysiwyg-hashtag">${sectionText}</a>`;
  }
  return sectionText;
}

/**
 * Function will return the markup for block preserving the inline styles and
 * special characters like newlines or blank spaces.
 */
export function getBlockInnerMarkup(
  block: Object,
  entityMap: Object,
  hashtagConfig: Object,
  customEntityTransform: Function
): string {
  const blockMarkup = [];
  const sections = getSections(block, hashtagConfig);
  sections.forEach((section, index) => {
    let sectionText =
      getSectionMarkup(block, entityMap, section, customEntityTransform);
    if (index === 0) {
      sectionText = trimLeadingZeros(sectionText);
    }
    if (index === sections.length - 1) {
      sectionText = trimTrailingZeros(sectionText);
    }
    blockMarkup.push(sectionText);
  });
  return blockMarkup.join('');
}

/**
 * Function will return html for the block.
 */
export function getBlockMarkup(
  block: Object,
  entityMap: Object,
  hashtagConfig: Object,
  directional: boolean,
  customEntityTransform: Function,
  blocksTotal: Number,
): string {
  const blockHtml = [];
  if (isAtomicEntityBlock(block)) {
    blockHtml.push(
      getEntityMarkup(
        entityMap,
        block.entityRanges[0].key,
        undefined,
        customEntityTransform,
      ));
  } else if (block.type === 'unstyled' && !block.text && blocksTotal > 1) {
    blockHtml.push('<br>');
  } else {
    const blockTag = getBlockTag(block.type);
    if (blockTag) {
      const defaultStyle = defaultStylesMap[block.type] || '';
      const blockStyle = getBlockStyle(block.data);
      const blockClass = getListBlockClass(block.data);
      const tagIsrequired = blocksTotal > 1 || blockStyle || directional;
      if (tagIsrequired) {
        blockHtml.push(`<${blockTag}`);
        if (blockStyle || defaultStyle) {
          blockHtml.push(` style="${defaultStyle}${blockStyle}"`);
        }
        if (blockClass) {
          blockHtml.push(` class="${blockClass}"`);
        }
        if (directional) {
          blockHtml.push(' dir = "auto"');
        }
        blockHtml.push('>');
      }
      blockHtml.push(getBlockInnerMarkup(block, entityMap, hashtagConfig, customEntityTransform));
      tagIsrequired && blockHtml.push(`</${blockTag}>`);
    }
  }
  return blockHtml.join('');
}