const rgba = (r, g, b, a) => ({ r, g, b, a });
let options = {
	width: 350,
	height: 19,
	border: {
		color: rgba(255, 0, 0, 1),
		width: 1
	},
	diagStripes: {
		color: rgba(0, 0, 0, 255),
		spacing: 20,
		onMainDiagonal: false
	}, // can be null
	diagStripesV2: {
		color: rgba(0, 0, 0, 40),
		spacing: 4
	}, // can be null
	text: {
		value: 'hello world',
		size: 10,
		stroke: {
			width: 2.5,
			color: rgba(0, 0, 0, 1),
		},
		color: rgba(255, 255, 255, 1),
		x: 275,
		y: 12
	},
	gradientType: 'linear',
	gradients: [ // position min 0.0 max 1.0
	],
	gradientDirection: 'to-right',
	backgroundImage: {
		src: null,
		width: 350,
		height: 0,
		x: 0,
		y: -220
	}, // can be null
	icon: {
		// src: '',
		x: 10,
		y: 0,
		width: 20,
		height: 20,
		angle: 0.0
	} // can be null
};

const updateOptions = (newOpts) => {
	const opts = {...options};

	options = {...opts, ...newOpts};

	createUserbar('#userbar', options);
};

(async () => {
	await document.fonts.ready;
	createUserbar('#userbar', options);
})();