import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
} from '@angular/core';
import { DEFAULT_CONTROLS, type VideoControls, resolveControls } from './controls';

/**
 * The default video skin, ejected from `@videojs/html` so every part of it can
 * sit behind an `@if`. Rendered by `<ngx-video-player skin="custom">`; the
 * media element is projected in.
 *
 * Not view-encapsulated: the skin's stylesheet targets the `media-*` custom
 * elements this template renders, and every rule is already scoped under
 * `.media-default-skin`, so nothing escapes.
 */
@Component({
  selector: 'ngx-video-skin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './video-skin.component.html',
  styleUrl: './video-skin.component.css',
  host: { style: 'display: contents' },
})
export class NgxVideoSkin {
  readonly controls = input<VideoControls>(DEFAULT_CONTROLS);
  readonly poster = input('');
  readonly posterAlt = input('');

  /** Short name because the template reads it on nearly every line. */
  protected readonly c = computed(() => resolveControls(this.controls()));

  /** The trigger is pointless with no panels behind it. */
  protected readonly hasSettingsMenu = computed(() => {
    const c = this.c();
    return c.settingsMenu && (c.qualityMenu || c.audioMenu || c.speedMenu || c.captionsMenu);
  });

  /**
   * A submenu only reaches the viewer when the settings menu renders too, so
   * shortcuts that stand in for one have to check both. Without this, turning
   * the settings menu off left `>` and `<` still changing speed.
   */
  protected readonly showsSpeed = computed(() => this.hasSettingsMenu() && this.c().speedMenu);

  /** Captions have two affordances: the toolbar button and the submenu. */
  protected readonly showsCaptions = computed(
    () => this.c().captionsButton || (this.hasSettingsMenu() && this.c().captionsMenu),
  );

  /** The overlay is only a grid for the indicators — skip it when there are none. */
  protected readonly hasIndicators = computed(() => {
    const c = this.c();
    return c.volumeIndicator || c.statusIndicator || (c.seekIndicator && c.progressBar);
  });

  /** The second row is a surface of its own — do not paint it empty. */
  protected readonly hasSecondaryRow = computed(() => {
    const c = this.c();
    return c.castButton || c.airplayButton || c.pipButton || c.fullscreenButton;
  });
}
