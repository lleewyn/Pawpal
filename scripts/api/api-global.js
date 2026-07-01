/**
 * api-global.js — Bridge để expose API ra window cho các script non-module.
 * Load file này bằng <script type="module"> trước các script cần window.API.
 */
import { API } from './api.js';
window.API = API;
