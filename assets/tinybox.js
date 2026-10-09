// USD prices. Add Shopify IDs for the base systems and upgrades, not every
// possible combination. Each ID is the purchasable variant of that one item.
const platforms = [
  { name: 'G4', ddr: 'DDR4', cpu: 'EPYC', pcie: 'PCIe 4', networking: '2× 1GbE + OCP3.0', memory: [
    { gb: 32, price: 7000, id: '50492208677082' },
    { gb: 128, price: 10000, id: '50492208742618' },
  ] },
  { name: 'G5', ddr: 'DDR5', cpu: 'GENOA', pcie: 'PCIe 5', networking: '2× 10GbE + OCP3.0 PCIe5', memory: [
    { gb: 32, price: 12000, id: '50492208611546' },
    { gb: 192, price: 20000, id: '50492208808154' },
  ] },
];
const storage = [
  { name: 'None', price: 0 },
  { name: '4 TB RAID', drives: '4x 1 TB drives', price: 2000, id: '67507609764058' },
  { name: '16 TB RAID', drives: '4x 4 TB drives', price: 6000, id: '67507609796826' },
];
// GPU RAM is per card in GB; multiply by quantity for the system total.
const rtx5090 = { price: 8000, id: '67511688823002', ram: 32 };
const rtx = { price: 19000, id: '67507610321114', ram: 96 }; // One RTX 6000; use quantity 2 for two.
const gpus = [
  { name: 'None', price: 0, ram: 0 },
  { name: '4× AMD 9070XT', price: 1000, id: '67507611271386', ram: 16, quantity: 4 },
  { name: '1× NVIDIA RTX 5090', ...rtx5090, quantity: 1 },
  { name: '2× NVIDIA RTX 5090', ...rtx5090, quantity: 2 },
  { name: '1× NVIDIA RTX 6000', ...rtx, quantity: 1 },
  { name: '2× NVIDIA RTX 6000', ...rtx, quantity: 2 },
];
const shop = 'https://tinycorp.myshopify.com';
const money = value => '$' + value.toLocaleString('en-US');
const cost = item => item.price * (item.quantity || 1);
const form = document.querySelector('#configurator');
const checkout = document.querySelector('#checkout');

function choices(name, options) {
  return options.map((option, index) => `
    <label class="choice">
      <input type="radio" name="${name}" value="${index}" ${index === 0 ? 'checked' : ''}>
      <span class="choice-content">
        <span>
          <span class="choice-title">${option.label}</span>
          ${option.description ? `<span class="choice-description">${option.description}</span>` : ''}
        </span>
        <span class="choice-price">${option.detail}</span>
      </span>
    </label>
  `).join('');
}

function fieldset(name, title, step) {
  return `<fieldset>
    <legend><span class="step">0${step}</span>${title}</legend>
    <div id="${name}-choices" class="choices ${name}"></div>
  </fieldset>`;
}

document.querySelector('#options').innerHTML = [
  fieldset('platform', 'Platform', 1),
  fieldset('memory', 'Memory', 2),
  fieldset('storage', 'Extra storage', 3),
  fieldset('gpu', 'GPUs', 4),
].join('');

document.querySelector('#platform-choices').innerHTML = choices('platform', platforms.map(platform => ({
  label: platform.name,
  detail: `${platform.ddr} / ${platform.cpu}<br>${platform.pcie}<br>${money(platform.memory[0].price)} base`,
})));
for (const [name, options] of [['storage', storage], ['gpu', gpus]]) {
  document.querySelector(`#${name}-choices`).innerHTML = choices(name, options.map(option => ({
    label: option.name,
    detail: option.price ? '+' + money(cost(option)) : 'No extra cost',
  })));
}

const selected = name => Number(form.elements.namedItem(name).value);
function renderMemory() {
  const platform = platforms[selected('platform')];
  document.querySelector('#memory-choices').innerHTML = choices('memory', platform.memory.map(memory => ({
    label: `${memory.gb} GB`,
    detail: memory.gb === 32 ? 'Included' : '+' + money(memory.price - platform.memory[0].price),
  })));
}

function selection() {
  const platform = platforms[selected('platform')];
  const base = platform.memory[selected('memory')];
  const extra = storage[selected('storage')];
  const gpu = gpus[selected('gpu')];
  const items = [base, extra, gpu].filter(item => item.price > 0);
  return { platform, base, extra, gpu, items, ready: items.every(item => item.id) };
}

function update() {
  const { platform, base, extra, gpu, items, ready } = selection();
  document.querySelector('#total').value = money(items.reduce((sum, item) => sum + cost(item), 0));
  const specs = {
    platform: `${platform.name} / ${platform.pcie}`,
    cpu: `32 core ${platform.cpu}, water cooled`,
    memory: `${base.gb} GB ${platform.ddr}`,
    storage: '1 TB boot SSD' + (extra.price ? ` + ${extra.drives}` : ''),
    networking: platform.networking,
    gpu: gpu.name + (gpu.ram ? `, ${gpu.ram * (gpu.quantity || 1)} GB VRAM` : ''),
  };
  for (const [name, value] of Object.entries(specs)) {
    document.querySelector(`#spec-${name}`).textContent = value;
  }
  checkout.disabled = !ready;
  document.querySelector('#checkout-note').hidden = ready;
}

form.addEventListener('change', event => {
  if (event.target.name === 'platform') {
    renderMemory();
    renderGallery();
  }
  update();
});
form.addEventListener('submit', event => {
  event.preventDefault();
  const { items, ready } = selection();
  if (ready) {
    const cart = items.map(item => `${item.id}:${item.quantity || 1}`).join(',');
    window.location.assign(`${shop}/cart/${cart}`);
  }
});
renderMemory();
update();
form.hidden = false;

const views = {
  front: 'Front view',
  'three-quarter': 'Three-quarter view',
  side: 'Side view',
  back: 'Rear view',
  inside: 'Empty side view',
  rtx5090: 'Interior with 2× RTX 5090',
  rx9070xt: 'Interior with 4× 9070XT',
};
// Exterior shots are shared. Rear and interior shots match the platform.
const platformViews = [
  { back: 'back-g4', inside: 'inside', gpu: 'rtx5090' }, // SP4 / G4
  { back: 'back', inside: 'inside-g5', gpu: 'rx9070xt' }, // SP5 / G5
];
let currentView = 'front';
const viewButtons = document.querySelectorAll('[data-view]');
async function renderGallery() {
  const platform = selected('platform');
  const activeView = currentView;
  for (const button of viewButtons) {
    const view = button.dataset.view;
    const name = platformViews[platform][view] || view;
    const src = `assets/tinybox/${name}.webp`;
    const thumbnail = button.querySelector('img');
    if (thumbnail.getAttribute('src') !== src) thumbnail.src = src;
    button.setAttribute('aria-label', views[name] || views[view]);
    button.setAttribute('aria-pressed', String(view === activeView));
  }
  const name = platformViews[platform][activeView] || activeView;
  const image = new Image();
  image.decoding = 'async';
  image.src = `assets/tinybox/${name}.webp`;
  // Decode only the selected photo, keeping the previous one visible until ready.
  try {
    await image.decode();
  } catch {
    return;
  }
  if (platform !== selected('platform') || activeView !== currentView) return;
  const photo = document.querySelector('#product-photo');
  const caption = views[name] || views[activeView];
  if (photo.src !== image.src) photo.src = image.src;
  photo.alt = `The new tinybox ${platforms[platform].name} — ${caption}`;
  document.querySelector('#photo-caption').textContent = caption;
}
viewButtons.forEach(button => {
  button.addEventListener('click', () => {
    currentView = button.dataset.view;
    renderGallery();
  });
});
renderGallery();
