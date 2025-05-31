const rgba2str = (rgba) => `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a || 1})`;

const drawDiagStripes = (canvas, ctx, { color, onMainDiagonal, spacing }) => {
	ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`;
	for (let x = 0; x < canvas.width; x++) {
		for (let y = 0; y < canvas.height; y++) {
			const offset = onMainDiagonal ? x - y : x + y;
			if (offset % spacing === 0) {
				ctx.fillRect(x, y, 1, 1);
			}
		}
	}
};

const drawText = (ctx, options) => {
	ctx.font = `${options.size}px VISITOR`;

	if (options.stroke) {
		ctx.strokeStyle = rgba2str(options.stroke.color);
		ctx.lineWidth = options.stroke.width;
		ctx.strokeText(options.value, options.x, options.y);
	}

	ctx.fillStyle = rgba2str(options.color);
	ctx.fillText(options.value, options.x, options.y);
};

const loadImage = (src) => {
	return new Promise((resolve) => {
		const image = new Image();

		image.src = src;

		image.onload = () => resolve(image);
	});
};

async function createUserbar(selector, options) {
	const canvas = document.querySelector(selector);
	const ctx = canvas.getContext('2d');

	canvas.width = options.width;
	canvas.height = options.height;

	document.fonts.add(await (new FontFace('Visitor', 'url(assets/fonts/visitor.ttf)')).load());

	ctx.textRendering = 'geometricPrecision';

	ctx.fillRect(0, 0, canvas.width, canvas.height);

	if (options.gradients) {
		options.gradients.sort((a, b) => a.position - b.position);

		let gradient;
		if (options.gradientType === 'linear') {
			let x0, y0, x1, y1;
			switch (options.gradientDirection) {
				case 'to-right':
					[x0, y0, x1, y1] = [0, 0, canvas.width, 0];
					break;
				case 'to-bottom':
					[x0, y0, x1, y1] = [0, 0, 0, canvas.height];
					break;
				case 'to-left':
					[x0, y0, x1, y1] = [canvas.width, 0, 0, 0];
					break;
				case 'to-top':
					[x0, y0, x1, y1] = [0, canvas.height, 0, 0];
					break;
				default:
					[x0, y0, x1, y1] = [0, 0, canvas.width, 0];
			}
			gradient = ctx.createLinearGradient(x0, y0, x1, y1);
		} else {
			gradient = ctx.createRadialGradient(
				canvas.width / 2, canvas.height / 2, 0,
				canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 2
			);
		}

		options.gradients.forEach(stop => {
			gradient.addColorStop(stop.position, rgba2str(stop.color));
		});

		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}

	if (options.diagStripes) drawDiagStripes(canvas, ctx, options.diagStripes);
	if (options.diagStripesV2) {
		drawDiagStripes(canvas, ctx, { ...options.diagStripesV2, onMainDiagonal: false });
		drawDiagStripes(canvas, ctx, { ...options.diagStripesV2, onMainDiagonal: true });
	}

	if (options.backgroundImage && options.backgroundImage.src) {
		const image = await loadImage(options.backgroundImage.src);
		ctx.drawImage(image, options.backgroundImage.x, options.backgroundImage.y, options.backgroundImage.width || image.width, options.backgroundImage.height || image.height);
	}
	if (options.icon && options.icon.src) {
		const image = await loadImage(options.icon.src);

		ctx.save();
		const centerX = options.icon.x + options.icon.width / 2;
		const centerY = options.icon.y + options.icon.height / 2;

		ctx.translate(centerX, centerY);
		ctx.rotate((options.icon.angle * Math.PI) / 180);

		ctx.drawImage(image, -options.icon.width / 2, -options.icon.height / 2, options.icon.width, options.icon.height);
		ctx.restore();
	}

	ctx.beginPath();
	ctx.ellipse(canvas.width / 2, 0, canvas.width / 2, canvas.height / 2, 0, 0, Math.PI * 2);
	ctx.fillStyle = `rgba(255, 255, 255, 0.4)`;
	ctx.fill();

	if (options.border.width > 0) {
		ctx.strokeStyle = rgba2str(options.border.color);
		ctx.lineWidth = options.border.width;
		ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
	}

	drawText(ctx, options.text);

	window.userbarSave = () => {
		const imageDataURL = canvas.toDataURL('image/png');
		const downloadLink = document.createElement('a');

		downloadLink.href = imageDataURL;

		downloadLink.download = `ub-${options.text.value.trim().replace(/\s+/g, '_')}.png`;

		document.body.appendChild(downloadLink);
		downloadLink.click();

		document.body.removeChild(downloadLink);
	}
}