/** 原站场景仅用到这四项翻译；移除对包含后台逻辑的主站入口的依赖。 */
const labels={'box-title-1':'人物模型','box-title-2':'场景建模','box-title-3':'游戏设计','box-title-4':'视频剪辑'};
export const t=key=>labels[key]||key;
