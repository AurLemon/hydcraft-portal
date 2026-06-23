# HydCraft Portal Memory

## Partner Drafts

- 在伙伴/支持鸣谢创建流程中，允许“先落一条真实记录，再上传媒体”。
- 这是刻意保留的行为，不要擅自改回“必须先完整保存再上传”。
- 但后续必须补自动清理机制，避免留下悬空或半成品伙伴记录。

## Attachment URL Policy

- 附件公开 URL 不要在业务代码里手写 `baseUrl + objectKey`。
- 统一通过 `server/utils/attachment/runtime.ts` 提供的公开 URL 方法生成。
- 如果以后要切换 COS / S3 兼容实现，优先改存储抽象层，不要在业务模块里分叉协议。

## UI Change Discipline

- 不要在未明确要求时额外添加 hover 浮动、缩放、过强动效或重排版交互。
- 对现有样式做修改时，优先基于用户已改过的版本继续迭代，不要擅自回退视觉方向。

## Build And Error Rules

- 执行全项目 Build 时，Timeout 设定控制在 180s - 200s 左右；当前项目全量 Build 预计耗时约 2m30s。
- 错误码与错误标识命名，优先使用英语、大写、下划线风格，例如 `RESOURCE_NOT_FOUND`、`UPLOAD_FAILED`。
- 面向用户的错误展示与文案，统一走 i18n，不要在业务流程中散落硬编码错误文案。
- 新增功能或调整现有逻辑时，默认需要考虑 i18n 接入，而不是仅处理单语言场景。

## UI Implementation Preference

- HTML 结构中，非必要不要直接写 `style` 内联样式，优先使用 Tailwind CSS 与 Nuxt UI 提供的能力完成样式表达。
- `<style scoped>` 不是禁用，但应只用于 Tailwind CSS / Nuxt UI 难以表达的复杂状态、动画、第三方组件覆盖或结构性样式；普通布局与视觉优先留在模板 class。
- `:style` / 内联 `style` 只用于运行时计算值、第三方库注入 HTML、canvas / map 等 Tailwind CSS 无法静态表达的场景；静态样式不要回退成 inline style。

## Attachment Storage Boundary

- 当前附件存储实现虽然基于 COS，但约束应按 S3-compatible / object storage 抽象理解，不要把业务规则绑定在某一家厂商 SDK 上。
- 不要在业务模块里直接 new COS、手写 SDK 参数、或自行拼接对象存储公开地址。
- 附件上传、删除、公开 URL、bucket profile 选择，统一走 `server/utils/attachment` 抽象层，不要绕过 runtime / service / storage-adapter。
- 如果未来切换到 S3 兼容实现，优先改 `storage-adapter` 与 runtime profile 映射，不要改业务 service / API handler。
- `publicAssets` 与 `privateUploads` 的 bucket / profile 语义不可在业务代码里混用；是否公开由 profile 与 visibility 决定，不靠调用方临时约定。
- 业务层只消费 `objectKey`、attachment id、public URL 结果，不关心底层厂商字段命名。

## UI System Discipline

- 优先复用 `app.config.ts` 中的 Nuxt UI 主题配置，以及 `assets/styles/base/tailwind.css` 中的 design token，不要在页面里重新发明一套颜色、表面层级、尺寸语义。
- 颜色、语义色、表面层级、字号与字体倾向，优先通过 token 与 class 表达，不要在局部组件里散落硬编码色值。
- 对 Nuxt UI 组件的定制，优先走 theme / config / class 扩展，不要为了一个局部视觉点把整个组件手写替换掉。

## Error And i18n Discipline

- 服务端业务错误统一通过 `createApiError` / `createBadRequestError` 抛出，不要直接散落 `createError` 拼结构。
- 错误 code 保持英语、大写、下划线风格；HTTP status 与错误 code 分离，前端展示依赖 i18n 映射，不直接展示裸文案。
- 新增错误 code 时，默认同步补各 locale 的 `errors` 文案；至少不能只补一个语言后就结束。
- 面向用户的失败提示统一走 i18n；日志与内部诊断信息可以保留英文技术描述。
- `console.error` / `console.warn` 的标签前缀优先使用稳定的英文大写错误标识，方便检索，例如 `PROFILE_ATTACHMENT_CLEANUP_FAILED`。

## Event And Side-Effect Boundary

- Service 负责核心数据库操作与数据合法性校验，成功后发事件；异步清理、发信、联动修复等副作用放到 event handler / plugin 层。
- API handler 保持薄层：鉴权、读参、调用 service、返回结果，不在 handler 里堆业务细节。
- 新增业务节点时，先想清楚是否应该补事件，而不是让两个业务模块直接互相调用。
- 定时清理、附件替换清理、OAuth 解绑后的补偿动作，这类后处理逻辑优先挂到 plugin / event 层，而不是塞回主流程事务里。
- 若某个副作用失败，优先记录日志并可重试，不要轻易污染核心成功路径。

## Draft And Cleanup Lifecycle

- 允许存在草稿、待上传、待替换、待清理这类中间态，但必须同时设计对应的过期回收或替换清理机制。
- 新增“先落库后补媒体”或“先生成记录再补关联”的流程时，要同时考虑悬空记录、过期附件、孤儿资源的清理策略。
- 如果一个功能会生成临时 token、临时附件、临时申请单、临时注册记录，默认需要先回答：谁来清、何时清、失败后如何补偿。
