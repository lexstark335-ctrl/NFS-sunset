# 出处与作者

## ROKU 恢复版

用户确认拥有原站赛车版权，并明确要求以本地 `rokuno-recovered-game` 为主工程整合。原版主场景、驾驶规则、HUD、CRT 图、字体与 BOOST 提示音从这份本地恢复包复制；本次没有重新访问后台，也没有公开部署。

`vendor/roku-scene.original.js` 保留恢复包基线。恢复包本身为已发布客户端构建，不是原作者未压缩源码；原界面、字体、图片和声音不会因为恢复而自动变为 CC0。

## Three.js 与样式依赖

所有模块共用本地 `assets/three-BJx-OGLx.js` 的 Three.js r184 和内含的 GLTFLoader / 后处理组件。保留原构建头部的 Copyright 2010–2026 Three.js Authors / MIT 标记。许可全文见 `licenses/THREE-MIT.txt`。

`vendor/nes-core.min.css` 来自恢复包，保留 NES.css、Bootstrap Reboot 等原始版权注释。像素字体为恢复包的 `pixel-zh.woff2` / `pixel-zh.ttf`，继续使用原站依赖归属，不重新指定许可。

## 车辆

| 模型 | 作者 | 用户提供的原始文件 |
|---|---|---|
| `assets/models/ignition-car.glb` | Ignition Labs | CAR Model by Ignition Labs - 5zUWP5UsLg-.glb |
| `assets/models/police-car.glb` | Quaternius | Police Car by Quaternius - BwwnUrWGmV.glb |

两份文件从用户指定的 neon-drift 原样复制，原二进制不改。归一化、运行时材质和自制尾灯在适配层处理，车库显示作者。沿用源工程的素材说明：GLB 元数据未附完整再分发许可，不把模型重新标为原创或 CC0。本次仅交付用户本地工程。

ION / VECTOR 的程序化几何、车库卡片与适配、红色尾迹来自此前为用户制作的 neon-drift，并针对原场景适配。新增 NIGHT CIRCUIT 曲谱、合成器和整合模块为此次独立实现，没有使用外部歌曲或音乐 API。
