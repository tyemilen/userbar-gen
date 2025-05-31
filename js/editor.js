const rgbaToCss = ({ r, g, b, a }) => `rgba(${r}, ${g}, ${b}, ${a})`;

const hexToRgba = (hex, alpha = 1) => {
	const parse = (start, len) => parseInt(hex.substring(start, start + len), 16);
	let [r, g, b] = hex.length === 4 ? [1, 2, 3].map(i => parse(i, 1) * 17) : [1, 3, 5].map(i => parse(i, 2));
	return { r, g, b, a: alpha };
};

const rgbaToHex = (rgba) => {
	if (!rgba || typeof rgba.r === 'undefined') return '#000000';
	const toHex = c => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0');
	return `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}`;
};

function createEditor(leftContainerId, rightContainerId, optionsObj, onChangeCallback) {
	const [leftContainer, rightContainer] = [leftContainerId, rightContainerId].map(id => document.getElementById(id));
	leftContainer.classList.add('editor-container');
	rightContainer.classList.add('editor-container');
	leftContainer.innerHTML = '';
	rightContainer.innerHTML = '';

	const triggerChange = () => onChangeCallback(optionsObj);
	const getNested = (obj, path) => path.split('.').reduce((acc, part) => acc?.[isNaN(parseInt(part)) ? part : parseInt(part)], obj);
	const setNested = (obj, path, value) => {
		const parts = path.split('.');
		let current = obj;
		for (let i = 0; i < parts.length - 1; i++) {
			const part = isNaN(parseInt(parts[i])) ? parts[i] : parseInt(parts[i]);
			if (current[part] === null || typeof current[part] !== 'object') {
				current[part] = {};
			}
			current = current[part];
		}
		const lastPart = isNaN(parseInt(parts.at(-1))) ? parts.at(-1) : parseInt(parts.at(-1));
		current[lastPart] = value;
	};

	const updateOption = (path, value) => {
		setNested(optionsObj, path, value);
		triggerChange();
		const inputEl = document.querySelector(`[data-path="${path}"]`);
		if (inputEl) {
			if (inputEl.type === 'color' && typeof value === 'object' && 'r' in value) {
				inputEl.value = rgbaToHex(value);
			} else if (inputEl.type === 'checkbox') {
				inputEl.checked = value;
			} else if (inputEl.type !== 'file') {
				inputEl.value = value;
			}
		}
	};

	const createEl = (tag, classes = [], text = '', attributes = {}, eventListeners = {}) => {
		const el = document.createElement(tag);
		el.classList.add(...classes);
		if (text) el.textContent = text;
		Object.entries(attributes).forEach(([attr, val]) => val ? el.setAttribute(attr, val) : undefined);
		Object.entries(eventListeners).forEach(([eventName, handler]) => el.addEventListener(eventName, handler));
		return el;
	};

	const createInput = (label, type, value, path, attributes = {}) => {
		const div = createEl('div', ['editor-field']);
		if (label) div.append(createEl('label', [], label));
		const inputEl = createEl('input', [], '', { type, 'data-path': path, ...attributes });

		if (type === 'color') {
			inputEl.value = rgbaToHex(value);
			inputEl.oninput = (e) => {
				const currentAlpha = getNested(optionsObj, path)?.a ?? 1;
				updateOption(path, hexToRgba(e.target.value, currentAlpha));
			};
		} else if (type === 'file') {
			inputEl.onchange = async (e) => {
				updateOption(path, e.target.files[0] ? await new Promise(res => {
					const r = new FileReader();
					r.onload = (le) => res(le.target.result);
					r.readAsDataURL(e.target.files[0]);
				}) : '');
			};
			if (value) div.append(createEl('span', [], ` (Current: ${value.startsWith('data:') ? 'Data URL' : value.split('/').pop()})`));
		} else {
			inputEl.value = value;
			if (type === 'checkbox') inputEl.checked = value;
			inputEl.oninput = (e) => updateOption(path, type === 'number' ? parseFloat(e.target.value) : type === 'checkbox' ? e.target.checked : e.target.value);
		}
		div.append(inputEl);
		return div;
	};

	const createSelect = (label, value, path, optionsArray) => {
		const div = createEl('div', ['editor-field']);
		div.append(createEl('label', [], label));
		const selectEl = createEl('select', [], '', { 'data-path': path });
		optionsArray.forEach(opt => selectEl.append(createEl('option', [], opt, { value: opt, selected: opt === value })));
		selectEl.addEventListener('change', (e) => updateOption(path, e.target.value));
		div.append(selectEl);
		return div;
	};

	const createSection = (title, parentElement, optionPath = null, defaultValue = null, initialVisibility = true) => {
		const sectionDiv = createEl('div', ['editor-section']);
		const sectionHeader = createEl('h3', [], title);
		const contentDiv = createEl('div', ['section-content']);
		sectionDiv.append(sectionHeader, contentDiv);
		parentElement.append(sectionDiv);
		if (!initialVisibility) {
			sectionDiv.classList.add('collapsed');
		}

		sectionHeader.addEventListener('click', () => {
			sectionDiv.classList.toggle('collapsed');
		});

		if (optionPath) {
			const button = createEl('button', ['option-toggle-btn']);
			sectionHeader.append(button);

			const updateBtn = () => {
				const pathValue = getNested(optionsObj, optionPath);
				const isEnabled = pathValue !== null && pathValue !== undefined;
				button.textContent = isEnabled ? 'DISABLE' : 'ENABLE';
				contentDiv.style.display = isEnabled ? '' : 'none';

				button.onclick = (e) => {
					e.stopPropagation();
					const newPathValue = isEnabled ? null : defaultValue;
					setNested(optionsObj, optionPath, newPathValue);
					triggerChange();
					updateBtn();
				};
			};
			updateBtn();
		}
		return contentDiv;
	};

	let gradientsContainerEl;

	const createGradientStopElement = (gradient, index, container) => {
		const path = `gradients.${index}`;
		const group = createEl('div', ['gradient-item'], '', { 'data-gradient-index': index });

		const positionInput = createInput('Position', 'range', gradient.position, `${path}.position`, { min: 0, max: 1, step: 0.001 });
		const colorInput = createInput('Color', 'color', gradient.color, `${path}.color`);

		const removeButton = createEl('button', ['remove-gradient-btn'], `Remove Stop ${index + 1}`);
		removeButton.addEventListener('click', (e) => {
			e.stopPropagation();
			optionsObj.gradients.splice(index, 1);
			renderGradients(container);
			triggerChange();
		});

		group.append(positionInput, colorInput, removeButton);
		return group;
	};

	const renderGradients = (container) => {
		gradientsContainerEl = container;
		gradientsContainerEl.innerHTML = '';

		optionsObj.gradients = optionsObj.gradients || [];

		if (optionsObj.gradients.length === 0) {
			gradientsContainerEl.append(createEl('p', [], 'No gradient stops.'));
		} else {
			optionsObj.gradients.forEach((gradient, index) => {
				const gradientEl = createGradientStopElement(gradient, index, container);
				gradientsContainerEl.append(gradientEl);
			});
		}

		const addGradientButton = createEl('button', ['add-gradient-btn'], 'Add New Gradient Stop');
		addGradientButton.addEventListener('click', (e) => {
			e.stopPropagation();
			optionsObj.gradients.push({ position: 0.5, color: { r: 128, g: 128, b: 128, a: 1 } });
			renderGradients(gradientsContainerEl);
			triggerChange();
		});
		gradientsContainerEl.append(addGradientButton);
	};

	const render = () => {
		const dimensionsSectionContent = createSection('✩ Dimensions', leftContainer);

		dimensionsSectionContent.appendChild(createInput('Width', 'number', optionsObj.width, 'width'));
		dimensionsSectionContent.appendChild(createInput('Height', 'number', optionsObj.height, 'height'));

		const borderSectionContent = createSection('✩ Border', leftContainer);
		borderSectionContent.appendChild(createInput('Color', 'color', optionsObj.border.color, 'border.color'));
		borderSectionContent.appendChild(createInput('Width', 'number', optionsObj.border.width, 'border.width'));

		const diagStripesSectionContent = createSection('✩ Background lines', leftContainer, 'diagStripes', { color: { r: 0, g: 0, b: 0, a: 255 }, spacing: 20, onMainDiagonal: false });
		if (optionsObj.diagStripes) {
			diagStripesSectionContent.appendChild(createInput('Color', 'color', optionsObj.diagStripes.color, 'diagStripes.color'));
			diagStripesSectionContent.appendChild(createInput('Spacing', 'number', optionsObj.diagStripes.spacing, 'diagStripes.spacing'));
			diagStripesSectionContent.appendChild(createInput('On Main Diagonal', 'checkbox', optionsObj.diagStripes.onMainDiagonal, 'diagStripes.onMainDiagonal'));
		}

		const diagStripesV2SectionContent = createSection('✩ Background grid', leftContainer, 'diagStripesV2', { color: { r: 0, g: 0, b: 0, a: 40 }, spacing: 4 });
		if (optionsObj.diagStripesV2) {
			diagStripesV2SectionContent.appendChild(createInput('Color', 'color', optionsObj.diagStripesV2.color, 'diagStripesV2.color'));
			diagStripesV2SectionContent.appendChild(createInput('Spacing', 'number', optionsObj.diagStripesV2.spacing, 'diagStripesV2.spacing'));
		}

		const textSectionContent = createSection('✩ Text', rightContainer);
		textSectionContent.appendChild(createInput('Value', 'text', optionsObj.text.value, 'text.value'));
		textSectionContent.appendChild(createInput('Size', 'number', optionsObj.text.size, 'text.size'));
		textSectionContent.appendChild(createInput('Color', 'color', optionsObj.text.color, 'text.color'));
		textSectionContent.appendChild(createInput('X Position', 'number', optionsObj.text.x, 'text.x'));
		textSectionContent.appendChild(createInput('Y Position', 'number', optionsObj.text.y, 'text.y'));

		const textStrokeContent = createSection('✩ Text Stroke', textSectionContent, 'text.stroke', { width: 1, color: 'black' });
		if (optionsObj.text.stroke) {
			textStrokeContent.appendChild(createInput('Width', 'number', optionsObj.text.stroke.width, 'text.stroke.width', { step: 0.1 }));
			textStrokeContent.appendChild(createInput('Color', 'color', optionsObj.text.stroke.color, 'text.stroke.color'));
		}

		const gradientsSectionContent = createSection('✩ Gradients', rightContainer);
		gradientsSectionContent.appendChild(createSelect('Direction', optionsObj.gradientDirection, 'gradientDirection', ['to-right', 'to-left', 'to-top', 'to-bottom']));

		const gradientListContainer = document.createElement('div');
		gradientListContainer.classList.add('gradient-list');
		gradientsSectionContent.appendChild(gradientListContainer);
		renderGradients(gradientListContainer);

		const backgroundImageSectionContent = createSection('✩ Background Image', rightContainer, 'backgroundImage', { src: '', width: 350, height: 0, x: 0, y: 0 });
		if (optionsObj.backgroundImage) {
			backgroundImageSectionContent.appendChild(createInput('', 'file', optionsObj.backgroundImage.src, 'backgroundImage.src', { accept: 'image/*' }));
			backgroundImageSectionContent.appendChild(createInput('Width', 'number', optionsObj.backgroundImage.width, 'backgroundImage.width'));
			backgroundImageSectionContent.appendChild(createInput('Height', 'number', optionsObj.backgroundImage.height, 'backgroundImage.height'));
			backgroundImageSectionContent.appendChild(createInput('X Position', 'number', optionsObj.backgroundImage.x, 'backgroundImage.x'));
			backgroundImageSectionContent.appendChild(createInput('Y Position', 'number', optionsObj.backgroundImage.y, 'backgroundImage.y'));
		}

		// const logoSectionContent = createSection('Logo', rightContainer, 'logo', { src: '', x: 0, angle: 0 });
		// if (optionsObj.logo) {
		// 	logoSectionContent.appendChild(createInput('', 'file', optionsObj.logo.src || '', 'logo.src', { accept: 'image/*' }));
		// 	logoSectionContent.appendChild(createInput('X Position', 'number', optionsObj.logo.x, 'logo.x'));
		// 	logoSectionContent.appendChild(createInput('Angle', 'number', optionsObj.logo.angle, 'logo.angle', { step: 0.1 }));
		// }
	}

	render();
	triggerChange();
}