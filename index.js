let framerate = 30;
let segmentsNumber = getSegmentsNumber();

// an array that has tuples of [start, finish] for each segment
let times = [];

function readTime(timeStr) {
  // completely ignore all whitespaces
  timeStr = timeStr.replace(/\s/g, '');

  // matching ff format (only frames given)
  let match = timeStr.match(/^\d+$/);
  if (match !== null) {
    return Number(match[0]) / framerate;
  }

  // matching for ss:ff format
  match = timeStr.match(/^(\d+)\:(\d{2})$/);
  if (match !== null) {
    return Number(match[1]) + Number(match[2]) / framerate;
  }

  // matching for all the other formats
  const [secondsPart, msPart] = timeStr.split('.');
  let ms = 0;
  // if could split, then the ms were provided
  if (msPart !== undefined) {
    // adding decimal part with arbitrary number of decimals
    ms = Number(msPart) / Math.pow(10, msPart.length);
  }

  const macroTimes = secondsPart.split(':');
  
  const macroTimeValues = {
    seconds: 0,
    minutes: 0,
    hours: 0
  };

  const macroTimeNames = ['seconds', 'minutes', 'hours'];

  for (const macroTimeName of macroTimeNames) {
    if (macroTimes.length === 0) {
      break;
    }
    const value = Number(macroTimes.pop());
    macroTimeValues[macroTimeName] = value;
  }

  return (macroTimeValues.hours * 60 + macroTimeValues.minutes) * 60 + macroTimeValues.seconds + ms;
}

function getSegmentsNumber() {
  let segmentNumber = parseInt(localStorage.getItem('segments'), 10);
  if (isNaN(segmentNumber)) {
    return 2;
  }
  return segmentNumber;
}

const segmentsInput = document.getElementById('segments-input');

const ps5Input = document.getElementById('ps5-input');

segmentsInput.value = segmentsNumber
segmentsInput.onchange = (e) => {
  segmentsNumber = Number(e.target.value);
  localStorage.setItem('segments', e.target.value);
  updateSegments();
  updateTimes();
}

ps5Input.onchange = () => {
  updateTimes();
}

updateSegments();

function updateFramerate(value) {
  framerate = value;
  rereadTimes();
  updateTimes();
}

document.getElementById('30-fps-input').onchange = (e) => {
  if (e.target.checked) {
    updateFramerate(30);
  }
}

document.getElementById('60-fps-input').onchange = (e) => {
  if (e.target.checked) {
    updateFramerate(60);
  }
}

function getSegmentStartInput(index) {
  return `segment-${index}-start`;
}

function getSegmentEndInput(index) {
  return `segment-${index}-end`;
}

function getSegmentTimeId(index) {
  return `segment-${index}-time`;
}

function updateSegments() {
  // if adding segments
  while (segmentsNumber > times.length) {
    const segmentIndex = times.length;
    times.push([0, 0]);
    // now that we have pushed, the length will become the proper chapter/segment number
    const segmentNumber = times.length;
    
    const startId = getSegmentStartInput(segmentIndex);
    const endId = getSegmentEndInput(segmentIndex);
    
    document.getElementById('time-inputs').insertAdjacentHTML('beforeend', `
      <div>
        <p>
          <label for="${startId}">Chapter ${segmentNumber} Start</label>
          <input id="${startId}" type="text" />
        </p>
        <p>
          <label for="${endId}">Chapter ${segmentNumber} End</label>
          <input id="${endId}" type="text" />
        </p>
        <p>
          Chapter ${segmentNumber} time: <span id="${getSegmentTimeId(segmentIndex)}"></span>
        </p>
      </div>
    `);

    [startId, endId].map(id => document.getElementById(id)).forEach((el, i) => {
      el.onchange = () => {
        times[segmentIndex][i] = readTime(el.value);
        updateTimes();
      }
    });
  }

  // removing segments
  while (times.length > segmentsNumber) {
    const timeInputs = document.getElementById('time-inputs');
    timeInputs.removeChild(timeInputs.lastElementChild);
    times.pop();
  }
}

function parseTime(time) {
  if (time < 0) {
    time = 0;
  }

  const isPs5 = ps5Input.checked;

  if (isPs5) {
    time = time / 30 * 31;
  }

  let decimal = time % 1;
  let integer = Math.floor(time);
  let hours = Math.floor(integer / 3600);
  let minutes = Math.floor(integer / 60) % 60;
  let seconds = integer % 60;

  // in the deltarune leaderboards, only 30 FPS times are wanted
  const computedFrames = decimal * 30;
  // want to round up times that aren't 30 FPS-like, using a delta
  const framesToUse = Math.abs(computedFrames - Math.round(computedFrames)) < 0.1 ? Math.round(computedFrames) : Math.floor(computedFrames);
  let ms = Math.round(framesToUse / 30 * 1000);

  let timeStrings = [];
  // variable will be used to ommit hours, minutes if not needed, will start true and once we have found a valid value,
  // then it will be false so we know for sure to add all remaining times to the string
  let allowOmmit = true;

  for (const timeInfo of [
    { pad: 1, name: 'h', value: hours, optional: true },
    { pad: 2, name: 'm', value: minutes, optional: true },
    { pad: 2, name: 's', value: seconds, optional: false },
    { pad: 3, name: 'ms', value: ms, optional: false }
  ]) {
    if (allowOmmit && (timeInfo.optional && timeInfo.value === 0)) {
      continue;
    }
    allowOmmit = false;
    timeStrings.push(`${String(timeInfo.value).padStart(timeInfo.pad, '0')}${timeInfo.name}`);
  }

  return timeStrings.join(' ');
}

function rereadTimes() {
  for (let i = 0; i < segmentsNumber; i++) {
    times[i] = [getSegmentStartInput(i), getSegmentEndInput(i)].map(id => {
      return readTime(document.getElementById(id).value);
    });
  }
}

function updateTimes() {
  let igt = 0;
  times.forEach((time, i) => {
    const segmentTime = time[1] - time[0];
    document.getElementById(getSegmentTimeId(i)).innerText = parseTime(segmentTime);
    igt += segmentTime;
  });

  const rta = times.slice(-1)[0][1] - times[0][0];
  document.getElementById('igt-input').value = parseTime(igt);
  document.getElementById('rta-input').value = parseTime(rta);
}