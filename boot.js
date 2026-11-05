import {integration} from './src/runtime.js';
/** 先载入四车库资源再启动原场景，避免存档车型被临时占位车覆盖。 */
try{
  await document.fonts.ready;await integration.load();
  await import('./assets/sceneApp-7cpBE01P.js');
  if(!window.__rokuSceneReady||!integration.api)throw Error('场景初始化未完成');
  integration.wireUI();document.getElementById('tv-power-btn').disabled=false;
  document.getElementById('menu-garage').disabled=false;
  document.documentElement.dataset.integrationReady='true';
}catch(error){
  const loading=document.getElementById('loading-screen');loading.classList.remove('hidden');
  document.getElementById('loading-text').textContent='加载失败：'+error.message;
  console.error(error);
}
