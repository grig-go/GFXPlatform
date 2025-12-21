# Nova GFX Interactive Scripting API

Complete reference for the Nova GFX scripting system. Scripts are written in JavaScript and executed in Interactive Mode.

## Handler Pattern

Scripts use a naming convention to handle element events:

```javascript
function on{ElementName}On{EventType}(event) {
  // Your code here
}
```

**Example:**
```javascript
function onShape1OnClick(event) {
  actions.log('Shape1 was clicked!');
}
```

## Available Objects

| Object | Description |
|--------|-------------|
| `actions` | All available action methods |
| `state` | Read/write state object |
| `data` | Data binding context |
| `event` | Current event info (type, elementId, elementName) |

---

## Element Operations

### Get Elements

```javascript
// Get element by name
const el = actions.getElement('MyShape');

// Get all elements
const allElements = actions.getAllElements();
```

### Update Elements

```javascript
// Update any property
actions.updateElement('MyShape', {
  opacity: 0.5,
  rotation: 45,
  position_x: 100,
  scale_x: 1.5
});

// Show/hide elements
actions.showElement('MyShape');
actions.hideElement('MyShape');
actions.toggleElement('MyShape');
```

### Create & Delete Elements

```javascript
// Create element
const id = actions.addElement('shape', {
  x: 100,
  y: 200,
  name: 'NewShape',
  width: 200,
  height: 100
});

// Element types: 'div', 'text', 'line', 'image', 'shape', 'group',
//                'video', 'lottie', 'd3-chart', 'map', 'ticker',
//                'svg', 'icon', 'table', 'countdown', 'interactive'

// Duplicate element
const newId = actions.duplicateElement('MyShape');

// Delete element
actions.deleteElement('MyShape');
```

### Z-Order

```javascript
actions.bringToFront('MyShape');
actions.sendToBack('MyShape');
actions.bringForward('MyShape');
actions.sendBackward('MyShape');
actions.setZIndex('MyShape', 10);
```

### Grouping

```javascript
// Group elements
const groupId = actions.groupElements(['Shape1', 'Shape2', 'Shape3']);

// Ungroup
actions.ungroupElements('Group1');
```

---

## Animation & Timeline

### Create Animations

```javascript
// Create animation on element (phase: 'in', 'loop', 'out')
const animId = actions.addAnimation('MyShape', 'in');

// Add keyframes (position in ms)
actions.addKeyframe(animId, 0, { opacity: 0, scale_x: 0.5, scale_y: 0.5 });
actions.addKeyframe(animId, 500, { opacity: 1, scale_x: 1, scale_y: 1 });

// Keyframe properties:
// position_x, position_y, rotation, scale_x, scale_y, opacity
```

### Manage Animations

```javascript
// Get animations for element
const anims = actions.getAnimations('MyShape');

// Get keyframes for animation
const keyframes = actions.getKeyframes(animId);

// Update animation
actions.updateAnimation(animId, { /* updates */ });

// Update keyframe
actions.updateKeyframe(keyframeId, { position: 300 });

// Remove animation
actions.removeAnimation(animId);
```

### Playback Controls

```javascript
actions.play();
actions.pause();
actions.stop();
actions.restart();  // Stops and plays from beginning

// Phase control
actions.setPhase('in');     // 'in', 'loop', 'out'
actions.setPlayhead(500);   // Position in ms

// Get state
const pos = actions.getPlayhead();
const phase = actions.getCurrentPhase();
const playing = actions.isPlaying();
```

### Phase Durations

```javascript
// Get duration
const duration = actions.getPhaseDuration('in');  // in ms
const all = actions.getAllPhaseDurations();       // { in, loop, out }

// Set duration
actions.setPhaseDuration('in', 2000);
```

### Full Preview

```javascript
// Play through IN → LOOP → OUT
actions.playFullPreview();
actions.endPreviewPlayback();
const isPreview = actions.isPlayingFullPreview();
```

---

## Template Management

```javascript
// Get templates
const templates = actions.getTemplates();
const current = actions.getCurrentTemplate();
const currentId = actions.getCurrentTemplateId();

// Switch template
actions.switchToTemplate('TemplateName');

// Create/duplicate
const newId = actions.addTemplate('LayerName', 'NewTemplate');
const copyId = actions.duplicateTemplate('TemplateName');

// Update
actions.updateTemplate('TemplateName', { name: 'NewName' });

// Visibility/Lock
actions.toggleTemplateVisibility('TemplateName');
actions.toggleTemplateLock('TemplateName');
```

---

## Layer Control

```javascript
// Get layers
const layers = actions.getLayers();
const layer = actions.getLayer('LayerName');

// Visibility/Lock
actions.toggleLayerVisibility('LayerName');
actions.toggleLayerLock('LayerName');

// Show all
actions.showAllLayers();
actions.showAllTemplates();
actions.showAll();
```

---

## On-Air Controls

```javascript
// Play IN animation
actions.playIn('TemplateName', 'LayerName');

// Play OUT animation
actions.playOut('LayerName');

// Switch template on layer
actions.switchTemplate('NewTemplate', 'LayerName');

// Get on-air state
const state = actions.getOnAirState('LayerName');

// Clear on-air
actions.clearOnAir('LayerName');
```

---

## Data Binding

```javascript
// Get current record
const record = actions.getDataRecord();

// Get specific record
const record5 = actions.getDataRecordAt(5);

// Get all records
const all = actions.getAllDataRecords();
const count = actions.getDataRecordCount();

// Navigation
actions.nextRecord();
actions.prevRecord();
actions.setRecordIndex(3);
const idx = actions.getCurrentRecordIndex();

// Data source info
const info = actions.getDataSourceInfo();
// Returns: { id, name, displayField, recordCount, currentIndex }
```

---

## Selection

```javascript
// Select elements
actions.selectElements(['Shape1', 'Shape2']);
actions.addToSelection(['Shape3']);
actions.toggleSelection(['Shape1']);

// Select/deselect all
actions.selectAll();
actions.deselectAll();

// Get selection
const selected = actions.getSelectedElements();
const names = actions.getSelectedElementNames();
```

---

## View Controls

```javascript
// Zoom
actions.setZoom(1.5);
const zoom = actions.getZoom();

// Pan
actions.setPan(100, 50);
const pan = actions.getPan();  // { x, y }

// View presets
actions.fitToScreen();
actions.resetView();

// Toggle overlays
actions.toggleGrid();
actions.toggleGuides();
actions.toggleSafeArea();
```

---

## State Management

```javascript
// Set state (persists across clicks)
actions.setState('counter', 1);
actions.setState('isActive', true);

// Read state
const count = state.counter;
const active = state.isActive;

// Address system (for element properties)
actions.setState('@Shape1.opacity', 0.5);
actions.setState('@Shape1.position_x', 200);
```

---

## Timers & Async

```javascript
// One-time delay (Promise-based)
await actions.delay(1000);

// setTimeout/clearTimeout
const timeoutId = actions.setTimeout(() => {
  actions.log('Timeout fired!');
}, 2000);
actions.clearTimeout(timeoutId);

// setInterval/clearInterval
const intervalId = actions.setInterval(() => {
  actions.log('Interval tick');
}, 500);
actions.clearInterval(intervalId);
```

---

## Audio

```javascript
// Play sound (returns HTMLAudioElement)
const sound = actions.playSound('https://example.com/click.mp3', 0.8);

// Stop sound
actions.stopSound(sound);
```

---

## Media Element Control (Video/Audio on Stage)

Control video and audio elements placed on the stage.

### Basic Media Control

```javascript
// Play/pause a video element
actions.playMedia('MyVideo');
actions.pauseMedia('MyVideo');

// Get current playback position (in seconds)
const currentTime = actions.getMediaTime('MyVideo');

// Seek to specific time
actions.setMediaTime('MyVideo', 5.5);  // Jump to 5.5 seconds

// Get total duration
const duration = actions.getMediaDuration('MyVideo');

// Set volume (0 to 1)
actions.setMediaVolume('MyVideo', 0.5);

// Mute/unmute
actions.setMediaMuted('MyVideo', true);
actions.setMediaMuted('MyVideo', false);

// Set playback speed (0.25 to 4x)
actions.setMediaSpeed('MyVideo', 2);  // 2x speed
actions.setMediaSpeed('MyVideo', 0.5);  // Half speed
```

### Get DOM Media Element

```javascript
// Get direct access to the HTML video/audio element
const videoEl = actions.getMediaElement('MyVideo');
if (videoEl) {
  console.log('Paused:', videoEl.paused);
  console.log('Duration:', videoEl.duration);
  videoEl.currentTime = 10;
}
```

### Media Keyframe Animation

Control video playback position with timeline keyframes. This allows video to sync with your animation timeline.

**Animatable Media Properties:**
| Property | Range | Description |
|----------|-------|-------------|
| `media_time` | seconds | Video currentTime position |
| `media_playing` | 0 or 1 | Play (1) or pause (0) state |
| `media_volume` | 0 to 1 | Volume level |
| `media_muted` | 0 or 1 | Muted (1) or unmuted (0) |
| `media_speed` | 0.25 to 4 | Playback rate multiplier |

**Create Media Timeline Animation:**

```javascript
// Add animation that controls video time during 'in' phase
// Video plays from 0s to 2s as the timeline plays
const animId = actions.addMediaTimeAnimation('MyVideo', 'in', 0, 2);

// Control video time manually with keyframes
const animId = actions.addAnimation('MyVideo', 'loop');
actions.addKeyframe(animId, 0, { media_time: 5, media_volume: 0 });
actions.addKeyframe(animId, 1000, { media_time: 8, media_volume: 1 });

// This creates: video starts at 5s muted, ends at 8s with full volume
```

**Sync Video to Timeline:**

```javascript
// Automatically sync video playback with timeline phases
// Video starts at 2s and advances 1:1 with timeline
actions.syncMediaToTimeline('MyVideo', 2);
```

### Example: Interactive Video Control

```javascript
// Toggle play/pause on click
function onPlayButtonOnClick(event) {
  const currentTime = actions.getMediaTime('MainVideo');
  const isPaused = actions.getMediaElement('MainVideo')?.paused;

  if (isPaused) {
    actions.playMedia('MainVideo');
    actions.updateElement('PlayIcon', { opacity: 0 });
    actions.updateElement('PauseIcon', { opacity: 1 });
  } else {
    actions.pauseMedia('MainVideo');
    actions.updateElement('PlayIcon', { opacity: 1 });
    actions.updateElement('PauseIcon', { opacity: 0 });
  }
}

// Jump to chapter on click
function onChapter2OnClick(event) {
  actions.setMediaTime('MainVideo', 45);  // Jump to 45 seconds
  actions.playMedia('MainVideo');
}
```

### Example: Animated Video Reveal

```javascript
// Create a video that fades in while playing from start
function onStartButtonOnClick(event) {
  // Clear any existing animations
  const oldAnims = actions.getAnimations('IntroVideo');
  oldAnims.forEach(a => actions.removeAnimation(a.id));

  // Create animation for video
  const animId = actions.addAnimation('IntroVideo', 'in');

  // Keyframe 0: invisible, video at 0s
  actions.addKeyframe(animId, 0, {
    opacity: 0,
    media_time: 0,
    media_playing: 1
  });

  // Keyframe at 1 second: fully visible, video at 1s
  actions.addKeyframe(animId, 1000, {
    opacity: 1,
    media_time: 1,
    media_playing: 1
  });

  // Play the animation
  actions.restart();
}
```

---

## HTTP Fetch

```javascript
// Fetch JSON
const data = await actions.fetch('https://api.example.com/data');

// Fetch text
const text = await actions.fetchText('https://example.com/page.html');

// With options
const result = await actions.fetch('https://api.example.com/post', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'value' })
});
```

---

## Navigation

```javascript
actions.navigate('TemplateName');
```

---

## Utility Functions

### Math Helpers

```javascript
// Random numbers
const r = actions.random(0, 100);      // Float between 0-100
const i = actions.randomInt(1, 10);    // Integer between 1-10

// Clamp value
const clamped = actions.clamp(150, 0, 100);  // Returns 100

// Linear interpolation
const mid = actions.lerp(0, 100, 0.5);  // Returns 50

// Map value from one range to another
const mapped = actions.map(50, 0, 100, 0, 1);  // Returns 0.5
```

### Logging

```javascript
actions.log('Debug message');
actions.log('Value: ' + someVariable);
```

---

## Complete Example

```javascript
// Click counter with cycling animations
function onShape1OnClick(event) {
  // Increment click counter
  const count = (state.clicks || 0) + 1;
  actions.setState('clicks', count);

  // Cycle through 3 animation styles
  const style = ((count - 1) % 3) + 1;
  actions.log('Click #' + count + ', Style: ' + style);

  // Stop and remove old animation
  actions.stop();
  const oldAnims = actions.getAnimations('Shape1');
  for (let i = 0; i < oldAnims.length; i++) {
    actions.removeAnimation(oldAnims[i].id);
  }

  // Create new animation
  const animId = actions.addAnimation('Shape1', 'in');

  if (style === 1) {
    // Pulse
    actions.addKeyframe(animId, 0, { scale_x: 1, scale_y: 1 });
    actions.addKeyframe(animId, 300, { scale_x: 1.3, scale_y: 1.3 });
    actions.addKeyframe(animId, 600, { scale_x: 1, scale_y: 1 });
  } else if (style === 2) {
    // Spin
    actions.addKeyframe(animId, 0, { rotation: 0 });
    actions.addKeyframe(animId, 600, { rotation: 360 });
  } else {
    // Bounce
    actions.addKeyframe(animId, 0, { position_y: 0 });
    actions.addKeyframe(animId, 150, { position_y: -30 });
    actions.addKeyframe(animId, 300, { position_y: 0 });
    actions.addKeyframe(animId, 400, { position_y: -15 });
    actions.addKeyframe(animId, 500, { position_y: 0 });
  }

  // Play animation
  actions.restart();
}

// Auto-advance data records every 5 seconds
function onStartButtonOnClick(event) {
  const intervalId = actions.setInterval(() => {
    actions.nextRecord();
    actions.log('Advanced to record ' + actions.getCurrentRecordIndex());
  }, 5000);

  actions.setState('autoAdvanceInterval', intervalId);
}

function onStopButtonOnClick(event) {
  const intervalId = state.autoAdvanceInterval;
  if (intervalId) {
    actions.clearInterval(intervalId);
    actions.log('Stopped auto-advance');
  }
}
```

---

## Event Object

The `event` parameter contains:

```javascript
{
  type: 'click',           // Event type
  elementId: 'abc123',     // Element ID
  elementName: 'Shape1',   // Element name
  data: { ... }            // Additional event data
}
```

Supported event types:
- `click`
- `mouseEnter`
- `mouseLeave`
- `mouseDown`
- `mouseUp`
- `doubleClick`
