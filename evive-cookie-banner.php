<?php
/**
 * Plugin Name: evive Cookie Banner
 * Description: Small, free consent banner of the evive family. Nothing non-essential loads before consent:
 *              Google Tag Manager is only loaded after "Accept" (with Google Consent Mode v2 signals), and
 *              YouTube/Vimeo embeds are held back until the visitor loads them. Equal Accept/Reject buttons,
 *              no consent by scrolling or clicking elsewhere, choice changeable via a "Cookie settings" link.
 * Version: 1.0.1
 * Author: evive.works (StackPros B.V.)
 * Author URI: https://evive.works
 * License: GPL-2.0-or-later
 * Update URI: https://github.com/evive-works/evive-cookie-banner
 */

if (!defined('ABSPATH')) exit;

define('EVIVE_CB_VERSION', '1.0.1');
define('EVIVE_CB_FILE', __FILE__);
define('EVIVE_CB_DIR', plugin_dir_path(__FILE__));

// Updates: WordPress offers every GitHub Release of github.com/evive-works/evive-cookie-banner with the asset
// evive-cookie-banner.zip (Plugin Update Checker v5, MIT, same setup as the evive Connector).
require_once EVIVE_CB_DIR . 'vendor/plugin-update-checker/plugin-update-checker.php';
$eviveCbUpdates = \YahnisElsts\PluginUpdateChecker\v5\PucFactory::buildUpdateChecker(
    'https://github.com/evive-works/evive-cookie-banner/',
    __FILE__,
    'evive-cookie-banner'
);
$eviveCbUpdates->setBranch('main');
$eviveCbUpdates->getVcsApi()->enableReleaseAssets('/evive-cookie-banner\.zip$/');

require_once EVIVE_CB_DIR . 'includes/settings.php';

// Hosts that only load after consent. Used to drop resource hints and to hold back embeds.
const EVIVE_CB_ANALYTICS_HOSTS = ['www.googletagmanager.com', 'googletagmanager.com', 'www.google-analytics.com', 'google-analytics.com'];
const EVIVE_CB_MEDIA_HOSTS     = ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'youtube-nocookie.com', 'player.vimeo.com'];

function evive_cb_active() {
    if (is_admin() || wp_doing_ajax() || (defined('REST_REQUEST') && REST_REQUEST) || is_feed()) return false;
    return evive_cb_option('mode') !== 'off';
}

// Front end: config + script in <head> (so the consent state and window.eviveConsent exist before
// other scripts run), stylesheet as a normal file.
add_action('wp_enqueue_scripts', function () {
    if (!evive_cb_active()) return;
    $url = plugins_url('assets/', EVIVE_CB_FILE);
    wp_enqueue_style('evive-cookie-banner', $url . 'banner.css', [], EVIVE_CB_VERSION);
    wp_enqueue_script('evive-cookie-banner', $url . 'banner.js', [], EVIVE_CB_VERSION, false);
    $privacy = evive_cb_option('privacy_url') ?: (function_exists('get_privacy_policy_url') ? get_privacy_policy_url() : '');
    wp_add_inline_script('evive-cookie-banner', 'window.eviveCookieBannerConfig = ' . wp_json_encode([
        'mode'       => evive_cb_option('mode'),
        'language'   => evive_cb_option('language'),
        'gtmId'      => evive_cb_option('gtm_id'),
        'privacyUrl' => $privacy,
        'revision'   => (int) evive_cb_option('revision'),
        'maxAgeDays' => 180,
        'media'      => (bool) evive_cb_option('block_media'),
    ]) . ';', 'before');
}, 1);

// No DNS/preconnect hints to hosts that may only be contacted after consent.
add_filter('wp_resource_hints', function ($urls) {
    if (!evive_cb_active()) return $urls;
    $blocked = array_merge(EVIVE_CB_ANALYTICS_HOSTS, EVIVE_CB_MEDIA_HOSTS);
    return array_values(array_filter($urls, function ($u) use ($blocked) {
        $href = is_array($u) ? ($u['href'] ?? '') : $u;
        $host = parse_url(strpos($href, '//') === 0 ? 'https:' . $href : $href, PHP_URL_HOST);
        return !$host || !in_array(strtolower($host), $blocked, true);
    }));
}, 99);

// Hold back video embeds: the page is sent with src="about:blank" and the real address in
// data-evive-src, so the browser contacts YouTube/Vimeo only after the visitor chose to load it.
// Done on the final HTML because page builders (BeTheme, Elementor) print iframes outside the_content.
add_action('template_redirect', function () {
    if (!evive_cb_active() || !evive_cb_option('block_media')) return;
    ob_start('evive_cb_hold_back_embeds');
}, 0);

function evive_cb_hold_back_embeds($html) {
    if (stripos($html, '<iframe') === false) return $html;
    return preg_replace_callback('/<iframe\b[^>]*>/i', function ($m) {
        $tag = $m[0];
        if (stripos($tag, 'data-evive-src') !== false) return $tag;
        if (!preg_match('/\ssrc\s*=\s*(["\'])(.*?)\1/i', $tag, $src)) return $tag;
        $url  = html_entity_decode($src[2]);
        $host = strtolower((string) parse_url(strpos($url, '//') === 0 ? 'https:' . $url : $url, PHP_URL_HOST));
        if (!in_array($host, EVIVE_CB_MEDIA_HOSTS, true)) return $tag;
        $replacement = ' src="about:blank" data-evive-src="' . esc_attr($url) . '" data-evive-consent="media"';
        return str_replace($src[0], $replacement, $tag);
    }, $html);
}

// [evive_cookie_settings label="Cookie settings"]: a link that reopens the banner. Any link to
// #cookie-settings (e.g. in a theme footer) does the same.
add_shortcode('evive_cookie_settings', function ($atts) {
    $atts = shortcode_atts(['label' => ''], $atts, 'evive_cookie_settings');
    $label = $atts['label'] !== '' ? $atts['label'] : (evive_cb_option('language') === 'nl' ? 'Cookie-instellingen' : 'Cookie settings');
    return '<a href="#cookie-settings" class="evive-cb-settings-link">' . esc_html($label) . '</a>';
});
