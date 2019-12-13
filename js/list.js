import {
  getBlockTag,
  getListBlockStyle,
  getBlockInnerMarkup,
  getListBlockClass,
} from './block';

/**
 * Function to check if a block is of type list.
 */
export function isList(blockType: string): any {
  return (
    blockType === 'unordered-list-item' ||
    blockType === 'ordered-list-item'
  );
}

/**
 * Function will return html markup for a list block.
 */
export function getListMarkup(
  listBlocks: Array<Object>,
  entityMap: Object,
  hashtagConfig: Object,
  directional: boolean,
  customEntityTransform: Function
): string {
  const listHtml = [];
  let nestedListBlock = [];
  let previousBlock;
  listBlocks.forEach((block) => {
    let nestedBlock = false;
    if (!previousBlock) {
      listHtml.push(`<${getBlockTag(block.type)}>\n`);
    } else if (previousBlock.type !== block.type) {
      listHtml.push(`</${getBlockTag(previousBlock.type)}>\n`);
      listHtml.push(`<${getBlockTag(block.type)}>\n`);
    } else if (previousBlock.depth === block.depth) {
      if (nestedListBlock && nestedListBlock.length > 0) {
        listHtml.push(getListMarkup(
          nestedListBlock,
          entityMap,
          hashtagConfig,
          directional,
          customEntityTransform
        ));
        nestedListBlock = [];
      }
    } else {
      nestedBlock = true;
      nestedListBlock.push(block);
    }
    if (!nestedBlock) {
      listHtml.push('<li');
      const blockStyle = getListBlockStyle(block.data);
      const blockClass = getListBlockClass(block.data);
      if (blockStyle) {
        listHtml.push(` style="${blockStyle}"`);
      }
      if (blockClass) {
        listHtml.push(` class="${blockClass}"`);
      }
      if (directional) {
        listHtml.push(' dir = "auto"');
      }
      listHtml.push('>');
      listHtml.push(getBlockInnerMarkup(
        block,
        entityMap,
        hashtagConfig,
        customEntityTransform
      ));
      listHtml.push('</li>\n');
      previousBlock = block;
    }
  });
  if (nestedListBlock && nestedListBlock.length > 0) {
    listHtml.push(getListMarkup(
      nestedListBlock,
      entityMap,
      hashtagConfig,
      directional,
      customEntityTransform
    ));
  }
  listHtml.push(`</${getBlockTag(previousBlock.type)}>\n`);
  return listHtml.join('');
}
