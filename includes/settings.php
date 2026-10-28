<?php
if (!defined('ABSPATH')) exit;

// One option array, 'evive_cookie_banner'. Defaults keep a fresh install harmless: preview mode
// (banner only for whoever opens a page with ?evive_cb_preview=1) until someone switches it to live.
function evive_cb_defaults() {
    return [
        'mode'        => 'preview', // off | preview | live
        'language'    => 'en',      // en | nl | auto (browser language)
        'gtm_id'      => '',        // GTM-XXXXXXX, loaded only after analytics consent
        'privacy_url' => '',        // empty: WordPress' own privacy policy page
        'revision'    => 1,         // raise to ask every visitor again (e.g. new cookies)
        'block_media' => 1,         // hold back YouTube/Vimeo embeds until the visitor loads them
    ];
}

function evive_cb_option($key) {
    $o = wp_parse_args((array) get_option('evive_cookie_banner', []), evive_cb_defaults());
    return $o[$key] ?? null;
}

function evive_cb_sanitize($in) {
    $d = evive_cb_defaults();
    $in = (array) $in;
    $gtm = strtoupper(trim((string) ($in['gtm_id'] ?? '')));
    return [
        'mode'        => in_array($in['mode'] ?? '', ['off', 'preview', 'live'], true) ? $in['mode'] : $d['mode'],
        'language'    => in_array($in['language'] ?? '', ['en', 'nl', 'auto'], true) ? $in['language'] : $d['language'],
        'gtm_id'      => preg_match('/^GTM-[A-Z0-9]{4,12}$/', $gtm) ? $gtm : '',
        'privacy_url' => esc_url_raw(trim((string) ($in['privacy_url'] ?? ''))),
        'revision'    => max(1, (int) ($in['revision'] ?? 1)),
        'block_media' => empty($in['block_media']) ? 0 : 1,
    ];
}

add_action('admin_init', function () {
    register_setting('evive_cookie_banner', 'evive_cookie_banner', ['sanitize_callback' => 'evive_cb_sanitize']);
});

add_action('admin_menu', function () {
    add_options_page('evive Cookie Banner', 'evive Cookie Banner', 'manage_options', 'evive-cookie-banner', 'evive_cb_render_settings');
});

function evive_cb_render_settings() {
    if (!current_user_can('manage_options')) return;
    $o = wp_parse_args((array) get_option('evive_cookie_banner', []), evive_cb_defaults());
    $f = function ($k) { return 'evive_cookie_banner[' . $k . ']'; };
    ?>
    <div class="wrap">
        <h1>evive Cookie Banner</h1>
        <p>Nothing non-essential is loaded before the visitor chooses. Google Tag Manager loads only after
        analytics consent; video embeds load only when the visitor clicks them (or accepted "External media").</p>
        <form method="post" action="options.php">
            <?php settings_fields('evive_cookie_banner'); ?>
            <table class="form-table">
                <tr><th scope="row">Mode</th><td>
                    <select name="<?php echo esc_attr($f('mode')); ?>">
                        <?php foreach (['off' => 'Off', 'preview' => 'Preview (only with ?evive_cb_preview=1)', 'live' => 'Live (every visitor)'] as $v => $l): ?>
                            <option value="<?php echo esc_attr($v); ?>" <?php selected($o['mode'], $v); ?>><?php echo esc_html($l); ?></option>
                        <?php endforeach; ?>
                    </select>
                    <p class="description">Preview: open any page with <code>?evive_cb_preview=1</code> to test (remembered in your browser; <code>?evive_cb_preview=0</code> stops it). Other visitors see no banner, and no Tag Manager.</p>
                </td></tr>
                <tr><th scope="row">Language</th><td>
                    <select name="<?php echo esc_attr($f('language')); ?>">
                        <?php foreach (['en' => 'English', 'nl' => 'Nederlands', 'auto' => 'Browser language (NL or EN)'] as $v => $l): ?>
                            <option value="<?php echo esc_attr($v); ?>" <?php selected($o['language'], $v); ?>><?php echo esc_html($l); ?></option>
                        <?php endforeach; ?>
                    </select>
                </td></tr>
                <tr><th scope="row">Google Tag Manager ID</th><td>
                    <input type="text" class="regular-text" name="<?php echo esc_attr($f('gtm_id')); ?>" value="<?php echo esc_attr($o['gtm_id']); ?>" placeholder="GTM-XXXXXXX">
                    <p class="description">Loaded only after analytics consent. Do not also let another plugin (e.g. Site Kit's Tag Manager module) insert this container.</p>
                </td></tr>
                <tr><th scope="row">Privacy policy URL</th><td>
                    <input type="url" class="regular-text" name="<?php echo esc_attr($f('privacy_url')); ?>" value="<?php echo esc_attr($o['privacy_url']); ?>" placeholder="<?php echo esc_attr(get_privacy_policy_url()); ?>">
                </td></tr>
                <tr><th scope="row">Video embeds</th><td>
                    <label><input type="checkbox" name="<?php echo esc_attr($f('block_media')); ?>" value="1" <?php checked($o['block_media'], 1); ?>> Hold back YouTube/Vimeo until the visitor loads them</label>
                </td></tr>
                <tr><th scope="row">Consent revision</th><td>
                    <input type="number" min="1" name="<?php echo esc_attr($f('revision')); ?>" value="<?php echo esc_attr($o['revision']); ?>" class="small-text">
                    <p class="description">Raise by 1 to ask every visitor again (for example after adding a new kind of cookie).</p>
                </td></tr>
            </table>
            <?php submit_button(); ?>
        </form>
        <h2>Cookie settings link</h2>
        <p>Any link to <code>#cookie-settings</code> reopens the banner, e.g. in the footer. Or use the shortcode <code>[evive_cookie_settings]</code>.</p>
        <h2>For developers</h2>
        <p><code>window.eviveConsent.get('analytics' | 'media')</code>, <code>window.eviveConsent.open()</code>, and the <code>evive:consent</code> event on <code>document</code> (detail = the choice).
        <code>window.invaiseCheckoutAnalyticsConsent</code> follows the analytics choice (invAIse Checkout plugin).</p>
    </div>
    <?php
}
