const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'vendor/base.html'),'utf8');
html=html.slice(0,html.indexOf('    <!-- 车库 / 解锁新车'));
html=html.replace('ROKU Racer · 独立恢复版','NFS sunset');
html=html.replaceAll('ROKU / SYNTHWAVE RACER','NFS sunset / NIGHT DRIVE').replaceAll('SYNTHWAVE RACER','NFS sunset').replaceAll('ROKU 赛车场景','NFS sunset 赛车场景');
html=html.replace('<small>← → / A D 转向', '<button id="menu-garage" disabled>车库 / 04</button><small>← → / A D 转向');
html+=`
<section id="integrated-garage" class="integrated-modal" role="dialog" aria-modal="true" aria-labelledby="integrated-garage-title" hidden>
<div class="integrated-panel"><header><div><small>CRT-2000 / TUNE YOUR FREQUENCY</small><h2 id="integrated-garage-title">THE GARAGE / 车库</h2></div><button id="integrated-garage-close" aria-label="关闭车库">✕</button></header>
<div class="garage-summary"><span>累计积分解锁 · 解锁不扣分</span><span>TOTAL <b id="integrated-total">000000</b></span></div><div id="integrated-vehicles"></div><footer>每辆车均可免费试驾；试驾不累计成绩，不改变正常选车。<br>模型：原创程序化车 / Ignition Labs / Quaternius</footer></div></section>
<div id="trial-indicator" role="status" hidden>免费试驾 · 成绩不累计</div><button id="integrated-pause" aria-label="暂停或继续" title="P 暂停 / 继续" hidden>Ⅱ</button>
<aside id="integrated-music" aria-label="音乐与音效"><p id="music-status">FM / NIGHT CIRCUIT · 110 BPM</p><div><button id="music-toggle" aria-pressed="false">音乐 ▷</button><button id="music-mute" aria-pressed="false">静音</button><input id="music-volume" type="range" min="0" max="1" step="0.01" value="0.42" aria-label="音乐音量"></div><div><button id="engine-toggle" aria-pressed="false">引擎 OFF</button><button id="effects-toggle" aria-pressed="false">音效 OFF</button></div></aside>
</body></html>`;
fs.writeFileSync(path.join(root,'index.html'),html);
