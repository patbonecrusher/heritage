import { toPng, toSvg } from 'html-to-image';

// Filter function to exclude UI elements but keep nodes and edges
function exportFilter(node) {
  // Always include if not an element
  if (!node.classList) return true;

  // Exclude controls, minimap, background dots, and handles
  const excludeClasses = [
    'react-flow__controls',
    'react-flow__minimap',
    'react-flow__background',
    'react-flow__handle',
    'node-handle',
  ];

  if (excludeClasses.some(cls => node.classList.contains(cls))) {
    return false;
  }

  return true;
}

export async function exportToImage(element, theme = null) {
  const flowElement = element.querySelector('.react-flow');
  if (!flowElement) {
    throw new Error('React Flow element not found');
  }

  // Get the bounds of all nodes
  const nodeElements = element.querySelectorAll('.react-flow__node');
  if (nodeElements.length === 0) {
    throw new Error('No nodes to export');
  }

  // Inline SVG styles for edges before export
  const svgElements = flowElement.querySelectorAll('svg');
  svgElements.forEach(svg => {
    const paths = svg.querySelectorAll('path');
    paths.forEach(path => {
      const computedStyle = window.getComputedStyle(path);
      path.style.stroke = computedStyle.stroke || '#64748b';
      path.style.strokeWidth = computedStyle.strokeWidth || '2';
      path.style.fill = computedStyle.fill || 'none';
    });
  });

  // Use theme background color or default to white
  const backgroundColor = theme?.colors?.background || '#ffffff';

  const dataUrl = await toPng(flowElement, {
    backgroundColor,
    pixelRatio: 2,
    filter: exportFilter,
    cacheBust: true,
    skipAutoScale: true,
    style: {
      overflow: 'visible',
    },
  });

  return dataUrl;
}

export async function exportToSvg(element, theme = null) {
  const flowElement = element.querySelector('.react-flow');
  if (!flowElement) {
    throw new Error('React Flow element not found');
  }

  // Inline SVG styles for edges before export
  const svgElements = flowElement.querySelectorAll('svg');
  svgElements.forEach(svg => {
    const paths = svg.querySelectorAll('path');
    paths.forEach(path => {
      const computedStyle = window.getComputedStyle(path);
      path.style.stroke = computedStyle.stroke || '#64748b';
      path.style.strokeWidth = computedStyle.strokeWidth || '2';
      path.style.fill = computedStyle.fill || 'none';
    });
  });

  // Use theme background color or default to white
  const backgroundColor = theme?.colors?.background || '#ffffff';

  const svgDataUrl = await toSvg(flowElement, {
    backgroundColor,
    filter: exportFilter,
    cacheBust: true,
    style: {
      overflow: 'visible',
    },
  });

  // Convert data URL to SVG string
  const base64Data = svgDataUrl.split(',')[1];
  const svgString = atob(base64Data);

  return svgString;
}
