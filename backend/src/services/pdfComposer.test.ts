import { convertMarkerToPdfCoords } from './pdfComposer';

function runTests() {
  console.log('Running convertMarkerToPdfCoords unit tests...');
  
  // Test case 1: Standard A4 page (595.27pt x 841.89pt)
  // Placement: x: 120px, y: 360px, width: 144px, height: 48px at scale 1.2
  const marker1 = { x: 120, y: 360, width: 144, height: 48 };
  const pageWidth1 = 595.27;
  const pageHeight1 = 841.89;
  
  const result1 = convertMarkerToPdfCoords(marker1, pageWidth1, pageHeight1);
  
  // Expected values (divided by 1.2):
  // width: 144 / 1.2 = 120pt
  // height: 48 / 1.2 = 40pt
  // x: 120 / 1.2 = 100pt
  // y: 841.89 - (360/1.2) - 40 = 841.89 - 300 - 40 = 501.89pt
  console.assert(Math.abs(result1.width - 120) < 0.001, `Expected width 120, got ${result1.width}`);
  console.assert(Math.abs(result1.height - 40) < 0.001, `Expected height 40, got ${result1.height}`);
  console.assert(Math.abs(result1.x - 100) < 0.001, `Expected x 100, got ${result1.x}`);
  console.assert(Math.abs(result1.y - 501.89) < 0.001, `Expected y 501.89, got ${result1.y}`);
  
  // Test case 2: US Letter page (612pt x 792pt)
  // Placement: x: 240px, y: 600px, width: 120px, height: 60px at scale 1.2
  const marker2 = { x: 240, y: 600, width: 120, height: 60 };
  const pageWidth2 = 612;
  const pageHeight2 = 792;
  
  const result2 = convertMarkerToPdfCoords(marker2, pageWidth2, pageHeight2);
  
  // Expected values (divided by 1.2):
  // width: 120 / 1.2 = 100pt
  // height: 60 / 1.2 = 50pt
  // x: 240 / 1.2 = 200pt
  // y: 792 - (600/1.2) - 50 = 792 - 500 - 50 = 242pt
  console.assert(Math.abs(result2.width - 100) < 0.001, `Expected width 100, got ${result2.width}`);
  console.assert(Math.abs(result2.height - 50) < 0.001, `Expected height 50, got ${result2.height}`);
  console.assert(Math.abs(result2.x - 200) < 0.001, `Expected x 200, got ${result2.x}`);
  console.assert(Math.abs(result2.y - 242) < 0.001, `Expected y 242, got ${result2.y}`);
  
  console.log('All convertMarkerToPdfCoords unit tests passed successfully!');
}

runTests();
