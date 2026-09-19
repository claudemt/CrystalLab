# Architecture

CrystalLab 1.0 使用单向数据流：**state → scene/UI projection → user action → state**。运行时没有兼容旧接口的适配层。

## 1. 模块边界

- `src/app/state.js`：唯一可变应用状态、图层注册表与模式默认值。
- `src/app/constants.js`：视觉语义常量，不保存业务状态。
- `src/core/`：不依赖 DOM 的晶体学与几何模型；`model.js` 负责跨核心模块的公共判据与坐标约定。**不反向依赖 `app/`、`scene/` 或 `ui/`**（`tests/verify-ui.mjs` 有守卫）。
- `src/scene/viewport.js`：renderer、camera、OrbitControls、自动取景和单次对称动画生命周期。
- `src/scene/render-scene.js`：把当前 state 投影为 Three.js scene graph，不读写 UI 控件。
- `src/ui/workbench.js`：把 state 投影到 inspector、图层栏与 readout，并**唯一一处**分发用户事件。
- `src/ui/theory.js`：定义 / 推导内容；图层跳转只声明 action，不自己绑定。
- `src/ui/catalog.js`：独立科研索引器；自留一份限定在 `#catalogArea` 内的委派。
- `src/main.js`：只组合模块、定义 action 并触发 render。

### 依赖方向

只向下：`main → scene/ + ui/ → core/`。`core/` 是叶子——它算晶体学，不知道有 DOM，也不知道有 scene graph 或控件。视觉语义常量（`COLORS`/`LINE_WEIGHTS`）住在 `app/constants.js`，供上层读；`core/` 需要的数值常量（如对照视图的归一化比例）定义在 `core/` 内部，不下沉到 `app/`。

### 几何层命名

构造 Three.js 对象的函数一律 `make*` 前缀（`makeSegments`/`makeArrow`/`makeCellMesh`…）；纯计算、纯数据函数不加前缀（`cellVolume`/`wignerSeitzData`/`millerPlanePolygon`）。同名概念不设第二套后缀——W–S 相关一律 `wignerSeitz*`。

场景构造函数统一为「身份参数位置化，其余走 options」：前几个参数是几何数据与颜色，其余一律放进选项对象，且**选项对象的键就是函数真正会读的键**——不写「同形」这种没人兑现的话。

### 交互入口

所有控件只在 HTML / 模板串里声明 `data-action`（图层 checkbox 另带 `data-layer-action` 指向保留自身副作用的专用 action），由 `src/ui/workbench.js` 的 `bindWorkbench` 用挂在 `document` 上的**一个 click + 一个 change** 分发。委派而非逐元素绑定，是因为理论抽屉的跳转按钮与 catalog 的行按钮每次重绘都会重建——逐元素绑定必须跟着重绑，漏一处就是「点了没反应」。

`tests/verify-ui.mjs` 断言 HTML 里出现的每个 action 都在表里有处理器、表里的每个处理器也确实被某个控件用到，且 `workbench.js` 只剩这两个监听。

## 2. 图层注册表

所有可切换空间对象在 `LAYERS` 中只定义一次。每项记录：

- 对应 state flag；
- 所属空间 `direct / reciprocal / both`；
- 可选依赖，例如 `{hkl}` 依赖 Miller 分析开启。

底部图层按钮和理论页跳转都只使用该注册表，禁止再次定义 `LAYER_FLAGS`、别名表或第二套开关状态。

## 3. Scene graph

物理几何使用同一笛卡尔坐标系：

- `direct-space-root` 保存实空间对象；
- `reciprocal-space-root` 保存倒空间对象；
- `reference-axis-root` 只在 overlay 中提供共享坐标参考。

`direct` 与 `reciprocal` 各自只挂载一个空间；`overlay` 才同时挂载两棵 root。

倒格数据始终满足 \(B=2\pi A^{-T}\)。overlay 为比较需要只对 `reciprocal-space-root` 施加显示变换

\[
s_{\rm display}=\rho\,\frac{\ell_{\rm direct}}{\ell_{\rm reciprocal}},
\]

其中 \(\rho\) 是接近 1 的目标视觉比例，\(\ell\) 是各自 primitive basis 的 characteristic length。显示尺度不得写回物理数据，也不得对子对象再做逆缩放补偿。

## 4. Camera

`Viewport3D` 从实际 scene bounds 自动计算中心、bounding sphere 和透视相机距离。空间切换、对象切换、局部 / 全局切换会触发重新 fit；普通图层开关保留用户手动缩放。

## 5. Motion

对称作用是唯一显式几何动画：一次 action 产生一次有限时长变换。相机自动旋转与群作用不并发；一般位置轨道是静态结果层。

## 6. UI 状态

UI 不拥有业务状态。checkbox、select、图层按钮、理论跳转都通过 `main.js` 中的 action 修改同一个 `state`，随后统一调用 `render()`。任何新功能若需要在两个位置同步控件，应先扩展 state / registry，而不是添加局部 DOM 状态。
