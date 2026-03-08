export const LUMBER_CATALOG = [
  { category: 'SPF材（1x）', items: [
    { id: '1x2', name: '1x2', width: 19, height: 38, defaultLength: 1820, color: '#deb887' },
    { id: '1x3', name: '1x3', width: 19, height: 63, defaultLength: 1820, color: '#deb887' },
    { id: '1x4', name: '1x4', width: 19, height: 89, defaultLength: 1820, color: '#deb887' },
    { id: '1x6', name: '1x6', width: 19, height: 140, defaultLength: 1820, color: '#d2b48c' },
    { id: '1x8', name: '1x8', width: 19, height: 184, defaultLength: 1820, color: '#d2b48c' },
    { id: '1x10', name: '1x10', width: 19, height: 235, defaultLength: 1820, color: '#d2b48c' },
  ]},
  { category: 'SPF材（2x）', items: [
    { id: '2x2', name: '2x2', width: 38, height: 38, defaultLength: 1820, color: '#c4956a' },
    { id: '2x3', name: '2x3', width: 38, height: 63, defaultLength: 1820, color: '#c4956a' },
    { id: '2x4', name: '2x4', width: 38, height: 89, defaultLength: 1820, color: '#c4956a' },
    { id: '2x6', name: '2x6', width: 38, height: 140, defaultLength: 1820, color: '#b8860b' },
    { id: '2x8', name: '2x8', width: 38, height: 184, defaultLength: 1820, color: '#b8860b' },
    { id: '2x10', name: '2x10', width: 38, height: 235, defaultLength: 2438, color: '#b8860b' },
  ]},
  { category: '角材', items: [
    { id: '30x30', name: '30x30角', width: 30, height: 30, defaultLength: 1820, color: '#a0522d' },
    { id: '45x45', name: '45x45角', width: 45, height: 45, defaultLength: 1820, color: '#a0522d' },
    { id: '90x90', name: '90x90角', width: 90, height: 90, defaultLength: 3000, color: '#8b4513' },
  ]},
  { category: '板材', items: [
    { id: 'shelf180', name: '棚板 180x18', width: 18, height: 180, defaultLength: 900, color: '#deb887' },
    { id: 'shelf250', name: '棚板 250x18', width: 18, height: 250, defaultLength: 900, color: '#deb887' },
    { id: 'shelf300', name: '棚板 300x18', width: 18, height: 300, defaultLength: 900, color: '#deb887' },
  ]},
];

export function findLumberDef(id) {
  for (const cat of LUMBER_CATALOG) {
    const item = cat.items.find(i => i.id === id);
    if (item) return item;
  }
  return null;
}
