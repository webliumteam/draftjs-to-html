/* @flow */

import { getBlockMarkup } from './block';
import { isList, getListMarkup } from './list';

/**
* The function will generate html markup for given draftjs editorContent.
*/
export default function draftToHtml(
  editorContent: ContentState,
  hashtagConfig: Object,
  directional: boolean,
  customEntityTransform: Function
): string {
  const html = [];
  if (editorContent) {
    console.log('editorContent!!!!')
    const { blocks, entityMap } = editorContent;
    if (blocks && blocks.length > 0) {
      console.log('blocks && blocks.length > 0!!!!')
      let listBlocks = [];
      blocks.forEach((block, index) => {
        console.log('blocks.forEach!!!!')
        console.log(block)
        console.log(isList(block.type))
        console.log(isList(listBlocks.length > 0))
        if (isList(block.type)) {
          listBlocks.push(block);
        } else {
          if (listBlocks.length > 0) {
            const listHtml = getListMarkup(listBlocks, entityMap, hashtagConfig, customEntityTransform);
            html.push(listHtml);
            listBlocks = [];
          }
          console.log(isList('const blockHtml = getBlockMarkup!!!!!!!'))
          const blockHtml = getBlockMarkup(
            block,
            entityMap,
            hashtagConfig,
            directional,
            customEntityTransform,
            blocks.length,
          );
          html.push(blockHtml);
        }
      });
      if (listBlocks.length > 0) {
        const listHtml = getListMarkup(listBlocks, entityMap, hashtagConfig,directional, customEntityTransform);
        html.push(listHtml);
        listBlocks = [];
      }
    }
  }
  return html.join('');
}
