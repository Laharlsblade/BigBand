

import { directions, soundNames, defaultKeyboardControls, defaultGamepadControls } from './js/constants.js';

const sounds = {};

let metaControls = {
    restartSong: {
        code: 82,
        label: 'R'
    }
}

let controls = {};

let allDownKeyCodes = [];
let pressedButtonsLastFrame = [];
let prevGamepadStates = [];

let disabledGamepads = [];

let gamepadItemsToAdd = [];

let currentSong = null;
let songNoteIndex = 0;

let controlListener = null;

let allSoundsLoaded = false;

let soundToPlay = '';

let pressedCombinationLastFrame = '';
let recentSound = '';

let frameDelay = 0;
let currentDelay = 0;

let buttonIcons = {};
let settingsElm;
let settingsList;
let loadingElm;
let songCollapseButton;
let songAreaElm;
let startSongButton;
let stopSongButton;
let songAssistSettingsElm;
let repeatSongCheckbox;

let settingsOpen = false;
let songAreaCollapsed = false;

let darkMode = true;
let debugEnabled = false;
let repeatSong = false;


function loadSettings() {

    let storedControls = localStorage.getItem('controls');

    if(storedControls) {
        controls = JSON.parse(storedControls);
    } else {
        resetControlsToDefault();
    }

    let storedMetaControls = localStorage.getItem('metaControls');

    if(storedMetaControls) {
        metaControls = JSON.parse(storedMetaControls);
    }

    let storedDarkMode = localStorage.getItem('darkMode');

    if(storedDarkMode) {
        darkMode = storedDarkMode === 'true';
    }

    debugEnabled = localStorage.getItem('debug') === 'true';

    songAreaCollapsed = localStorage.getItem('songCollapsed') === 'true';

    repeatSong = localStorage.getItem('repeatSong') === 'true';

    if(document.body) {
        if(!darkMode) {
            document.body.classList.remove('dark');
            document.getElementById('dark-mode-input').checked = false;
        } else {
            document.getElementById('dark-mode-input').checked = true;
        }

        if(debugEnabled) {
            document.getElementById('debug-input').checked = true;
        } else {
            document.getElementById('debug-input').checked = false;
        }

        if(songAreaCollapsed) {
            songAreaCollapsed = false;
            toggleSongArea();
        }

        if(repeatSong) {
            repeatSong = false;
            toggleRepeatSong();
        }

        if(startSongButton) {
            startSongButton.innerText = `Start (${metaControls.restartSong.label})`
        } else {
            startSongButton = document.getElementById('start-song');
            startSongButton.innerText = `Start (${metaControls.restartSong.label})`
        }
    }
}

async function loadSounds() {
    
    let promises = [];

    directions.forEach(dir => {
        
        soundNames.forEach(sound => {

            let promise = new Promise((resolve, reject) => {

                try {
                    let audio = new Audio(`sounds/${dir}${sound}.mp3`);
        
                    sounds[dir + sound] = audio;

                    resolve();
                } catch(e) {
                    console.warn(e);
                    reject(e);
                }
            });

            promises.push(promise);
        });

    });

    await Promise.all(promises);

    allSoundsLoaded = true;
    if(loadingElm) {
        loadingElm.classList.remove('open');
    }
}

loadSounds();
loadSettings();

window.onload = () => {
    let labels = Array.from(document.getElementsByTagName('button'));

    labels.forEach(label => {
        let { innerText } = label; 
        Object.keys(defaultKeyboardControls).forEach(button => {
            if(innerText === defaultKeyboardControls[button].label) {
                label.innerText = controls[button].label;
            }
        });

        label.addEventListener('focus', ev => label.blur());
    });

    let inputs = Array.from(document.getElementsByTagName('input'));
    
    inputs.forEach(input => input.addEventListener('focus', ev => input.blur()));

    settingsElm = document.getElementById('settings');

    songCollapseButton = document.getElementById('song-collapse');
    songAreaElm = document.getElementById('song-area');
    songAssistSettingsElm = document.getElementById('song-assist-settings');
    startSongButton = document.getElementById('start-song');
    stopSongButton = document.getElementById('stop-song');
    repeatSongCheckbox = document.getElementById('repeat-song-input');

    if(!darkMode) {
        document.body.classList.remove('dark');
        document.getElementById('dark-mode-input').checked = false;
    } else {
        document.getElementById('dark-mode-input').checked = true;
    }

    if(debugEnabled) {
        document.getElementById('debug-input').checked = true;
    } else {
        document.getElementById('debug-input').checked = false;
    }

    if(songAreaCollapsed) {
        songAreaCollapsed = false;
        toggleSongArea();
    }

    repeatSongCheckbox.checked = repeatSong;
    

    settingsList = document.getElementById('settings-list');

    gamepadItemsToAdd.forEach(item => settingsList.appendChild(item));

    startSongButton.innerText = `Start (${metaControls.restartSong.label})`

    if(!allSoundsLoaded) {
        loadingElm = document.getElementById('loading');
    }

    ['UP', 'DOWN', 'LP', 'MP', 'HP', 'LK', 'MK', 'HK'].forEach(button => {
        buttonIcons[button] = document.getElementById(button);
    });
};

window.addEventListener('keydown', ev => {

    if(controlListener) return;

    Object.keys(metaControls).forEach(control => {
        if(metaControls[control].code === ev.keyCode) {
            switch(control) {
                case 'restartSong': {
                    startUserSong();
                    break;
                }
            }
        }
    });

    if(allDownKeyCodes.indexOf(ev.keyCode) === -1) {
        allDownKeyCodes.push(ev.keyCode);

        debug(`Added ${ev.keyCode} to allDownKeyCodes. K: ${ev.key} C: ${ev.code}`);
    }
    
});

window.addEventListener('keyup', ev => {

    if(allDownKeyCodes.indexOf(ev.keyCode) !== -1) {
        allDownKeyCodes.splice(allDownKeyCodes.indexOf(ev.keyCode), 1);

        debug(`Removed ${ev.keyCode} from allDownKeyCodes. K: ${ev.key} C: ${ev.code}`);
    }

});

window.addEventListener('click', ev => {
    if(!ev.onSettings && settingsOpen) {
        toggleSettings();
    }
});

window.addEventListener('gamepadconnected', ev => {
    let { gamepad } = ev;

    let shouldDisable = localStorage.getItem(`disable_${gamepad.id}`) === 'true';

    prevGamepadStates[gamepad.index] = stringifyGamepad(gamepad);
    disabledGamepads[gamepad.index] = shouldDisable;

    let item = document.createElement('div');
    item.classList.add('settings-item');
    
    let input = document.createElement('input');
    input.setAttribute('type', 'checkbox');
    input.id = `gamepad${gamepad.index}`;
    input.checked = !shouldDisable;

    let label = document.createElement('label');
    label.setAttribute('for', `gamepad${gamepad.index}`);
    label.innerText = gamepad.id;
    label.style.marginLeft = '5px';

    item.appendChild(input);
    item.appendChild(label);

    input.addEventListener('input', ev => {
        let { index } = gamepad;
        
        disabledGamepads[index] = !disabledGamepads[index];

        localStorage.setItem(`disable_${gamepad.id}`, disabledGamepads[index]);
    });

    input.addEventListener('focus', ev => input.blur());

    if(settingsList) {
        settingsList.appendChild(item);
    } else {
        gamepadItemsToAdd.push(item);
    }

    debug(`Gamepad "${ev.gamepad.id}" connected.`);
});

function stringifyGamepad(gp) {
    let gpObj = {
        axes: gp.axes,
        buttons: [],
    };

    gp.buttons.forEach(button => {
        gpObj.buttons.push({
            pressed: button.pressed,
            touched: button.touched,
            value: button.value,
        });
    });

    return JSON.stringify(gpObj);
}

const inputCheck = setInterval(() => {
    
    let pressedButtons = [];
    let changedControl = false;

    Array.from(navigator.getGamepads()).forEach(gp => {
        if(!gp) return;
        if(disabledGamepads[gp.index]) return;

        let prevGPString = prevGamepadStates[gp.index];
        let prevGP = JSON.parse(prevGPString);

        if(stringifyGamepad(gp) !== prevGPString) {
            let pressedIndexes =  [];
            let pressedDirections = [];

            gp.buttons.forEach((button, i) => {
                let prevButton = prevGP.buttons[i]
                if(button.pressed && !prevButton.pressed) {
                    pressedIndexes.push(i);

                    debug(`Button ${i} has been pressed on gamepad "${gp.id}"`)

                    if(button.pressed && allDownKeyCodes.indexOf('gp' + i) === -1 && !controlListener) {
                        debug(`Added ${'gp' + i} to allDownKeyCodes.`);
                        allDownKeyCodes.push('gp' + i);
                    }
                } else if(!button.pressed && prevButton.pressed) {
                    // any uses for this?
                }

                if(!button.pressed && allDownKeyCodes.indexOf('gp' + i) !== -1) {
                    debug(`Removed ${'gp' + i} from allDownKeyCodes.`);
                    allDownKeyCodes.splice(allDownKeyCodes.indexOf('gp' + i), 1);
                }
            });

            gp.axes.forEach((axis, i) => {
                let prevAxis = prevGP.axes[i];

                let axisLetter = i % 2 ? 'Y' : 'X';
                let axisNumber = Math.floor(i / 2);
                
                if(axis >= 0.5 && prevAxis < 0.5) {
                    pressedDirections.push(i + 1);

                    debug(`Axis ${i} is now positive on gamepad "${gp.id}"`)

                    let keyCode = `gpa${axisNumber}+${axisLetter}`

                    if(allDownKeyCodes.indexOf(keyCode) === -1 && !controlListener) {
                        allDownKeyCodes.push(keyCode);

                        debug(`Added ${keyCode} to allDownKeyCodes.`)
                    }
                } else if(axis <= -0.5 && prevAxis > -0.5) {
                    pressedDirections.push(-i - 1);
                    
                    debug(`Axis ${i} is now negative on gamepad "${gp.id}"`)

                    let keyCode = `gpa${axisNumber}-${axisLetter}`;

                    if(allDownKeyCodes.indexOf(keyCode) === -1 && !controlListener) {
                        allDownKeyCodes.push(keyCode);

                        debug(`Added ${keyCode} to allDownKeyCodes.`)
                    }
                }

                if(axis < 0.5) {
                    let keyCode = `gpa${axisNumber}+${axisLetter}`;
                    if(allDownKeyCodes.indexOf(keyCode) !== -1) {
                        allDownKeyCodes.splice(allDownKeyCodes.indexOf(keyCode), 1);

                        debug(`Removed ${keyCode} from allDownKeyCodes.`)
                    }
                }
                if(axis > -0.5) {
                    let keyCode = `gpa${axisNumber}-${axisLetter}`;
                    if(allDownKeyCodes.indexOf(keyCode) !== -1) {
                        allDownKeyCodes.splice(allDownKeyCodes.indexOf(keyCode), 1);
                        
                        debug(`Removed ${keyCode} from allDownKeyCodes.`)
                    }
                }
            });

            if(controlListener) {
        
                if(pressedIndexes.length + pressedDirections.length !== 1) { 
                    prevGamepadStates[gp.index] = stringifyGamepad(gp);
                    return;
                }

                let code, keyCode;

                if(pressedIndexes.length) {
                    code = 'Gamepad ' + pressedIndexes[0];
                    keyCode = 'gp' + pressedIndexes[0];
                } else {
                    let index = pressedDirections[0];
                    let absIndex = Math.abs(index) - 1;

                    let sign = index > 0 ? '+' : '-';
                    let axisLetter = absIndex % 2 ? 'Y' : 'X';
                    code = `Gamepad Joystick ${Math.floor(absIndex / 2)} ${sign + axisLetter}`;
                    keyCode = `gpa${Math.floor(absIndex / 2)}${sign + axisLetter}`;
                }
        
                controlListener({
                    key: '',
                    code,
                    keyCode
                });

                changedControl = true;
            }
        }

        prevGamepadStates[gp.index] = stringifyGamepad(gp);
    });

    if(changedControl) return;

    Object.keys(controls).forEach(button => {

        if(button === 'version') return;

        let code = controls[button].code;

        if(allDownKeyCodes.indexOf(code) !== -1) {

            pressedButtons.push(button.toUpperCase());

        }
    });

    let combination = '';

    if(pressedButtons.length > 0) {

        if(pressedButtons.length > 1) {
            let numAttackButtonsPressed = pressedButtons.length;
            let direction = 0;

            if(pressedButtons.indexOf('UP') !== -1) {
                direction++;
                numAttackButtonsPressed--;
            }

            if(pressedButtons.indexOf('DOWN') !== -1) {
                direction--;
                numAttackButtonsPressed--;
            }

            if(!numAttackButtonsPressed) {
                pressedCombinationLastFrame = '';
                return;
            }

            if(direction > 0) combination = 'up_';
            if(direction < 0) combination = 'down_';

            let notFirstButton = false;

            pressedButtons.sort((a, b) => {
                return Object.keys(controls).indexOf(a.toLowerCase()) - 
                       Object.keys(controls).indexOf(b.toLowerCase());
            }).forEach(fButton => {
                if(fButton !== 'UP' && fButton !== 'DOWN') {
                    combination += notFirstButton ? '+' + fButton : fButton;
                    notFirstButton = true;
                }
            });

        } else {

            let pressedButton = pressedButtons[0];

            if(pressedButton !== 'UP' && pressedButton !== 'DOWN') {
                combination = pressedButton;
            }
        }

        if(combination !== pressedCombinationLastFrame) {

            debug(`New button combination is "${combination}"`);

            if(!allSoundsLoaded && loadingElm) {
                loadingElm.classList.add('open');
                return;
            }

            let soundPlayed = false;

            pressedButtons.forEach(button => {
                if(button === 'UP' || button === 'DOWN' || soundPlayed) return;

                if(pressedButtonsLastFrame.indexOf(button) === -1) {

                    if(combination.indexOf('P') !== -1 && combination.indexOf('K') !== -1) {
                        combination = combination.slice(0, combination.indexOf('K') - 2);
                    }

                    if(frameDelay > 0) {
                        soundToPlay = combination;
                        currentDelay = 0;
                    } else {
                        stopAllSounds();
                        playSound(combination);
                    }

                    soundPlayed = true;

                }
            });
        } else {
            if(soundToPlay && frameDelay > 0) {
                currentDelay++;

                if(currentDelay >= frameDelay) {
                    stopAllSounds();
                    playSound(soundToPlay);
                    soundToPlay = '';
                    currentDelay = 0;
                }
            }
        }
    }
    
    Object.keys(sounds).forEach(sound => {
        if(sound !== recentSound && !sounds[sound].paused) {
            sounds[sound].volume /= 2;
        }
    });

    pressedCombinationLastFrame = combination;
    pressedButtonsLastFrame = pressedButtons;

}, 16);

function playSound(sound) {
    debug(`Playing "${sound}"`);
    if(sound in sounds) {
        sounds[sound].currentTime = 0;
        sounds[sound].volume = 1;
        sounds[sound].play();
        recentSound = sound;

        if(currentSong) {
            if(sound === currentSong[songNoteIndex]) {
                songNoteIndex++;

                if(songNoteIndex === currentSong.length) {
                    if(repeatSong) {
                        startUserSong();
                    } else {
                        stopUserSong();
                    }
                } else {
                    highlightNote(currentSong[songNoteIndex]);
                }
            }
        }
    } else {
        debug(`Sound "${sound}" not found`);
    }
}

window.playSound = playSound;

function stopAllSounds() {
    recentSound = '';

    debug('Stopping all sounds.');

    // Don't know if I'm going to stick with the fade out for stopping sounds, gonna leave this around for a bit
    // Object.keys(sounds).forEach(sound => {
    //     let audio = sounds[sound];

    //     if(!audio.paused) {
    //         audio.pause();
    //         audio.currentTime = 0;
    //     }
    // });
}

window.stopAllSounds = stopAllSounds;

function changeControl(ev, button) {
    if(ev.clientX === 0 && ev.clientY === 0) return;
    
    const elm = ev.srcElement;

    const control = controls[button.toLowerCase()];

    if(controlListener) {
        controlListener({ keyCode: 27 });
    }

    elm.innerText = "...";

    debug(`Now listening for new control for button ${button}`);

    controlListener = ev => {

        if(ev.keyCode !== 27) {

            let allControls = Object.assign([], controls, metaControls);

            let allControlButtons = Object.keys(allControls);

            for(let i = 0; i < allControlButtons.length; i++) {

                if(allControls[allControlButtons[i]].code === ev.keyCode) {
                    if(allControlButtons[i] !== button.toLowerCase()) {

                        debug(`Key "${ev.code}" (${ev.keyCode}) already assigned to button ${allControlButtons[i].toUpperCase()}`);

                        return;
                    }
                }
            }

            control.code = ev.keyCode;

            let label = ev.key.toLocaleUpperCase();

            if(!label.trim()) {
                label = ev.code;
            }

            if(ev.code.toLocaleLowerCase().includes('numpad')) {
                label = 'Numpad ' + (/numpad(.+)/i).exec(ev.code)[1];
            }

            control.label = label;

            localStorage.setItem('controls', JSON.stringify(controls));

            debug(`Control for button ${button} set to ${label}`);

        } else {
            debug(`Reverting to previous control "${control.label}" for button ${button}`);
        }

        debug('No longer listening for new control.');

        elm.innerText = control.label;

        window.removeEventListener('keydown', controlListener);

        controlListener = null;

    }

    window.addEventListener('keydown', controlListener);
    
}

window.changeControl = changeControl;

function resetControlsToDefault(which) {

    let labels = Array.from(document.getElementsByTagName('button'));

    let defaultControls = which === 'gp' ? defaultGamepadControls : defaultKeyboardControls;

    labels.forEach(label => {
        let { innerText } = label; 
        Object.keys(defaultControls).forEach(button => {
            if(controls[button] && innerText === controls[button].label) {
                label.innerText = defaultControls[button].label;
            }
        })
    });
    
    controls = JSON.parse(JSON.stringify(defaultControls));
    
    localStorage.setItem('controls', JSON.stringify(controls));

    debug(`Reset controls to defaults for ${which === 'gp' ? 'gamepad' : 'keyboard'}.`);
}

window.resetControlsToDefault = resetControlsToDefault;

function toggleSettings() {
    if(!settingsOpen) {
        settingsElm.classList.add('open');
    } else {
        settingsElm.classList.remove('open');
    }
    
    settingsOpen = !settingsOpen;
}

window.toggleSettings = toggleSettings;

function toggleDarkMode() {

    if(!darkMode) {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }

    darkMode = !darkMode;
    
    localStorage.setItem('darkMode', darkMode);
}

window.toggleDarkMode = toggleDarkMode;

function highlight(buttons) {
    Object.keys(buttonIcons).forEach(button => {
        if(buttons.indexOf(button) === -1) {
            buttonIcons[button].classList.remove('highlighted');
        } else {
            buttonIcons[button].classList.add('highlighted');
        }
    })
}

function settingsClick(ev) {
    ev.onSettings = true
}

window.settingsClick = settingsClick;

function toggleDebug() {
    debugEnabled = !debugEnabled;

    localStorage.setItem('debug', debugEnabled);
}

window.toggleDebug = toggleDebug;

function debug(msg, type="log") {
    if(debugEnabled) {
        switch(type.toLowerCase()) {
            case 'log': {
                console.log(msg);
                break;
            }
            case 'warn': {
                console.warn(msg);
                break;
            }
            case 'err':
            case 'error': {
                console.error(msg);
                break;
            }
            case 'info': {
                console.info(msg);
                break;
            }
        }
    }
}

function parseSong(raw, delim=',') {
    return raw.split(delim).filter(n => n.trim()).map(userNote => {
        let sanitizedNote = userNote.toLocaleLowerCase();

        let note = '';

        if(sanitizedNote.indexOf('d') !== -1 || sanitizedNote.indexOf('2') !== -1) {
            note += 'down_';
        }
        if(sanitizedNote.indexOf('u') !== -1 || sanitizedNote.indexOf('8') !== -1) {
            note += 'up_';
        }

        if(note.length > 5) {
            console.warn(userNote, '- Confusing note, contains both "u" or "8" and "d" or "2"');
            return new Error(userNote + `: Contains characters for both up and down (either 8 or "u", or 2 or "d"). Unclear what direction is desired.`);
        }

        let firstButton = true;
        Object.keys(controls).forEach(button => {
        
            if(button === 'version' || button === 'up' || button === 'down') return;

            if(sanitizedNote.indexOf(button) !== -1) {
                if(firstButton) {
                    note += button.toUpperCase();
                    firstButton = false;
                } else {
                    note += `+${button.toUpperCase()}`;
                }
            }

        });

        if(sanitizedNote.indexOf('ppp') !== -1) {
            if(note.indexOf('P') !== -1) {
                console.warn(userNote, `- Confusing note, contains both "ppp" and additional punch inputs. ` +
                `Could write logic to fix this to just default to all 3 punches but how about you ` +
                `fix your shitty input instead`);
                return new Error(userNote + `: Contains "ppp" and additional punch inputs.`);
            }

            if(note.indexOf('K') !== -1) {
                note += '+LP+MP+HP';
            } else {
                note += 'LP+MP+HP';
            }
        }

        if(sanitizedNote.indexOf('kkk') !== -1) {
            console.warn(userNote, `- come on now, all three kicks isn't even a valid note`);
            return new Error(userNote + `: Come on now`);
        }

        if(note.indexOf('P') !== -1 && note.indexOf('K') !== -1) {

            console.warn(userNote, `- Can't have punches and kicks in the same note.  Well, you can, but ` + 
                         `in-game it will just play the note as if you're only pressing punch buttons. ` + 
                         `So I've stripped out the kick buttons from this note.`);

            note = note.slice(0, note.indexOf('K') - 2);
        }

        if(!note.length || (note.indexOf('P') === -1 && note.indexOf('K') === -1)) {
            console.warn(userNote, `- Couldn't find any buttons in this note`);

            return new Error(userNote + `: Could not find any punch or kick buttons in this section ` + 
                                        `that was between two separators, and so assumed to be a note.`)
        }

        return note;

    });
}

function startUserSong() {
    let song = parseSong(songAreaElm.value);

    let err = false;

    song.forEach(note => { if(note instanceof Error) err = true; });

    if(err) {
        alert(`nice song dumbass (you can open the console (ctrl+shift+I) to see the notes it's complaining about for now)`);
        return;
    }

    stopSongButton.disabled = false;

    playSong(song);
}

window.startUserSong = startUserSong;

function stopUserSong() {
    highlight([]);
    currentSong = null;

    stopSongButton.disabled = true;
}

window.stopUserSong = stopUserSong;

function playSong(song) {
    if(!song || !song.length) return;

    currentSong = song;
    songNoteIndex = 0;
    
    highlightNote(song[0]);
}

function highlightNote(note) {
    let parts = note.split('_');

    let buttons = [];
    let atkBtnStr = '';

    if(parts.length === 2) {
        buttons.push( parts[0][0] === 'u' ? 'UP' : 'DOWN' );

        atkBtnStr = parts[1];
    } else {
        atkBtnStr = parts[0];
    }

    Object.keys(controls).forEach(button => {
        
        if(button === 'version' || button === 'up' || button === 'down') return;

        if(atkBtnStr.indexOf(button.toUpperCase()) !== -1) {
            buttons.push(button.toUpperCase());
        }

    });

    highlight(buttons);
}

function toggleSongArea() {

    if(songAreaCollapsed) {
        songAreaElm.style.visibility = "visible";
        songAssistSettingsElm.style.visibility = "visible";
        songCollapseButton.innerText = "Hide";
        songCollapseButton.parentElement.style.height = "";
    } else {
        songAreaElm.style.visibility = "hidden";
        songAssistSettingsElm.style.visibility = "hidden";
        songCollapseButton.innerText = "Show";
        songCollapseButton.parentElement.style.height = "28px";
    }

    songAreaCollapsed = !songAreaCollapsed;

    localStorage.setItem('songCollapsed', songAreaCollapsed);
}

window.toggleSongArea = toggleSongArea;

function toggleRepeatSong() {
    repeatSong = !repeatSong;

    localStorage.setItem('repeatSong', repeatSong);
}

window.toggleRepeatSong = toggleRepeatSong;

function startSongButtonListener(ev) {

    ev.preventDefault();

    let elm = ev.srcElement;

    elm.innerText = "Start (...)";

    if(controlListener) {
        controlListener({ keyCode: 27 });
    }

    let control = metaControls['restartSong'];

    controlListener = ev => {
        if(ev.keyCode !== 27) {
            let allControls = Object.assign([], controls, metaControls);

            let allControlButtons = Object.keys(allControls);

            for(let i = 0; i < allControlButtons.length; i++) {

                if(allControls[allControlButtons[i]].code === ev.keyCode) {
                    if(allControlButtons[i] !== "restartSong") {

                        debug(`Key "${ev.code}" (${ev.keyCode}) already assigned to button ${allControlButtons[i].toUpperCase()}`);

                        return;
                    }
                }
            }

            control.code = ev.keyCode;

            let label = ev.key.toLocaleUpperCase();

            if(!label.trim()) {
                label = ev.code;
            }

            if(ev.code.toLocaleLowerCase().includes('numpad')) {
                label = 'Numpad ' + (/numpad(.+)/i).exec(ev.code)[1];
            }

            control.label = label;

            localStorage.setItem('metaControls', JSON.stringify(metaControls));
        }

        elm.innerText = `Start (${control.label})`;

        window.removeEventListener('keydown', controlListener);

        controlListener = null;
    }

    window.addEventListener('keydown', controlListener);

    return false;
}

window.startSongButtonListener = startSongButtonListener;


