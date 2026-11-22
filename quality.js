function multiply(left, right) {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5],
  ];
}

// Measure image painting transforms in PDF page units, including nested forms.
export async function inspectPDFPage(page, OPS) {
  const operations = await page.getOperatorList();
  let matrix = [1, 0, 0, 1, 0, 0];
  const stack = [];
  const images = [];
  let uncertain = false;
  const imageOperators = new Set([
    OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject,
    OPS.paintImageXObjectRepeat, OPS.paintImageMaskXObjectRepeat,
    OPS.paintImageMaskXObjectGroup, OPS.paintInlineImageXObjectGroup,
  ]);
  for (let index = 0; index < operations.fnArray.length; index++) {
    const operation = operations.fnArray[index];
    const args = operations.argsArray[index];
    if (operation === OPS.save || operation === OPS.paintFormXObjectBegin) {
      stack.push([...matrix]);
      if (operation === OPS.paintFormXObjectBegin && args[0]) matrix = multiply(matrix, args[0]);
    } else if (operation === OPS.restore || operation === OPS.paintFormXObjectEnd) {
      matrix = stack.pop() || [1, 0, 0, 1, 0, 0];
    } else if (operation === OPS.transform) {
      matrix = multiply(matrix, args);
    } else if (imageOperators.has(operation)) {
      let width, height;
      if (operation === OPS.paintImageXObject) [ , width, height] = args;
      else if (operation === OPS.paintInlineImageXObject || operation === OPS.paintImageMaskXObject) {
        ({width, height} = args[0]);
      } else {
        uncertain = true;
        continue;
      }
      const pointWidth = Math.hypot(matrix[0], matrix[1]);
      const pointHeight = Math.hypot(matrix[2], matrix[3]);
      if (width > 0 && height > 0 && pointWidth > 0 && pointHeight > 0) {
        images.push({width, height, pointWidth, pointHeight});
      } else uncertain = true;
    }
  }
  return {images, uncertain};
}

export function qualityAtSize(asset, widthMM, heightMM) {
  if (asset.kind !== "pdf") {
    return {ppi: Math.min(asset.width * 25.4 / widthMM, asset.height * 25.4 / heightMM), vector: false, uncertain: false};
  }
  const quality = asset.pdfQuality;
  if (!quality) return {ppi: null, vector: false, uncertain: true};
  if (!quality.images.length) return {ppi: null, vector: !quality.uncertain, uncertain: quality.uncertain};
  const values = quality.images.map(image => Math.min(
    image.width * 25.4 / (image.pointWidth / asset.width * widthMM),
    image.height * 25.4 / (image.pointHeight / asset.height * heightMM),
  ));
  return {ppi: Math.min(...values), vector: false, uncertain: quality.uncertain};
}
