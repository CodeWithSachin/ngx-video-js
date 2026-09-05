/**
 * Which parts of the ejected skin are rendered.
 *
 * Every key defaults to `true`. A `false` keeps the element out of the DOM
 * entirely — this is not a CSS toggle, so there is no rule for a viewer to
 * override and no hidden control to re-enable from the console.
 *
 * Turning a control off also drops the keyboard and gesture shortcuts that do
 * the same job, so the restriction actually holds: hiding `progressBar` means
 * arrow keys, `j`/`l` and the digit keys stop seeking too.
 *
 * Only `skin="custom"` reads this. The packaged skins render their UI inside a
 * shadow root and expose no such switches.
 */
export interface VideoControls {
  // Layers
  /** The poster image shown until playback starts. */
  poster?: boolean;
  /** The spinner shown while the media is waiting for data. */
  bufferingIndicator?: boolean;
  /** The dialog shown when playback fails. Removing it leaves errors silent. */
  errorDialog?: boolean;
  /** The gradient scrim behind the control bar. */
  overlay?: boolean;
  /** The whole control bar. `false` removes both rows and everything in them. */
  controlBar?: boolean;
  /** Hover and focus tooltips on every button. */
  tooltips?: boolean;

  // Primary row
  playButton?: boolean;
  muteButton?: boolean;
  /** The volume slider in the popover above the mute button. */
  volumeSlider?: boolean;
  currentTime?: boolean;
  /** The seek bar. `false` also removes every seeking shortcut. */
  progressBar?: boolean;
  /** Chapter segmentation of the seek bar, from a `kind="chapters"` track. */
  chapters?: boolean;
  /** The thumbnail that follows the pointer along the seek bar. */
  thumbnailPreview?: boolean;
  /** The time on the right of the bar. Click toggles remaining and duration. */
  remainingTime?: boolean;
  captionsButton?: boolean;

  // Settings menu
  settingsMenu?: boolean;
  qualityMenu?: boolean;
  audioMenu?: boolean;
  speedMenu?: boolean;
  captionsMenu?: boolean;

  // Secondary row
  castButton?: boolean;
  airplayButton?: boolean;
  pipButton?: boolean;
  fullscreenButton?: boolean;

  // Input layer
  /** Keyboard shortcuts. Individual ones still follow their control. */
  hotkeys?: boolean;
  /** Tap and double-tap gestures. Individual ones still follow their control. */
  gestures?: boolean;
  /** Screen-reader announcements for playback state. Leave this on. */
  statusAnnouncer?: boolean;
  /** The volume bar that appears while the volume changes. */
  volumeIndicator?: boolean;
  /** The captions/fullscreen/PiP flash at the top of the player. */
  statusIndicator?: boolean;
  /** The chevrons that appear when double-tapping to seek. */
  seekIndicator?: boolean;
}

/** Everything on — what `skin="custom"` renders when `controls` is not set. */
export const DEFAULT_CONTROLS: Required<VideoControls> = {
  poster: true,
  bufferingIndicator: true,
  errorDialog: true,
  overlay: true,
  controlBar: true,
  tooltips: true,
  playButton: true,
  muteButton: true,
  volumeSlider: true,
  currentTime: true,
  progressBar: true,
  chapters: true,
  thumbnailPreview: true,
  remainingTime: true,
  captionsButton: true,
  settingsMenu: true,
  qualityMenu: true,
  audioMenu: true,
  speedMenu: true,
  captionsMenu: true,
  castButton: true,
  airplayButton: true,
  pipButton: true,
  fullscreenButton: true,
  hotkeys: true,
  gestures: true,
  statusAnnouncer: true,
  volumeIndicator: true,
  statusIndicator: true,
  seekIndicator: true,
};

/** Fills in the keys the caller left out. */
export function resolveControls(controls: VideoControls): Required<VideoControls> {
  return { ...DEFAULT_CONTROLS, ...controls };
}
