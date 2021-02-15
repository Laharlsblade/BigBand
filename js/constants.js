
const directions = [
    'up_',
    'down_',
    ''
];

const soundNames = [
    'HP',
    'LP+MP+HP',
    'LP+HP',
    'MP+HP',
    'LP+MP',
    'LP',
    'MP',
    'HK',
    'MK+HK',
    'LK+MK',
    'LK',
    'MK'
];

const defaultKeyboardControls = {
    version: 1.0,
    up: {
        code: 87,
        label: 'W'
    },
    down: {
        code: 83,
        label: 'S'
    },
    lp: {
        code: 100,
        label: 'Numpad 4'
    },
    mp: {
        code: 101,
        label: 'Numpad 5'
    },
    hp: {
        code: 102,
        label: 'Numpad 6'
    },
    lk: {
        code: 97,
        label: 'Numpad 1'
    },
    mk: {
        code: 98,
        label: 'Numpad 2'
    },
    hk: {
        code: 99,
        label: 'Numpad 3'
    },
};

const defaultGamepadControls = {
    version: 1,
    up: {
        code: "gp12",
        label: "Gamepad 12"
    },
    down: {
        code: "gp13",
        label: "Gamepad 13"
    },
    lp: {
        code: "gp2",
        label: "Gamepad 2"
    },
    mp: {
        code: "gp3", 
        label: "Gamepad 3"
    },
    hp: {
        code: "gp5",
        label: "Gamepad 5"
    },
    lk: {
        code: "gp0",
        label: "Gamepad 0"
    },
    mk: {
        code: "gp1",
        label: "Gamepad 1"
    },
    hk: {
        code: "gp7",
        label: "Gamepad 7"
    }
}

export {
    directions,
    soundNames,
    defaultKeyboardControls,
    defaultGamepadControls,
}